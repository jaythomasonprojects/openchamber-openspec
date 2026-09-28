import { mountButton, mountTextField } from "@openchamber/sdk/ui";
import { isChangeName } from "../model.js";
import { ServiceRequestError, type Client, type Scope } from "./client.js";
import { addButtonIcon } from "./button-icon.js";

type Attempt = { scope: Scope; name: string; goal: string };
type Mode =
  | "editing"
  | "submitting"
  | "reconciling"
  | "read-failed"
  | "observed-existing"
  | "confirmed-success";

export function mountCreateDialog(
  client: Pick<Client, "create" | "list">,
  callbacks: {
    current: () => Scope | null;
    created: (scope: Scope) => void;
    inspect: (scope: Scope, name: string) => void;
  },
) {
  const dialog = document.createElement("dialog");
  const form = document.createElement("form");
  const heading = document.createElement("h2");
  heading.id = "new-change-title";
  dialog.setAttribute("aria-labelledby", heading.id);
  heading.textContent = "New change";
  const nameRoot = document.createElement("div");
  const goalRoot = document.createElement("div");
  let name = "";
  let goal = "";
  let mode: Mode = "editing";
  let attempt: Attempt | null = null;
  let draftScope: Scope | null = null;
  let messageText = "";
  let generation = 0;
  let disposed = false;
  const nameField = mountTextField(nameRoot, {
    label: "Change name",
    value: "",
    placeholder: "add-change-board",
    mono: true,
    onChange: (value) => {
      name = value;
      nameField.update({ value, error: undefined });
    },
  });
  const goalField = mountTextField(goalRoot, {
    label: "Goal",
    value: "",
    placeholder: "What should this change make possible?",
    multiline: true,
    rows: 4,
    onChange: (value) => {
      goal = value;
      goalField.update({ value, error: undefined });
    },
  });
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  const actions = document.createElement("div");
  actions.className = "create-actions";
  const cancelRoot = document.createElement("span");
  const submitRoot = document.createElement("span");
  const retryRoot = document.createElement("span");
  const inspectRoot = document.createElement("span");
  const forgetRoot = document.createElement("span");
  const dismiss = mountButton(cancelRoot, {
    label: "cancel",
    variant: "secondary",
    size: "sm",
    onClick: () => dialog.close(),
  });
  const submit = mountButton(submitRoot, {
    label: "create",
    variant: "default",
    size: "sm",
    onClick: () => void submitChange(),
  });
  addButtonIcon(submitRoot, "create");
  const retry = mountButton(retryRoot, {
    label: "Retry read",
    variant: "secondary",
    size: "sm",
    onClick: () => void reconcile(),
  });
  const inspect = mountButton(inspectRoot, {
    label: "Inspect change",
    variant: "secondary",
    size: "sm",
    onClick: () => {
      if (!attempt || !sameContext(attempt.scope)) return;
      callbacks.inspect(attempt.scope, attempt.name);
      dialog.close();
    },
  });
  const forget = mountButton(forgetRoot, {
    label: "Dismiss attempt",
    variant: "ghost",
    size: "sm",
    onClick: () => {
      if (mode === "submitting" || mode === "reconciling") return;
      const contextChanged = !!attempt && !sameContext(attempt.scope);
      if (mode === "read-failed" && !contextChanged) return;
      const originalAttempt = attempt;
      attempt = null;
      if (contextChanged) {
        discardDraft();
        if (mode === "read-failed") {
          attempt = originalAttempt;
          messageText = "Creation outcome is unknown. Retry the read before creating again.";
        } else mode = "editing";
        dialog.close();
        return;
      }
      draftScope = callbacks.current();
      mode = "editing";
      messageText = "";
      paint();
    },
  });
  actions.append(cancelRoot, forgetRoot, retryRoot, inspectRoot, submitRoot);
  form.append(heading, nameRoot, goalRoot, message, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitChange();
  });
  dialog.append(form);
  document.body.append(dialog);

  const sameContext = (scope: Scope) => {
    const current = callbacks.current();
    return current?.directory === scope.directory && current.root === scope.root;
  };
  function discardDraft() {
    draftScope = null;
    name = "";
    goal = "";
    messageText = "";
    nameField.update({ value: "", error: undefined });
    goalField.update({ value: "", error: undefined });
  }
  dialog.addEventListener("close", () => {
    if (!attempt && draftScope && !sameContext(draftScope)) discardDraft();
  });
  function paint() {
    if (disposed) return;
    const current = callbacks.current();
    const origin = attempt?.scope ?? draftScope;
    const usable = origin ? sameContext(origin) : current !== null;
    const busy = mode === "submitting" || mode === "reconciling";
    nameField.update({ disabled: busy || mode === "read-failed" || mode === "observed-existing" });
    goalField.update({ disabled: busy || mode === "read-failed" || mode === "observed-existing" });
    submit.update({ disabled: mode !== "editing" || !usable, loading: mode === "submitting" });
    retryRoot.hidden = mode !== "read-failed";
    retry.update({ disabled: mode !== "read-failed", loading: mode === "reconciling" });
    inspectRoot.hidden = mode !== "observed-existing";
    inspect.update({ disabled: mode !== "observed-existing" || !usable });
    forgetRoot.hidden = !attempt || busy || (mode === "read-failed" && usable);
    forget.update({ disabled: busy });
    const contextNotice =
      origin && !usable
        ? ` Return to ${origin.directory} (OpenSpec root ${origin.root}) to inspect or submit in the original project.`
        : "";
    message.textContent = messageText + contextNotice;
    message.hidden = !message.textContent;
  }
  async function reconcile() {
    if (!attempt || (mode !== "reconciling" && mode !== "read-failed")) return;
    const original = attempt;
    const currentGeneration = ++generation;
    mode = "reconciling";
    messageText = "Checking the original project for a matching change…";
    paint();
    try {
      const listing = await client.list(original.scope.directory, original.scope.root);
      if (disposed || currentGeneration !== generation) return;
      if (listing.changes.some((entry) => entry.id === original.name)) {
        mode = "observed-existing";
        messageText =
          "Creation outcome is unknown. An existing change with this name was found for inspection.";
      } else {
        mode = "editing";
        messageText =
          "Creation outcome is unknown. The original project was refreshed; no matching change was found.";
      }
    } catch (caught) {
      if (disposed || currentGeneration !== generation) return;
      mode = "read-failed";
      messageText = `Creation outcome is unknown. ${caught instanceof Error ? caught.message : "The original project could not be read."} Retry the read before creating again.`;
    }
    paint();
  }
  async function submitChange() {
    if (mode !== "editing" || disposed) return;
    const current = callbacks.current();
    if (
      !current ||
      (draftScope && !sameContext(draftScope)) ||
      (attempt && !sameContext(attempt.scope))
    ) {
      paint();
      return;
    }
    const submittedName = name.trim();
    const submittedGoal = goal.trim();
    if (!isChangeName(submittedName)) {
      nameField.update({ error: "Use lowercase letters or digits separated by single hyphens." });
      return;
    }
    if (!submittedGoal) {
      goalField.update({ error: "Goal is required." });
      return;
    }
    attempt = { scope: current, name: submittedName, goal: submittedGoal };
    const original = attempt;
    const currentGeneration = ++generation;
    mode = "submitting";
    messageText = "";
    paint();
    try {
      await client.create(original.scope, original.name, original.goal);
      if (disposed || currentGeneration !== generation) return;
      mode = "confirmed-success";
      messageText = "Change created.";
      paint();
      if (sameContext(original.scope)) callbacks.created(original.scope);
      if (dialog.open) dialog.close();
      attempt = null;
      draftScope = null;
      name = "";
      goal = "";
      nameField.update({ value: "" });
      goalField.update({ value: "" });
      mode = "editing";
      messageText = "";
      paint();
    } catch (caught) {
      if (disposed || currentGeneration !== generation) return;
      if (
        caught instanceof ServiceRequestError &&
        !caught.outcome &&
        caught.code !== "CLI_TIMEOUT"
      ) {
        mode = "editing";
        messageText = caught.message;
        paint();
        return;
      }
      mode = "reconciling";
      await reconcile();
    }
  }
  return {
    open() {
      if (!disposed && !dialog.open) {
        if (!attempt && draftScope && !sameContext(draftScope)) discardDraft();
        draftScope ??= callbacks.current();
        paint();
        dialog.showModal();
      }
    },
    update: paint,
    dispose() {
      disposed = true;
      generation++;
      dismiss.dispose();
      submit.dispose();
      retry.dispose();
      inspect.dispose();
      forget.dispose();
      nameField.dispose();
      goalField.dispose();
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}
