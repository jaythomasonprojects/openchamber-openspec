import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import test from "node:test";
import { createOpenSpecService, runOpenSpec } from "../service/main.js";
import { fixtureChange, withProjects } from "./helpers/openspec.mjs";

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test("compiled panel reads and creates through the real local service and temporary OpenSpec project", async (t) => {
  await withProjects(async (directory) => {
    const change = "integration-change";
    await fixtureChange(
      directory,
      change,
      "# Integration proposal content\n\nA **real** planning document.\n\n```mermaid\nflowchart LR\n Read --> Plan --> Apply\n```\n",
    );
    const changeDir = join(directory, "openspec", "changes", change);
    const metadataPath = join(changeDir, ".openspec.yaml");
    const metadata = await readFile(metadataPath, "utf8");
    const setAreas = (areas) =>
      writeFile(metadataPath, metadata + `\naffected_areas: ${JSON.stringify(areas)}\n`);
    await setAreas(["auth", "api", "auth"]);
    await writeFile(
      join(changeDir, "tasks.md"),
      "# Tasks\n\n## Delivery\n\n- [ ] 1.1 Review integrated view\n      Keep a continuation in the source.\n",
    );
    for (const name of ["first", "second"]) {
      const path = join(changeDir, "specs", name);
      await mkdir(path, { recursive: true });
      await writeFile(join(path, "spec.md"), `# ${name} integration document\n`);
    }
    await writeFile(join(changeDir, "design.md"), "# Integration design\n");
    const mainSpec = join(directory, "openspec", "specs", "existing", "spec.md");
    await mkdir(join(directory, "openspec", "specs", "existing"), { recursive: true });
    await writeFile(mainSpec, "# Existing main spec\n");
    const implementation = join(directory, "implementation.ts");
    await writeFile(implementation, "export const kept = true;\n");
    const cliCalls = [];
    const service = createOpenSpecService("integration-token", (cwd, args, remaining) => {
      cliCalls.push(args[0]);
      return runOpenSpec(cwd, args, remaining);
    });
    let host;
    let browser;
    try {
      const serviceUrl = await listen(service);
      const [index, panel] = await Promise.all([
        readFile(new URL("../panel/index.html", import.meta.url)),
        readFile(new URL("../panel/main.js", import.meta.url)),
      ]);
      const ready = {
        directory,
        session: { id: "integration-session", title: "Integration" },
        surface: "panel",
        locale: "en-AU",
        connection: { connected: true, account: "" },
        settings: {},
        item: null,
        theme: {
          mode: "dark",
          tokens: {
            background: "#15191c",
            foreground: "#e3e7ea",
            elevated: "#1d2226",
            border: "#30363c",
            muted: "#a0a9b1",
            focus: "#75b6a0",
          },
        },
      };
      const html = `<!doctype html><script>
      const ready = ${JSON.stringify(ready)};
      window.__requests = [];
      addEventListener("message", async (event) => {
        const message = event.data;
        if (!message || message.channel !== "openchamber.sdk" || message.v !== 1) return;
        const reply = (payload) => event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id, ok: true, payload }, "*");
        if (message.type === "hello") { event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "ready", payload: ready }, "*"); return; }
        if (message.type === "service-request") {
          window.__requests.push({ path: message.payload.path, body: JSON.parse(message.payload.body) });
          try {
            const response = await fetch("/service" + message.payload.path, { method: "POST", headers: { "content-type": "application/json" }, body: message.payload.body });
            reply({ status: response.status, body: await response.text() });
          } catch (error) { event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id, ok: false, error: { code: "NETWORK", message: String(error) } }, "*"); }
          return;
        }
       if (message.type === "compose") { (window.__compositions ||= []).push(message.payload); window.__compose = message.payload; reply(); return; }
        if (message.type === "toast") reply(undefined);
      });
    </script><style>iframe{width:100%;height:100vh;border:0}</style><iframe src="/panel/index.html" title="OpenSpec integration panel"></iframe>`;
      host = createServer(async (request, response) => {
        const path = new URL(request.url, "http://127.0.0.1").pathname;
        if (path.startsWith("/service/")) {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          const forwarded = await fetch(serviceUrl + path.slice("/service".length), {
            method: "POST",
            headers: {
              authorization: "Bearer integration-token",
              "content-type": "application/json",
            },
            body: Buffer.concat(chunks),
          });
          response.writeHead(forwarded.status, { "content-type": "application/json" });
          response.end(Buffer.from(await forwarded.arrayBuffer()));
        } else if (path === "/panel/main.js") {
          response.setHeader("content-type", "text/javascript");
          response.end(panel);
        } else {
          response.setHeader("content-type", "text/html");
          response.end(path === "/panel/index.html" ? index : html);
        }
      });
      const hostUrl = await listen(host);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(hostUrl, { waitUntil: "networkidle" });
      const panelFrame = page.frameLocator('iframe[title="OpenSpec integration panel"]');
      await panelFrame.getByRole("button", { name: change }).waitFor({ timeout: 30000 });
      assert.deepEqual(
        await panelFrame.locator(".change-card .affected-areas .oc-sdk-badge").allTextContents(),
        ["auth", "api", "auth"],
      );
      await panelFrame.getByRole("button", { name: change }).click();
      assert.deepEqual(
        await panelFrame.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
        ["auth", "api", "auth"],
      );
      await panelFrame
        .getByRole("heading", { name: "Integration proposal content" })
        .waitFor({ timeout: 30000 });
      assert.equal(
        await panelFrame.locator(".document-content pre code").textContent(),
        "flowchart LR\n Read --> Plan --> Apply",
      );
      assert.equal(await panelFrame.locator(".document-content svg").count(), 0);
      assert.equal(await panelFrame.locator(".document-content strong").textContent(), "real");
      await page.waitForFunction(() =>
        window.__requests.some((item) => item.body?.selector === "design.md"),
      );
      await panelFrame.getByRole("tab", { name: /Design · Written/ }).click();
      await panelFrame.getByRole("heading", { name: "Integration design" }).waitFor();
      const initial = await page.evaluate(() => window.__requests.map((item) => item.path));
      assert.deepEqual(initial.slice(0, 2), ["/changes", "/summary"]);
      assert.equal(initial.filter((path) => path === "/document").length, 4);
      assert.equal(initial.filter((path) => path === "/tasks").length, 1);
      assert.equal(
        await page.evaluate(
          () =>
            window.__requests.filter(
              (item) => item.path === "/document" && item.body.selector === "proposal.md",
            ).length,
        ),
        1,
      );
      await panelFrame.getByRole("tab", { name: /Tasks · Written/ }).click();
      await panelFrame.getByText(/1.1 Review integrated view/).waitFor();
      assert.equal(await panelFrame.locator(".task-row details").count(), 0);
      assert.equal(await panelFrame.getByText("Keep a continuation in the source.").count(), 0);
      assert.equal(
        await panelFrame
          .getByRole("tab", { name: /Tasks · Written/ })
          .getAttribute("aria-selected"),
        "true",
      );
      await panelFrame.getByRole("tab", { name: /Specs · Written/ }).click();
      await page.waitForFunction(
        () =>
          window.__requests.filter(
            (item) => item.path === "/document" && item.body.artifactId === "specs",
          ).length === 2,
      );
      await panelFrame
        .locator(".detail-content details summary")
        .getByText("specs/first/spec.md")
        .click();
      await panelFrame.getByRole("heading", { name: "first integration document" }).waitFor();
      assert.deepEqual(
        await page.evaluate(() => window.__requests.map((item) => item.path)),
        initial,
      );
      await panelFrame
        .locator(".detail-content details summary")
        .getByText("specs/second/spec.md")
        .click();
      await panelFrame.getByRole("heading", { name: "second integration document" }).waitFor();
      await panelFrame
        .locator(".detail-content details summary")
        .getByText("specs/first/spec.md")
        .click();
      await panelFrame.getByRole("heading", { name: "first integration document" }).waitFor();
      const warmReads = await page.evaluate(
        () =>
          window.__requests.filter(
            (item) => item.path === "/document" && item.body.selector === "specs/first/spec.md",
          ).length,
      );
      assert.ok(warmReads <= 1);
      await writeFile(
        join(changeDir, "specs", "first", "spec.md"),
        "# Edited integration document\n",
      );
      await page.evaluate(() =>
        document
          .querySelector("iframe")
          .contentDocument.dispatchEvent(new Event("visibilitychange")),
      );
      assert.equal(
        await panelFrame.getByRole("heading", { name: "Edited integration document" }).count(),
        0,
      );
      await panelFrame.getByRole("heading", { name: "first integration document" }).waitFor();
      await panelFrame.getByRole("tab", { name: /Tasks · Written/ }).click();
      await writeFile(
        join(changeDir, "tasks.md"),
        "# Tasks\n\n## Delivery\n\n- [x] 1.1 Review integrated view\n      Updated source continuation.\n",
      );
      assert.equal(await panelFrame.getByText("1 of 1 tasks complete", { exact: true }).count(), 0);
      await setAreas(["panel", "service"]);
      assert.deepEqual(
        await panelFrame.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
        ["auth", "api", "auth"],
      );
      await panelFrame.getByRole("button", { name: "Back to changes" }).click();
      await panelFrame.getByRole("button", { name: "refresh", exact: true }).click();
      await panelFrame
        .getByText("1 of 1 tasks complete", { exact: true })
        .first()
        .waitFor({ timeout: 30000 });
      await panelFrame.getByRole("button", { name: change }).click();
      assert.deepEqual(
        await panelFrame.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
        ["panel", "service"],
      );
      await panelFrame.getByRole("tab", { name: /Tasks · Written/ }).click();
      await panelFrame.getByText(/1.1 Review integrated view/).waitFor();
      assert.equal(await panelFrame.locator(".task-row.done").count(), 1);
      assert.equal(await panelFrame.getByText("Updated source continuation.").count(), 0);
      await panelFrame.getByRole("tab", { name: /Specs · Written/ }).click();
      await panelFrame
        .locator(".detail-content details summary")
        .getByText("specs/first/spec.md")
        .click();
      await panelFrame
        .getByRole("heading", { name: "Edited integration document" })
        .waitFor({ timeout: 30000 });
      await setAreas([]);
      await panelFrame.getByRole("button", { name: "refresh", exact: true }).click();
      await panelFrame
        .locator(".detail .affected-areas")
        .waitFor({ state: "hidden", timeout: 30000 });
      assert.equal(await panelFrame.locator(".detail .affected-areas .oc-sdk-badge").count(), 0);
      await panelFrame.getByRole("button", { name: "Back to changes" }).click();
      await panelFrame.getByRole("heading", { name: "Complete 1" }).waitFor({ timeout: 30000 });
      const completedCard = panelFrame.locator(".change-card").filter({ hasText: change });
      assert.equal(await completedCard.locator(".affected-areas").isVisible(), false);
      await completedCard.getByRole("button", { name: "archive" }).click();
      await page.waitForFunction(() =>
        window.__compose?.text?.startsWith("/openspec-archive-change "),
      );
      await completedCard.getByRole("button", { name: "verify" }).click();
      await page.waitForFunction(() =>
        window.__compose?.text?.startsWith("/openspec-verify-change "),
      );
      assert.deepEqual(await page.evaluate(() => window.__compositions.map(({ mode }) => mode)), [
        "replace",
        "replace",
      ]);
      assert.equal(
        await page.evaluate(() => window.__requests.some((item) => item.path === "/archive")),
        false,
      );
      await panelFrame.getByRole("button", { name: "new change" }).click();
      await panelFrame.getByLabel("Change name").fill("created-in-fixture");
      await panelFrame.getByLabel("Goal").fill("Fixture creation goal");
      await panelFrame.getByRole("button", { name: "create", exact: true }).click();
      await panelFrame
        .getByRole("button", { name: "created-in-fixture" })
        .waitFor({ timeout: 30000 });
      await panelFrame
        .locator(".change-card")
        .filter({ hasText: "created-in-fixture" })
        .getByRole("button", { name: "propose" })
        .click();
      await page.waitForFunction(() => window.__compose?.text?.includes("created-in-fixture"));
      assert.equal(await page.evaluate(() => window.__compose.mode), "replace");
      assert.match(
        await page.evaluate(() => window.__compose.text),
        /^\/openspec-propose created-in-fixture \(existing change\)\nGoal: Fixture creation goal\n\nInspect/,
      );
      await panelFrame.getByRole("button", { name: "created-in-fixture" }).click();
      await panelFrame
        .locator(".detail-toolbar")
        .getByRole("button", { name: "Delete change" })
        .click();
      const confirm = panelFrame.getByRole("dialog", { name: /Delete created-in-fixture/ });
      await confirm.getByRole("button", { name: "delete" }).click();
      await panelFrame
        .getByRole("button", { name: "created-in-fixture" })
        .waitFor({ state: "hidden", timeout: 30000 });
      await panelFrame.getByRole("button", { name: change }).waitFor({ timeout: 30000 });
      const afterDelete = await runOpenSpec(directory, ["list"]);
      assert.equal(afterDelete.ok, true);
      assert.deepEqual(
        afterDelete.value.changes.map((item) => item.name),
        [change],
      );
      assert.equal(await readFile(mainSpec, "utf8"), "# Existing main spec\n");
      assert.equal(await readFile(implementation, "utf8"), "export const kept = true;\n");
      assert.equal(
        await readFile(join(changeDir, "proposal.md"), "utf8").then((text) =>
          text.includes("Integration proposal"),
        ),
        true,
      );
      assert.deepEqual(errors, []);
      assert.equal(
        await page.evaluate(
          () => window.__requests.filter((item) => item.path === "/create").length,
        ),
        1,
      );
      assert.equal(
        await page.evaluate(
          () => window.__requests.filter((item) => item.path === "/delete").length,
        ),
        1,
      );
      const counts = await page.evaluate(() =>
        Object.fromEntries(
          [...new Set(window.__requests.map((item) => item.path))].map((path) => [
            path,
            window.__requests.filter((item) => item.path === path).length,
          ]),
        ),
      );
      const commands = Object.fromEntries(
        [...new Set(cliCalls)].map((command) => [
          command,
          cliCalls.filter((item) => item === command).length,
        ]),
      );
      t.diagnostic(
        `Disposable integration requests: ${JSON.stringify(counts)}; CLI calls: ${cliCalls.length} ${JSON.stringify(commands)}.`,
      );
    } finally {
      const cleanup = await Promise.allSettled([
        ...(browser ? [browser.close()] : []),
        ...(host?.listening
          ? [
              new Promise((resolve, reject) =>
                host.close((error) => (error ? reject(error) : resolve())),
              ),
            ]
          : []),
        ...(service.listening
          ? [
              new Promise((resolve, reject) =>
                service.close((error) => (error ? reject(error) : resolve())),
              ),
            ]
          : []),
      ]);
      const failures = cleanup.filter((result) => result.status === "rejected");
      if (failures.length) throw new AggregateError(failures.map((result) => result.reason));
    }
  });
});
