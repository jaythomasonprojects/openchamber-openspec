import { mountButton, mountProgress } from "@openchamber/sdk/ui";
import type { Task } from "../contracts.js";
import type { ReadState } from "./resources.js";

export function mountTasksView(root: HTMLElement, retryRead: () => void) {
  root.className = "tasks-view";
  const summary = document.createElement("p");
  summary.className = "content-status";
  const progressRoot = document.createElement("div");
  const progress = mountProgress(progressRoot, { value: 0, label: "Task completion" });
  const issue = document.createElement("p");
  issue.className = "notice error";
  const retryRoot = document.createElement("span");
  const retry = mountButton(retryRoot, {
    label: "Retry tasks",
    variant: "secondary",
    size: "sm",
    onClick: retryRead,
  });
  const list = document.createElement("ol");
  list.className = "task-rows";
  root.append(summary, progressRoot, issue, retryRoot, list);
  const rows = new Map<string, { row: HTMLLIElement; mark: HTMLElement; label: HTMLElement }>();
  function clear() {
    rows.clear();
    list.replaceChildren();
  }
  return {
    update(state: ReadState<Task[]> | null, retryable = true, emptyMessage = "") {
      const tasks = state?.value ?? [];
      const completed = tasks.filter((task) => task.done).length;
      summary.textContent =
        tasks.length || state?.error || !retryable
          ? ""
          : state?.pending
            ? "Loading tasks…"
            : emptyMessage || "No tasks tracked yet.";
      summary.hidden = !summary.textContent;
      progressRoot.hidden = !tasks.length;
      progress.update({
        value: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        label: tasks.length ? `${completed} of ${tasks.length} tasks complete` : "Task completion",
      });
      issue.textContent = retryable ? (state?.error?.message ?? "") : "";
      issue.hidden = !issue.textContent;
      retryRoot.hidden = !state?.error || !retryable;
      const ids = new Set(tasks.map((task) => task.id));
      for (const [id, row] of rows)
        if (!ids.has(id)) {
          row.row.remove();
          rows.delete(id);
        }
      tasks.forEach((task, index) => {
        let item = rows.get(task.id);
        if (!item) {
          const row = document.createElement("li");
          row.className = "task-row";
          const mark = document.createElement("span");
          mark.className = "task-indicator";
          mark.setAttribute("role", "img");
          const label = document.createElement("span");
          label.className = "task-title";
          row.append(mark, label);
          item = { row, mark, label };
          rows.set(task.id, item);
        }
        item.row.classList.toggle("done", task.done);
        item.mark.textContent = task.done ? "✓" : "○";
        item.mark.setAttribute("aria-label", task.done ? "Complete" : "Pending");
        item.label.textContent = task.description;
        if (list.children[index] !== item.row)
          list.insertBefore(item.row, list.children[index] ?? null);
      });
    },
    reset: clear,
    dispose() {
      progress.dispose();
      retry.dispose();
      clear();
      root.replaceChildren();
    },
  };
}
