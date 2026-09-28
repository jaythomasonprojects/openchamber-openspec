import { mountButton } from "@openchamber/sdk/ui";

export function mountHelpButton(root: HTMLElement, onClick: () => void) {
  root.className = "help-control";
  const handle = mountButton(root, { label: "", variant: "ghost", size: "sm", onClick });
  const button = root.querySelector("button")!;
  button.setAttribute("aria-label", "OpenSpec quickstart");
  button.title = "OpenSpec quickstart";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "16");
  icon.setAttribute("height", "16");
  icon.setAttribute("aria-hidden", "true");
  const outline = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  outline.setAttribute("cx", "12");
  outline.setAttribute("cy", "12");
  outline.setAttribute("r", "9");
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", "currentColor");
  outline.setAttribute("stroke-width", "1.8");
  const hook = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hook.setAttribute("d", "M9.6 9.5a2.5 2.5 0 1 1 4.4 1.6c-.6.7-2 1.1-2 2.4");
  hook.setAttribute("fill", "none");
  hook.setAttribute("stroke", "currentColor");
  hook.setAttribute("stroke-width", "1.8");
  hook.setAttribute("stroke-linecap", "round");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", "12");
  dot.setAttribute("cy", "16.7");
  dot.setAttribute("r", "1");
  dot.setAttribute("fill", "currentColor");
  icon.append(outline, hook, dot);
  button.prepend(icon);
  return handle;
}
