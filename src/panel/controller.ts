import { HostRequestError, type HostClient } from "@openchamber/sdk";
import { deriveChange, type DerivedChange } from "../model.js";
import {
  documentKey,
  type ArchivedChange,
  type SpecEntry,
  type Task,
  type Workflow,
} from "../contracts.js";
import { createClient, ServiceRequestError, type Scope } from "./client.js";
import { createResources, type ReadState } from "./resources.js";
import { mountBoardView, type BoardView } from "./board-view.js";
import { mountDetailView, taskArtifact } from "./detail-view.js";
import { mountSpecView } from "./spec-view.js";
import { mountCreateDialog } from "./create-dialog.js";
import { mountDeleteDialog } from "./delete-dialog.js";
import { mountArchiveDialog } from "./archive-dialog.js";
import { archiveAllPrompt } from "./archive-prompt.js";
import { actionPrompt, planningPrompt } from "./prompts.js";
import type { PrimaryIntent } from "./primary-action.js";
import { appendTrackedChange, resolveSessionChanges } from "./tracked-change.js";
import { findProject } from "./project.js";
import { inspectWorktreeDestination } from "./worktree.js";
import { CORE_WORKFLOWS, loadWorkflows } from "./workflows.js";

export function mountController(host: HostClient, appRoot: HTMLElement): () => void {
  const client = createClient(host);
  const resources = createResources(client);
  let directory: string | null = null;
  let scope: Scope | null = null;
  let sessionId: string | null = null;
  let epoch = 0;
  let boardOperation = 0;
  let boardActive = false;
  let reconcileQueued = false;
  let pendingInspection: {
    scope: Scope;
    epoch: number;
    name: string;
    minOperation: number;
  } | null = null;
  let changes: DerivedChange[] = [];
  let workflows: ReadonlySet<Workflow> = new Set(CORE_WORKFLOWS);
  let listedIds: ReadonlySet<string> = new Set();
  let checkFocus = true;
  let focusedChange: { name: string; reloaded: boolean } | null = null;
  let staleIds = new Set<string>();
  let unavailableIds = new Set<string>();
  let failures: { id: string; error: string }[] = [];
  let listedCount = 0;
  let completedTasks = 0;
  let totalTasks = 0;
  let pendingSummaries = 0;
  let loading = false;
  let settled = false;
  let errorMessage: string | null = null;
  let search = "";
  let boardTab: BoardView = "changes";
  let archivedState: ReadState<ArchivedChange[]> | null = null;
  let specsState: ReadState<SpecEntry[]> | null = null;
  let specState: ReadState<string> | null = null;
  let selectedSpec: string | null = null;
  let specListScroll = 0;
  let returningToSpec: string | null = null;
  let selectedChange: DerivedChange | null = null;
  let selectedArtifact = "";
  let activeView: "document" | "tasks" = "document";
  let taskState: ReadState<Task[]> | null = null;
  let files = new Map<string, ReadState<string>>();
  let selection = 0;
  let detailOpening = 0;
  let readGeneration = 0;
  let boardScroll = 0;
  let archivePending = false;
  const worktreePending = new Set<string>();
  const worktreeKey = (scope: Scope, id: string) =>
    JSON.stringify([scope.directory, scope.root, scope.planning, id]);
  let disposed = false;

  function invalidate() {
    epoch++;
    boardOperation++;
    boardActive = false;
    reconcileQueued = false;
    pendingInspection = null;
    scope = null;
    resources.setContext(null);
    clearBrowse(true);
    changes = [];
    workflows = new Set(CORE_WORKFLOWS);
    listedIds = new Set();
    focusedChange = null;
    staleIds = new Set();
    unavailableIds = new Set();
    failures = [];
    listedCount = completedTasks = totalTasks = pendingSummaries = 0;
    loading = settled = false;
    selectedChange = null;
    selectedArtifact = "";
    taskState = null;
    files = new Map();
    selection++;
    detailOpening++;
    readGeneration++;
    search = "";
    boardView.resetPositions();
    errorMessage = null;
    render();
  }

  function planningChanged() {
    const retainedSearch = search;
    invalidate();
    search = retainedSearch;
    errorMessage = "Planning target changed. Refresh to establish the new scope.";
    render();
  }

  function loadBoard({
    refresh = false,
    reconcile = false,
    workflows: readWorkflows = false,
  } = {}) {
    if (boardActive) {
      if (reconcile) reconcileQueued = true;
      return;
    }
    const currentDirectory = directory;
    if (!currentDirectory) {
      invalidate();
      return;
    }
    if (refresh) {
      if (readWorkflows) {
        resources.refresh();
        clearBrowse(false);
      } else resources.refreshChanges();
      readGeneration++;
      detailOpening++;
      files = new Map();
      taskState = null;
    }
    boardActive = true;
    const operation = ++boardOperation;
    const startingEpoch = epoch;
    loading = true;
    errorMessage = null;
    render();
    void (async () => {
      try {
        const [listing, configuredWorkflows] = await Promise.all([
          client.list(currentDirectory),
          readWorkflows ? loadWorkflows(client, currentDirectory) : workflows,
        ]);
        if (
          directory !== currentDirectory ||
          epoch !== startingEpoch ||
          operation !== boardOperation
        )
          return;
        if (scope && scope.root !== listing.root) {
          invalidate();
          loadBoard({ workflows: true });
          return;
        }
        workflows = configuredWorkflows;
        const previousScope = scope;
        scope =
          scope?.root === listing.root && scope.planning === listing.planning
            ? scope
            : { directory: currentDirectory, root: listing.root, planning: listing.planning };
        const current = scope;
        resources.setContext(current);
        if (current !== previousScope) clearBrowse(true);
        readBrowse();
        const listed = new Set(listing.changes.map((entry) => entry.id));
        listedIds = listed;
        if (selectedChange && !listed.has(selectedChange.id)) {
          unavailableIds.add(selectedChange.id);
          detailOpening++;
        }
        if (
          pendingInspection?.scope === current &&
          pendingInspection.epoch === epoch &&
          operation >= pendingInspection.minOperation &&
          !listed.has(pendingInspection.name)
        ) {
          pendingInspection = null;
          errorMessage = "The observed change is no longer available for inspection.";
        }
        for (const change of changes)
          if (!listed.has(change.id)) resources.invalidateChange(current, change.id);
        changes = changes.filter((change) => listed.has(change.id));
        staleIds = new Set([...staleIds].filter((id) => listed.has(id)));
        unavailableIds = new Set(
          [...unavailableIds].filter((id) => listed.has(id) || id === selectedChange?.id),
        );
        failures = failures.filter((item) => listed.has(item.id));
        listedCount = listing.changes.length;
        completedTasks = listing.changes.reduce((count, entry) => count + entry.completedTasks, 0);
        totalTasks = listing.changes.reduce((count, entry) => count + entry.totalTasks, 0);
        pendingSummaries = listedCount;
        settled = true;
        render();
        const summaryRequest = client.summaries(current, listing.changes);
        if (checkFocus) claimFocus();
        const summaries = await summaryRequest;
        if (epoch !== startingEpoch || scope !== current || operation !== boardOperation) return;
        for (const entry of summaries) {
          try {
            if ("error" in entry) throw entry.error;
            const summary = entry.summary;
            if (epoch !== startingEpoch || scope !== current || operation !== boardOperation)
              return;
            const derived = deriveChange(summary);
            changes = [...changes.filter((item) => item.id !== derived.id), derived].sort((a, b) =>
              a.id.localeCompare(b.id),
            );
            unavailableIds.delete(derived.id);
            if (selectedChange?.id === derived.id) {
              selectedChange = derived;
              if (refresh) {
                const owner = taskArtifact(derived);
                const valid = derived.artifacts.some(
                  (item) => item.id === (activeView === "tasks" ? owner : selectedArtifact),
                );
                if (!valid) {
                  const first = derived.artifacts.find(
                    (item) =>
                      item.id !== owner &&
                      derived.documents?.some((document) => document.artifactId === item.id),
                  );
                  selectedArtifact = first?.id ?? derived.artifacts[0]?.id ?? "";
                  activeView =
                    selectedArtifact === owner || !selectedArtifact ? "tasks" : "document";
                }
                startContent(derived);
              }
            }
            staleIds.delete(derived.id);
            failures = failures.filter((item) => item.id !== derived.id);
            if (
              pendingInspection?.scope === current &&
              pendingInspection.epoch === epoch &&
              operation >= pendingInspection.minOperation &&
              pendingInspection.name === derived.id
            ) {
              pendingInspection = null;
              openDetail(derived, current, epoch);
            }
          } catch (caught) {
            if (epoch !== startingEpoch || scope !== current || operation !== boardOperation)
              return;
            if (caught instanceof ServiceRequestError && caught.code === "PLANNING_CHANGED") {
              planningChanged();
              return;
            }
            if (caught instanceof ServiceRequestError && caught.code === "ROOT_CHANGED") {
              invalidate();
              loadBoard({ workflows: true });
              return;
            }
            failures = [
              ...failures.filter((item) => item.id !== entry.id),
              {
                id: entry.id,
                error: caught instanceof Error ? caught.message : "Change could not be read.",
              },
            ];
            if (changes.some((item) => item.id === entry.id)) staleIds.add(entry.id);
            if (caught instanceof ServiceRequestError && caught.code === "CHANGE_UNAVAILABLE")
              unavailableIds.add(entry.id);
            if (pendingInspection?.scope === current && pendingInspection.name === entry.id)
              pendingInspection = null;
          }
        }
        pendingSummaries = 0;
        render();
      } catch (caught) {
        if (
          directory !== currentDirectory ||
          epoch !== startingEpoch ||
          operation !== boardOperation
        )
          return;
        if (caught instanceof ServiceRequestError && caught.code === "PLANNING_CHANGED") {
          planningChanged();
          return;
        }
        if (caught instanceof ServiceRequestError && caught.code === "ROOT_CHANGED") {
          invalidate();
          loadBoard({ workflows: true });
          return;
        }
        pendingSummaries = 0;
        staleIds = new Set(changes.map((change) => change.id));
        errorMessage = caught instanceof Error ? caught.message : "The board could not be loaded.";
      } finally {
        if (
          epoch === startingEpoch &&
          directory === currentDirectory &&
          operation === boardOperation
        ) {
          loading = false;
          boardActive = false;
          render();
          if (reconcileQueued) {
            reconcileQueued = false;
            loadBoard({ refresh: true });
          }
          applyFocus();
        }
      }
    })();
  }

  function clearBrowse(resetSelection: boolean) {
    archivedState = specsState = specState = null;
    returningToSpec = null;
    if (resetSelection) {
      selectedSpec = null;
      specListScroll = 0;
    }
  }

  function readBrowse() {
    if (!scope || selectedChange) return;
    if (boardTab === "archived" && !archivedState) readArchived(scope);
    else if (boardTab === "specs") {
      if (selectedSpec) {
        if (!specState) readSpec(scope, selectedSpec);
      } else if (!specsState) readSpecs(scope);
    }
  }

  function readArchived(captured: Scope) {
    const read = resources.archived(captured);
    archivedState = read.state;
    if (read.completion)
      void read.completion.then((state) => {
        if (disposed || scope !== captured || archivedState !== read.state) return;
        archivedState = state;
        render();
      });
  }

  function readSpecs(captured: Scope) {
    const read = resources.specs(captured);
    specsState = read.state;
    if (read.completion)
      void read.completion.then((state) => {
        if (disposed || scope !== captured || specsState !== read.state) return;
        specsState = state;
        render();
        restoreSpecList();
      });
  }

  function readSpec(captured: Scope, id: string, retry = false) {
    const read = resources.spec(captured, id, retry);
    specState = read.state;
    if (read.completion)
      void read.completion.then((state) => {
        if (disposed || scope !== captured || selectedSpec !== id || specState !== read.state)
          return;
        specState = state;
        render();
      });
  }

  async function preparePrompt(
    change: DerivedChange,
    captured: Scope | null,
    originatingEpoch: number,
    intent: PrimaryIntent | "verify" | "explore",
    originatingSession: string | null = sessionId,
  ) {
    const current = changes.find((item) => item.id === change.id);
    if (
      !captured ||
      scope !== captured ||
      epoch !== originatingEpoch ||
      sessionId !== originatingSession ||
      unavailableIds.has(change.id) ||
      !current ||
      current.stage !== change.stage ||
      (intent === "verify" && (current.stage !== "complete" || !workflows.has("verify"))) ||
      (intent === "explore" && current.stage !== "planning")
    )
      return;
    if (intent === "worktree") {
      if (current.stage !== "ready" && current.stage !== "progress") return;
      await runInWorktree(change, captured, originatingEpoch);
      return;
    }
    const expectedSession = sessionId;
    const currentContext = () =>
      scope === captured && epoch === originatingEpoch && sessionId === expectedSession;
    try {
      const text =
        intent === "ff" || intent === "continue"
          ? planningPrompt(change, intent)
          : actionPrompt(change, intent === "verify" || intent === "explore" ? intent : "primary");
      await host.compose({ text, mode: "replace" });
      if (!currentContext()) return;
      if (expectedSession !== null)
        void appendTrackedChange(host, expectedSession, change.id, currentContext, async () => {
          const project = await findProject(host, captured.directory);
          if (!project || !currentContext()) return [];
          return resolveSessionChanges(
            expectedSession,
            await host.listSessions(project.id),
            null,
            listedIds,
          );
        });
      await host.toast({
        kind: "success",
        message: "Workflow prompt prepared in the open composer.",
      });
    } catch (caught) {
      if (!currentContext()) return;
      await host.toast({
        kind: "error",
        message:
          caught instanceof HostRequestError
            ? caught.message
            : "The workflow prompt could not be prepared.",
      });
    }
  }

  async function runInWorktree(change: DerivedChange, captured: Scope, originatingEpoch: number) {
    const key = worktreeKey(captured, change.id);
    if (worktreePending.has(key)) return;
    const expectedSession = sessionId;
    const current = () =>
      !disposed &&
      scope === captured &&
      epoch === originatingEpoch &&
      sessionId === expectedSession &&
      !unavailableIds.has(change.id) &&
      changes.some((item) => item.id === change.id && item.stage === change.stage);
    worktreePending.add(key);
    render();
    let dispatched = false;
    let knownSession: string | null = null;
    try {
      const project = await inspectWorktreeDestination(host, captured.directory, change.id);
      if (!current()) return;
      const listing = await client.list(captured.directory, captured.root, captured.planning);
      if (!current()) return;
      const listed = listing.changes.find((item) => item.id === change.id);
      if (!listed || (listed.totalTasks > 0 && listed.completedTasks === listed.totalTasks))
        throw new Error("This change is no longer applicable. Refresh before starting Apply.");
      dispatched = true;
      const result = await host.startSession({
        providerId: "openspec-board",
        id: change.id,
        data: { kind: "change", change: change.id },
        title: `Apply ${change.id}`,
        url: "https://openspec.dev/docs/quickstart",
        projectId: project.id,
        worktree: { kind: "new", name: change.id },
        navigation: "preserve",
        text: actionPrompt(change, "primary"),
      });
      knownSession = result.sessionId;
      if (!current()) return;
      const resource = result.worktree
        ? ` Worktree ${result.worktree.name} at ${result.worktree.directory} is retained.`
        : "";
      if (!result.sessionId || result.sent !== "sent") {
        await host.toast({
          kind: "error",
          persistent: true,
          message: result.sessionId
            ? `Session ${result.sessionId} exists, but Apply submission was not confirmed (${result.sent}).${resource} Inspect it before another attempt.`
            : `Apply creation failed (${"failure" in result ? result.failure : "unknown"}).${resource} Inspect worktrees and sessions before another attempt.`,
        });
        return;
      }
      if (
        !result.directory ||
        !result.worktree ||
        result.worktree.name !== change.id ||
        result.worktree.directory !== result.directory
      ) {
        await host.toast({
          kind: "error",
          persistent: true,
          message: `Session ${result.sessionId} was returned with an unexpected worktree result.${resource} Inspect it before another attempt.`,
        });
        return;
      }
      await host.toast({
        kind: result.linked === false ? "info" : "success",
        message: `Apply submitted in session ${result.sessionId}.${result.linked === false ? " Its workflow reference could not be saved." : ""}`,
      });
      if (current()) await host.openSession(result.sessionId);
    } catch (caught) {
      if (!current()) return;
      await host.toast({
        kind: "error",
        persistent: dispatched,
        message: knownSession
          ? `Apply session ${knownSession} exists, but it could not be opened. Inspect that session; submission will not be repeated.`
          : dispatched
            ? `Apply launch outcome is uncertain. A worktree, session or sent prompt may already exist. Inspect worktrees and sessions before another attempt; this launch will not be retried automatically. ${caught instanceof Error ? caught.message : ""}`
            : caught instanceof Error
              ? caught.message
              : "Worktree inspection failed. No creation was requested.",
      });
    } finally {
      worktreePending.delete(key);
      if (!disposed) render();
    }
  }

  function applyContentError(state: ReadState<unknown> | null, captured: Scope, change: string) {
    if (!(state?.error instanceof ServiceRequestError)) return false;
    if (state.error.code === "PLANNING_CHANGED") {
      planningChanged();
      return true;
    }
    if (state.error.code === "ROOT_CHANGED") {
      invalidate();
      loadBoard({ workflows: true });
      return true;
    }
    if (state.error.code === "CHANGE_UNAVAILABLE") {
      unavailableIds.add(change);
      return true;
    }
    return false;
  }

  function readTasks(retry = false) {
    if (!scope || !selectedChange || unavailableIds.has(selectedChange.id)) return;
    const captured = scope;
    const change = selectedChange.id;
    const opening = detailOpening;
    const generation = readGeneration;
    const read = resources.tasks(captured, change, retry);
    taskState = read.state;
    if (applyContentError(read.state, captured, change)) {
      render();
      return;
    }
    render();
    if (read.completion)
      void read.completion.then((result) => {
        if (
          scope !== captured ||
          selectedChange?.id !== change ||
          detailOpening !== opening ||
          readGeneration !== generation ||
          unavailableIds.has(change)
        )
          return;
        if (applyContentError(result, captured, change) && scope !== captured) return;
        taskState = result;
        render();
      });
  }

  function readFile(artifact: string, selector: string, retry = false) {
    if (!scope || !selectedChange || unavailableIds.has(selectedChange.id)) return null;
    const captured = scope;
    const change = selectedChange.id;
    const generation = readGeneration;
    const opening = detailOpening;
    const key = documentKey(artifact, selector);
    const read = resources.document(captured, change, artifact, selector, retry);
    files.set(key, read.state);
    if (applyContentError(read.state, captured, change)) {
      render();
      return null;
    }
    render();
    if (read.completion)
      void read.completion.then((result) => {
        if (
          scope !== captured ||
          selectedChange?.id !== change ||
          readGeneration !== generation ||
          detailOpening !== opening ||
          unavailableIds.has(change)
        )
          return;
        if (applyContentError(result, captured, change) && scope !== captured) return;
        files.set(key, result);
        render();
      });
    return read.completion;
  }

  function selectArtifact(artifact: string) {
    if (!selectedChange || !scope) return;
    selectedArtifact = artifact;
    selection++;
    if (taskArtifact(selectedChange) === artifact) {
      activeView = "tasks";
      render();
      return;
    }
    activeView = "document";
    render();
  }

  function startContent(change: DerivedChange) {
    if (!scope || selectedChange?.id !== change.id) return;
    const captured = scope;
    const opening = ++detailOpening;
    const generation = readGeneration;
    const current = () =>
      scope === captured &&
      selectedChange?.id === change.id &&
      detailOpening === opening &&
      readGeneration === generation &&
      !unavailableIds.has(change.id);
    const documents = change.documents ?? [];
    files = new Map(
      documents
        .filter((item) => item.artifactId !== "tasks")
        .map((item) => [
          documentKey(item.artifactId, item.selector),
          resources.documentState(captured, change.id, item.artifactId, item.selector) ?? {
            value: null,
            pending: true,
            error: null,
          },
        ]),
    );
    taskState = resources.taskState(captured, change.id);
    if (applyContentError(taskState, captured, change.id) && scope !== captured) return;
    for (const state of files.values())
      if (applyContentError(state, captured, change.id) && scope !== captured) return;
    render();
    if (unavailableIds.has(change.id)) return;
    readTasks();
    const groups = change.artifacts.filter((item) => item.id !== "tasks");
    const standard = groups.every((item) => ["proposal", "specs", "design"].includes(item.id));
    if (standard)
      groups.sort(
        (a, b) =>
          ["proposal", "specs", "design"].indexOf(a.id) -
          ["proposal", "specs", "design"].indexOf(b.id),
      );
    void (async () => {
      for (const group of groups) {
        if (!current()) return;
        const reads = documents
          .filter((item) => item.artifactId === group.id)
          .map((item) => readFile(group.id, item.selector));
        await Promise.all(reads);
      }
    })();
  }

  function openDetail(change: DerivedChange, captured: Scope | null, originatingEpoch: number) {
    if (
      !captured ||
      scope !== captured ||
      epoch !== originatingEpoch ||
      unavailableIds.has(change.id) ||
      !changes.some((item) => item.id === change.id)
    )
      return;
    selectedSpec = null;
    boardTab = "changes";
    selectedChange = change;
    boardScroll = boardView.scrollForChanges();
    selectedArtifact = "";
    render();
    const first = change.artifacts.find(
      (item) =>
        item.id !== taskArtifact(change) &&
        change.documents?.some((document) => document.artifactId === item.id),
    );
    selectArtifact(first?.id ?? change.artifacts[0]?.id ?? "");
    startContent(change);
    queueMicrotask(() => appRoot.querySelector<HTMLElement>(".detail-back button")?.focus());
  }

  function applyFocus() {
    if (boardActive || !focusedChange) return;
    const target = focusedChange;
    focusedChange = null;
    if (listedIds.has(target.name)) {
      const change = changes.find(({ id }) => id === target.name);
      if (change) openDetail(change, scope, epoch);
    } else if (!target.reloaded) {
      if (selectedChange) closeDetail();
      focusedChange = { name: target.name, reloaded: true };
      loadBoard({ refresh: true });
    } else {
      if (selectedChange) closeDetail();
      void host
        .toast({ kind: "info", message: `${target.name} isn't in this board's list.` })
        .catch((caught: unknown) =>
          console.warn("Could not show the OpenSpec focus notice.", caught),
        );
    }
  }

  function claimFocus() {
    const captured = scope;
    const startingEpoch = epoch;
    if (!captured) {
      checkFocus = true;
      return;
    }
    checkFocus = false;
    void client
      .claimFocus(captured.directory)
      .then((change) => {
        if (!change || disposed || scope !== captured || epoch !== startingEpoch) return;
        focusedChange = { name: change, reloaded: false };
        applyFocus();
      })
      .catch((caught: unknown) =>
        console.warn("Could not claim the OpenSpec board focus.", caught),
      );
  }

  const createView = mountCreateDialog(client, {
    current: () => scope,
    created: (origin) => {
      if (
        scope?.directory === origin.directory &&
        scope.root === origin.root &&
        scope.planning === origin.planning
      )
        loadBoard({ refresh: true, reconcile: true });
    },
    inspect: (origin, name) => {
      if (
        scope?.directory !== origin.directory ||
        scope.root !== origin.root ||
        scope.planning !== origin.planning
      )
        return;
      pendingInspection = { scope, epoch, name, minOperation: boardOperation + 1 };
      loadBoard({ refresh: true, reconcile: true });
    },
  });
  async function openHelp() {
    try {
      await host.openUrl("https://openspec.dev/docs/quickstart");
    } catch (caught) {
      await host.toast({
        kind: "error",
        message: caught instanceof HostRequestError ? caught.message : "Cannot open quickstart",
      });
    }
  }
  function canArchive() {
    return (
      !!scope &&
      !loading &&
      !archivePending &&
      changes.some((change) => change.stage === "complete" && !unavailableIds.has(change.id))
    );
  }
  async function startArchive() {
    if (!canArchive()) return;
    const captured = scope;
    const originatingEpoch = epoch;
    const expectedSession = sessionId;
    const current = () =>
      scope === captured && epoch === originatingEpoch && sessionId === expectedSession;
    archivePending = true;
    render();
    try {
      const result = await host.startSession({
        providerId: "openspec-board",
        id: "archive-all",
        data: { kind: "archive-all" },
        title: "Archive completed OpenSpec changes",
        url: "https://openspec.dev/docs/quickstart",
        navigation: "preserve",
        text: archiveAllPrompt(workflows),
      });
      if (!current()) return;
      if (result.sessionId && result.sent === "sent") {
        await host.toast({
          kind: result.linked !== false ? "success" : "info",
          message:
            result.linked !== false
              ? `Archive prompt submitted in session ${result.sessionId}. Use refresh to see updates.`
              : `Archive prompt submitted in session ${result.sessionId}, but its workflow reference could not be saved.`,
        });
      } else {
        const reason =
          result.sent === "no-model" ? "No model was available." : `Submission ${result.sent}.`;
        await host.toast({
          kind: "error",
          persistent: true,
          message: result.sessionId
            ? `Session ${result.sessionId} exists, but the archive prompt was not submitted successfully. ${reason} Inspect this session before starting again.${result.linked === false ? " Its workflow reference was not saved." : ""}`
            : "The archive session could not be created. Inspect sessions before starting again.",
        });
      }
    } catch (caught) {
      if (!current()) return;
      const knownRefusal =
        caught instanceof HostRequestError &&
        ["NOT_GRANTED", "DISABLED", "NO_DIRECTORY", "HOST_REJECTED", "HOST_UNAVAILABLE"].includes(
          caught.code,
        );
      await host.toast({
        kind: "error",
        persistent: !knownRefusal,
        message: knownRefusal
          ? `Archive launch failed: ${caught.message}`
          : "Archive launch outcome is uncertain. A session or submitted prompt may already exist. Inspect sessions before starting again; this launch will not be retried automatically.",
      });
    } finally {
      archivePending = false;
      if (!disposed) render();
    }
  }
  const archiveView = mountArchiveDialog(appRoot, {
    current: () => scope,
    canStart: canArchive,
    start: () => {
      void startArchive().catch(() => {});
    },
  });
  const boardView = mountBoardView(appRoot, {
    archive: () => archiveView.open(),
    help: () => void openHelp(),
    create: () => {
      if (scope) createView.open();
    },
    retry: () => loadBoard({ refresh: true, workflows: true }),
    search: (value) => {
      search = value;
      render();
    },
    select: (view) => {
      boardTab = view;
      returningToSpec = null;
      readBrowse();
      render();
    },
    openSpec: (id) => {
      if (!scope || boardTab !== "specs" || !specsState?.value?.some((item) => item.id === id))
        return;
      specListScroll = window.scrollY;
      selectedSpec = id;
      readSpec(scope, id);
      render();
      specView?.focusBack();
    },
  });
  const detailRoot = document.createElement("div");
  appRoot.append(detailRoot);
  let specView: ReturnType<typeof mountSpecView> | null = null;
  const specCallbacks = {
    close: () => {
      returningToSpec = selectedSpec;
      selectedSpec = null;
      specState = null;
      readBrowse();
      render();
      restoreSpecList();
    },
    refresh: () => loadBoard({ refresh: true, workflows: true }),
    retry: () => {
      if (!scope || !selectedSpec) return;
      if (!specState && errorMessage) loadBoard({ refresh: true, workflows: true });
      else {
        readSpec(scope, selectedSpec, true);
        render();
      }
    },
    openUrl: openDocumentLink,
  };
  const deleteView = mountDeleteDialog(appRoot, client, {
    current: () =>
      selectedChange && scope ? { scope, epoch, selection, name: selectedChange.id } : null,
    removed: (attempt) => {
      if (scope !== attempt.scope || epoch !== attempt.epoch || selectedChange?.id !== attempt.name)
        return;
      boardOperation++;
      boardActive = false;
      reconcileQueued = false;
      pendingSummaries = 0;
      selection++;
      detailOpening++;
      selectedChange = null;
      changes = changes.filter((change) => change.id !== attempt.name);
      unavailableIds.add(attempt.name);
      staleIds.delete(attempt.name);
      failures = failures.filter((item) => item.id !== attempt.name);
      if (pendingInspection?.name === attempt.name) pendingInspection = null;
      resources.invalidateChange(attempt.scope, attempt.name);
      render();
      loadBoard({ refresh: true, reconcile: true });
      queueMicrotask(() => focusBoard());
    },
  });
  const detailView = mountDetailView(detailRoot, {
    copyName: () => {
      const name = selectedChange?.id;
      if (!name) return;
      void (async () => {
        try {
          await host.writeClipboard(name);
        } catch (caught) {
          await host.toast({
            kind: "error",
            message:
              caught instanceof HostRequestError ? caught.message : "Could not copy change name",
          });
          return;
        }
        await host.toast({ kind: "success", message: "Change name copied" });
      })().catch(() => {});
    },
    openUrl: openDocumentLink,
    refresh: () => loadBoard({ refresh: true, workflows: true }),
    delete: () => {
      if (scope && selectedChange && !unavailableIds.has(selectedChange.id))
        deleteView.open({ scope, epoch, selection, name: selectedChange.id });
    },
    close: closeDetail,
    selectArtifact,
    selectTasks: () => {
      selectedArtifact = taskArtifact(selectedChange!) ?? "";
      selection++;
      activeView = "tasks";
      render();
    },
    retryTasks: () => readTasks(true),
    retryDocument: (artifact, selector) => {
      void readFile(artifact, selector, true);
    },
    action: (intent) => {
      if (selectedChange) void preparePrompt(selectedChange, scope, epoch, intent);
    },
  });

  function openDocumentLink(url: string) {
    void host
      .openUrl(url)
      .catch(async (caught: unknown) => {
        await host.toast({
          kind: "error",
          message:
            caught instanceof HostRequestError ? caught.message : "Cannot open document link",
        });
      })
      .catch(() => {});
  }

  function restoreSpecList() {
    const id = returningToSpec;
    if (!id || specsState?.pending || boardTab !== "specs" || selectedSpec || selectedChange)
      return;
    returningToSpec = null;
    boardView.focusSpec(id);
    window.scrollTo(0, specListScroll);
  }

  function closeDetail() {
    const name = selectedChange?.id;
    selection++;
    detailOpening++;
    selectedChange = null;
    render();
    requestAnimationFrame(() => window.scrollTo(0, boardScroll));
    queueMicrotask(() => focusBoard(name));
  }

  function focusBoard(name?: string) {
    const opener = name
      ? [...appRoot.querySelectorAll<HTMLButtonElement>(".card-main")].find(
          (button) => button.textContent === name,
        )
      : undefined;
    const fallback =
      document.documentElement.dataset.pointer === "coarse"
        ? ".new-change-control button"
        : 'input[aria-label="Search changes"]';
    (opener ?? appRoot.querySelector<HTMLElement>(fallback))?.focus();
  }

  function render() {
    const originatingSession = sessionId;
    const detailChange = selectedChange;
    createView.update();
    deleteView.update();
    archiveView.update();
    const captured = scope;
    const originatingEpoch = epoch;
    boardView.update({
      directory,
      canCreate: !!scope,
      canArchive: canArchive(),
      archivePending,
      search,
      listedCount,
      completedTasks,
      totalTasks,
      pendingSummaries,
      loading,
      settled,
      error: errorMessage,
      failures,
      workflows,
      view: boardTab,
      archived: archivedState,
      specs: specsState,
      cards: changes.map((change) => ({
        change,
        stale: staleIds.has(change.id),
        unavailable: unavailableIds.has(change.id),
        pending: !!captured && worktreePending.has(worktreeKey(captured, change.id)),
        open: () =>
          openDetail(
            changes.find((item) => item.id === change.id) ?? change,
            captured,
            originatingEpoch,
          ),
        action: (intent) =>
          void preparePrompt(change, captured, originatingEpoch, intent, originatingSession),
      })),
    });
    boardView.setVisible(!selectedChange && !selectedSpec);
    if (selectedSpec) {
      specView ??= mountSpecView(appRoot, specCallbacks);
      specView.update(selectedSpec, specState, loading, errorMessage);
    } else if (specView) {
      specView.dispose();
      specView = null;
    }
    detailView.update(
      selectedChange
        ? {
            change: selectedChange,
            workflows,
            selectedArtifact,
            activeView,
            files,
            tasks: taskState,
            unavailable: unavailableIds.has(selectedChange.id),
            pending: !!captured && worktreePending.has(worktreeKey(captured, selectedChange.id)),
            loading,
            refreshError:
              errorMessage ??
              failures.find((item) => item.id === selectedChange?.id)?.error ??
              null,
            primaryAction: (intent) => {
              if (detailChange)
                void preparePrompt(
                  detailChange,
                  captured,
                  originatingEpoch,
                  intent,
                  originatingSession,
                );
            },
          }
        : null,
    );
  }

  const offServiceEvent = host.onServiceEvent(({ topic }) => {
    if (topic === "focus" && document.visibilityState === "visible") claimFocus();
  });
  const offReady = host.onReady((ready) => {
    const changed = directory !== ready.directory;
    directory = ready.directory;
    sessionId = ready.session?.id ?? null;
    if (changed) {
      invalidate();
      loadBoard({ workflows: true });
    } else render();
  });
  const offDirectory = host.onDirectory((nextDirectory) => {
    if (directory === nextDirectory) return;
    directory = nextDirectory;
    invalidate();
    loadBoard({ workflows: true });
  });
  const offSession = host.onSession((nextSession) => {
    sessionId = nextSession?.id ?? null;
    render();
  });
  return () => {
    disposed = true;
    epoch++;
    selection++;
    detailOpening++;
    offReady();
    offDirectory();
    offSession();
    offServiceEvent();
    resources.dispose();
    boardView.dispose();
    specView?.dispose();
    detailView.dispose();
    deleteView.dispose();
    createView.dispose();
    archiveView.dispose();
    detailRoot.remove();
  };
}
