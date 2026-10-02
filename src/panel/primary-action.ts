import { mountButton, mountMenu } from "@openchamber/sdk/ui";
import type { Stage } from "../model.js";
import { workflowLabel } from "./workflow.js";

export type PrimaryIntent = "primary" | "worktree";
type State = {
  id: string;
  stage: Stage;
  disabled: boolean;
  pending?: boolean;
  action: (intent: PrimaryIntent) => void;
};

export function mountPrimaryAction(root: HTMLElement) {
  const buttonRoot = document.createElement("span");
  const menuRoot = document.createElement("span");
  root.append(buttonRoot, menuRoot);
  let state: State | null = null;
  let opened: State | null = null;
  const button = mountButton(buttonRoot, {
    label: "propose",
    size: "sm",
    onClick: () => state?.action("primary"),
  });
  const menu = mountMenu(menuRoot, {
    label: "apply",
    size: "sm",
    variant: "default",
    items: [],
    onSelect: (id) => {
      const captured = opened;
      opened = null;
      if (
        !captured ||
        captured.disabled ||
        state?.disabled ||
        captured.id !== state?.id ||
        captured.stage !== state?.stage ||
        (id === "worktree" && state?.pending)
      )
        return;
      captured.action(id === "worktree" ? "worktree" : "primary");
    },
  });
  const trigger = menuRoot.querySelector("button")!;
  const capture = () => {
    if (trigger.getAttribute("aria-expanded") !== "true") opened = state;
  };
  trigger.addEventListener("click", capture, true);
  return {
    update(next: State) {
      state = next;
      const apply = next.stage === "ready" || next.stage === "progress";
      buttonRoot.hidden = apply;
      menuRoot.hidden = !apply;
      button.update({ label: workflowLabel(next.stage), disabled: next.disabled });
      menu.update({
        items: [
          { id: "current", label: "Prepare in current chat", disabled: next.disabled },
          { id: "worktree", label: "Run in new worktree", disabled: next.disabled || next.pending },
        ],
      });
      trigger.disabled = next.disabled;
    },
    dispose() {
      trigger.removeEventListener("click", capture, true);
      menu.dispose();
      button.dispose();
      buttonRoot.remove();
      menuRoot.remove();
      opened = state = null;
    },
  };
}
