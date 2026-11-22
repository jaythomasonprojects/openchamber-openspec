import { connectHost, HostRequestError, type GuestSessionsSnapshot } from "@openchamber/sdk";
import { applyHostReady, mountButton, mountPopoverAnchor } from "@openchamber/sdk/ui";
import {
  decodeValidation,
  type ListingEntry,
  type Task,
  type ValidationResult,
  type Workflow,
} from "./contracts.js";
import { deriveChange, taskWindow, type DerivedChange, type Stage } from "./model.js";
import { addButtonIcon } from "./panel/button-icon.js";
import { createClient, type Listing, type Scope } from "./panel/client.js";
import { applyDevice } from "./panel/device.js";
import { findProject } from "./panel/project.js";
import { actionPrompt, newChangePrompt, planningPrompt, syncPrompt } from "./panel/prompts.js";
import { createStatusCache, type DisplayCard } from "./panel/status-cache.js";
import {
  appendTrackedChange,
  readTrackedChanges,
  resolveSessionChanges,
  updateTrackedChanges,
} from "./panel/tracked-change.js";
import { stageLabel } from "./panel/workflow.js";
import { cardChips, loadWorkflows } from "./panel/workflows.js";

type View =
  | { kind: "empty" | "loading" }
  | { kind: "stale"; cards: DisplayCard[]; message?: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; listing: Listing; cards: Card[] };
type Card =
  | { id: string; change: DerivedChange; tasks: Task[] }
  | { id: string; message: string }
  | { id: string; display: DisplayCard; message?: string };
type ChangeFlyout = {
  kind: "change";
  name: string;
  stage: Stage;
  goal: string | null;
  directory: string;
  offerContinue: boolean;
};
type TaskFlyout = { kind: "task"; id: string; description: string };
type ValidationFlyout = {
  kind: "validation";
  change: string;
  result: ValidationResult & { totalIssues: number };
};
type Flyout = ChangeFlyout | TaskFlyout | ValidationFlyout;
const isValidationIssue = ({ level }: ValidationResult["issues"][number]) => level !== "INFO";

const root = document.querySelector<HTMLElement>("#root");
if (!root) throw new Error("Status section root is missing");
const host = connectHost();
const client = createClient(host);
const statusCache = createStatusCache(host);
const panelRoot = root;

let directory: string | null = null;
let sessionId: string | null = null;
let turnStarted = false;
let epoch = 0;
let projectEpoch = 0;
let sessions: GuestSessionsSnapshot | null = null;
let offSessions: (() => void) | undefined;
let workspace: Promise<void> | undefined;
let disposed = false;
let reading = false;
let queued = false;
let workflows: ReadonlySet<Workflow> | undefined;
let refreshWorkflows = false;
let contextRead: ReturnType<typeof setTimeout> | undefined;
let selection: { active: Set<string>; saved: string[] | null; changes: string[] } | null = null;
let hasDeviceStorage = false;
let hasPopovers = false;
let popoverFrame = false;
const notes = document.createElement("div");
const content = document.createElement("div");
content.className = "section-content";
const controls = document.createElement("footer");
controls.className = "section-controls";
for (const element of [notes, content, controls]) element.hidden = true;
panelRoot.append(notes, content, controls);

const pickerRoot = document.createElement("div");
const picker = document.createElement("div");
picker.className = "section-picker";
picker.id = "section-picker";
picker.hidden = true;
const choices = document.createElement("ul");
choices.setAttribute("aria-label", "Changes");
const emptyChoices = document.createElement("p");
emptyChoices.className = "note";
emptyChoices.textContent = "No untracked changes.";
picker.append(choices, emptyChoices);
panelRoot.append(picker);
const footerActions = document.createElement("div");
footerActions.className = "footer-actions";
const newRoot = document.createElement("span");
const boardRoot = document.createElement("span");
const refreshRoot = document.createElement("span");
footerActions.append(newRoot, boardRoot, refreshRoot);
controls.append(pickerRoot, footerActions);
const newButton = mountButton(newRoot, {
  label: "new",
  size: "sm",
  variant: "secondary",
  onClick: () => void preparePrompt(null, newChangePrompt(), captureContext()),
});
const boardButton = mountButton(boardRoot, {
  label: "board",
  size: "sm",
  variant: "secondary",
  onClick: () => void openBoard(captureContext()),
});
const refreshButton = mountButton(refreshRoot, {
  label: "",
  size: "sm",
  variant: "secondary",
  onClick: refresh,
});
addButtonIcon(refreshRoot, "refresh");
const refreshTrigger = refreshRoot.querySelector("button")!;
refreshTrigger.setAttribute("aria-label", "Refresh");
for (const action of [newRoot, boardRoot, refreshRoot])
  action.querySelector("button")!.classList.add("status-link");
