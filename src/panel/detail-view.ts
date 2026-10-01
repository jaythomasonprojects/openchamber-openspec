import { mountBadge, mountButton, mountTabs } from "@openchamber/sdk/ui";
import { documentKey, type DocumentDescriptor, type Task } from "../contracts.js";
import type { DerivedChange } from "../model.js";
import type { ReadState } from "./resources.js";
import { mountDocumentView } from "./document-view.js";
import { mountTasksView } from "./tasks-view.js";
import { stageLabel, workflowLabel } from "./workflow.js";
import { addButtonIcon } from "./button-icon.js";
import { mountAreaBadges } from "./area-badges.js";
import { documentFormat } from "./document-renderer.js";

export type DetailState = {
  change: DerivedChange;
  selectedArtifact: string;
  activeView: "document" | "tasks";
  files: Map<string, ReadState<string>>;
  tasks: ReadState<Task[]> | null;
  unavailable: boolean;
  loading: boolean;
  refreshError: string | null;
};

const tones = {
  planning: "neutral",
  ready: "info",
  progress: "primary",
  complete: "success",
} as const;
const artifactLabels: Record<string, string> = {
  proposal: "Proposal",
  specs: "Specs",
  design: "Design",
  tasks: "Tasks",
};
const readiness = {
  done: "Written",
  ready: "Ready to write",
  blocked: "Blocked",
  skipped: "Skipped",
} as const;
const tabId = (id: string) => `artifact:${id}`;
const fallbackId = "tasks:fallback";

export function taskArtifact(change: DerivedChange): string | null {
  return change.artifacts.some((artifact) => artifact.id === "tasks") ? "tasks" : null;
}

