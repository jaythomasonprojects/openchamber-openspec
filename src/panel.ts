import { connectHost } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";
import { mountController } from "./panel/controller.js";

const root = document.querySelector<HTMLElement>("#root");
if (!root) throw new Error("Panel root is missing");
const host = connectHost();
const offTheme = host.onReady((ready) => {
  applyHostReady(ready, document.documentElement);
  document.documentElement.classList.add("oc-themed");
  root.style.visibility = "visible";
});
const unmount = mountController(host, root);
window.addEventListener(
  "pagehide",
  () => {
    offTheme();
    unmount();
    host.dispose();
  },
  { once: true },
);
