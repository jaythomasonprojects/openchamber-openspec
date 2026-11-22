import type { HostDevice } from "@openchamber/sdk";

export function applyDevice(device?: HostDevice) {
  const { dataset, style } = document.documentElement;
  dataset.pointer =
    device?.pointer ?? (matchMedia("(pointer: coarse)").matches ? "coarse" : "fine");
  style.setProperty("--oc-inset-bottom", `${device?.insets.bottom ?? 0}px`);
  style.setProperty("--oc-keyboard", `${device?.keyboard ?? 0}px`);
}