export function mountDetailView(
  root: HTMLElement,
  callbacks: {
    close: () => void;
    selectArtifact: (artifact: string) => void;
    selectTasks: () => void;
    retryTasks: () => void;
    retryDocument: (artifact: string, selector: string) => void;
    action: (intent: "primary" | "verify" | "explore") => void;
    delete: () => void;
    refresh: () => void;
    openUrl: (url: string) => void;
  },
) {
  const shell = document.createElement("section");
  shell.className = "detail";
  shell.hidden = true;
  const header = document.createElement("header");
  header.className = "detail-header";
  const body = document.createElement("div");
  body.className = "view-body detail-body";
  const titleRow = document.createElement("div");
  titleRow.className = "detail-title-row";
  const backRoot = document.createElement("span");
  backRoot.className = "detail-back";
  const back = mountButton(backRoot, {
    label: "",
    variant: "ghost",
    size: "sm",
    onClick: callbacks.close,
  });
  const backButton = backRoot.querySelector("button")!;
  const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  chevron.setAttribute("viewBox", "0 0 24 24");
  chevron.setAttribute("width", "16");
  chevron.setAttribute("height", "16");
  chevron.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m15 5-7 7 7 7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  chevron.append(path);
  backButton.prepend(chevron);
  backButton.setAttribute("aria-label", "Back to changes");
  backButton.title = "Back to changes";
  const title = document.createElement("h1");
  title.id = "change-detail-title";
  shell.setAttribute("aria-labelledby", title.id);
  const titleGroup = document.createElement("div");
  titleGroup.className = "detail-title-group";
  titleGroup.append(title);
  const areas = mountAreaBadges(titleGroup);
  titleRow.append(backRoot, titleGroup);
  const headingActions = document.createElement("div");
  headingActions.className = "detail-heading-actions";
  const refreshRoot = document.createElement("span");
  refreshRoot.className = "refresh-control";
  const refresh = mountButton(refreshRoot, {
    label: "refresh",
    variant: "ghost",
    size: "sm",
    onClick: callbacks.refresh,
  });
  addButtonIcon(refreshRoot, "refresh");
  const deleteRoot = document.createElement("span");
  deleteRoot.className = "detail-delete";
  const deleteAction = mountButton(deleteRoot, {
    label: "delete",
    variant: "destructive",
    size: "sm",
    onClick: callbacks.delete,
  });
  const deleteButton = deleteRoot.querySelector("button")!;
  deleteButton.setAttribute("aria-label", "Delete change");
  deleteButton.title = "Delete change";
  addButtonIcon(deleteRoot, "delete");
  headingActions.append(refreshRoot, deleteRoot);
  const goal = document.createElement("p");
  goal.className = "goal";
  goal.setAttribute("role", "region");
  goal.setAttribute("aria-label", "Recorded objective");
  goal.tabIndex = 0;
  const stage = document.createElement("div");
  stage.className = "stage-label";
  const stageBadge = mountBadge(stage, { label: "Planning", tone: "neutral" });
  titleRow.append(stage);
  const unavailable = document.createElement("p");
  unavailable.className = "notice error detail-issue";
  const refreshIssue = document.createElement("div");
  refreshIssue.className = "notice error detail-refresh-issue";
  const refreshMessage = document.createElement("span");
  const retryRoot = document.createElement("span");
  const retry = mountButton(retryRoot, {
    label: "Retry",
    variant: "secondary",
    size: "sm",
    onClick: callbacks.refresh,
  });
  refreshIssue.append(refreshMessage, retryRoot);
  const tabs = document.createElement("nav");
  tabs.className = "artifact-tabs";
  tabs.setAttribute("aria-label", "Planning artefacts");
  const toolbar = document.createElement("div");
  toolbar.className = "detail-toolbar";
  toolbar.append(tabs, headingActions);
  header.append(titleRow, goal);
  const content = document.createElement("div");
  content.className = "detail-content";
  content.id = "change-detail-panel";
  content.setAttribute("role", "tabpanel");
  content.tabIndex = 0;
  const readinessNote = document.createElement("p");
  readinessNote.className = "readiness-note";
  const documents = document.createElement("section");
  const tasks = document.createElement("section");
  const tasksView = mountTasksView(tasks, callbacks.retryTasks);
  content.append(readinessNote, documents, tasks);
  const footer = document.createElement("footer");
  footer.className = "detail-footer";
  const actionRoot = document.createElement("span");
  const action = mountButton(actionRoot, {
    label: "continue in chat",
    variant: "default",
    size: "sm",
    onClick: () => callbacks.action("primary"),
  });
  const verifyRoot = document.createElement("span");
  const verify = mountButton(verifyRoot, {
    label: "verify",
    variant: "secondary",
    size: "sm",
    onClick: () => callbacks.action("verify"),
  });
  const exploreRoot = document.createElement("span");
  const explore = mountButton(exploreRoot, {
    label: "explore",
    variant: "secondary",
    size: "sm",
    onClick: () => callbacks.action("explore"),
  });
  footer.append(exploreRoot, verifyRoot, actionRoot);
  body.append(toolbar, unavailable, refreshIssue, content);
  shell.append(header, body, footer);
  root.append(shell);
  let currentOwner: string | null = null;
  let tabSignature = "";
  const tabControl = mountTabs(tabs, {
    items: [],
    activeId: "",
    trackBackground: true,
    onChange: (id) => {
      if (id === fallbackId || (id === tabId("tasks") && currentOwner === "tasks"))
        callbacks.selectTasks();
      else if (id.startsWith("artifact:")) callbacks.selectArtifact(id.slice("artifact:".length));
    },
  });
  tabs.querySelector("[role=tablist]")?.setAttribute("aria-label", "Planning artefacts");
  const files = new Map<
    string,
    { node: HTMLDetailsElement; view: ReturnType<typeof mountDocumentView> }
  >();
  let changeId = "";
  let artifactId = "";
  let scrollSelection = "";
  function reset() {
    areas.update([]);
    tasksView.reset();
    tabControl.update({ items: [], activeId: "" });
    tabSignature = "";
    for (const file of files.values()) file.view.dispose();
    files.clear();
    documents.replaceChildren();
    artifactId = "";
    scrollSelection = "";
  }
  function file(descriptor: DocumentDescriptor) {
    const key = documentKey(descriptor.artifactId, descriptor.selector);
    let entry = files.get(key);
    if (!entry) {
      const node = document.createElement("details");
      const summary = document.createElement("summary");
      const path = document.createElement("span");
      path.textContent = descriptor.label;
      const status = document.createElement("span");
      status.className = "document-status";
      summary.append(path, status);
      const body = document.createElement("div");
      const view = mountDocumentView(body, { openUrl: callbacks.openUrl });
      node.append(summary, body);
      node.addEventListener("toggle", () => {
        if (node.open)
          for (const other of files.values()) if (other.node !== node) other.node.open = false;
      });
      entry = { node, view };
      files.set(key, entry);
    }
    return entry;
  }
  return {
    update(state: DetailState | null) {
      shell.hidden = !state;
      if (!state) {
        reset();
        changeId = "";
        return;
      }
      if (changeId !== state.change.id) {
        reset();
        changeId = state.change.id;
      }
      title.textContent = state.change.id;
      areas.update(state.change.affectedAreas);
      goal.textContent = state.change.goal ?? "Goal unavailable";
      stageBadge.update({
        label: stageLabel(state.change.stage),
        tone: tones[state.change.stage],
      });
      unavailable.hidden = !state.unavailable;
      unavailable.textContent = state.unavailable
        ? "This change is no longer available. Refresh or return to the board."
        : "";
      refresh.update({ loading: state.loading });
      refreshMessage.textContent = state.refreshError ?? "";
      refreshIssue.hidden = !state.refreshError;
      retry.update({ disabled: state.loading });
      action.update({ label: workflowLabel(state.change.stage) });
      action.update({ disabled: state.unavailable });
      exploreRoot.hidden = state.change.stage !== "planning";
      explore.update({ disabled: state.unavailable });
      deleteAction.update({ disabled: state.unavailable });
      verifyRoot.hidden = state.change.stage !== "complete";
      verify.update({ disabled: state.unavailable });
      currentOwner = taskArtifact(state.change);
      const items = state.change.artifacts.map((item) => ({
        id: tabId(item.id),
        label: artifactLabels[item.id] ?? item.id,
        count:
          item.id === "specs"
            ? (state.change.documents ?? []).filter((document) => document.artifactId === item.id)
                .length
            : item.id === currentOwner
              ? state.change.totalTasks
              : undefined,
      }));
      if (!currentOwner)
        items.push({ id: fallbackId, label: "Tasks", count: state.change.totalTasks });
      const activeId =
        state.activeView === "tasks"
          ? currentOwner
            ? tabId(currentOwner)
            : fallbackId
          : tabId(state.selectedArtifact);
      const signature = JSON.stringify([items, activeId]);
      if (signature !== tabSignature) {
        const focused = tabs.contains(document.activeElement);
        tabControl.update({ items, activeId });
        tabSignature = signature;
        tabs.querySelectorAll<HTMLElement>("[role=tab]").forEach((tab, index) => {
          tab.id = `change-detail-tab-${index}`;
          tab.setAttribute("aria-controls", content.id);
        });
        if (focused) tabs.querySelector<HTMLElement>('[role=tab][aria-selected="true"]')?.focus();
      }
      tabs.querySelectorAll<HTMLElement>("[role=tab]").forEach((tab, index) => {
        const artifact = state.change.artifacts[index];
        if (!artifact) return;
        const label = `${items[index].label} · ${readiness[artifact.status]}${items[index].count === undefined ? "" : ` ${items[index].count}`}`;
        if (tab.getAttribute("aria-label") !== label) tab.setAttribute("aria-label", label);
      });
      content.setAttribute(
        "aria-labelledby",
        tabs.querySelector('[role=tab][aria-selected="true"]')?.id ?? "",
      );
      const selected = state.change.artifacts.find(
        (item) =>
          item.id === (state.activeView === "tasks" ? currentOwner : state.selectedArtifact),
      );
      const unresolved =
        selected?.requires.filter((id) => {
          const prerequisite = state.change.artifacts.find((item) => item.id === id);
          return (
            prerequisite && prerequisite.status !== "done" && prerequisite.status !== "skipped"
          );
        }) ?? [];
      const readinessMessage =
        selected?.status === "ready"
          ? "Ready to write this artefact. Continue planning in chat."
          : selected?.status === "blocked"
            ? unresolved.length
              ? `Blocked until ${unresolved.join(", ")} is written or skipped.`
              : "Blocked by planning prerequisites; their details are not available."
            : selected?.status === "skipped"
              ? "This artefact was skipped."
              : "";
      documents.hidden = state.activeView === "tasks";
      tasks.hidden = state.activeView !== "tasks";
      if (state.activeView === "tasks" && !state.refreshError)
        tasksView.update(state.tasks, !state.unavailable, readinessMessage);
      const nextScrollSelection = `${state.activeView}:${state.selectedArtifact}`;
      if (scrollSelection !== nextScrollSelection) {
        scrollSelection = nextScrollSelection;
        content.scrollTop = 0;
      }
      if (artifactId !== state.selectedArtifact) {
        artifactId = state.selectedArtifact;
        for (const entry of files.values()) entry.node.open = false;
      }
      const available = (state.change.documents ?? []).filter(
        (item) => item.artifactId === state.selectedArtifact,
      );
      readinessNote.textContent =
        state.activeView === "document" && !state.unavailable && !available.length
          ? readinessMessage ||
            (state.selectedArtifact
              ? "This artefact has no available documents yet."
              : "This change has no available planning documents.")
          : "";
      readinessNote.hidden = !!state.refreshError || !readinessNote.textContent;
      content.hidden = !!state.refreshError;
      const multi = state.selectedArtifact === "specs" || available.length > 1;
      const current = new Set(available.map((item) => documentKey(item.artifactId, item.selector)));
      for (const [key, entry] of files)
        if (!current.has(key)) {
          entry.view.dispose();
          entry.node.remove();
          files.delete(key);
        }
      for (const [index, descriptor] of available.entries()) {
        const key = documentKey(descriptor.artifactId, descriptor.selector);
        const entry = file(descriptor);
        const status = entry.node.querySelector<HTMLElement>("summary .document-status");
        if (status) status.textContent = state.files.get(key)?.error ? " · Read failed" : "";
        const current = state.files.get(key);
        entry.view.update({
          text: current?.value ?? "",
          format: documentFormat(descriptor.selector),
          hasContent: current?.value !== null && !!current,
          status:
            !state.unavailable && !current?.error && current?.value == null
              ? "Loading document…"
              : null,
          error: state.unavailable ? null : (current?.error?.message ?? null),
          retry: () => callbacks.retryDocument(descriptor.artifactId, descriptor.selector),
          canRetry: !state.unavailable,
        });
        entry.node.classList.toggle("single-document", !multi);
        if (!multi) entry.node.open = true;
        if (documents.children[index] !== entry.node)
          documents.insertBefore(entry.node, documents.children[index] ?? null);
      }
    },
    dispose() {
      reset();
      back.dispose();
      refresh.dispose();
      retry.dispose();
      deleteAction.dispose();
      stageBadge.dispose();
      areas.dispose();
      action.dispose();
      explore.dispose();
      verify.dispose();
      tabControl.dispose();
      tasksView.dispose();
      shell.remove();
    },
  };
}