const pickerButton = mountButton(pickerRoot, {
  label: "＋ Track a change",
  size: "sm",
  variant: "secondary",
  onClick: () => setPickerOpen(picker.hidden === true),
});
const pickerTrigger = pickerRoot.querySelector("button")!;
pickerTrigger.classList.add("status-link");
pickerTrigger.setAttribute("aria-controls", picker.id);
pickerTrigger.setAttribute("aria-expanded", "false");
let optionButtons: ReturnType<typeof mountButton>[] = [];
const cancelRoot = document.createElement("div");
picker.append(cancelRoot);
const cancelPicker = mountButton(cancelRoot, {
  label: "Cancel",
  size: "sm",
  variant: "secondary",
  onClick: () => setPickerOpen(false),
});
let pickerKey = "";
let viewKey = "";
let showingLive = false;
let readError: string | undefined;
const mountedCards = new Map<string, ReturnType<typeof mountTrackedCard>>();

function setPickerOpen(open: boolean, restoreFocus = true) {
  picker.hidden = !open;
  pickerTrigger.setAttribute("aria-expanded", String(open));
  if (open) choices.querySelector<HTMLElement>("button:enabled")?.focus();
  else if (restoreFocus) pickerTrigger.focus();
}

function escapePicker(event: KeyboardEvent) {
  if (event.key !== "Escape" || picker.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  setPickerOpen(false);
}

panelRoot.addEventListener("keydown", escapePicker);

function captureContext() {
  const capturedEpoch = epoch;
  return () => !disposed && epoch === capturedEpoch;
}

function render(view: View) {
  newRoot.hidden = !workflows?.has("new");
  const nextViewKey = JSON.stringify([epoch, view, workflows && [...workflows]]);
  if (viewKey === nextViewKey) return;
  viewKey = nextViewKey;
  showingLive = view.kind === "ready";
  markRefreshing(false);
  controls.hidden = !directory;
  const cards: Card[] =
    view.kind === "ready"
      ? view.cards
      : view.kind === "stale"
        ? view.cards.map((display) => ({ id: display.id, display }))
        : [];
  content.hidden = !cards.length;
  for (const [id, mounted] of mountedCards) {
    if (cards.some((card) => card.id === id)) continue;
    mounted.dispose();
    mountedCards.delete(id);
  }
  for (const [index, card] of cards.entries()) {
    let mounted = mountedCards.get(card.id);
    if (!mounted) {
      mounted = mountTrackedCard(card.id);
      mountedCards.set(card.id, mounted);
    }
    const previous = content.children.item(index);
    if (previous !== mounted.element) content.insertBefore(mounted.element, previous);
    mounted.update(card, view.kind === "ready" ? view.listing : null);
  }
  notes.replaceChildren();
  if (view.kind === "ready") {
    if (!sessionId) note("Start a session to track a change.");
    if (!view.listing.changes.length) note("No active changes.");
  } else if (view.kind === "error") {
    note(view.message, "alert");
  } else if (view.kind === "stale") {
    if (view.message) note(view.message, "alert");
    note("Showing last known progress.", "status");
  } else if (view.kind === "loading") {
    note("Loading OpenSpec change…", "status");
  }
  notes.hidden = !notes.childElementCount;
  pickerButton.update({ disabled: view.kind !== "ready" || !sessionId });
  cancelRoot.hidden = !cards.length;
  if (view.kind === "ready")
    updatePicker(
      view.listing,
      cards.map(({ id }) => id),
    );
  else setPickerOpen(false, false);
}

function pickerPriority({ completedTasks, totalTasks }: ListingEntry) {
  if (!totalTasks) return 2;
  if (!completedTasks) return 1;
  return completedTasks < totalTasks ? 0 : 3;
}

function updatePicker(listing: Listing, tracked: string[]) {
  const items = [...listing.changes]
    .filter(({ id }) => !tracked.includes(id))
    .sort((left, right) => pickerPriority(left) - pickerPriority(right))
    .map(({ id }) => id);
  const nextKey = JSON.stringify([sessionId, items]);
  if (pickerKey === nextKey) return;
  pickerKey = nextKey;
  emptyChoices.hidden = items.length !== 0;
  const focused = choices.contains(document.activeElement)
    ? document.activeElement?.textContent
    : null;
  for (const button of optionButtons) button.dispose();
  choices.replaceChildren();
  optionButtons = items.map((id) => {
    const row = document.createElement("li");
    choices.append(row);
    const button = mountButton(row, {
      label: id,
      size: "sm",
      variant: "secondary",
      onClick: () => {
        const session = sessionId;
        const current = captureContext();
        if (!session || !current()) return;
        setPickerOpen(false);
        void (async () => {
          const saved = await appendTrackedChange(host, session, id, current, seedTrackedChanges);
          if (!current()) return;
          if (saved) read();
          else await showError(current, null, "Could not track the OpenSpec change. Try again.");
        })();
      },
    });
    if (focused === id) row.querySelector("button")?.focus();
    return button;
  });
  if (focused && !choices.contains(document.activeElement))
    (choices.querySelector<HTMLElement>("button:enabled") ?? pickerTrigger).focus();
}

function seedTrackedChanges() {
  return selection ? resolveSessionChanges(sessionId, sessions, null, selection.active) : [];
}

async function showError(current: () => boolean, caught: unknown, fallback: string) {
  if (!current()) return;
  await host
    .toast({
      kind: "error",
      message: caught instanceof HostRequestError ? caught.message : fallback,
    })
    .catch((error: unknown) => console.warn("Could not show the OpenSpec error.", error));
}

async function openBoard(current: () => boolean, target?: { directory: string; change: string }) {
  try {
    if (!current()) return false;
    if (target) await client.setFocus(target.directory, target.change);
    if (!current()) return false;
    await host.openSurface("plugin:openspec-board");
    return current();
  } catch (caught) {
    await showError(current, caught, "Could not open the OpenSpec board.");
    return false;
  }
}

async function preparePrompt(
  change: string | null,
  text: string,
  current: () => boolean,
  session = sessionId,
  seed = seedTrackedChanges,
) {
  if (!current()) return false;
  try {
    await host.compose({ text, mode: "replace" });
  } catch (caught) {
    await showError(current, caught, "The workflow prompt could not be prepared.");
    return false;
  }
  if (!current()) return false;
  const saved = session && change && appendTrackedChange(host, session, change, current, seed);
  try {
    await host.toast({
      kind: "success",
      message: "Workflow prompt prepared in the open composer.",
    });
  } catch (caught) {
    await showError(current, caught, "The workflow prompt could not be prepared.");
  }
  await saved;
  return current();
}

function taskTitle(task: Task | null) {
  return task?.description.split("\n", 1)[0] ?? "";
}

function mountTaskTitle() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "flyout-trigger task-title";
  const inline = document.createElement("div");
  inline.hidden = true;
  let task: Task | null = null;
  const flyout = mountFlyout(button, inline, () => (task ? taskFlyout(task) : null));
  return {
    button,
    inline,
    update(next: Task | null) {
      if (task?.id !== next?.id) flyout.reset();
      task = next;
      const title = taskTitle(task);
      if (button.textContent !== title) button.textContent = title;
      if (task) flyout.update();
    },
    refreshAnchor: flyout.update,
    dispose: flyout.dispose,
  };
}

