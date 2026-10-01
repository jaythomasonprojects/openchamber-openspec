import { mountBadge } from "@openchamber/sdk/ui";

export function mountAreaBadges(parent: HTMLElement) {
  const group = document.createElement("div");
  group.className = "affected-areas";
  group.hidden = true;
  parent.append(group);
  let signature = "[]";
  let handles: ReturnType<typeof mountBadge>[] = [];
  function clear() {
    handles.forEach((handle) => handle.dispose());
    handles = [];
    group.replaceChildren();
  }
  return {
    update(areas: string[]) {
      const next = JSON.stringify(areas);
      if (signature === next) return;
      clear();
      signature = next;
      group.hidden = !areas.length;
      for (const label of areas) {
        const target = document.createElement("span");
        group.append(target);
        handles.push(mountBadge(target, { label, tone: "neutral" }));
      }
    },
    dispose() {
      clear();
      group.remove();
    },
  };
}
