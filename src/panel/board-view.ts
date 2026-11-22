import { mountButton, mountProgress, mountSearchField, mountTabs } from "@openchamber/sdk/ui";
import type { ArchivedChange, SpecEntry, Workflow } from "../contracts.js";
import type { DerivedChange } from "../model.js";
import { stages, workflowLabel } from "./workflow.js";
import { mountPrimaryAction, type PrimaryIntent } from "./primary-action.js";
import { mountHelpButton } from "./help-button.js";
import { addButtonIcon } from "./button-icon.js";
import { mountAreaBadges } from "./area-badges.js";
import type { ReadState } from "./resources.js";

const views = [
  { id: "changes", label: "Changes" },
  { id: "archived", label: "Archived" },
  { id: "specs", label: "Specs" },
] as const;
export type BoardView = (typeof views)[number]["id"];

export type BoardCard = {
  change: DerivedChange;
  stale: boolean;
  unavailable: boolean;
  open: () => void;
  pending?: boolean;
  action: (intent: PrimaryIntent | "verify" | "explore") => void;
};
export type BoardState = {
  directory: string | null;
  canCreate: boolean;
  canArchive: boolean;
  archivePending: boolean;
  search: string;
  listedCount: number;
  completedTasks: number;
  totalTasks: number;
  pendingSummaries: number;
  loading: boolean;
  settled: boolean;
  error: string | null;
  failures: { id: string; error: string }[];
  cards: BoardCard[];
  workflows: ReadonlySet<Workflow>;
  view: BoardView;
  archived: ReadState<ArchivedChange[]> | null;
  specs: ReadState<SpecEntry[]> | null;
};

