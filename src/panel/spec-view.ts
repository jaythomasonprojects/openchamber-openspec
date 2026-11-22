import { mountButton } from "@openchamber/sdk/ui";
import { mountDocumentView } from "./document-view.js";
import type { ReadState } from "./resources.js";

export function mountSpecView(
  root: HTMLElement,
  callbacks: {
    close: () => void;
    refresh: () => void;
    retry: () => void;
    openUrl: (url: string) => void;
  },
) {
  const pane = document.createElement("section");
  pane.className = "detail spec-detail";
  const header = document.createElement("header");
  header.className = "detail-header";
  const controls = document.createElement("div");
  controls.className = "spec-header";
  const back = mountButton(controls, {
    label: "Back to specs",
    variant: "ghost",
    size: "sm",
    onClick: callbacks.close,
  });
  const refresh = mountButton(controls, {
    label: "refresh",
    variant: "ghost",
    size: "sm",
    onClick: callbacks.refresh,
  });
  const title = document.createElement("h1");
  title.id = "spec-detail-title";
  pane.setAttribute("aria-labelledby", title.id);
  header.append(controls, title);
  const content = document.createElement("div");
  content.className = "detail-content";
  content.tabIndex = 0;
  content.setAttribute("role", "region");
  content.setAttribute("aria-label", "Spec document");
  const doc = mountDocumentView(content, { openUrl: callbacks.openUrl });
  pane.append(header, content);
  root.append(pane);

  return {
    update(id: string, state: ReadState<string> | null, loading: boolean, error: string | null) {
      if (id !== title.textContent) {
        title.textContent = id;
        content.scrollTop = 0;
      }
      refresh.update({ loading });
      const text = state?.value ?? null;
      const issue = state?.error?.message ?? error;
      doc.update({
        text: text ?? "",
        format: "markdown",
        hasContent: text !== null,
        status: text === null && !issue ? "Loading spec…" : null,
        error: issue,
        retry: callbacks.retry,
        canRetry: !loading && !state?.pending,
      });
    },
    focusBack() {
      controls.querySelector("button")?.focus({ preventScroll: true });
    },
    dispose() {
      doc.dispose();
      back.dispose();
      refresh.dispose();
      pane.remove();
    },
  };
}