type TaskRow = {
  row: HTMLLIElement;
  checkbox: HTMLInputElement;
  title: ReturnType<typeof mountTaskTitle>;
};

function mountTrackedCard(id: string) {
  const element = document.createElement("article");
  element.className = "status-card";
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const title = document.createElement("h1");
  const nameButton = document.createElement("button");
  nameButton.type = "button";
  nameButton.className = "flyout-trigger";
  nameButton.textContent = id;
  title.append(nameButton);
  heading.append(title);
  const inline = document.createElement("div");
  inline.hidden = true;
  let change: DerivedChange | null = null;
  const nameAnchor = mountFlyout(nameButton, inline, () =>
    change && scope && workflows ? changeFlyout(change, scope.directory, workflows) : null,
  );
  const count = document.createElement("span");
  heading.append(count);
  const meter = document.createElement("progress");
  meter.className = "section-progress";
  meter.setAttribute("aria-label", "Task completion");
  meter.max = 100;
  const disclosure = document.createElement("details");
  const summary = document.createElement("summary");
  const tasksLabel = document.createElement("span");
  tasksLabel.className = "tasks-label";
  tasksLabel.textContent = "Tasks:";
  const currentTask = mountTaskTitle();
  summary.append(tasksLabel, currentTask.button);
  const taskList = document.createElement("ul");
  taskList.className = "task-window";
  disclosure.append(summary, taskList);
  let taskKey: string | null = null;
  let taskRows = new Map<string, TaskRow>();
  const actions = document.createElement("div");
  actions.className = "card-actions";
  let scope: Scope | null = null;
  let chips: ReturnType<typeof cardChips> | null = null;
  const primary = mountButton(actions, {
    label: "",
    size: "xs",
    onClick: () => {
      if (!change || !chips) return;
      const text =
        chips.primary === "ff" || chips.primary === "continue"
          ? planningPrompt(change, chips.primary)
          : actionPrompt(change, "primary");
      void preparePrompt(change.id, text, captureContext());
    },
  });
  const secondaryRoot = document.createElement("span");
  const syncRoot = document.createElement("span");
  actions.append(secondaryRoot, syncRoot);
  const secondary = mountButton(secondaryRoot, {
    label: "",
    size: "xs",
    variant: "secondary",
    onClick: () => {
      if (change && chips?.secondary)
        void preparePrompt(change.id, actionPrompt(change, chips.secondary), captureContext());
    },
  });
  const sync = mountButton(syncRoot, {
    label: "sync",
    size: "xs",
    variant: "secondary",
    onClick: () => {
      if (change) void preparePrompt(change.id, syncPrompt(change), captureContext());
    },
  });
  const validationInline = document.createElement("div");
  validationInline.hidden = true;
  const validateRoot = document.createElement("span");
  actions.append(validateRoot);
  let validationData: ValidationFlyout | null = null;
  let validating = false;
  let disposedCard = false;
  const validate = mountButton(validateRoot, {
    label: "validate",
    size: "xs",
    variant: "secondary",
    onClick: () => {
      if (!change || !scope || validating) return;
      const captured = captureContext();
      const current = () => captured() && !disposedCard && change !== null;
      const plan = scope;
      validating = true;
      void client
        .validate(plan, id)
        .then((result) => {
          if (!current()) return;
          validationData = validationFlyout(id, result);
          validationAnchor.update();
          validationAnchor.open();
          if (!validationAnchor.isOpen()) validationAnchor.reset();
        })
        .catch((caught: unknown) =>
          showError(current, caught, "Could not validate the OpenSpec change."),
        )
        .finally(() => {
          validating = false;
        });
    },
  });
  const validationAnchor = mountFlyout(
    validateRoot.querySelector("button")!,
    validationInline,
    () => validationData,
    () => {
      validationData = null;
    },
  );
  const details = document.createElement("div");
  details.className = "section-content";
  details.append(disclosure, currentTask.inline, actions, validationInline);
  const cachedStage = document.createElement("p");
  cachedStage.className = "note";
  const cachedTask = document.createElement("p");
  cachedTask.className = "note cached-task";
  const errorCard = document.createElement("div");
  errorCard.className = "section-content";
  const error = document.createElement("p");
  error.setAttribute("role", "alert");
  errorCard.append(error);
  const retry = mountButton(errorCard, {
    label: "Refresh",
    size: "sm",
    variant: "secondary",
    onClick: refresh,
  });
  element.append(heading, inline, meter, cachedStage, cachedTask, details, errorCard);
  function updateProgress({ completedTasks, totalTasks }: ListingEntry) {
    const percentage = totalTasks ? (100 * completedTasks) / totalTasks : 0;
    meter.value = percentage;
    meter.setAttribute("aria-valuenow", String(percentage));
    count.textContent = `${completedTasks}/${totalTasks}`;
  }
  return {
    element,
    refreshAnchor() {
      nameAnchor.update();
      if (validationAnchor.isOpen()) validationAnchor.update();
      if (taskKey !== null) currentTask.refreshAnchor();
      for (const { title } of taskRows.values()) title.refreshAnchor();
    },
    update(card: Card, listing: Scope | null) {
      scope = listing;
      const display = "display" in card ? card.display : null;
      details.hidden = !("change" in card);
      const message = "message" in card ? card.message : undefined;
      errorCard.hidden = !message;
      error.textContent = message ?? "";
      count.hidden = meter.hidden = details.hidden && !display;
      nameButton.disabled = details.hidden;
      element.classList.toggle("stale-card", !!display);
      cachedStage.hidden = !display;
      cachedTask.hidden = !display?.currentTaskTitle;
      if (!("change" in card)) {
        if (display) {
          updateProgress(display);
          cachedStage.textContent = stageLabel(display.stage);
          cachedTask.textContent = display.currentTaskTitle;
        }
        change = null;
        nameAnchor.reset();
        currentTask.update(null);
        for (const { title } of taskRows.values()) title.update(null);
        validationAnchor.reset();
        return;
      }
      change = card.change;
      nameAnchor.update();
      chips = cardChips(change, workflows!);
      primary.update({ label: chips.primary });
      secondary.update({ label: chips.secondary ?? "" });
      secondaryRoot.hidden = chips.secondary === null;
      syncRoot.hidden = !chips.sync;
      updateProgress(change);

      const next = card.tasks.find((task) => !task.done) ?? card.tasks.at(-1) ?? null;
      const nextKey = next?.id ?? null;
      if (nextKey !== taskKey) disclosure.open = false;
      taskKey = nextKey;
      disclosure.hidden = !next;
      currentTask.update(next);
      const rows = new Map<string, TaskRow>();
      for (const [index, task] of taskWindow(card.tasks).entries()) {
        let item = taskRows.get(task.id);
        if (!item) {
          const row = document.createElement("li");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.disabled = true;
          checkbox.setAttribute("aria-label", "Task completion");
          const title = mountTaskTitle();
          row.append(checkbox, title.button, title.inline);
          item = { row, checkbox, title };
        }
        item.checkbox.checked = task.done;
        item.title.update(task);
        rows.set(task.id, item);
        const previous = taskList.children.item(index);
        if (previous !== item.row) taskList.insertBefore(item.row, previous);
      }
      for (const [id, item] of taskRows) {
        if (rows.has(id)) continue;
        item.title.dispose();
        item.row.remove();
      }
      taskRows = rows;
    },
    dispose() {
      disposedCard = true;
      nameAnchor.dispose();
      validationAnchor.dispose();
      currentTask.dispose();
      for (const { title } of taskRows.values()) title.dispose();
      for (const handle of [primary, secondary, sync, validate, retry]) handle.dispose();
      element.remove();
    },
  };
}

