import { mountButton } from "@openchamber/sdk/ui";
import { ServiceRequestError, type Client, type Scope } from "./client.js";
import { addButtonIcon } from "./button-icon.js";

type Target = { scope: Scope; epoch: number; selection: number; name: string };

export function mountDeleteDialog(
  root: HTMLElement,
  client: Pick<Client, "delete" | "list">,
  callbacks: {
    current: () => Target | null;
    removed: (target: Target) => void;
  },
) {
  const dialog = document.createElement("dialog");
  const heading = document.createElement("h2");
  heading.id = "delete-change-title";
  dialog.setAttribute("aria-labelledby", heading.id);
  const description = document.createElement("p");
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  const actions = document.createElement("div");
  actions.className = "delete-actions";
  const cancelRoot = document.createElement("span");
  const retryRoot = document.createElement("span");
  const deleteRoot = document.createElement("span");
  let target: Target | null = null;
  let mode: "confirming" | "deleting" | "reconciling" | "unresolved" | "present" = "confirming";
  let disposed = false;
  const unresolved = new Set<string>();
  const key = (attempt: Target) =>
    JSON.stringify([attempt.scope.directory, attempt.scope.root, attempt.name]);
  const matches = (attempt: Target) => {
    const current = callbacks.current();
    return (
      current?.scope === attempt.scope &&
      current.epoch === attempt.epoch &&
      current.selection === attempt.selection &&
      current.name === attempt.name
    );
  };
  function close() {
    dialog.close();
    target = null;
    mode = "confirming";
    message.textContent = "";
  }
  const cancel = mountButton(cancelRoot, {
    label: "cancel",
    variant: "secondary",
    size: "sm",
    onClick: () => {
      if (mode === "confirming" || mode === "present") close();
    },
  });
  const retry = mountButton(retryRoot, {
    label: "Retry read",
    variant: "secondary",
    size: "sm",
    onClick: () => {
      if (target && mode === "unresolved") void reconcile(target);
    },
  });
  const confirm = mountButton(deleteRoot, {
    label: "delete",
    variant: "destructive",
    size: "sm",
    onClick: () => {
      if (target && mode === "confirming" && matches(target)) void remove(target);
    },
  });
  addButtonIcon(deleteRoot, "delete");
  actions.append(cancelRoot, retryRoot, deleteRoot);
  dialog.append(heading, description, message, actions);
  root.append(dialog);
  function display() {
    message.hidden = !message.textContent;
    retryRoot.hidden = mode !== "unresolved";
    deleteRoot.hidden = mode !== "confirming" && mode !== "deleting";
    cancel.update({
      disabled: mode === "deleting" || mode === "reconciling" || mode === "unresolved",
      label: mode === "present" ? "Close" : "cancel",
    });
    confirm.update({ disabled: mode !== "confirming", loading: mode === "deleting" });
  }
  dialog.addEventListener("cancel", (event) => {
    if (mode === "deleting" || mode === "reconciling" || mode === "unresolved")
      event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (mode !== "deleting" && mode !== "reconciling") {
      target = null;
      mode = "confirming";
      message.textContent = "";
    }
  });
  async function reconcile(attempt: Target) {
    if (matches(attempt) && target === attempt) {
      mode = "reconciling";
      message.textContent = "Checking the original project for this change…";
      display();
    }
    try {
      const listing = await client.list(attempt.scope.directory, attempt.scope.root);
      if (disposed || !matches(attempt) || target !== attempt) return;
      unresolved.delete(key(attempt));
      if (!listing.changes.some((item) => item.id === attempt.name)) {
        close();
        callbacks.removed(attempt);
      } else {
        mode = "present";
        message.textContent =
          "Removal was not confirmed. The change is still listed. Close and confirm again before another attempt.";
        display();
      }
    } catch {
      if (disposed || !matches(attempt) || target !== attempt) return;
      unresolved.add(key(attempt));
      mode = "unresolved";
      message.textContent =
        "Deletion outcome is unresolved. Retry the read of the original project before another attempt.";
      display();
    }
  }
  async function remove(attempt: Target) {
    mode = "deleting";
    message.textContent = "";
    display();
    try {
      await client.delete(attempt.scope, attempt.name);
      if (disposed || !matches(attempt) || target !== attempt) return;
      unresolved.delete(key(attempt));
      close();
      callbacks.removed(attempt);
    } catch (caught) {
      if (disposed) return;
      if (
        caught instanceof ServiceRequestError &&
        caught.outcome !== "unknown" &&
        caught.code !== "CHANGE_UNAVAILABLE"
      ) {
        if (!matches(attempt) || target !== attempt) return;
        mode = "present";
        message.textContent = caught.message;
        display();
      } else {
        // A lost response or missing target is resolved against a new original-context listing.
        await reconcile(attempt);
      }
    }
  }
  return {
    open(attempt: Target) {
      if (dialog.open || disposed || !matches(attempt)) return;
      target = attempt;
      mode = unresolved.has(key(attempt)) ? "unresolved" : "confirming";
      heading.textContent = `Delete ${attempt.name}?`;
      description.textContent = `Permanently remove the planning folder for ${attempt.name}? This does not undo implementation or delete main specifications.`;
      message.textContent =
        mode === "unresolved"
          ? "Deletion outcome is unresolved. Retry the read of the original project before another attempt."
          : "";
      display();
      dialog.showModal();
      cancelRoot.querySelector("button")?.focus();
    },
    update() {
      if (target && !matches(target)) {
        if (mode === "deleting" || mode === "reconciling" || mode === "unresolved")
          unresolved.add(key(target));
        dialog.close();
        target = null;
      }
    },
    dispose() {
      disposed = true;
      dialog.close();
      cancel.dispose();
      retry.dispose();
      confirm.dispose();
      dialog.remove();
    },
  };
}
