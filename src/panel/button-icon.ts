const paths = {
  refresh: "M20 11a8 8 0 1 1-2.4-5.7M20 4v5h-5",
  create: "M12 5v14M5 12h14",
  delete: "M4 7h16M10 4h4m4 3-1 13H7L6 7m4 4v5m4-5v5",
} as const;

export function addButtonIcon(root: HTMLElement, name: keyof typeof paths) {
  root.classList.add("loading-action");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", paths[name]);
  svg.append(path);
  root.querySelector("button")!.prepend(svg);
}