const FLYOUT_DATA_LIMIT = 15_000;

function ellipsize(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function fitText(text: string, max: number, measure: (value: string) => number): string {
  const cut = ellipsize(text, max);
  if (measure(cut) <= FLYOUT_DATA_LIMIT) return cut;
  let low = 1;
  let high = cut.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(ellipsize(text, mid)) <= FLYOUT_DATA_LIMIT) low = mid;
    else high = mid - 1;
  }
  return ellipsize(text, low);
}

function changeFlyout(
  change: DerivedChange,
  directory: string,
  workflows: ReadonlySet<Workflow>,
): ChangeFlyout {
  const data: ChangeFlyout = {
    kind: "change",
    name: change.id,
    stage: change.stage,
    goal: null,
    directory,
    offerContinue: change.stage === "planning" && workflows.has("ff") && workflows.has("continue"),
  };
  if (change.goal) {
    data.goal = fitText(change.goal, 4_000, (goal) => JSON.stringify({ ...data, goal }).length);
  }
  return data;
}

function taskFlyout(task: Task): TaskFlyout {
  const data: TaskFlyout = { kind: "task", id: "", description: "" };
  data.id = fitText(
    task.id,
    FLYOUT_DATA_LIMIT,
    (id) => JSON.stringify({ ...data, id, description: "…" }).length,
  );
  data.description = fitText(
    task.description,
    4_000,
    (description) => JSON.stringify({ ...data, description }).length,
  );
  return data;
}

