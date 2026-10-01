import { HostRequestError, type HostClient } from "@openchamber/sdk";
import { deriveChange, type DerivedChange } from "../model.js";
import { documentKey, type Task } from "../contracts.js";
import { createClient, ServiceRequestError, type Scope } from "./client.js";
import { createResources, type ReadState } from "./resources.js";
import { mountBoardView } from "./board-view.js";
import { mountDetailView, taskArtifact } from "./detail-view.js";
import { mountCreateDialog } from "./create-dialog.js";
import { mountDeleteDialog } from "./delete-dialog.js";

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
  let selectedChange: DerivedChange | null = null;
  let selectedArtifact = "";
  let activeView: "document" | "tasks" = "document";
  let taskState: ReadState<Task[]> | null = null;
  let files = new Map<string, ReadState<string>>();
  let selection = 0;
  let detailOpening = 0;
  let readGeneration = 0;
  let boardScroll = 0;

  function invalidate() {
    epoch++;
    boardOperation++;
    boardActive = false;
    reconcileQueued = false;
    pendingInspection = null;
    scope = null;
    resources.setContext(null);
    changes = [];
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
    errorMessage = null;
    render();
  }

  function loadBoard(refresh = false, reconcile = false) {
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
      resources.refresh();
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
        const listing = await client.list(currentDirectory);
        if (
          directory !== currentDirectory ||
          epoch !== startingEpoch ||
          operation !== boardOperation
        )
          return;
        if (scope && scope.root !== listing.root) {
          invalidate();
          loadBoard();
          return;
        }
        scope =
          scope?.root === listing.root
            ? scope
            : { directory: currentDirectory, root: listing.root };
        const current = scope;
        resources.setContext(current);
        const listed = new Set(listing.changes.map((entry) => entry.id));
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
        let next = 0;
        async function worker() {
          while (
            next < listing.changes.length &&
            epoch === startingEpoch &&
            scope === current &&
            operation === boardOperation
          ) {
            const entry = listing.changes[next++];
            try {
              const summary = await client.summary(current, entry);
              if (epoch !== startingEpoch || scope !== current || operation !== boardOperation)
                return;
              const derived = deriveChange(summary);
              changes = [...changes.filter((item) => item.id !== derived.id), derived].sort(
                (a, b) => a.id.localeCompare(b.id),
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
              if (caught instanceof ServiceRequestError && caught.code === "ROOT_CHANGED") {
                invalidate();
                loadBoard();
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
            } finally {
              if (epoch === startingEpoch && scope === current && operation === boardOperation) {
                pendingSummaries--;
                render();
              }
            }
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(3, listing.changes.length) }, () => worker()),
        );
      } catch (caught) {
        if (
          directory !== currentDirectory ||
          epoch !== startingEpoch ||
          operation !== boardOperation
        )
          return;
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
            loadBoard(true);
          }
        }
      }
    })();
  }

  function actionPrompt(change: DerivedChange, intent: "primary" | "verify" | "explore"): string {
    const target = `OpenSpec change "${change.id}"`;
    const goal = change.goal?.trim() ? `\nGoal: ${change.goal}` : "";
    if (intent === "explore")
      return `/openspec-explore ${change.id}${goal}\n\nInvestigate the goal, relevant code, options and trade-offs for ${target}. Discuss findings without file changes or implementation. If no goal is recorded, inspect existing context and ask the user to clarify it if necessary; do not invent a goal.`;
    if (change.stage === "planning")
      return `/openspec-propose ${change.id} (existing change)${goal}\n\nInspect ${target}'s status and current metadata. Preserve existing decisions and any recorded goal; only if current metadata has no goal, establish and record a concise goal from existing change context. Ask the user for clarification if the goal is unclear. Finish planning this existing scaffold and complete missing planning artefacts using OpenSpec's artefact instructions. Do not create another change or implement code. If the skill requires new-change creation, explain the conflict rather than creating another change.`;
    if (change.stage === "ready" || change.stage === "progress") {
      const progress =
        change.stage === "progress"
          ? `\n${change.completedTasks} of ${change.totalTasks} tasks complete. Pick up where implementation left off and complete the remaining tasks.`
          : "";
      return `/openspec-apply-change ${change.id}${progress}\n\nComplete all remaining tasks in ${target}, then verify the implementation against its change artefacts. Resolve any issues found and verify again until all tasks are complete and verification passes. If blocked, report the blocker rather than marking unfinished work complete.`;
    }
    if (intent === "verify") return `/openspec-verify-change ${change.id}`;
    return `/openspec-archive-change ${change.id}`;
  }

  async function preparePrompt(
    change: DerivedChange,
    captured: Scope | null,
    originatingEpoch: number,
    intent: "primary" | "verify" | "explore",
  ) {
    const current = changes.find((item) => item.id === change.id);
    if (
      !captured ||
      scope !== captured ||
      epoch !== originatingEpoch ||
      unavailableIds.has(change.id) ||
      !current ||
      (intent === "verify" && current.stage !== "complete") ||
      (intent === "explore" && current.stage !== "planning") ||
      (intent === "primary" && current.stage !== change.stage)
    )
      return;
    const expectedSession = sessionId;
    try {
      await host.compose({ text: actionPrompt(change, intent), mode: "replace" });
      if (scope !== captured || epoch !== originatingEpoch || sessionId !== expectedSession) return;
      await host.toast({
        kind: "success",
        message: "Workflow prompt prepared in the open composer.",
      });
    } catch (caught) {
      if (scope !== captured || epoch !== originatingEpoch || sessionId !== expectedSession) return;
      await host.toast({
        kind: "error",
        message:
          caught instanceof HostRequestError
            ? caught.message
            : "The workflow prompt could not be prepared.",
      });
    }
  }

  function applyContentError(state: ReadState<unknown> | null, captured: Scope, change: string) {
    if (!(state?.error instanceof ServiceRequestError)) return false;
    if (state.error.code === "ROOT_CHANGED") {
      invalidate();
      loadBoard();
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
    selectedChange = change;
    boardScroll = window.scrollY;
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

  const createView = mountCreateDialog(client, {
    current: () => scope,
    created: (origin) => {
      if (scope?.directory === origin.directory && scope.root === origin.root)
        loadBoard(true, true);
    },
    inspect: (origin, name) => {
      if (scope?.directory !== origin.directory || scope.root !== origin.root) return;
      pendingInspection = { scope, epoch, name, minOperation: boardOperation + 1 };
      loadBoard(true, true);
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
  const boardView = mountBoardView(appRoot, {
    help: () => void openHelp(),
    create: () => {
      if (scope) createView.open();
    },
    retry: () => loadBoard(true),
    search: (value) => {
      search = value;
      render();
    },
  });
  const detailRoot = document.createElement("div");
  appRoot.append(detailRoot);
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
      loadBoard(true, true);
      queueMicrotask(() =>
        appRoot.querySelector<HTMLInputElement>('input[aria-label="Search changes"]')?.focus(),
      );
    },
  });
  const detailView = mountDetailView(detailRoot, {
    openUrl: (url) => {
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
    },
    refresh: () => loadBoard(true),
    delete: () => {
      if (scope && selectedChange && !unavailableIds.has(selectedChange.id))
        deleteView.open({ scope, epoch, selection, name: selectedChange.id });
    },
    close: () => {
      const name = selectedChange?.id;
      selection++;
      detailOpening++;
      selectedChange = null;
      render();
      requestAnimationFrame(() => window.scrollTo(0, boardScroll));
      queueMicrotask(() => {
        const opener = [...appRoot.querySelectorAll<HTMLButtonElement>(".card-main")].find(
          (button) => button.textContent === name,
        );
        (
          opener ?? appRoot.querySelector<HTMLInputElement>('input[aria-label="Search changes"]')
        )?.focus();
      });
    },
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

  function render() {
    createView.update();
    deleteView.update();
    const captured = scope;
    const originatingEpoch = epoch;
    boardView.update({
      directory,
      canCreate: !!scope,
      search,
      listedCount,
      completedTasks,
      totalTasks,
      pendingSummaries,
      loading,
      settled,
      error: errorMessage,
      failures,
      cards: changes.map((change) => ({
        change,
        stale: staleIds.has(change.id),
        unavailable: unavailableIds.has(change.id),
        open: () =>
          openDetail(
            changes.find((item) => item.id === change.id) ?? change,
            captured,
            originatingEpoch,
          ),
        action: (intent) =>
          void preparePrompt(
            changes.find((item) => item.id === change.id) ?? change,
            captured,
            originatingEpoch,
            intent,
          ),
      })),
    });
    boardView.setVisible(!selectedChange);
    detailView.update(
      selectedChange
        ? {
            change: selectedChange,
            selectedArtifact,
            activeView,
            files,
            tasks: taskState,
            unavailable: unavailableIds.has(selectedChange.id),
            loading,
            refreshError:
              errorMessage ??
              failures.find((item) => item.id === selectedChange?.id)?.error ??
              null,
          }
        : null,
    );
  }

  const offReady = host.onReady((ready) => {
    const changed = directory !== ready.directory;
    directory = ready.directory;
    sessionId = ready.session?.id ?? null;
    if (changed) {
      invalidate();
      loadBoard();
    } else render();
  });
  const offDirectory = host.onDirectory((nextDirectory) => {
    if (directory === nextDirectory) return;
    directory = nextDirectory;
    invalidate();
    loadBoard();
  });
  const offSession = host.onSession((nextSession) => {
    sessionId = nextSession?.id ?? null;
  });
  return () => {
    epoch++;
    selection++;
    detailOpening++;
    offReady();
    offDirectory();
    offSession();
    resources.dispose();
    boardView.dispose();
    detailView.dispose();
    deleteView.dispose();
    createView.dispose();
    detailRoot.remove();
  };
}
