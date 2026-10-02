import { lstat, open, readdir, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  decodeArtifacts,
  decodeListingEntry,
  decodeTasks,
  type ListingEntry,
  type ChangeMetadata,
} from "../contracts.js";
import { isChangeName } from "../model.js";
import {
  runOpenSpec,
  serviceError,
  type CliResult,
  type CommandRunner,
  type Json,
  type ServiceError,
  ServiceFault,
} from "./cli.js";

type Scope = { root: string; planning: string; planningRoot: string };
type State = Scope & { changeRoot: string; status: Json };
type Document = { artifactId: string; selector: string; label: string };
const failure = (error: ServiceError): { ok: false; error: ServiceError } => ({ ok: false, error });
const inside = (path: string, parent: string): boolean =>
  path === parent || path.startsWith(`${parent}${sep}`);

export function createOpenSpecAdapter(run: CommandRunner = runOpenSpec, remove: typeof rm = rm) {
  async function planningScope(root: string, expectedPlanning?: string): Promise<Scope> {
    try {
      const planningRoot = await realpath(join(root, "openspec"));
      const stat = await lstat(planningRoot);
      if (!stat.isDirectory()) throw new Error("Planning is not a directory.");
      const planning = JSON.stringify([planningRoot, stat.dev, stat.ino]);
      if (planning.length > 4096) throw new Error("Planning identity exceeds bounds.");
      if (expectedPlanning !== undefined && planning !== expectedPlanning)
        throw serviceError(
          "PLANNING_CHANGED",
          "Planning target changed. Refresh to establish the new scope.",
          409,
        );
      return { root, planning, planningRoot };
    } catch (caught) {
      if (caught instanceof ServiceFault) throw caught;
      throw serviceError("NO_OPENSPEC_ROOT", "The planning target is missing or invalid.", 404);
    }
  }

  async function context(
    directory: string,
    expectedRoot?: string,
    expectedPlanning?: string,
  ): Promise<Scope | ServiceError> {
    if (!isAbsolute(directory)) return serviceError("BAD_DIRECTORY", "Directory must be absolute.");
    const result = await run(directory, ["context"]);
    if (!result.ok) return result.error;
    const root = (result.value.root as Json | undefined)?.path;
    if (typeof root !== "string")
      return serviceError(
        "NO_OPENSPEC_ROOT",
        "This directory does not resolve to an OpenSpec project.",
        404,
      );
    const canonical = await realpath(root);
    if (expectedRoot !== undefined && canonical !== expectedRoot)
      return serviceError("ROOT_CHANGED", "The selected OpenSpec root has changed.", 409);
    return planningScope(canonical, expectedPlanning);
  }

  async function checked(
    directory: string,
    args: string[],
    current: Pick<Scope, "root"> | undefined,
    strict = false,
    reconcileRootless = false,
  ): Promise<CliResult> {
    if (!isAbsolute(directory))
      return failure(serviceError("BAD_DIRECTORY", "Directory must be absolute."));
    const result = await run(directory, args);
    const rootlessFailure =
      reconcileRootless &&
      !result.ok &&
      result.error.code === "OPENSPEC_ERROR" &&
      result.value &&
      !("root" in result.value);
    if (strict && result.value && !rootlessFailure) {
      const root = result.value.root as Json | undefined;
      if (!root || typeof root.path !== "string" || root.source === "implicit")
        return failure(
          serviceError(
            "NO_OPENSPEC_ROOT",
            "This directory does not resolve to an OpenSpec project.",
            404,
          ),
        );
      if (current && (await realpath(root.path)) !== current.root)
        return failure(
          serviceError("ROOT_CHANGED", "The selected OpenSpec root has changed.", 409),
        );
    }
    if (!result.ok) return result;
    const reported = (result.value.root as Json | undefined)?.path;
    if (
      current &&
      reported !== undefined &&
      (typeof reported !== "string" || (await realpath(reported)) !== current.root)
    )
      return failure(
        serviceError(
          "ROOT_CHANGED",
          "OpenSpec resolved a different project during the request.",
          409,
        ),
      );
    return result;
  }

  async function changeState(
    directory: string,
    change: string,
    current: Scope,
  ): Promise<State | ServiceError> {
    if (!isChangeName(change)) return serviceError("BAD_CHANGE", "Change name is invalid.");
    const result = await checked(directory, ["status", "--change", change], current, true, true);
    if (!result.ok) {
      return reconcileChange(directory, change, current, result.error);
    }
    if (typeof result.value.changeRoot !== "string")
      return serviceError("BAD_CLI_OUTPUT", "OpenSpec did not return a change root.", 502);
    const changeRoot = await validatedChange(current, change, result.value);
    return { ...current, changeRoot, status: result.value };
  }

  async function validatedChange(current: Scope, change: string, status?: Json): Promise<string> {
    const parent = join(current.planningRoot, "changes");
    const target = join(parent, change);
    for (const path of [parent, target]) {
      try {
        if ((await lstat(path)).isSymbolicLink())
          throw serviceError("BAD_CHANGE_ROOT", "Change path is not a real named directory.", 409);
      } catch (caught) {
        if ((caught as NodeJS.ErrnoException).code !== "ENOENT") throw caught;
      }
    }
    if (
      status &&
      (typeof status.changeRoot !== "string" || (await realpath(status.changeRoot)) !== target)
    )
      throw serviceError("BAD_CHANGE_ROOT", "OpenSpec returned an unsafe change path.", 502);
    for (const path of [parent, target]) {
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isDirectory() || (await realpath(path)) !== path)
        throw serviceError("BAD_CHANGE_ROOT", "Change path is not a real named directory.", 409);
    }
    if (status) {
      const home = status.planningHome as Json | undefined;
      if (
        typeof status.changeRoot !== "string" ||
        (await realpath(status.changeRoot)) !== target ||
        (home?.changesDir !== undefined &&
          (typeof home.changesDir !== "string" || (await realpath(home.changesDir)) !== parent))
      )
        throw serviceError("BAD_CHANGE_ROOT", "OpenSpec returned an unsafe change path.", 502);
    }
    return target;
  }

  // CLI schemas restrict task inputs to relative paths. Check every existing link before the
  // CLI can choose its schema-specific tracking input, without parsing task source text.
  async function validateInputs(current: Scope, change: string): Promise<void> {
    let target: string;
    try {
      target = await validatedChange(current, change);
    } catch (caught) {
      if ((caught as NodeJS.ErrnoException).code === "ENOENT") return;
      throw caught;
    }
    const pending = [target];
    const visited = new Set<string>();
    let entries = 0;
    while (pending.length) {
      const directory = pending.pop()!;
      if (visited.has(directory)) continue;
      visited.add(directory);
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (++entries > 10_000)
          throw serviceError(
            "INPUTS_TOO_LARGE",
            "Change input tree exceeds validation bounds.",
            413,
          );
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) {
          const canonical = await realpath(path);
          if (!inside(canonical, target))
            throw serviceError(
              "BAD_DOCUMENT_PATH",
              "Task input link is outside the selected change.",
              502,
            );
          if ((await lstat(canonical)).isDirectory()) pending.push(canonical);
        } else if (entry.isDirectory()) pending.push(path);
      }
    }
  }

  async function reconcileChange(
    directory: string,
    change: string,
    current: Scope,
    error: ServiceError,
  ): Promise<ServiceError> {
    if (error.code === "OPENSPEC_ERROR") {
      const listing = await list(directory, current);
      if ("code" in listing && ["ROOT_CHANGED", "NO_OPENSPEC_ROOT"].includes(listing.code))
        return listing;
      if (!("code" in listing) && !listing.changes.some((entry) => entry.id === change))
        return serviceError("CHANGE_UNAVAILABLE", "Change is no longer listed.", 404);
    }
    return error;
  }

  async function validateMetadata(current: Scope, change: string): Promise<void> {
    const target = join(current.planningRoot, "changes", change);
    try {
      await validatedChange(current, change);
      if (!inside(await realpath(join(target, ".openspec.yaml")), target))
        throw serviceError(
          "BAD_METADATA_PATH",
          "Goal metadata is outside the selected change.",
          502,
        );
    } catch (caught) {
      if ((caught as NodeJS.ErrnoException).code !== "ENOENT") throw caught;
    }
  }

  async function list(
    directory: string,
    current: Pick<Scope, "root"> | undefined,
    strict = true,
  ): Promise<{ root: string; changes: ListingEntry[] } | ServiceError> {
    const result = await checked(directory, ["list"], current, strict);
    if (!result.ok) return result.error;
    try {
      if (!Array.isArray(result.value.changes)) throw new Error("Missing changes.");
      const changes = result.value.changes.map((item) => decodeListingEntry(item, "name"));
      if (new Set(changes.map((item) => item.id)).size !== changes.length)
        throw new Error("Duplicate change.");
      const reported = (result.value.root as Json | undefined)?.path;
      return {
        root: typeof reported === "string" ? await realpath(reported) : current!.root,
        changes,
      };
    } catch {
      return serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec change listing.", 502);
    }
  }

  async function metadataFor(
    state: State,
  ): Promise<{ goal: string | null; affectedAreas: string[] }> {
    const metadataPath = resolve(state.changeRoot, ".openspec.yaml");
    let canonical: string;
    try {
      canonical = await realpath(metadataPath);
    } catch (caught) {
      if ((caught as NodeJS.ErrnoException).code === "ENOENT")
        return { goal: null, affectedAreas: [] };
      throw caught;
    }
    if (!inside(canonical, state.changeRoot))
      throw serviceError("BAD_DOCUMENT_PATH", "Change metadata is outside the change.", 502);
    const file = await open(canonical, "r");
    let metadata: unknown;
    try {
      const buffer = Buffer.alloc(240_001);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > 240_000)
        throw serviceError("METADATA_TOO_LARGE", "Change metadata is too large to read.", 413);
      metadata = parseYaml(buffer.toString("utf8", 0, length));
    } finally {
      await file.close();
    }
    const fields = metadata && typeof metadata === "object" ? (metadata as Json) : {};
    const areas = fields.affected_areas === undefined ? [] : fields.affected_areas;
    if (!Array.isArray(areas) || areas.some((area) => typeof area !== "string" || !area.length))
      throw new Error("Invalid affected areas.");
    return {
      goal: typeof fields.goal === "string" ? fields.goal : null,
      affectedAreas: areas as string[],
    };
  }

  async function summaryFor(state: State, change: string): Promise<CliResult> {
    try {
      const artifacts = decodeArtifacts(state.status.artifacts, state.status.applyRequires);
      return {
        ok: true,
        value: {
          id: change,
          root: state.root,
          ...(await metadataFor(state)),
          artifacts,
          applyRequires: state.status.applyRequires,
          documents: await documentsFor(state, artifacts),
        },
      };
    } catch (caught) {
      if (caught instanceof Error && "code" in caught) throw caught;
      return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec change data.", 502));
    }
  }

  async function changes(
    directory: string,
    expectedRoot?: string,
    expectedPlanning?: string,
  ): Promise<CliResult> {
    if (expectedRoot) await planningScope(expectedRoot, expectedPlanning);
    const listing = await list(directory, expectedRoot ? { root: expectedRoot } : undefined);
    if ("code" in listing) return failure(listing);
    const current = await planningScope(listing.root, expectedPlanning);
    return { ok: true, value: { directory, ...listing, planning: current.planning } };
  }

  async function summaries(
    directory: string,
    expectedRoot: string,
    expectedPlanning?: string,
  ): Promise<CliResult> {
    const current = await planningScope(expectedRoot, expectedPlanning);
    const parent = join(current.planningRoot, "changes");
    if ((await lstat(parent)).isSymbolicLink())
      throw serviceError("BAD_CHANGE_ROOT", "Changes parent is not a real directory.", 409);
    const entries = await readdir(parent, { withFileTypes: true });
    if (entries.length > 10_000)
      throw serviceError("INPUTS_TOO_LARGE", "Planning tree exceeds validation bounds.", 413);
    for (const entry of entries)
      if (
        entry.name !== "archive" &&
        isChangeName(entry.name) &&
        (entry.isDirectory() || entry.isSymbolicLink())
      )
        await validateMetadata(current, entry.name);
    const result = await checked(directory, ["status", "--all"], { root: expectedRoot }, true);
    if (!result.value) return result;
    if (!result.ok && result.error.code !== "OPENSPEC_ERROR") return result;
    if (!Array.isArray(result.value.changes))
      return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec batch status.", 502));
    const ids = new Set<string>();
    const changes: (
      | { id: string; summary: ChangeMetadata }
      | { id: string; error: { code: string; message: string } }
    )[] = [];
    for (const entry of result.value.changes) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec batch entry.", 502));
      const status = entry as Json;
      const id = status.changeName;
      if (typeof id !== "string" || !isChangeName(id) || ids.has(id))
        return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec batch change name.", 502));
      ids.add(id);
      try {
        if (!Array.isArray(status.artifacts)) {
          const diagnostics = status.status;
          const message =
            Array.isArray(diagnostics) &&
            diagnostics.find(
              (item) => item?.severity === "error" || typeof item?.message === "string",
            )?.message;
          throw serviceError(
            "OPENSPEC_ERROR",
            typeof message === "string" ? message : "OpenSpec could not read this change.",
            422,
          );
        }
        if (typeof status.changeRoot !== "string") throw new Error("Missing change root.");
        const changeRoot = await validatedChange(current, id, status);
        const summary = await summaryFor({ ...current, changeRoot, status }, id);
        if (!summary.ok) throw summary.error;
        changes.push({ id, summary: summary.value as ChangeMetadata });
      } catch (caught) {
        const error =
          caught instanceof ServiceFault
            ? caught
            : serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec change data.", 502);
        changes.push({ id, error: { code: error.code, message: error.message } });
      }
    }
    await planningScope(expectedRoot, current.planning);
    return { ok: true, value: { root: expectedRoot, planning: current.planning, changes } };
  }

  async function documentsFor(state: State, artifacts: { id: string }[]) {
    const paths = state.status.artifactPaths;
    if (!paths || typeof paths !== "object" || Array.isArray(paths))
      throw new Error("Invalid document paths.");
    const documents: Document[] = [];
    for (const artifact of artifacts) {
      const entry = (paths as Json)[artifact.id];
      if (entry === undefined) continue;
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        throw new Error("Invalid artefact paths.");
      const outputs = (entry as Json).existingOutputPaths;
      if (!Array.isArray(outputs)) throw new Error("Invalid artefact outputs.");
      for (const path of outputs) {
        if (typeof path !== "string" || !isAbsolute(path)) throw new Error("Invalid output path.");
        const selector = relative(state.changeRoot, await realpath(path));
        if (
          !selector ||
          selector === ".." ||
          selector.startsWith(`..${sep}`) ||
          isAbsolute(selector)
        )
          throw serviceError(
            "BAD_DOCUMENT_PATH",
            "Document path is outside the selected change.",
            502,
          );
        documents.push({ artifactId: artifact.id, selector, label: selector });
      }
    }
    return documents.sort(
      (left, right) =>
        artifacts.findIndex((item) => item.id === left.artifactId) -
          artifacts.findIndex((item) => item.id === right.artifactId) ||
        left.label.localeCompare(right.label),
    );
  }

  async function readDocument(
    state: State,
    selected: Document,
  ): Promise<
    | { ok: true; value: { artifactId: string; selector: string; content: string } }
    | { ok: false; error: ServiceError }
  > {
    const path = await realpath(resolve(state.changeRoot, selected.selector));
    if (!inside(path, state.changeRoot))
      return failure(
        serviceError("BAD_DOCUMENT_PATH", "Document path is outside the selected change.", 502),
      );
    const file = await open(path, "r");
    try {
      const buffer = Buffer.alloc(240_001);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > 240_000)
        return failure(
          serviceError("DOCUMENT_TOO_LARGE", "Document is too large to display.", 413),
        );
      return {
        ok: true,
        value: {
          artifactId: selected.artifactId,
          selector: selected.selector,
          content: buffer.toString("utf8", 0, length),
        },
      };
    } finally {
      await file.close();
    }
  }

  async function tasks(
    directory: string,
    change: string,
    expectedRoot: string,
    expectedPlanning?: string,
  ): Promise<CliResult> {
    if (!isChangeName(change))
      return failure(serviceError("BAD_CHANGE", "Change name is invalid."));
    const current = await planningScope(expectedRoot, expectedPlanning);
    await validateInputs(current, change);
    const apply = await checked(
      directory,
      ["instructions", "apply", "--change", change],
      current,
      true,
      true,
    );
    if (!apply.ok) return failure(await reconcileChange(directory, change, current, apply.error));
    await planningScope(expectedRoot, current.planning);
    try {
      return { ok: true, value: { tasks: decodeTasks(apply.value.tasks) } };
    } catch (caught) {
      if (caught instanceof Error && "code" in caught) throw caught;
      return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec change details.", 502));
    }
  }

  async function documentFor(
    directory: string,
    change: string,
    artifactId: string,
    selector?: string,
    expectedRoot: string = directory,
    expectedPlanning?: string,
  ): Promise<CliResult> {
    const current = await planningScope(expectedRoot, expectedPlanning);
    await validateMetadata(current, change);
    const state = await changeState(directory, change, current);
    if ("code" in state) return failure(state);
    let documents;
    try {
      documents = await documentsFor(
        state,
        decodeArtifacts(state.status.artifacts, state.status.applyRequires),
      );
    } catch (caught) {
      if (caught instanceof Error && "code" in caught) throw caught;
      return failure(serviceError("BAD_CLI_OUTPUT", "Invalid OpenSpec document data.", 502));
    }
    const selected =
      selector === undefined
        ? documents.find((item) => item.artifactId === artifactId)
        : documents.find((item) => item.artifactId === artifactId && item.selector === selector);
    if (!selected)
      return failure(
        serviceError("DOCUMENT_UNAVAILABLE", "This document is no longer available.", 404),
      );
    await planningScope(expectedRoot, current.planning);
    const result = await readDocument(state, selected);
    await planningScope(expectedRoot, current.planning);
    return result;
  }

  async function createChange(
    directory: string,
    name: string,
    goal: string,
    expectedRoot?: string,
    expectedPlanning?: string,
  ): Promise<CliResult> {
    if (!isChangeName(name))
      return failure(
        serviceError("BAD_CHANGE", "Use lowercase letters or digits separated by single hyphens."),
      );
    if (!goal.trim()) return failure(serviceError("BAD_GOAL", "Goal is required."));
    const current = await context(directory, expectedRoot, expectedPlanning);
    if ("code" in current) return failure(current);
    const pinned = await context(dirname(current.planningRoot));
    if ("code" in pinned) return failure(pinned);
    if (pinned.planning !== current.planning)
      return failure(serviceError("ROOT_CHANGED", "Canonical planning context changed.", 409));
    const confirmed = await context(directory, current.root, current.planning);
    if ("code" in confirmed) return failure(confirmed);
    const parent = join(current.planningRoot, "changes");
    const parentStat = await lstat(parent);
    if (parentStat.isSymbolicLink() || !parentStat.isDirectory())
      return failure(
        serviceError("BAD_CHANGE_ROOT", "Changes parent is not a real directory.", 409),
      );
    try {
      const result = await checked(
        pinned.root,
        ["new", "change", name, "--goal", goal.trim()],
        pinned,
      );
      if (!result.ok)
        return failure(
          serviceError(result.error.code, result.error.message, result.error.status, "unknown"),
        );
      const created = result.value.change as Json | undefined;
      if (!created || created.id !== name)
        return failure(
          serviceError(
            "BAD_CLI_OUTPUT",
            "OpenSpec creation result is invalid; check the original project before retrying.",
            502,
            "unknown",
          ),
        );
      const final = await context(directory, current.root, current.planning);
      if ("code" in final)
        return failure(serviceError(final.code, final.message, final.status, "unknown"));
      return { ok: true, value: { root: current.root, change: name } };
    } catch {
      return failure(
        serviceError(
          "CREATE_UNKNOWN",
          "Creation outcome is unknown; check the original project before retrying.",
          503,
          "unknown",
        ),
      );
    }
  }

  async function deleteChange(
    directory: string,
    change: string,
    expectedRoot: string,
    beforeRemove: () => void = () => {},
    expectedPlanning?: string,
  ): Promise<CliResult> {
    if (!isChangeName(change))
      return failure(serviceError("BAD_CHANGE", "Change name is invalid."));
    const current = await context(directory, expectedRoot, expectedPlanning);
    if ("code" in current) return failure(current);
    const listing = await list(directory, current, false);
    if ("code" in listing) return failure(listing);
    if (!listing.changes.some((item) => item.id === change))
      return failure(serviceError("CHANGE_UNAVAILABLE", "Change is no longer listed.", 404));
    const status = await checked(directory, ["status", "--change", change], current);
    if (!status.ok) return status;
    const parent = join(current.planningRoot, "changes");
    const target = join(parent, change);
    try {
      await validatedChange(current, change, status.value);
      const identities = await Promise.all(
        [current.planningRoot, parent, target].map(async (path) => {
          const stat = await lstat(path);
          return { path, dev: stat.dev, ino: stat.ino };
        }),
      );
      const confirmed = await context(directory, expectedRoot, current.planning);
      if ("code" in confirmed) return failure(confirmed);
      for (const { path, dev, ino } of identities) {
        const stat = await lstat(path);
        if (stat.isSymbolicLink() || !stat.isDirectory())
          return failure(
            serviceError("BAD_CHANGE_ROOT", "Change path is not a real directory.", 409),
          );
        if (stat.dev !== dev || stat.ino !== ino || (await realpath(path)) !== path)
          return failure(
            serviceError(
              "ROOT_CHANGED",
              "Planning, parent or target changed during deletion.",
              409,
            ),
          );
      }
      if (
        (await realpath(current.root)) !== current.root ||
        (await realpath(parent)) !== parent ||
        (await realpath(target)) !== target ||
        !(await lstat(target)).isDirectory()
      )
        return failure(serviceError("ROOT_CHANGED", "OpenSpec root changed during deletion.", 409));
      beforeRemove();
      // Ancestors are checked above; recursive removal unlinks links inside the target tree.
      await remove(target, { recursive: true });
      return { ok: true, value: { root: current.root, change } };
    } catch (caught) {
      if ((caught as NodeJS.ErrnoException).code === "ENOENT")
        return failure(serviceError("CHANGE_UNAVAILABLE", "Change is no longer available.", 404));
      throw caught;
    }
  }

  return { changes, summaries, tasks, documentFor, createChange, deleteChange };
}