function validationFlyout(change: string, validation: ValidationResult): ValidationFlyout {
  const data: ValidationFlyout = {
    kind: "validation",
    change,
    result: {
      valid: validation.valid,
      totalIssues: validation.issues.filter(isValidationIssue).length,
      issues: [],
    },
  };
  for (const issue of validation.issues.slice(0, 20)) {
    data.result.issues.push({ ...issue, message: ellipsize(issue.message, 300) });
    if (JSON.stringify(data).length <= FLYOUT_DATA_LIMIT) continue;
    data.result.issues.pop();
    break;
  }
  return data;
}

function decodeFlyout(value: unknown): Flyout | null {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  if (value.kind === "task")
    return "id" in value &&
      typeof value.id === "string" &&
      "description" in value &&
      typeof value.description === "string"
      ? { kind: "task", id: value.id, description: value.description }
      : null;
  if (value.kind === "validation" && "change" in value && typeof value.change === "string") {
    try {
      if (
        !("result" in value) ||
        !value.result ||
        typeof value.result !== "object" ||
        !("totalIssues" in value.result) ||
        typeof value.result.totalIssues !== "number" ||
        !Number.isSafeInteger(value.result.totalIssues)
      )
        return null;
      const result = decodeValidation(value.result);
      if (value.result.totalIssues < result.issues.filter(isValidationIssue).length) return null;
      return {
        kind: "validation",
        change: value.change,
        result: { ...result, totalIssues: value.result.totalIssues },
      };
    } catch {
      return null;
    }
  }
  if (
    value.kind !== "change" ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !("directory" in value) ||
    typeof value.directory !== "string" ||
    !("offerContinue" in value) ||
    typeof value.offerContinue !== "boolean" ||
    !("goal" in value) ||
    (value.goal !== null && typeof value.goal !== "string") ||
    !("stage" in value) ||
    (value.stage !== "planning" &&
      value.stage !== "ready" &&
      value.stage !== "progress" &&
      value.stage !== "complete")
  )
    return null;
  return {
    kind: "change",
    name: value.name,
    goal: value.goal,
    stage: value.stage,
    directory: value.directory,
    offerContinue: value.offerContinue,
  };
}

type FlyoutContext = {
  session: string | null;
  current: () => boolean;
  seed: () => string[] | null;
  afterAction?: () => void;
  afterUntrack: () => void;
};

