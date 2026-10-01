import { mountButton } from "@openchamber/sdk/ui";
import { renderDocument } from "./document-renderer.js";

export function mountDocumentView(
  root: HTMLElement,
  callbacks: { openUrl: (url: string) => void } = { openUrl: () => {} },
) {
  const content = document.createElement("div");
  content.className = "document-content";
  const presentationIssue = document.createElement("p");
  presentationIssue.className = "document-issue";
  presentationIssue.hidden = true;
  const onLink = (event: MouseEvent) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!link || !content.contains(link)) return;
    event.preventDefault();
    if (event.button > 1) return;
    const href = link.dataset.documentHref!;
    if (href.startsWith("#")) {
      let id: string;
      try {
        id = decodeURIComponent(href.slice(1));
      } catch {
        return;
      }
      const heading = Array.from(content.querySelectorAll<HTMLElement>("[id]")).find(
        (node) => node.id === `document-${id}`,
      );
      heading?.scrollIntoView({ block: "nearest" });
    } else if (/^https?:\/\//i.test(href)) callbacks.openUrl(href);
  };
  content.addEventListener("click", onLink);
  content.addEventListener("auxclick", onLink);
  const status = document.createElement("p");
  status.className = "document-status";
  const issue = document.createElement("p");
  issue.className = "document-issue";
  const retryRoot = document.createElement("span");
  let onRetry = () => {};
  const retry = mountButton(retryRoot, {
    label: "Retry document",
    variant: "secondary",
    size: "sm",
    onClick: () => onRetry(),
  });
  root.append(content, presentationIssue, status, issue, retryRoot);
  let displayed: string | null = null;
  let format: string | null = null;
  let renderingFailed = false;
  return {
    update(next: {
      text: string;
      format?: "markdown" | "text";
      hasContent: boolean;
      status: string | null;
      error: string | null;
      retry: () => void;
      canRetry: boolean;
    }) {
      if (next.hasContent && (displayed !== next.text || format !== (next.format ?? "text"))) {
        renderingFailed = false;
        try {
          if (next.format === "markdown") content.replaceChildren(renderDocument(next.text));
          else {
            const pre = document.createElement("pre");
            pre.textContent = next.text;
            content.replaceChildren(pre);
          }
        } catch {
          const pre = document.createElement("pre");
          pre.textContent = next.text;
          content.replaceChildren(pre);
          presentationIssue.textContent = "Document rendering failed. Original source is shown.";
          renderingFailed = true;
        }
        displayed = next.text;
        format = next.format ?? "text";
      }
      content.hidden = !next.hasContent;
      presentationIssue.hidden = !next.hasContent || !renderingFailed;
      status.textContent = next.status ?? "";
      status.hidden = !next.status;
      issue.textContent = next.error ?? "";
      issue.hidden = !next.error;
      retryRoot.hidden = !next.error;
      onRetry = next.retry;
      retry.update({ disabled: !next.canRetry });
    },
    dispose() {
      content.removeEventListener("click", onLink);
      content.removeEventListener("auxclick", onLink);
      retry.dispose();
      root.replaceChildren();
    },
  };
}
