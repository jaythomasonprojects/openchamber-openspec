import { mountButton } from "@openchamber/sdk/ui";

export function mountDocumentView(root: HTMLElement) {
  const content = document.createElement("pre");
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
  root.append(content, status, issue, retryRoot);
  let displayed = "";
  return {
    update(next: {
      text: string;
      hasContent: boolean;
      status: string | null;
      error: string | null;
      retry: () => void;
      canRetry: boolean;
    }) {
      if (displayed !== next.text) {
        content.textContent = next.text;
        displayed = next.text;
      }
      content.hidden = !next.hasContent;
      status.textContent = next.status ?? "";
      status.hidden = !next.status;
      issue.textContent = next.error ?? "";
      issue.hidden = !next.error;
      retryRoot.hidden = !next.error;
      onRetry = next.retry;
      retry.update({ disabled: !next.canRetry });
    },
    dispose() {
      retry.dispose();
      root.replaceChildren();
    },
  };
}