function renderFlyout(container: HTMLElement, data: Flyout, context: FlyoutContext) {
  container.classList.add("flyout");
  if (data.kind === "task") {
    const description = document.createElement("p");
    description.textContent = data.description;
    container.replaceChildren(description);
    return;
  }
  const heading = document.createElement(container === panelRoot ? "h1" : "p");
  heading.className = "flyout-heading";
  if (data.kind === "validation") {
    const { valid, issues, totalIssues } = data.result;
    heading.textContent = data.change;
    const result = document.createElement("p");
    result.textContent = `${valid ? "Valid" : "Invalid"} · ${totalIssues} ${totalIssues === 1 ? "issue" : "issues"}`;
    container.replaceChildren(heading, result);
    const list = document.createElement("ul");
    list.className = "validation-issues";
    for (const issue of issues) {
      const location = issue.path === "file" ? "" : ` · ${issue.path}`;
      if (!isValidationIssue(issue)) {
        const note = document.createElement("p");
        note.className = "note";
        note.textContent = `Note${location}: ${issue.message}`;
        container.append(note);
        continue;
      }
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = `${issue.level}${location}`;
      const message = document.createElement("p");
      message.textContent = issue.message;
      item.append(label, message);
      list.append(item);
    }
    if (list.childElementCount) container.append(list);
    const hiddenIssues = totalIssues - list.childElementCount;
    if (hiddenIssues > 0) {
      const omitted = document.createElement("p");
      omitted.textContent = `+${hiddenIssues} more issues: open the board or run openspec validate`;
      container.append(omitted);
    }
    return;
  }
  heading.textContent = data.name;
  const stage = document.createElement("p");
  stage.textContent = stageLabel(data.stage);
  container.replaceChildren(heading, stage);
  if (data.goal) {
    const goal = document.createElement("p");
    goal.textContent = data.goal;
    container.append(goal);
  }
  const row = document.createElement("div");
  row.className = "card-actions";
  container.append(row);
  const { session, current, seed, afterAction, afterUntrack } = context;
  const actions = (
    data.offerContinue ? (["continue", "update"] as const) : (["update"] as const)
  ).map((intent) =>
    mountButton(row, {
      label: intent,
      variant: "secondary",
      size: "xs",
      onClick: () => {
        void preparePrompt(
          data.name,
          planningPrompt({ id: data.name, goal: data.goal }, intent),
          current,
          session,
          seed,
        ).then((prepared) => {
          if (prepared) afterAction?.();
        });
      },
    }),
  );
  actions.push(
    mountButton(row, {
      label: "Open in board",
      variant: "secondary",
      size: "xs",
      onClick: () => {
        void openBoard(current, { directory: data.directory, change: data.name }).then((opened) => {
          if (opened) afterAction?.();
        });
      },
    }),
  );
  if (session) {
    const button = mountButton(container, {
      label: "Untrack",
      variant: "secondary",
      size: "xs",
      onClick: () => void untrackChange(session, data.name, current, seed, afterUntrack),
    });
    container.lastElementChild!.classList.add("status-link", "untrack-link");
    actions.push(button);
  }
  return actions;
}

function mountFlyout(
  button: HTMLButtonElement,
  inline: HTMLElement,
  getData: () => Flyout | null,
  onReset?: () => void,
) {
  let anchor: ReturnType<typeof mountPopoverAnchor> | undefined;
  let openedId: string | null = null;
  let actions: ReturnType<typeof mountButton>[] | undefined;
  function closeInline() {
    actions?.forEach((action) => action.dispose());
    actions = undefined;
    inline.hidden = true;
    if (!anchor) button.setAttribute("aria-expanded", "false");
  }
  function open() {
    const data = getData();
    if (!data) return;
    if (anchor) {
      if (button.getAttribute("aria-expanded") !== "true")
        button.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    } else {
      inline.hidden = false;
      actions = renderFlyout(inline, data, {
        session: sessionId,
        current: captureContext(),
        seed: seedTrackedChanges,
        afterUntrack: () => {
          closeInline();
          read();
        },
      });
      button.setAttribute("aria-expanded", "true");
    }
  }
  function onClick(event: MouseEvent) {
    event.preventDefault();
    if (!inline.hidden) closeInline();
    else open();
  }
  function reset() {
    openedId = null;
    anchor?.dispose();
    anchor = undefined;
    closeInline();
    onReset?.();
  }
  const offClosed = !onReset
    ? undefined
    : host.onPopoverClosed(({ id }) => {
        if (id === openedId)
          queueMicrotask(() => {
            if (id === openedId) reset();
          });
      });
  // Validation clicks must reach the chip even when the SDK would treat a tap as a toggle.
  if (onReset) button.addEventListener("click", reset, true);
  else button.addEventListener("click", onClick);
  return {
    open,
    reset,
    isOpen: () => button.getAttribute("aria-expanded") === "true",
    update() {
      if (anchor && !hasPopovers) {
        anchor.dispose();
        anchor = undefined;
      }
      if (!hasPopovers) {
        button.setAttribute("aria-expanded", String(!inline.hidden));
      } else if (!anchor) {
        closeInline();
        button.removeAttribute("aria-expanded");
        anchor = mountPopoverAnchor(button, {
          host: onReset
            ? {
                ...host,
                openPopover: (request) => {
                  openedId = request.id;
                  return host.openPopover(request).catch((caught: unknown) => {
                    if (openedId === request.id) reset();
                    throw caught;
                  });
                },
              }
            : host,
          getData: () => {
            const data = getData();
            if (!data || JSON.stringify(data).length > FLYOUT_DATA_LIMIT)
              throw new Error("OpenSpec flyout data is unavailable.");
            return data;
          },
          width: 320,
          height: 160,
          side: "bottom",
        });
      }
    },
    dispose() {
      offClosed?.();
      reset();
      if (onReset) button.removeEventListener("click", reset, true);
      else button.removeEventListener("click", onClick);
    },
  };
}

function note(text: string, role?: string) {
  const line = document.createElement("p");
  line.className = "note";
  if (role) line.setAttribute("role", role);
  line.textContent = text;
  notes.append(line);
}

async function untrackChange(
  session: string,
  change: string,
  current: () => boolean,
  seed: () => string[] | null,
  onSaved: () => void,
) {
  const saved = await updateTrackedChanges(host, session, current, seed, (changes) =>
    changes.filter((name) => name !== change),
  );
  if (!current()) return;
  if (saved) onSaved();
  else await showError(current, null, "Could not untrack the OpenSpec change.");
}