export function mountBoardView(
  root: HTMLElement,
  callbacks: {
    create: () => void;
    archive: () => void;
    retry: () => void;
    search: (value: string) => void;
    help: () => void;
    select: (view: BoardView) => void;
    openSpec: (id: string) => void;
  },
) {
  const main = document.createElement("div");
  main.className = "board-shell";
  const header = document.createElement("header");
  header.className = "board-header";
  const body = document.createElement("div");
  body.className = "view-body board-body";
  const heading = document.createElement("div");
  heading.className = "heading";
  const project = document.createElement("h1");
  const headingActions = document.createElement("div");
  headingActions.className = "heading-actions";
  const newChangeRoot = document.createElement("span");
  newChangeRoot.className = "new-change-control";
  const newChange = mountButton(newChangeRoot, {
    label: "new change",
    variant: "default",
    size: "sm",
    disabled: true,
    onClick: callbacks.create,
  });
  addButtonIcon(newChangeRoot, "create");
  const archiveRoot = document.createElement("span");
  const archive = mountButton(archiveRoot, {
    label: "archive all",
    variant: "secondary",
    size: "sm",
    disabled: true,
    onClick: callbacks.archive,
  });
  addButtonIcon(archiveRoot, "archive");
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  const tally = document.createElement("span");
  tally.className = "board-tally";
  const tallyGroup = document.createElement("span");
  tallyGroup.className = "board-tally-group";
  const refreshRoot = document.createElement("span");
  refreshRoot.className = "refresh-control";
  const refresh = mountButton(refreshRoot, {
    label: "refresh",
    variant: "ghost",
    size: "sm",
    onClick: callbacks.retry,
  });
  addButtonIcon(refreshRoot, "refresh");
  const helpRoot = document.createElement("span");
  const help = mountHelpButton(helpRoot, callbacks.help);
  headingActions.append(helpRoot, refreshRoot, archiveRoot, newChangeRoot);
  const searchRoot = document.createElement("span");
  searchRoot.className = "board-search";
  let searchValue = "";
  const search = mountSearchField(searchRoot, {
    value: "",
    placeholder: "Search changes",
    label: "Search changes",
    onChange: (value) => {
      searchValue = value;
      callbacks.search(value);
    },
  });
  tallyGroup.append(tally);
  heading.append(project, tallyGroup);
  toolbar.append(searchRoot, headingActions);
  header.append(heading, toolbar);
  const notices = document.createElement("div");
  notices.className = "board-notices";
  const tabRoot = document.createElement("nav");
  tabRoot.className = "board-tabs";
  let view: BoardView = "changes";
  const tabs = mountTabs(tabRoot, {
    items: [...views],
    activeId: view,
    onChange: (id) => {
      const next = views.find((item) => item.id === id);
      if (next) callbacks.select(next.id);
    },
  });
  const tablist = tabRoot.querySelector('[role="tablist"]')!;
  tablist.setAttribute("aria-label", "OpenSpec views");
  const panes = {
    changes: document.createElement("section"),
    archived: document.createElement("section"),
    specs: document.createElement("section"),
  };
  const positions = new Map<BoardView, { scroll: number; focus: HTMLElement | null }>();
  const syncTabs = () => {
    for (const { id } of views) {
      const pane = panes[id];
      const tab = tablist.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
      tab.id = `board-tab-${id}`;
      tab.setAttribute("aria-controls", pane.id);
      pane.hidden = view !== id;
    }
  };
  for (const { id } of views) {
    const pane = panes[id];
    pane.id = `board-view-${id}`;
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", `board-tab-${id}`);
    pane.addEventListener("focusin", ({ target }) => {
      if (target instanceof HTMLElement)
        positions.set(id, { scroll: window.scrollY, focus: target });
    });
  }
  syncTabs();
  const archivedStatus = document.createElement("div");
  archivedStatus.className = "notice browse-status";
  const archivedMessage = document.createElement("span");
  const archivedRetryRoot = document.createElement("span");
  const archivedRetry = mountButton(archivedRetryRoot, {
    label: "refresh",
    variant: "secondary",
    size: "sm",
    onClick: callbacks.retry,
  });
  const archivedList = document.createElement("ul");
  archivedList.className = "browse-list";
  archivedStatus.append(archivedMessage, archivedRetryRoot);
  panes.archived.append(archivedStatus, archivedList);
  let lastArchived: BoardState["archived"] | undefined;
  let lastArchiveQuery: string | undefined;
  function updateArchived(state: BoardState["archived"], query: string) {
    if (lastArchived === state && lastArchiveQuery === query) return;
    lastArchived = state;
    lastArchiveQuery = query;
    const rows = (state?.value ?? [])
      .map(({ name, completedTasks, totalTasks }) => {
        const dated = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(name);
        return { name: dated?.[2] ?? name, date: dated?.[1] ?? "", completedTasks, totalTasks };
      })
      .filter(({ name }) => name.toLocaleLowerCase().includes(query))
      .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
    archivedList.replaceChildren(
      ...rows.map(({ name, date, completedTasks, totalTasks }) => {
        const row = document.createElement("li");
        const title = document.createElement("span");
        title.textContent = name;
        const count = document.createElement("span");
        count.textContent = `${completedTasks} of ${totalTasks} tasks`;
        count.className = "browse-meta";
        row.append(title);
        if (date) {
          const time = document.createElement("time");
          time.dateTime = time.textContent = date;
          time.className = "browse-meta";
          row.append(time);
        }
        row.append(count);
        return row;
      }),
    );
    archivedStatus.hidden = !state || rows.length > 0;
    archivedStatus.classList.toggle("error", !!state?.error);
    archivedRetryRoot.hidden = !state?.error;
    archivedMessage.textContent =
      state?.error?.message ??
      (state?.pending
        ? "Loading archived changes…"
        : state?.value?.length
          ? "No matching archived changes."
          : "No changes are archived.");
  }
  const specsStatus = document.createElement("div");
  specsStatus.className = "notice browse-status";
  const specsMessage = document.createElement("span");
  const specsRetryRoot = document.createElement("span");
  const specsRetry = mountButton(specsRetryRoot, {
    label: "refresh",
    variant: "secondary",
    size: "sm",
    onClick: callbacks.retry,
  });
  const specsList = document.createElement("ul");
  specsList.className = "browse-list spec-list";
  specsStatus.append(specsMessage, specsRetryRoot);
  panes.specs.append(specsStatus, specsList);
  let lastSpecs: BoardState["specs"] | undefined;
  let lastSpecQuery: string | undefined;
  function updateSpecs(state: BoardState["specs"], query: string) {
    if (lastSpecs === state && lastSpecQuery === query) return;
    lastSpecs = state;
    lastSpecQuery = query;
    const rows = (state?.value ?? []).filter(({ id }) => id.toLocaleLowerCase().includes(query));
    specsList.replaceChildren(
      ...rows.map(({ id, requirementCount }) => {
        const row = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.spec = id;
        button.className = "spec-row";
        const name = document.createElement("span");
        name.textContent = id;
        const count = document.createElement("span");
        count.textContent = `${requirementCount} ${requirementCount === 1 ? "requirement" : "requirements"}`;
        count.className = "browse-meta";
        button.append(name, count);
        button.addEventListener("click", () => callbacks.openSpec(id));
        row.append(button);
        return row;
      }),
    );
    specsStatus.hidden = !state || rows.length > 0;
    specsStatus.classList.toggle("error", !!state?.error);
    specsRetryRoot.hidden = !state?.error;
    specsMessage.textContent =
      state?.error?.message ??
      (state?.pending
        ? "Loading specs…"
        : state?.value?.length
          ? "No matching specs."
          : "No specs exist yet.");
  }
  const board = panes.changes;
  board.className = "board";
  const sections = stages.map((stage) => {
    const section = document.createElement("section");
    section.className = "stage";
    const label = document.createElement("h2");
    const grid = document.createElement("div");
    grid.className = "card-grid";
    const empty = document.createElement("p");
    empty.className = "empty-stage";
    section.append(label, grid);
    board.append(section);
    return { stage, label, grid, empty };
  });
  body.append(notices, ...Object.values(panes));
  main.append(header, tabRoot, body);
  root.append(main);
  let noticesMounted: { dispose: () => void }[] = [];
  let noticeSignature = "";
  const cards = new Map<
    string,
    {
      node: HTMLElement;
      title: HTMLButtonElement;
      areas: ReturnType<typeof mountAreaBadges>;
      progressLabel: HTMLElement;
      progressRoot: HTMLElement;
      progress: ReturnType<typeof mountProgress>;
      action: ReturnType<typeof mountPrimaryAction>;
      explore: ReturnType<typeof mountButton>;
      exploreRoot: HTMLElement;
      verify: ReturnType<typeof mountButton>;
      verifyRoot: HTMLElement;
      status: HTMLElement;
      current: BoardCard;
    }
  >();
  function addAction(target: HTMLElement, label: string) {
    const mount = document.createElement("span");
    target.append(mount);
    noticesMounted.push(
      mountButton(mount, { label, variant: "secondary", size: "sm", onClick: callbacks.retry }),
    );
  }
  function cardFor(item: BoardCard, workflows: ReadonlySet<Workflow>) {
    let entry = cards.get(item.change.id);
    if (!entry) {
      const node = document.createElement("article");
      node.className = "change-card";
      const title = document.createElement("button");
      title.className = "card-main";
      title.type = "button";
      const progressLabel = document.createElement("p");
      progressLabel.className = "progress-label";
      const progressRoot = document.createElement("div");
      const progress = mountProgress(progressRoot, { value: 0, label: "Task completion" });
      const actionRoot = document.createElement("span");
      actionRoot.className = "card-actions";
      const id = item.change.id;
      const action = mountPrimaryAction(actionRoot);
      const exploreRoot = document.createElement("span");
      const explore = mountButton(exploreRoot, {
        label: "explore",
        variant: "secondary",
        size: "sm",
        onClick: () => cards.get(id)?.current.action("explore"),
      });
      const verifyRoot = document.createElement("span");
      const verify = mountButton(verifyRoot, {
        label: "verify",
        variant: "secondary",
        size: "sm",
        onClick: () => cards.get(id)?.current.action("verify"),
      });
      actionRoot.prepend(exploreRoot, verifyRoot);
      title.addEventListener("click", () => cards.get(id)?.current.open());
      const status = document.createElement("p");
      status.className = "stale-label";
      node.append(title);
      const areas = mountAreaBadges(node);
      node.append(progressLabel, progressRoot, actionRoot, status);
      entry = {
        node,
        title,
        areas,
        progressLabel,
        progressRoot,
        progress,
        action,
        explore,
        exploreRoot,
        verify,
        verifyRoot,
        status,
        current: item,
      };
      cards.set(id, entry);
    }
    entry.current = item;
    const change = item.change;
    if (entry.title.textContent !== change.id) entry.title.textContent = change.id;
    entry.areas.update(change.affectedAreas);
    const label = `${change.completedArtifacts} of ${change.totalArtifacts} artefacts${change.totalTasks === 0 ? " · No tasks yet" : ""}`;
    if (entry.progressLabel.textContent !== label) entry.progressLabel.textContent = label;
    entry.progressRoot.hidden = !change.totalTasks;
    entry.progress.update({
      value: change.totalTasks ? Math.round((100 * change.completedTasks) / change.totalTasks) : 0,
      label: `${change.completedTasks} of ${change.totalTasks} tasks complete`,
    });
    entry.action.update({
      id: change.id,
      stage: change.stage,
      workflow: workflowLabel(change.stage, workflows),
      disabled: item.unavailable,
      pending: item.pending,
      action: item.action,
    });
    entry.explore.update({ disabled: item.unavailable });
    entry.exploreRoot.hidden = change.stage !== "planning";
    entry.verifyRoot.hidden = change.stage !== "complete" || !workflows.has("verify");
    entry.verify.update({ disabled: item.unavailable });
    entry.status.hidden = !item.stale && !item.unavailable;
    if (item.unavailable) entry.status.textContent = `${change.id} is no longer available.`;
    else if (item.stale)
      entry.status.textContent = `${change.id} is stale; latest summary unavailable.`;
    return entry.node;
  }
  return {
    setVisible(visible: boolean) {
      main.hidden = !visible;
    },
    resetPositions() {
      positions.clear();
    },
    scrollForChanges() {
      return view === "changes" ? window.scrollY : (positions.get("changes")?.scroll ?? 0);
    },
    focusSpec(id: string) {
      const button = specsList.querySelector<HTMLElement>(`[data-spec="${CSS.escape(id)}"]`);
      (button ?? tablist.querySelector<HTMLElement>("#board-tab-specs"))?.focus({
        preventScroll: true,
      });
    },
    update(state: BoardState) {
      const switched = view !== state.view;
      const tabHadFocus = switched && tabRoot.contains(document.activeElement);
      if (switched) {
        positions.set(view, { scroll: window.scrollY, focus: positions.get(view)?.focus ?? null });
        view = state.view;
        tabs.update({ activeId: view });
        syncTabs();
      }
      project.textContent =
        state.directory?.split("/").filter(Boolean).at(-1) ?? "No project selected";
      newChange.update({ disabled: !state.canCreate });
      archive.update({ disabled: !state.canArchive, loading: state.archivePending });
      if (searchValue !== state.search) {
        searchValue = state.search;
        search.update({ value: searchValue });
      }
      tally.textContent = `${state.listedCount} changes · ${state.completedTasks} of ${state.totalTasks} tasks complete`;
      refresh.update({ disabled: !state.directory, loading: state.loading });
      const nextNoticeSignature = JSON.stringify([
        !!state.directory,
        state.error,
        state.failures.map(({ id }) => id),
      ]);
      if (noticeSignature !== nextNoticeSignature) {
        noticeSignature = nextNoticeSignature;
        noticesMounted.forEach((handle) => handle.dispose());
        noticesMounted = [];
        notices.replaceChildren();
        if (!state.directory) {
          const notice = document.createElement("p");
          notice.className = "notice";
          notice.textContent =
            "Select an OpenChamber project or worktree to view its OpenSpec changes.";
          notices.append(notice);
        }
        if (state.error) {
          const notice = document.createElement("div");
          notice.className = "notice error";
          const message = document.createElement("span");
          message.textContent = state.error;
          notice.append(message);
          addAction(notice, "Retry");
          notices.append(notice);
        }
        if (state.failures.length) {
          const notice = document.createElement("div");
          notice.className = "notice";
          const message = document.createElement("span");
          message.textContent = `${state.failures.map(({ id }) => id).join(", ")} could not be read. Refresh to try again.`;
          notice.append(message);
          addAction(notice, "Retry");
          notices.append(notice);
        }
      }
      const ids = new Set(state.cards.map(({ change }) => change.id));
      for (const [id, entry] of cards) {
        if (ids.has(id)) continue;
        entry.action.dispose();
        entry.explore.dispose();
        entry.verify.dispose();
        entry.progress.dispose();
        entry.areas.dispose();
        entry.node.remove();
        cards.delete(id);
      }
      const query = state.search.trim().toLocaleLowerCase();
      updateArchived(state.archived, query);
      updateSpecs(state.specs, query);
      for (const entry of cards.values()) {
        if (!entry.current.change.id.toLocaleLowerCase().includes(query)) entry.node.remove();
      }
      for (const { stage, label, grid, empty } of sections) {
        const matching = state.cards
          .filter(
            ({ change }) =>
              change.stage === stage.id && change.id.toLocaleLowerCase().includes(query),
          )
          .sort((a, b) => (a.change.id < b.change.id ? -1 : a.change.id > b.change.id ? 1 : 0));
        label.textContent = `${stage.label} ${matching.length}`;
        for (const child of [...grid.children]) {
          if (
            child !== empty &&
            !matching.some((item) => cards.get(item.change.id)?.node === child)
          )
            child.remove();
        }
        empty.textContent =
          state.loading && !state.settled && state.pendingSummaries
            ? "Loading…"
            : query
              ? "No matching changes"
              : "No changes here";
        if (!matching.length) {
          if (empty.parentElement !== grid) grid.append(empty);
        } else empty.remove();
        matching.forEach((item, index) => {
          const node = cardFor(item, state.workflows);
          if (grid.children[index] !== node) grid.insertBefore(node, grid.children[index] ?? null);
        });
      }
      if (switched) {
        const position = positions.get(view);
        const previous = position?.focus;
        const fallback = tablist.querySelector<HTMLElement>('[aria-selected="true"]');
        (previous?.isConnected ? previous : tabHadFocus ? fallback : null)?.focus({
          preventScroll: true,
        });
        window.scrollTo(0, position?.scroll ?? 0);
      }
    },
    dispose() {
      noticesMounted.forEach((handle) => handle.dispose());
      for (const entry of cards.values()) {
        entry.action.dispose();
        entry.explore.dispose();
        entry.verify.dispose();
        entry.progress.dispose();
        entry.areas.dispose();
      }
      cards.clear();
      newChange.dispose();
      archive.dispose();
      refresh.dispose();
      help.dispose();
      search.dispose();
      tabs.dispose();
      archivedRetry.dispose();
      specsRetry.dispose();
      main.remove();
    },
  };
}