function sameChanges(left: string[] | null, right: string[] | null) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.length === right.length &&
      left.every((id, index) => id === right[index]))
  );
}

function markRefreshing(stale: boolean) {
  content.classList.toggle("refreshing", stale);
  content.setAttribute("aria-busy", String(stale));
}

function showCached() {
  const cards = sessionId && directory ? statusCache.get(sessionId, directory) : undefined;
  if (cards?.length) render({ kind: "stale", cards, ...(readError ? { message: readError } : {}) });
  else if (readError) render({ kind: "error", message: readError });
  else render({ kind: directory ? "loading" : "empty" });
}

function queueContextRead() {
  clearTimeout(contextRead);
  contextRead = setTimeout(() => {
    contextRead = undefined;
    read();
  }, 32);
}

function read() {
  if (disposed || !directory) return;
  if (contextRead !== undefined) return;
  if (reading) {
    queued = true;
    return;
  }
  const capturedDirectory = directory;
  const capturedSession = sessionId;
  const capturedWorkspace = workspace;
  const capturedEpoch = epoch;
  const capturedProject = projectEpoch;
  const config = refreshWorkflows || !workflows;
  refreshWorkflows = false;
  const current = () => !disposed && epoch === capturedEpoch;
  reading = true;
  refreshTrigger.setAttribute("aria-busy", "true");
  if (showingLive && mountedCards.size) markRefreshing(true);
  void (async () => {
    try {
      const [listingResult, detected] = await Promise.allSettled([
        client.list(capturedDirectory),
        config ? loadWorkflows(client, capturedDirectory) : workflows,
      ]);
      if (!disposed && projectEpoch === capturedProject && detected.status === "fulfilled")
        workflows = detected.value;
      if (!current()) return;
      if (listingResult.status === "rejected") throw listingResult.reason;
      const listing = listingResult.value;
      const saved = capturedSession ? await readTrackedChanges(host, capturedSession) : null;
      if (!current()) return;
      if (capturedSession && saved === null) {
        await capturedWorkspace;
        if (!current()) return;
      }
      const byId = new Map(listing.changes.map((item) => [item.id, item]));
      const active = new Set(byId.keys());
      const changes = resolveSessionChanges(capturedSession, sessions, saved, active) ?? [];
      selection = { active, saved, changes };
      const cards = await Promise.all(
        changes.map(async (id): Promise<Card> => {
          try {
            const [summaryResponse, taskResponse] = await Promise.allSettled([
              client.summary(listing, id),
              client.tasks(listing, id),
            ]);
            if (summaryResponse.status === "rejected") throw summaryResponse.reason;
            if (taskResponse.status === "rejected") throw taskResponse.reason;
            return {
              id,
              change: deriveChange({ ...summaryResponse.value, ...byId.get(id)! }),
              tasks: taskResponse.value,
            };
          } catch (caught) {
            return {
              id,
              message:
                caught instanceof Error ? caught.message : "Could not read the OpenSpec change.",
            };
          }
        }),
      );
      if (!current()) return;
      const previous = new Map(
        (capturedSession ? statusCache.get(capturedSession, capturedDirectory) : undefined)?.map(
          (card) => [card.id, card] as const,
        ),
      );
      const display: DisplayCard[] = [];
      const visibleCards = cards.map((card) => {
        if ("change" in card) {
          const { id, completedTasks, totalTasks, stage } = card.change;
          const task = card.tasks.find(({ done }) => !done) ?? card.tasks.at(-1) ?? null;
          display.push({
            id,
            completedTasks,
            totalTasks,
            stage,
            currentTaskTitle: taskTitle(task) || null,
          });
          return card;
        }
        const old = previous.get(card.id);
        if (old) {
          display.push(old);
          return { ...card, display: old };
        }
        return card;
      });
      if (capturedSession)
        statusCache.set(capturedSession, capturedDirectory, display, hasDeviceStorage);
      readError = undefined;
      render({ kind: "ready", listing, cards: visibleCards });
    } catch (caught) {
      if (current()) {
        readError =
          caught instanceof Error ? caught.message : "Could not read the OpenSpec change.";
        showCached();
      }
    } finally {
      if (current()) markRefreshing(false);
      reading = false;
      refreshTrigger.setAttribute("aria-busy", "false");
      if (queued) {
        queued = false;
        read();
      }
    }
  })();
}

function subscribeToProject(capturedDirectory: string) {
  const capturedProject = ++projectEpoch;
  const current = () => !disposed && projectEpoch === capturedProject;
  return (async () => {
    try {
      const project = await findProject(host, capturedDirectory);
      if (!current() || !project) return;
      const off = await host.onSessions(project.id, (snapshot) => {
        if (!current()) return;
        sessions = snapshot;
        if (
          selection &&
          !sameChanges(
            resolveSessionChanges(sessionId, sessions, selection.saved, selection.active) ?? [],
            selection.changes,
          )
        ) {
          epoch++;
          selection = null;
          showCached();
          read();
        }
      });
      if (current()) offSessions = off;
      else off();
    } catch (caught) {
      if (current()) console.warn("Could not inspect OpenSpec session metadata.", caught);
    }
  })();
}

function refresh() {
  refreshWorkflows = true;
  read();
}

function updateContext(nextDirectory: string | null, nextSession: string | null) {
  const directoryChanged = nextDirectory !== directory;
  if (!directoryChanged && nextSession === sessionId) return;
  turnStarted = false;
  directory = nextDirectory;
  sessionId = nextSession;
  epoch++;
  selection = null;
  queued = false;
  readError = undefined;
  setPickerOpen(false, false);
  if (directoryChanged) {
    workflows = undefined;
    refreshWorkflows = false;
  }
  showCached();
  const current = captureContext();
  if (
    hasDeviceStorage &&
    nextSession &&
    nextDirectory &&
    !statusCache.get(nextSession, nextDirectory)
  )
    void statusCache.restore(nextSession, nextDirectory).then((cards) => {
      if (current() && cards?.length && !showingLive) showCached();
    });
  if (directoryChanged) {
    projectEpoch++;
    offSessions?.();
    offSessions = undefined;
    sessions = null;
    workspace = directory ? subscribeToProject(directory) : undefined;
  }
  queueContextRead();
}

let lastHeight = 0;
let popoverSession: string | null | undefined;
let popoverActions: ReturnType<typeof mountButton>[] | undefined;
const resize = new ResizeObserver(() => {
  const height = Math.ceil(panelRoot.getBoundingClientRect().height);
  if (height === lastHeight) return;
  lastHeight = height;
  void host
    .setHeight(height)
    .catch((error: unknown) => console.warn("Could not resize the OpenSpec section.", error));
});
const offReady = host.onReady((ready) => {
  hasDeviceStorage = ready.features?.deviceStorage === true;
  applyHostReady(ready, document.documentElement);
  applyDevice(ready.device);
  if (ready.surface === "popover") {
    const nextSession = ready.session?.id ?? null;
    if (!popoverFrame) {
      popoverFrame = true;
      popoverSession = nextSession;
      panelRoot.replaceChildren();
      const data = decodeFlyout(ready.popover?.data);
      const popoverId = ready.popover?.id;
      if (data && popoverId) {
        const close = () =>
          void host.closePopover(popoverId).catch((caught: unknown) => {
            console.warn("Could not close the OpenSpec flyout.", caught);
          });
        popoverActions = renderFlyout(panelRoot, data, {
          session: nextSession,
          current: () => !disposed && popoverSession === nextSession,
          seed: () => (data.kind === "change" ? [data.name] : []),
          afterAction: close,
          afterUntrack: close,
        });
      } else panelRoot.textContent = "OpenSpec details are unavailable.";
    } else if (nextSession !== popoverSession) {
      popoverSession = undefined;
      popoverActions?.forEach((action) => action.update({ disabled: true }));
    }
    resize.observe(panelRoot);
    return;
  }
  if (hasPopovers !== (ready.features?.popovers === true)) {
    hasPopovers = ready.features?.popovers === true;
    for (const card of mountedCards.values()) card.refreshAnchor();
  }
  updateContext(ready.directory, ready.session?.id ?? null);
  resize.observe(panelRoot);
});
const offDirectory = host.onDirectory((next) => {
  if (!popoverFrame && next !== directory) updateContext(next, sessionId);
});
const offSession = host.onSession((next) => {
  if (!popoverFrame) updateContext(directory, next?.id ?? null);
  else if ((next?.id ?? null) !== popoverSession) {
    popoverSession = undefined;
    popoverActions?.forEach((action) => action.update({ disabled: true }));
  }
});
const offLifecycle = host.onSessionLifecycle((event) => {
  if (event.sessionId !== sessionId) return;
  const completedTurn = turnStarted && event.phase === "completed";
  turnStarted = event.phase === "started";
  if (completedTurn) read();
});
const offPopover = host.onPopoverClosed(({ reason }) => {
  const session = sessionId;
  if (reason !== "closed" || !session || !selection) return;
  const current = captureContext();
  void readTrackedChanges(host, session)
    .then((saved) => {
      if (current() && selection && !sameChanges(saved, selection.saved)) read();
    })
    .catch((caught: unknown) => {
      console.warn("Could not check the tracked OpenSpec changes.", caught);
    });
});
window.addEventListener(
  "pagehide",
  () => {
    disposed = true;
    clearTimeout(contextRead);
    resize.disconnect();
    offReady();
    offDirectory();
    offSession();
    offLifecycle();
    offPopover();
    offSessions?.();
    popoverActions?.forEach((action) => action.dispose());
    for (const card of mountedCards.values()) card.dispose();
    for (const handle of [
      refreshButton,
      newButton,
      boardButton,
      pickerButton,
      cancelPicker,
      ...optionButtons,
    ])
      handle.dispose();
    panelRoot.removeEventListener("keydown", escapePicker);
    host.dispose();
  },
  { once: true },
);
