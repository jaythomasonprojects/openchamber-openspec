import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import test from "node:test";

const directory = "/tmp/fixture-project";
const root = `${directory}/openspec`;
const theme = (mode) => ({
  mode,
  tokens: {
    background: mode === "light" ? "#ffffff" : "#15191c",
    elevated: mode === "light" ? "#f5f7f8" : "#1d2226",
    foreground: mode === "light" ? "#161616" : "#e3e7ea",
    muted: mode === "light" ? "#555f67" : "#a0a9b1",
    subtle: mode === "light" ? "#727c84" : "#737b83",
    border: mode === "light" ? "#d4dbe0" : "#30363c",
    hover: mode === "light" ? "#e8eff0" : "#252b30",
    selection: mode === "light" ? "#dcece6" : "#253b35",
    focus: mode === "light" ? "#187659" : "#75b6a0",
    primary: mode === "light" ? "#cfe9dc" : "#253b35",
    mutedSurface: mode === "light" ? "#e9eff1" : "#20262a",
    elevatedForeground: mode === "light" ? "#161616" : "#e3e7ea",
    active: mode === "light" ? "#b8d7cb" : "#304f45",
    selectionForeground: mode === "light" ? "#163a2d" : "#e3e7ea",
    primaryForeground: mode === "light" ? "#163a2d" : "#e3e7ea",
    primaryText: mode === "light" ? "#19644b" : "#c2e1d7",
    successText: mode === "light" ? "#22704b" : "#9ed9b9",
    warningText: mode === "light" ? "#775617" : "#e4c775",
    errorText: mode === "light" ? "#a32727" : "#e3a1a1",
    infoText: mode === "light" ? "#245f91" : "#9bc2e5",
    success: mode === "light" ? "#d7edde" : "#276749",
    warning: mode === "light" ? "#f6eacd" : "#805d1b",
    error: mode === "light" ? "#f6dcdc" : "#8b3434",
    info: mode === "light" ? "#daeafb" : "#285e8e",
    font: "system-ui, sans-serif",
    mono: "ui-monospace, monospace",
    radius: "8px",
  },
});
const artifacts = [
  { id: "proposal", status: "done", outputPath: "proposal.md", requires: [] },
  { id: "specs", status: "done", outputPath: "specs/**/*.md", requires: ["proposal"] },
  { id: "tasks", status: "done", outputPath: "tasks.md", requires: ["specs"] },
];
function hostHtml() {
  const data = JSON.stringify({ directory, root, artifacts, theme: theme("dark") });
  const themes = JSON.stringify({ dark: theme("dark"), light: theme("light") });
  return `<!doctype html><script>
    const { directory, root, artifacts, theme } = ${data};
    let currentRoot = root;
    const guests = new Set();
    const changes = [
      { id: "first-change", goal: "Read the proposal", completedTasks: 1, totalTasks: 2 },
      { id: "second-change", goal: "Review the specs", completedTasks: 0, totalTasks: 0 },
    ];
    let proposal = "First version of proposal";
    let tasks = [{ id: "1", description: "1.1 CLI description", done: true },
      { id: "2", description: "Second description", done: false }];
    let holdFiles = false;
    let holdListing = false;
    let holdSummaries = location.search.includes("hold-summary");
    const pendingSummaries = [];
    let failSummary = location.search.includes("fail-summary");
    let failDocument = false;
    let failTasks = false;
    let unavailable = false;
    let unavailableOnRelease = false;
    let rootErrorPath = "";
    let unknownCreate = false;
    let createReply = "success";
    let createWrites = true;
    let holdCreate = false;
    let holdDelete = false;
    let unknownDelete = false;
    let malformedDelete = false;
    let failNextListing = false;
    const pendingDeletes = [];
    const pendingCreates = [];
    let holdProposal = false;
    let holdTasks = false;
    let withDesign = false;
    let longSpec = false;
    let failSpec2 = false;
    let custom = false;
    let collidingLabels = false;
    let longArtifact = false;
    let readinessCase = "";
    let draft = "Earlier draft";
    let holdCompose = false;
    let failCompose = false;
    let failOpenUrl = false;
    const pendingCompose = [];
    const pending = [];
    window.__requests = [];
    window.__completed = [];
    window.__edit = (text) => { proposal = text; tasks[1].done = true; changes[0].completedTasks = 2; };
    window.__unedit = () => { tasks[1].done = false; changes[0].completedTasks = 1; };
    window.__goal = (id, value) => { changes.find((item) => item.id === id).goal = value; };
    window.__areas = (id, value) => { changes.find((item) => item.id === id).affectedAreas = value; };
    window.__rename = (before, after) => { changes.find((item) => item.id === before).id = after; };
    window.__remove = (id) => { const index = changes.findIndex((item) => item.id === id); changes.splice(index, 1); };
    window.__recreate = (id) => { changes.push({ id, goal: "Recreated goal", completedTasks: 0, totalTasks: 0 }); };
    window.__addSameStage = () => { changes.push({ id: "alpha-change", goal: "Another goal", completedTasks: 1, totalTasks: 2 }); };
    window.__theme = (mode) => { for (const guest of guests) guest.postMessage({ channel: "openchamber.sdk", v: 1,
      type: "ready", payload: { ...ready, theme: ${themes}[mode] } }, "*"); };
    window.__failSummary = () => { failSummary = true; };
    window.__failDocument = () => { failDocument = true; };
    window.__failTasks = () => { failTasks = true; };
    window.__clearTasks = () => { tasks = []; changes[0].completedTasks = 0; changes[0].totalTasks = 0; };
    window.__unavailable = () => { unavailable = true; };
    window.__unavailableOnRelease = () => { unavailableOnRelease = true; };
    window.__rootErrorOn = (path) => { rootErrorPath = path; };
    window.__unknownCreate = () => { unknownCreate = true; };
    window.__createReply = (reply, writes = true) => { createReply = reply; createWrites = writes; };
    window.__holdCreate = () => { holdCreate = true; };
    window.__holdDelete = () => { holdDelete = true; };
    window.__releaseDelete = () => { holdDelete = false; pendingDeletes.splice(0).forEach((finish) => finish()); };
    window.__unknownDelete = () => { unknownDelete = true; };
    window.__malformedDelete = () => { malformedDelete = true; };
    window.__keepOnUnknownDelete = () => { unknownDelete = "present"; };
    window.__failNextListing = () => { failNextListing = true; };
    window.__releaseCreate = () => { holdCreate = false; pendingCreates.splice(0).forEach((finish) => finish()); };
    window.__holdProposal = () => { holdProposal = true; };
    window.__holdTasks = () => { holdTasks = true; };
    window.__design = () => { withDesign = true; };
    window.__longSpec = () => { longSpec = true; };
    window.__failSpec2 = () => { failSpec2 = true; };
    window.__custom = () => { custom = true; };
    window.__collidingLabels = () => { collidingLabels = true; };
    window.__longArtifact = () => { longArtifact = true; };
    window.__readiness = (mode) => { readinessCase = mode; };
    window.__proposalStatus = (status) => { artifacts[0].status = status; };
    window.__draft = () => draft;
    window.__session = (id) => { ready.session = id ? { id } : null;
      for (const guest of guests) guest.postMessage({ channel: "openchamber.sdk", v: 1,
        type: "session", payload: { session: ready.session } }, "*"); };
    window.__holdCompose = () => { holdCompose = true; };
    window.__releaseCompose = () => { holdCompose = false; pendingCompose.splice(0).forEach((finish) => finish()); };
    window.__failCompose = () => { failCompose = true; };
    window.__failOpenUrl = () => { failOpenUrl = true; };
    window.__holdListing = () => { holdListing = true; };
    window.__releaseListing = () => { holdListing = false; pending.shift()?.(); };
    window.__releaseSummaries = () => { holdSummaries = false; pendingSummaries.splice(0).forEach((finish) => finish()); };
    window.__releaseOneSummary = (index) => { pendingSummaries.splice(index, 1)[0]?.(); };
    window.__holdSummaries = () => { holdSummaries = true; };
    window.__holdFiles = () => { holdFiles = true; };
    window.__releaseFile = () => { const finish = pending.shift(); finish?.(); };
    window.__directory = (next) => { for (const guest of guests) guest.postMessage({ channel: "openchamber.sdk", v: 1,
      type: "directory", payload: { directory: next } }, "*"); };
    window.__root = (next) => { currentRoot = next; };
    const ready = { directory, theme, locale: "en-AU", session: { id: "fixture-session" },
      surface: "panel", connection: { connected: true, account: "" }, settings: {}, item: null };
    addEventListener("message", (event) => {
      const message = event.data;
      if (!message || message.channel !== "openchamber.sdk" || message.v !== 1) return;
       const reply = (payload) => { if (message.type === "service-request") __completed.push(message.payload.path);
         event.source.postMessage({ channel: "openchamber.sdk", v: 1,
           type: "result", id: message.id, ok: true, payload }, "*"); };
      if (message.type === "hello") {
        guests.add(event.source);
        const show = () => event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "ready", payload: ready }, "*");
        if (location.search.includes("hold-ready")) window.__releaseReady = show;
        else show();
        return;
      }
      if (message.type === "service-request") {
        const path = message.payload.path;
        const body = JSON.parse(message.payload.body);
        window.__requests.push({ path, body });
        const send = (value, status = 200) => reply({ status, body: JSON.stringify(value) });
        if (path === "/changes") {
           if (failNextListing) { failNextListing = false;
             send({ error: { code: "CLI_UNAVAILABLE", message: "Cannot check listing" } }, 503); return; }
           const finish = () => send({ directory: body.directory, root: body.directory === directory ? currentRoot : body.directory + "/openspec",
            changes: body.directory === directory ? changes.map(({ id, completedTasks, totalTasks }) => ({ id, completedTasks, totalTasks })) : [] });
          if (holdListing) pending.push(finish); else finish();
        }
        else if (path === "/summary") {
          if (holdSummaries) {
            pendingSummaries.push(() => respondSummary(body, send));
          } else respondSummary(body, send);
        }
        else if (path === "/tasks") {
          if (rootErrorPath === path) { rootErrorPath = ""; send({ error: { code: "ROOT_CHANGED", message: "Root changed" } }, 409); return; }
          if (unavailable) send({ error: { code: "CHANGE_UNAVAILABLE", message: "Change no longer exists." } }, 404);
           else if (failTasks) { failTasks = false; send({ error: { code: "TASKS_UNAVAILABLE", message: "Retry these tasks" } }, 503); }
            else {
              const finish = () => unavailableOnRelease
                ? send({ error: { code: "CHANGE_UNAVAILABLE", message: "Change no longer exists." } }, 404)
                : send({ tasks: body.change === "second-change" ? [] : tasks });
              if (holdTasks) pending.push(finish); else finish();
            }
        }
        else if (path === "/document") {
          const finish = () => unavailableOnRelease
            ? send({ error: { code: "CHANGE_UNAVAILABLE", message: "Change no longer exists." } }, 404)
            : send({ artifactId: body.artifactId, selector: body.selector,
              content: body.selector === "proposal.md" ? proposal
                : longSpec && body.selector === "specs/1.md" ? "Long document line\\n".repeat(200)
                : "Content of " + body.selector });
          if (rootErrorPath === path) { rootErrorPath = ""; send({ error: { code: "ROOT_CHANGED", message: "Root changed" } }, 409); return; }
          if (unavailable) send({ error: { code: "CHANGE_UNAVAILABLE", message: "Change no longer exists." } }, 404);
          else if (failDocument && body.selector === "proposal.md") { failDocument = false;
            send({ error: { code: "DOCUMENT_UNAVAILABLE", message: "Retry this document" } }, 503); }
          else if (failSpec2 && body.selector === "specs/2.md") { failSpec2 = false;
            send({ error: { code: "DOCUMENT_UNAVAILABLE", message: "Second file unavailable" } }, 503); }
          else if (holdFiles && body.artifactId === "specs" || holdProposal && body.artifactId === "proposal") pending.push(finish);
          else finish();
        }
        else if (path === "/create") {
          if (createWrites) changes.push({ id: body.name, goal: body.goal, completedTasks: 0, totalTasks: 0 });
          const finish = () => {
            if (createReply === "invalid-json") reply({ status: 200, body: "{" });
            else if (createReply === "null") send(null);
            else if (createReply === "bad-success") send({ root: "wrong-root", change: body.name });
            else if (createReply === "bad-error") send({ error: null }, 500);
            else if (createReply === "known-error") send({ error: { code: "BAD_GOAL", message: "Known rejection" } }, 400);
            else if (unknownCreate) send({ error: { code: "CLI_TIMEOUT", message: "Write outcome unknown", outcome: "unknown" } }, 504);
            else send({ root, change: body.name });
          };
          if (holdCreate) pendingCreates.push(finish); else finish();
        }
        else if (path === "/delete") {
          const finish = () => {
            const index = changes.findIndex((item) => item.id === body.change);
            if (index >= 0 && unknownDelete !== "present") changes.splice(index, 1);
            if (unknownDelete) send({ error: { code: "CLI_TIMEOUT", message: "Deletion outcome unknown", outcome: "unknown" } }, 504);
            else send({ root: malformedDelete ? "wrong-root" : currentRoot, change: body.change });
          };
          if (holdDelete) pendingDeletes.push(finish); else finish();
        }
        else send({ error: { code: "UNEXPECTED", message: path } }, 500);
        return;
      }
      if (message.type === "compose") {
        window.__requests.push({ path: "compose", body: message.payload });
        const finish = () => {
          if (failCompose) { failCompose = false;
            event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result",
              id: message.id, ok: false, code: "HOST_REJECTED", error: "Composer unavailable" }, "*"); }
          else { draft = message.payload.mode === "replace" ? message.payload.text : draft + message.payload.text; reply(); }
        };
        if (holdCompose) pendingCompose.push(finish); else finish();
        return;
      }
      if (message.type === "open-url") {
        window.__requests.push({ path: "open-url", body: message.payload });
        if (failOpenUrl) { failOpenUrl = false;
          event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result",
            id: message.id, ok: false, code: "HOST_REJECTED", error: "Cannot open quickstart" }, "*"); }
        else reply();
        return;
      }
      if (message.type === "prompt" || message.type === "toast") {
        window.__requests.push({ path: message.type, body: message.payload });
        reply(message.type === "prompt" ? { sent: "skipped" } : undefined);
      }
    });
    function respondSummary(body, send) {
           const reply = send;
           send = (value, status) => reply(value.error ? value : { affectedAreas: changes.find((change) => change.id === body.change)?.affectedAreas ?? [], ...value }, status);
          const item = changes.find((change) => change.id === body.change);
          if (!item) send({ error: { code: "CHANGE_UNAVAILABLE", message: "Removed" } }, 404);
          else if (failSummary && item.id === "first-change") { failSummary = false;
            send({ error: { code: "UNAVAILABLE", message: "Read failed" } }, 503); }
           else if (readinessCase) send({ id: item.id, goal: item.goal, root: currentRoot,
             artifacts: [
                { id: "proposal", status: readinessCase === "unknown" ? "done" : "ready", outputPath: "proposal.md", requires: [] },
                 { id: "specs", status: "blocked", outputPath: "specs/**/*.md", requires: ["proposal"] },
                { id: "design", status: "skipped", outputPath: "design.md", requires: ["proposal"] },
                 { id: "tasks", status: readinessCase === "blocked-tasks" ? "blocked" : "done", outputPath: "tasks.md", requires: ["specs"] },
             ], applyRequires: ["tasks"], documents: readinessCase === "available" ?
               [{ artifactId: "proposal", selector: "proposal.md", label: "proposal.md" }] : [] });
           else if (longArtifact) send({ id: item.id, goal: item.goal, root: currentRoot,
              artifacts: [{ id: "long-artifact-name-that-must-wrap-at-sidebar-width", status: "ready", outputPath: "long.md", requires: [] }],
              applyRequires: ["long-artifact-name-that-must-wrap-at-sidebar-width"], documents: [] });
           else if (collidingLabels) send({ id: item.id, goal: item.goal, root: currentRoot,
            artifacts: [
              { id: "specs", status: "done", outputPath: "a:b", requires: [] },
              { id: "specs:a", status: "done", outputPath: "b", requires: [] },
            ], applyRequires: ["specs"], documents: [
              { artifactId: "specs", selector: "a:b", label: "a:b" },
              { artifactId: "specs:a", selector: "b", label: "b" },
            ] });
           else send({ id: item.id, goal: item.goal, root: currentRoot,
             artifacts: custom ? [artifacts[0], { id: "checklist", status: "done", outputPath: "checklist.md", requires: ["proposal"] }] :
               withDesign ? [artifacts[0], artifacts[1], { id: "design", status: "done", outputPath: "design.md", requires: ["specs"] }, artifacts[2]] : artifacts,
            applyRequires: custom ? ["checklist"] : ["tasks"], documents: [
            { artifactId: "proposal", selector: "proposal.md", label: "proposal.md" },
            ...(custom ? [{ artifactId: "checklist", selector: "checklist.md", label: "checklist.md" }] : [
               ...[1, 2, 3].map((n) => ({ artifactId: "specs", selector: "specs/" + n + ".md", label: "specs/" + n + ".md" })),
               ...(withDesign ? [{ artifactId: "design", selector: "design.md", label: "design.md" }] : []),
              { artifactId: "tasks", selector: "tasks.md", label: "tasks.md" }]),
          ] });
    }
  </script><style>body{margin:0}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe src="/panel/index.html" title="OpenSpec test panel"></iframe>`;
}

async function withPanel(run) {
  const [html, js] = await Promise.all([
    readFile(new URL("../panel/index.html", import.meta.url)),
    readFile(new URL("../panel/main.js", import.meta.url)),
  ]);
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    if (path === "/") {
      response.setHeader("content-type", "text/html");
      response.end(hostHtml());
    } else if (path === "/panel/index.html") {
      response.setHeader("content-type", "text/html");
      response.end(html);
    } else if (path === "/panel/main.js") {
      response.setHeader("content-type", "text/javascript");
      response.end(js);
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  const pageErrors = [];
  try {
    browser = await chromium.launch({ headless: true });
    await run(
      {
        newPage: async (...args) => {
          const page = await browser.newPage(...args);
          page.on("pageerror", (error) => pageErrors.push(error.message));
          return page;
        },
      },
      `http://127.0.0.1:${server.address().port}`,
    );
    if (pageErrors.length) throw new Error(`Browser page error: ${pageErrors.join("; ")}`);
  } finally {
    const cleanup = await Promise.allSettled([
      ...(browser ? [browser.close()] : []),
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
    const failures = cleanup.filter((result) => result.status === "rejected");
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason));
  }
}

test("affected areas are neutral literal read-only badges on cards and detail", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const labels = ["auth", "api", "auth", "<img src=x onerror=alert(1)>"];
    await page.evaluate((labels) => __areas("first-change", labels), labels);
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    const card = panel
      .locator(".change-card")
      .filter({ has: panel.getByRole("button", { name: "first-change", exact: true }) });
    await card.locator(".affected-areas .oc-sdk-badge").first().waitFor();
    assert.deepEqual(await card.locator(".affected-areas .oc-sdk-badge").allTextContents(), labels);
    assert.equal(
      await card.locator(".affected-areas img, .affected-areas button, .affected-areas a").count(),
      0,
    );
    assert.equal(
      await card
        .locator(".affected-areas")
        .evaluate((node) => node.previousElementSibling.className),
      "card-main",
    );
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    assert.deepEqual(
      await panel.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
      labels,
    );
    assert.equal(await panel.locator(".stage-label .oc-sdk-badge").textContent(), "In Progress");
    assert.equal(
      await panel.locator(".stage-label .oc-sdk-badge").getAttribute("data-tone"),
      "primary",
    );
    assert.ok(
      await panel.locator(".detail-title-group").evaluate((group) => {
        const title = group.querySelector("h1").getBoundingClientRect();
        const areas = group.querySelector(".affected-areas").getBoundingClientRect();
        return areas.left > title.right && areas.top < title.bottom;
      }),
      "detail areas sit beside the title on a wide layout",
    );
    assert.ok(
      await panel
        .locator(".affected-areas .oc-sdk-badge")
        .evaluateAll((nodes) => nodes.every((node) => !node.hasAttribute("data-tone"))),
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.equal(
      await panel
        .locator(".change-card")
        .filter({ has: panel.getByRole("button", { name: "second-change", exact: true }) })
        .locator(".affected-areas")
        .isVisible(),
      false,
    );
  });
});

test("affected area refresh retains handles and focus, wraps labels and discards old contexts", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const longTitle = "long-change-" + "title-".repeat(20) + "end";
    const labels = ["area".repeat(40), "Several words in another affected area", "third"];
    await page.evaluate(
      ({ longTitle, labels }) => {
        __rename("first-change", longTitle);
        __areas(longTitle, labels);
      },
      { longTitle, labels },
    );
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: longTitle, exact: true }).waitFor();
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      assert.ok(
        await panel.locator("body").evaluate((body) => body.scrollWidth <= innerWidth),
        "board has no page overflow",
      );
    }
    await panel.getByRole("button", { name: longTitle, exact: true }).click();
    await panel.getByRole("tab", { name: /Proposal/ }).waitFor();
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      assert.ok(
        await panel.locator("body").evaluate((body) => body.scrollWidth <= innerWidth),
        "detail has no page overflow",
      );
      assert.deepEqual(
        await panel.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
        labels,
      );
    }
    const before = await page.evaluate(() => __requests.length);
    await panel.locator(".detail").evaluate((detail) => {
      window.__oldBadge = detail.querySelector(".affected-areas .oc-sdk-badge");
      window.__oldShell = detail;
      detail.querySelector(".goal").focus();
    });
    await panel
      .getByRole("button", { name: "refresh", exact: true })
      .evaluate((button) => button.click());
    await page.waitForFunction((before) => __requests.length >= before + 8, before);
    await panel.getByRole("button", { name: "refresh", exact: true }).waitFor();
    assert.ok(
      await panel
        .locator(".detail")
        .evaluate(
          (detail) =>
            detail === window.__oldShell &&
            detail.querySelector(".affected-areas .oc-sdk-badge") === window.__oldBadge,
        ),
    );
    assert.equal(
      await panel.locator(".detail .goal").evaluate((button) => button === document.activeElement),
      true,
    );
    const requests = await page.evaluate(
      (before) => __requests.slice(before).map((request) => request.path),
      before,
    );
    assert.equal(requests.filter((path) => path === "/changes").length, 1);
    assert.equal(requests.filter((path) => path === "/summary").length, 2);
    assert.equal(requests.length, 8);
    await page.evaluate((id) => __areas(id, ["replacement"]), longTitle);
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel
      .locator(".detail .affected-areas")
      .getByText("replacement", { exact: true })
      .waitFor();
    assert.ok(await panel.locator(".detail").evaluate(() => !window.__oldBadge.isConnected));
    await page.evaluate((id) => __areas(id, []), longTitle);
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.locator(".detail .affected-areas").waitFor({ state: "hidden" });
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByLabel("Search changes").fill("replacement");
    assert.equal(await panel.locator(".change-card").count(), 0);
    await panel.getByLabel("Search changes").fill("");
    await page.evaluate(() => {
      __holdSummaries();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((request) => request.path === "/summary").length >= 12,
    );
    await page.evaluate(() => __directory("/tmp/other-project"));
    await panel.getByText("other-project", { exact: true }).waitFor();
    await page.evaluate(() => __releaseSummaries());
    assert.equal(await panel.locator(".affected-areas .oc-sdk-badge").count(), 0);
  });
});

test("failed area summaries retain successful badges and removed cards dispose their badges", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => __areas("first-change", ["retained"]));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.locator(".affected-areas").getByText("retained", { exact: true }).waitFor();
    await panel.locator(".board-shell").evaluate((board) => {
      window.__cardBadge = board.querySelector(".affected-areas .oc-sdk-badge");
    });
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await page.evaluate(() => {
      __areas("first-change", [""]);
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.locator(".detail-refresh-issue").waitFor();
    assert.deepEqual(
      await panel.locator(".detail .affected-areas .oc-sdk-badge").allTextContents(),
      ["retained"],
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.deepEqual(
      await panel.locator(".change-card .affected-areas .oc-sdk-badge").allTextContents(),
      ["retained"],
    );
    assert.ok(
      await panel
        .locator(".board-shell")
        .evaluate(
          (board) => board.querySelector(".affected-areas .oc-sdk-badge") === window.__cardBadge,
        ),
    );
    await panel.getByLabel("Search changes").fill("retained");
    assert.equal(await panel.locator(".change-card").count(), 0);
    await panel.getByLabel("Search changes").fill("");
    await page.evaluate(() => __remove("first-change"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel
      .getByRole("button", { name: "first-change", exact: true })
      .waitFor({ state: "detached" });
    assert.ok(await panel.locator(".board-shell").evaluate(() => !window.__cardBadge.isConnected));
    await page.evaluate(() => __areas("second-change", ["context-owned"]));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.locator(".affected-areas").getByText("context-owned", { exact: true }).waitFor();
    await panel.locator(".board-shell").evaluate((board) => {
      window.__contextBadge = board.querySelector(".affected-areas .oc-sdk-badge");
    });
    await page.evaluate(() => __directory("/tmp/new-context"));
    await panel.getByText("new-context", { exact: true }).waitFor();
    assert.ok(
      await panel.locator(".board-shell").evaluate(() => !window.__contextBadge.isConnected),
    );
  });
});

test("panel harness fails on an uncaught asynchronous browser error", async () => {
  await assert.rejects(
    withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(url);
      await page.evaluate(() =>
        setTimeout(() => {
          throw new Error("deliberate panel probe");
        }, 0),
      );
      await page.waitForTimeout(60);
      await page.close();
    }),
    /deliberate panel probe/,
  );
});

test("explicit Refresh retains opened-change observations until a new opening", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    assert.deepEqual(await page.evaluate(() => __requests.map((request) => request.path)), [
      "/changes",
      "/summary",
      "/summary",
    ]);
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("First version of proposal").waitFor();
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => {
      __edit("Updated proposal");
      document.querySelector("iframe").contentDocument.dispatchEvent(new Event("visibilitychange"));
    });
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("First version of proposal").waitFor();
    assert.equal(
      await page.evaluate(
        () => __requests.filter((request) => request.path === "/document").length,
      ),
      4,
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByText("2 of 2 tasks complete", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("Updated proposal").waitFor();
    assert.equal(
      await page.evaluate(
        () => __requests.filter((request) => request.path === "/document").length,
      ),
      8,
    );
    await page.close();
  });
});

test("in-place detail restores search and focus; Tasks is a flat CLI-only checklist", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const search = panel.getByLabel("Search changes");
    await search.fill("first");
    await panel.getByRole("button", { name: "first-change" }).click();
    assert.equal(await panel.locator("dialog.detail").count(), 0);
    assert.equal(await panel.locator(".board-shell:visible").count(), 0);
    await panel.getByRole("tab", { name: /Tasks · Written/ }).click();
    await panel.getByText("1.1 CLI description").waitFor();
    assert.equal(await panel.locator(".tasks-view h3").count(), 0);
    assert.equal(
      await panel.locator(".tasks-view .oc-sdk-progress-label").innerText(),
      "1 of 2 tasks complete\n50%",
    );
    assert.equal(await panel.locator(".tasks-view > .progress-label:visible").count(), 0);
    assert.equal(await panel.locator(".task-row details").count(), 0);
    assert.equal(await panel.locator(".task-row").count(), 2);
    assert.equal(await panel.getByRole("img", { name: "Complete" }).count(), 1);
    assert.equal(await panel.getByRole("img", { name: "Pending" }).count(), 1);
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "/tasks").length),
      1,
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.equal(await search.inputValue(), "first");
    assert.equal(await panel.locator(":focus").getAttribute("class"), "card-main");
    await page.close();
  });
});

test("board actions and detail back/stage controls use the compact viewer layout", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    assert.equal(await panel.locator(".toolbar .heading-actions button").count(), 3);
    await panel.getByRole("button", { name: "new change" }).waitFor();
    assert.equal(
      await panel.locator(".board-tally").innerText(),
      "2 changes · 1 of 2 tasks complete",
    );
    await panel.getByRole("button", { name: "first-change" }).click();
    const back = panel.getByRole("button", { name: "Back to changes" });
    assert.equal(await back.getAttribute("title"), "Back to changes");
    assert.equal(await panel.locator(".stage-label").innerText(), "In Progress");
    assert.equal(await panel.getByRole("heading", { name: "first-change", level: 1 }).count(), 1);
    await back.click();
    await page.close();
  });
});

test("opening detail loads Tasks beside Proposal, then every Specs file, then Design", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __design();
      __holdProposal();
      __holdFiles();
      __holdTasks();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("tab", { name: /Specs/ }).count();
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(
      () =>
        __requests.some((r) => r.path === "/tasks") &&
        __requests.some((r) => r.body?.selector === "proposal.md"),
    );
    assert.equal(
      await page.evaluate(() => __requests.some((r) => r.body?.artifactId === "specs")),
      false,
    );
    await page.evaluate(() => __releaseFile()); // Tasks may finish without advancing documents.
    await panel.getByRole("tab", { name: /Tasks · Written/ }).click();
    await panel.getByText("1.1 CLI description").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.some((r) => r.body?.artifactId === "specs")),
      false,
    );
    await page.evaluate(() => __releaseFile());
    await page.waitForFunction(
      () => __requests.filter((r) => r.body?.artifactId === "specs").length === 3,
    );
    assert.equal(
      await page.evaluate(() => __requests.some((r) => r.body?.artifactId === "design")),
      false,
    );
    await panel.getByRole("tab", { name: /Specs · Written/ }).click();
    await panel.locator("details").first().waitFor();
    const focusedSpecs = panel.getByRole("tab", { name: /Specs · Written/ });
    await focusedSpecs.focus();
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter(
            (request) => request.path === "/document" && request.body.artifactId === "specs",
          ).length,
      ),
      3,
    );
    await panel.locator("details summary").first().click();
    await focusedSpecs.focus();
    await page.evaluate(() => __releaseFile());
    await panel.getByText("Content of specs/1.md").waitFor();
    assert.equal(await focusedSpecs.evaluate((node) => document.activeElement === node), true);
    await page.evaluate(() => {
      __releaseFile();
      __releaseFile();
    });
    await page.waitForFunction(() => __requests.some((r) => r.body?.artifactId === "design"));
    await panel.locator("details summary").nth(1).click();
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter(
            (request) => request.path === "/document" && request.body.artifactId === "specs",
          ).length,
      ),
      3,
    );
    await page.close();
  });
});

test("a failed Proposal advances the groups; custom artefacts retain declared order", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __design();
      __failDocument();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("Retry this document").waitFor();
    await page.waitForFunction(() => __requests.some((r) => r.body?.selector === "design.md"));
    await panel.getByRole("button", { name: "Retry document" }).click();
    await panel.getByText("First version of proposal").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.selector === "design.md").length),
      1,
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => __custom());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.body?.selector === "checklist.md"));
    await panel.getByRole("tab", { name: /checklist/ }).click();
    await panel.getByText("Content of checklist.md").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.selector === "tasks.md").length),
      0,
    );
    await page.close();
  });
});

test("early Design and hidden Tasks stay queued without restarting reads or moving focus", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __design();
      __holdProposal();
      __holdTasks();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    const design = panel.getByRole("tab", { name: /Design · Written/ });
    await design.click();
    await panel.getByText("Loading document…").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.selector === "design.md").length),
      0,
    );
    await page.evaluate(() => __releaseFile()); // Tasks resolves while Design is selected.
    await panel.getByRole("tab", { name: /Tasks · Written/ }).click();
    await panel.getByText("1.1 CLI description").waitFor();
    await design.click();
    await design.focus();
    await page.evaluate(() => __releaseFile());
    await panel.getByText("Content of design.md").waitFor();
    assert.equal(await design.evaluate((node) => node === document.activeElement), true);
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => r.body?.selector === "proposal.md").length,
      ),
      1,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.selector === "design.md").length),
      1,
    );
    await page.close();
  });
});

test("Back and reopening a pending change share its read without the old opening advancing groups", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __holdProposal());
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.body?.selector === "proposal.md"));
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.artifactId === "specs").length),
      0,
    );
    await panel.getByRole("button", { name: "first-change" }).click();
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => r.body?.selector === "proposal.md").length,
      ),
      1,
    );
    await page.evaluate(() => __releaseFile());
    await panel.getByText("First version of proposal").waitFor();
    await page.waitForFunction(
      () => __requests.filter((r) => r.body?.artifactId === "specs").length === 3,
    );
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => r.body?.selector === "proposal.md").length,
      ),
      1,
    );
    await page.close();
  });
});

test("confirmed unavailability prevents later document groups from starting", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __unavailable());
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("This change is no longer available").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.artifactId === "specs").length),
      0,
    );
    await page.close();
  });
});

test("fresh listing removal stops queued groups in an already open detail", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __holdListing();
      __holdProposal();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.body?.selector === "proposal.md"));
    await page.evaluate(() => {
      __remove("first-change");
      __releaseListing();
    });
    await panel.getByText("This change is no longer available").waitFor();
    await page.evaluate(() => __releaseFile());
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.body?.artifactId === "specs").length),
      0,
    );
    await page.close();
  });
});

test("Refresh in detail restarts after fresh metadata and preserves its selected tab", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs · Written/ }).click();
    await page.waitForFunction(
      () => __requests.filter((r) => r.body?.artifactId === "specs").length === 3,
    );
    await page.evaluate(() => {
      __holdSummaries();
      __edit("Edited after refresh");
    });
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs · Written/ }).click();
    await page.evaluate(() => __releaseSummaries());
    await panel.getByRole("tab", { name: /Specs · Written/ }).waitFor();
    assert.equal(
      await panel.getByRole("tab", { name: /Specs · Written/ }).getAttribute("aria-selected"),
      "true",
    );
    await panel.getByRole("tab", { name: /Proposal · Written/ }).click();
    await panel.getByText("Edited after refresh").waitFor();
    await page.close();
  });
});

test("counted tabs use listing metadata and support keyboard selection without duplicate reads", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    const specs = panel.getByRole("tab", { name: /Specs.*3/ });
    const tasks = panel.getByRole("tab", { name: /Tasks.*2/ });
    await specs.waitFor();
    assert.equal(await tasks.count(), 1);
    await page.waitForFunction(
      () => __requests.filter((r) => r.body?.artifactId === "specs").length === 3,
    );
    const reads = await page.evaluate(
      () => __requests.filter((r) => r.path === "/tasks" || r.body?.artifactId === "specs").length,
    );
    assert.equal(reads, 4);
    await specs.focus();
    await specs.press("End");
    assert.equal(await tasks.getAttribute("aria-selected"), "true");
    assert.equal(await tasks.evaluate((node) => document.activeElement === node), true);
    assert.equal(
      await tasks.getAttribute("aria-controls"),
      await panel.getByRole("tabpanel").getAttribute("id"),
    );
    await panel.getByText("1.1 CLI description").waitFor();
    await tasks.press("Home");
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter((r) => r.path === "/tasks" || r.body?.artifactId === "specs").length,
      ),
      reads,
    );
    assert.equal(await panel.getByRole("tab").first().getAttribute("aria-selected"), "true");
    await page.evaluate(() => __theme("light"));
    assert.equal(
      await panel
        .getByRole("tab")
        .first()
        .evaluate((node) => document.activeElement === node),
      true,
    );
    await page.close();
  });
});

test("ready, blocked and skipped tabs stay selectable and explain observed readiness", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __readiness("pending"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Proposal · Ready to write/ }).waitFor();
    assert.equal(
      await panel.getByRole("tab", { name: /Proposal · Ready to write/ }).innerText(),
      "Proposal",
    );
    assert.equal(await panel.getByRole("tab", { name: /Specs · Blocked/ }).innerText(), "Specs\n0");
    assert.equal(await panel.getByRole("tab", { name: /Design · Skipped/ }).innerText(), "Design");
    await panel.getByText(/Ready to write this artefact/).waitFor();
    await panel.getByRole("tab", { name: /Specs · Blocked/ }).click();
    await panel.getByText(/Blocked.*proposal/i).waitFor();
    await panel.getByRole("tab", { name: /Design · Skipped/ }).click();
    await panel.getByText(/was skipped/i).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/document").length),
      0,
    );
    await page.close();
  });
});

test("counted artefact tabs sit in a grouped track with aligned label and count", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    const track = panel.locator(".artifact-tabs .oc-sdk-tabs");
    const grouping = await track.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      radius: parseFloat(getComputedStyle(node).borderRadius),
    }));
    assert.notEqual(grouping.background, "rgba(0, 0, 0, 0)");
    assert.ok(grouping.radius > 0);
    const alignment = await panel.getByRole("tab", { name: /Specs · Written/ }).evaluate((tab) => {
      const [label, count] = tab.children;
      const first = label.getBoundingClientRect();
      const second = count.getBoundingClientRect();
      return Math.abs((first.top + first.bottom) / 2 - (second.top + second.bottom) / 2);
    });
    assert.ok(alignment <= 1);
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
      false,
    );
    await page.close();
  });
});

test("detail back is square and standalone workflow actions use the panel scale", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    const back = panel.getByRole("button", { name: "Back to changes" });
    const title = panel.getByRole("heading", { name: "first-change", level: 1 });
    const titleBox = await title.boundingBox();
    const backBox = await back.boundingBox();
    assert.ok(backBox.x + backBox.width <= titleBox.x);
    assert.equal(await back.getAttribute("title"), "Back to changes");
    const dimensions = await back.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    }));
    assert.deepEqual(dimensions, { width: 28, height: 28 });
    assert.equal(
      await panel
        .locator(".detail-footer button:visible")
        .evaluate((node) => node.getBoundingClientRect().height),
      28,
    );
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
      false,
    );
    await page.close();
  });
});

test("unknown blockers stay generic and available pending documents remain readable", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __readiness("unknown"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs · Blocked 0/ }).click();
    assert.match(await panel.locator(".readiness-note").innerText(), /details are not available/);
    assert.doesNotMatch(await panel.locator(".readiness-note").innerText(), /proposal|missing/);
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => __readiness("available"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("First version of proposal").waitFor();
    assert.equal(
      await panel
        .getByRole("tab", { name: /Proposal · Ready to write/ })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.close();
  });
});

test("one selected placeholder replaces readiness, loading and empty duplicates", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __readiness("pending"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await panel.getByRole("tab", { name: /Specs · Blocked/ }).click();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await panel.getByRole("tab", { name: /Design · Skipped/ }).click();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await panel.getByRole("tab", { name: /Tasks · Written/ }).click();
    await panel.getByText("1.1 CLI description").waitFor();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 0);
    await page.close();
  });
});

test("document loading is status text, then content replaces it; failures show one notice", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __holdProposal());
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.locator(".document-status", { hasText: "Loading document…" }).waitFor();
    assert.equal(await panel.locator("pre:visible").count(), 0);
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await page.evaluate(() => __releaseFile());
    await panel.getByText("First version of proposal").waitFor();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 0);
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => __failDocument());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("Retry this document").waitFor();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    assert.equal(await panel.locator("pre:visible").count(), 0);
    await page.close();
  });
});

test("empty blocked and fallback Tasks select one message; task failure is actionable", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __clearTasks();
      __readiness("blocked-tasks");
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Tasks · Blocked 0/ }).click();
    await panel.getByText(/Blocked until specs/).waitFor();
    assert.equal(await panel.getByText("No tasks tracked yet.").count(), 0);
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => {
      __custom();
      __readiness("");
      __failTasks();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: "Tasks 0", exact: true }).click();
    await panel.getByText("Retry these tasks").waitFor();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    await panel.getByRole("button", { name: "Retry tasks" }).click();
    await panel.getByText("No tasks tracked yet.").waitFor();
    assert.equal(await panel.locator(".detail-content p:visible").count(), 1);
    assert.equal(await panel.locator(".tasks-view .oc-sdk-progress:visible").count(), 0);
    await page.close();
  });
});

test("create dialogue keeps concise actions and a width-stable busy button", async () => {
  await withPanel(async (browser, url) => {
    for (const width of [320, 1076]) {
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      await panel.getByRole("button", { name: "new change" }).click();
      const dialog = panel.locator("dialog:visible");
      const create = dialog.getByRole("button", { name: "create", exact: true });
      assert.equal(await dialog.getByRole("button", { name: "cancel", exact: true }).count(), 1);
      assert.equal(await create.locator("svg:visible").count(), 1);
      const before = await create.boundingBox();
      assert.equal(before.height, 28);
      assert.equal(
        await dialog
          .getByRole("button", { name: "cancel", exact: true })
          .evaluate((button) => button.getBoundingClientRect().height),
        28,
      );
      await panel.getByLabel("Change name").fill("created-change");
      await panel.getByLabel("Goal").fill("Test creation");
      await page.evaluate(() => __holdCreate());
      await create.click();
      await create.locator(".oc-sdk-spinner-ring").waitFor();
      assert.equal(await dialog.getByText("Creating change…").count(), 0);
      assert.equal(await dialog.getByRole("status").isVisible(), false);
      assert.equal(await create.locator("svg:visible").count(), 0);
      assert.equal(await create.getAttribute("aria-busy"), "true");
      assert.equal(await create.isDisabled(), true);
      assert.ok(Math.abs((await create.boundingBox()).width - before.width) < 1);
      await create.evaluate((button) => button.click());
      assert.equal(
        await page.evaluate(
          () => __requests.filter((request) => request.path === "/create").length,
        ),
        1,
      );
      await page.evaluate(() => __releaseCreate());
      await panel.getByRole("button", { name: "created-change" }).waitFor();
      await page.close();
    }
  });
});

test("creation and detail use named dialogue, one main landmark and unique document elements", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    assert.equal(await panel.getByRole("main").count(), 1);
    await panel.getByRole("button", { name: "new change" }).click();
    const dialog = panel.getByRole("dialog", { name: "New change" });
    await dialog.getByRole("heading", { name: "New change" }).waitFor({ timeout: 5000 });
    await dialog.getByRole("button", { name: "cancel", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs/ }).click();
    assert.equal(await panel.getByRole("main").count(), 1);
    assert.equal(await panel.locator(".detail-content details pre").count(), 3);
    assert.equal(await panel.locator("[id=document-content]").count(), 0);
    assert.equal(await panel.locator("[role=tabpanel][aria-labelledby]").count(), 1);
    await page.close();
  });
});

test("numeric-prefixed names are created and shown on the board", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("100-add-feature");
    await panel.getByLabel("Goal").fill("Numeric change");
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "100-add-feature" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "/create").length),
      1,
    );
    await page.close();
  });
});

test("safe creation refreshes the board and prompts stay unsent", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("created-change");
    await panel.getByLabel("Goal").fill("Test creation");
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "created-change" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "created-change" })
      .getByRole("button", { name: "apply" })
      .click();
    await page.waitForFunction(() => __requests.some((request) => request.path === "compose"));
    const prompt = await page.evaluate(
      () => __requests.find((request) => request.path === "compose")?.body,
    );
    assert.match(
      prompt.text,
      /^\/openspec-apply-change created-change\n\nComplete all remaining tasks/,
    );
    assert.match(prompt.text, /all tasks are complete and verification passes/);
    assert.doesNotMatch(prompt.text, /\/tmp\/fixture-project/);
    assert.equal(prompt.mode, "replace");
    await page.close();
  });
});

test("a fresh-chat draft receives replacement composition without sending or starting a session", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __session(null));
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "continue", exact: true })
      .click();
    await page.waitForFunction(
      () => __requests.some((request) => request.path === "compose"),
      null,
      { timeout: 3000 },
    );
    const result = await page.evaluate(() => ({
      draft: __draft(),
      requests: __requests.filter((r) => ["compose", "prompt", "start-session"].includes(r.path)),
    }));
    assert.match(result.draft, /^\/openspec-apply-change first-change\n1 of 2 tasks complete\./);
    assert.match(result.draft, /Pick up where implementation left off/);
    assert.match(result.draft, /verify the implementation against its change artefacts/);
    assert.match(result.draft, /Resolve any issues found and verify again/);
    assert.match(
      result.draft,
      /If blocked, report the blocker rather than marking unfinished work complete/,
    );
    assert.doesNotMatch(result.draft, /\/tmp\/fixture-project/);
    assert.deepEqual(
      result.requests.map((request) => request.path),
      ["compose"],
    );
    assert.equal(result.requests[0].body.mode, "replace");
    await page.close();
  });
});

test("composer rejection reports failure; stale session and directory replies do not replay", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const action = panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "continue", exact: true });
    await action.waitFor();
    await page.evaluate(() => __failCompose());
    await action.click();
    await page.waitForFunction(() =>
      __requests.some(
        (request) =>
          request.path === "toast" &&
          request.body.kind === "error" &&
          request.body.message === "Composer unavailable",
      ),
    );
    assert.equal(await panel.locator(".board-notices button").count(), 0);
    await page.evaluate(() => {
      __holdCompose();
      __failCompose();
    });
    await action.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 2);
    await page.evaluate(() => {
      __session(null);
      __releaseCompose();
    });
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      2,
    );
    assert.equal(await page.evaluate(() => __requests.filter((r) => r.path === "toast").length), 1);
    await page.evaluate(() => {
      __holdCompose();
      __failCompose();
    });
    await action.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 3);
    await page.evaluate(() => {
      __directory("/tmp/other-project");
      __releaseCompose();
    });
    await panel.getByRole("heading", { name: "other-project" }).waitFor();
    assert.equal(await page.evaluate(() => __requests.filter((r) => r.path === "toast").length), 1);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      3,
    );
    await page.close();
  });
});

test("detail composer rejection reports host feedback without board navigation or a Retry notice", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __failCompose());
    await panel
      .locator(".detail-footer")
      .getByRole("button", { name: "continue", exact: true })
      .click();
    await page.waitForFunction(() =>
      __requests.some(
        (request) =>
          request.path === "toast" &&
          request.body.kind === "error" &&
          request.body.message === "Composer unavailable",
      ),
    );
    assert.equal(await panel.locator(".detail:visible").count(), 1);
    assert.equal(await panel.locator(".board-notices button").count(), 0);
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter((request) => ["prompt", "start-session"].includes(request.path)).length,
      ),
      0,
    );
    await page.close();
  });
});

test("canonical-root replacement discards late composer success and failure without replay", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const action = panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "continue", exact: true });
    await action.waitFor();

    await page.evaluate(() => __holdCompose());
    await action.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 1);
    await page.evaluate(() => __root("/tmp/fixture-project/other-root"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/changes").length >= 3);
    await action.waitFor();
    await page.evaluate(() => __releaseCompose());
    assert.equal(await page.evaluate(() => __requests.filter((r) => r.path === "toast").length), 0);

    await page.evaluate(() => {
      __holdCompose();
      __failCompose();
    });
    await action.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 2);
    await page.evaluate(() => __root("/tmp/fixture-project/third-root"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/changes").length >= 5);
    await action.waitFor();
    await page.evaluate(() => __releaseCompose());
    assert.equal(await panel.getByText("Composer unavailable").count(), 0);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      2,
    );
    await page.close();
  });
});

test("planning, ready and complete actions prepare the appropriate unsent composer text", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "second-change" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "second-change" })
      .getByRole("button", { name: "apply" })
      .click();
    await page.waitForFunction(() => __draft().startsWith("/openspec-apply-change second-change"));
    assert.match(await page.evaluate(() => __draft()), /Complete all remaining tasks/);
    assert.doesNotMatch(await page.evaluate(() => __draft()), /tasks complete\./);
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    await page.evaluate(() => __edit("new text"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Complete 1" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "verify" })
      .click();
    await page.waitForFunction(() => __draft() === "/openspec-verify-change first-change");
    assert.equal(await page.evaluate(() => __draft()), "/openspec-verify-change first-change");
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    await page.evaluate(() => __readiness("pending"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "propose" })
      .click();
    await page.waitForFunction(() => __draft().startsWith("/openspec-propose first-change"));
    assert.match(
      await page.evaluate(() => __draft()),
      /^\/openspec-propose first-change \(existing change\)\nGoal: Read the proposal\n\nInspect/,
    );
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => r.path === "prompt" || r.path === "start-session").length,
      ),
      0,
    );
    await page.close();
  });
});

test("propose preserves goals and conditionally records a missing goal without sending or writing", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __readiness("pending"));
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    for (const goal of ['Ship "A"\nwith B', "Existing goal", null, "   "]) {
      await page.evaluate((goal) => __goal("first-change", goal), goal);
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel.locator(".toolbar .refresh-control button:not(:disabled)").waitFor();
      const before = await page.evaluate(() => __requests.length);
      await card.getByRole("button", { name: "propose" }).click();
      await page.waitForFunction(
        (before) => __requests.slice(before).some((r) => r.path === "compose"),
        before,
      );
      const draft = await page.evaluate(() => __draft());
      assert.ok(
        draft.startsWith(
          `/openspec-propose first-change (existing change)${goal?.trim() ? `\nGoal: ${goal}` : ""}\n\n`,
        ),
      );
      assert.match(draft, /Inspect .*status and current metadata/);
      assert.match(draft, /Preserve existing decisions and any recorded goal/);
      assert.match(draft, /only if current metadata has no goal/);
      assert.match(draft, /establish and record a concise goal from existing change context/);
      assert.match(draft, /Ask the user for clarification if the goal is unclear/);
      assert.match(
        draft,
        /complete missing planning artefacts using OpenSpec's artefact instructions/,
      );
      assert.match(draft, /Do not create another change or implement code/);
      assert.match(draft, /If the skill requires new-change creation, explain the conflict/);
      assert.doesNotMatch(draft, /Goal: null|\/tmp\/fixture-project/);
      if (!goal?.trim()) assert.doesNotMatch(draft, /Goal:/);
      assert.deepEqual(
        await page.evaluate(
          (before) =>
            __requests
              .slice(before)
              .filter((r) => r.path !== "toast")
              .map((r) => r.path),
          before,
        ),
        ["compose"],
      );
    }
    await page.close();
  });
});

test("explore is a secondary, unsent goal-aware action only in Planning", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __session(null));
    assert.equal(
      await panel
        .locator(".change-card")
        .filter({ hasText: "second-change" })
        .getByRole("button", { name: "explore" })
        .isVisible(),
      false,
    );
    for (const [stage, setup] of [
      ["In Progress", () => {}],
      ["Complete", () => __edit("done")],
      ["Planning", () => __readiness("pending")],
    ]) {
      await page.evaluate(setup);
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel
        .getByRole("heading", { name: stage === "Planning" ? "Planning 2" : `${stage} 1` })
        .waitFor();
      assert.equal(
        await card.getByRole("button", { name: "explore" }).isVisible(),
        stage === "Planning",
      );
      if (stage === "Planning") {
        await card.getByRole("button", { name: "explore" }).click();
        await page.waitForFunction(() => __draft().startsWith("/openspec-explore first-change"));
        assert.match(await page.evaluate(() => __draft()), /first-change.*Read the proposal/s);
        assert.match(
          await page.evaluate(() => __draft()),
          /^\/openspec-explore first-change\nGoal: Read the proposal\n\nInvestigate/,
        );
        assert.match(
          await page.evaluate(() => __draft()),
          /Discuss .*without file changes or implementation/,
        );
      }
      assert.equal(
        await panel
          .getByRole("heading", { name: stage === "Planning" ? "Planning 2" : `${stage} 1` })
          .count(),
        1,
      );
    }
    await page.evaluate(() => {
      __goal("first-change", null);
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await card.getByRole("button", { name: "explore" }).click();
    await page.waitForFunction(() => __draft().startsWith("/openspec-explore first-change\n\n"));
    const draft = await page.evaluate(() => __draft());
    assert.match(draft, /inspect existing context and ask the user to clarify it if necessary/);
    assert.doesNotMatch(draft, /Goal:|record a|write a/);
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => ["prompt", "start-session"].includes(r.path)).length,
      ),
      0,
    );
    await page.close();
  });
});

test("board header keeps Help, Refresh and New change in order at both widths", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      const actions = panel.locator(".heading-actions button");
      assert.deepEqual(
        await actions.evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("aria-label") || button.textContent.trim()),
        ),
        ["OpenSpec quickstart", "refresh", "new change"],
      );
      assert.deepEqual(
        await actions.evaluateAll((buttons) => buttons.map((button) => button.dataset.variant)),
        ["ghost", "ghost", "default"],
      );
      assert.equal(
        await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
        false,
      );
    }
    await page.close();
  });
});

test("board title and toolbar reflow as intact rows without moving the gutter", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 1076, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const search = panel.getByRole("searchbox", { name: "Search changes" });
    await search.fill("first");
    const tally = panel.locator(".board-tally");
    assert.match(await tally.innerText(), /2 changes.*1 of 2 tasks complete/);
    for (const width of [1076, 561, 560, 559, 320]) {
      await page.setViewportSize({ width, height: 700 });
      const layout = await panel.locator(".board-shell").evaluate((shell) => {
        const rect = (selector) => shell.querySelector(selector).getBoundingClientRect();
        const project = rect("h1"),
          tally = rect(".board-tally");
        const search = rect('input[aria-label="Search changes"]');
        const actions = rect(".heading-actions"),
          toolbar = rect(".toolbar");
        const heading = rect(".heading");
        const button = rect(".heading-actions button");
        return {
          gutter: project.left,
          titleHeight: project.height,
          headingHeight: heading.height,
          titleTop: project.top,
          tallyTop: tally.top,
          searchTop: search.top,
          actionsTop: actions.top,
          toolbarTop: toolbar.top,
          headerBottom: rect(".board-header").bottom,
          bodyTop: rect(".board-body").top,
          boardTop: rect(".board").top,
          searchWidth: search.width,
          searchLeft: search.left,
          searchHeight: search.height,
          searchBottom: search.bottom,
          buttonHeight: button.height,
          searchCenter: search.top + search.height / 2,
          actionsCenter: actions.top + actions.height / 2,
          actionsRight: actions.right,
          toolbarWidth: toolbar.width,
          actionsWidth: actions.width,
          viewport: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(layout.gutter, 16);
      assert.equal(layout.titleHeight, 28);
      assert.equal(layout.overflow, false);
      assert.equal(layout.searchHeight, 36);
      assert.equal(layout.buttonHeight, 28);
      assert.equal(
        await panel
          .locator(".card-actions button:visible")
          .first()
          .evaluate((button) => button.getBoundingClientRect().height),
        layout.buttonHeight,
      );
      assert.ok(layout.actionsRight <= width - 15);
      assert.ok(layout.toolbarTop > layout.titleTop);
      assert.equal(layout.bodyTop - layout.headerBottom, 24);
      assert.equal(layout.boardTop - layout.headerBottom, 24);
      if (width === 320) {
        assert.ok(layout.tallyTop > layout.titleTop);
        assert.ok(layout.actionsTop > layout.searchTop);
        assert.equal(layout.headingHeight, 56);
        assert.ok(Math.abs(layout.actionsTop - layout.searchBottom - 12) < 1);
      } else if (width === 1076) {
        assert.ok(Math.abs(layout.tallyTop - layout.titleTop) < 10);
        assert.ok(Math.abs(layout.actionsCenter - layout.searchCenter) < 1);
        assert.ok(layout.searchWidth > 480);
        assert.ok(
          Math.abs(layout.searchWidth + layout.actionsWidth + 12 - layout.toolbarWidth) < 2,
        );
      }
      assert.equal(await search.inputValue(), "first");
      assert.equal(await search.evaluate((node) => node === document.activeElement), true);
    }
    assert.equal(await panel.getByRole("button", { name: "new change" }).locator("svg").count(), 1);
    await page.close();
  });
});

test("detail header groups title then goal with the default badge centred", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      const layout = await panel.locator(".detail-title-row").evaluate((row) => {
        const back = row.querySelector(".detail-back button");
        const title = row.querySelector("h1");
        const badge = row.querySelector(".oc-sdk-badge");
        const center = (node) => {
          const rect = node.getBoundingClientRect();
          return rect.top + rect.height / 2;
        };
        const header = row.closest("header");
        const goal = header.querySelector(".goal").getBoundingClientRect();
        const toolbar = row
          .closest(".detail")
          .querySelector(".detail-toolbar")
          .getBoundingClientRect();
        return {
          back: back.getBoundingClientRect().height,
          title: title.getBoundingClientRect().height,
          badge: badge.getBoundingClientRect().height,
          titleSize: getComputedStyle(title).fontSize,
          badgeSize: getComputedStyle(badge).fontSize,
          backCenter: center(back),
          titleCenter: center(title),
          badgeCenter: center(badge),
          titleBottom: row.getBoundingClientRect().bottom,
          goalTop: goal.top,
          goalBottom: goal.bottom,
          toolbarTop: toolbar.top,
          headerBottom: header.getBoundingClientRect().bottom,
          bodyTop: row.closest(".detail").querySelector(".detail-body").getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(layout.badgeSize, "11px");
      assert.equal(layout.titleSize, "14px");
      assert.equal(layout.back, 28);
      assert.equal(layout.title, 28);
      assert.ok(layout.badge < layout.back);
      assert.ok(Math.abs(layout.backCenter - layout.badgeCenter) < 1);
      assert.ok(Math.abs(layout.titleCenter - layout.badgeCenter) < 1);
      assert.ok(layout.goalTop > layout.titleBottom);
      assert.ok(layout.toolbarTop > layout.goalBottom);
      assert.equal(layout.bodyTop - layout.headerBottom, 24);
      assert.equal(layout.toolbarTop - layout.goalBottom, 24);
      assert.equal(layout.overflow, false);
      const toolbar = await panel.locator(".detail-toolbar").evaluate((row) => {
        const tabs = row.querySelector(".oc-sdk-tabs").getBoundingClientRect();
        const tabTrack = row.querySelector(".artifact-tabs").getBoundingClientRect();
        const actions = row.querySelector(".detail-heading-actions").getBoundingClientRect();
        const button = row.querySelector(".detail-heading-actions button").getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        return {
          tabsHeight: tabs.height,
          buttonHeight: button.height,
          tabsTop: tabs.top,
          tabsBottom: tabs.bottom,
          tabsLeft: tabs.left,
          tabsRight: tabs.right,
          tabTrackRight: tabTrack.right,
          actionsTop: actions.top,
          actionsLeft: actions.left,
          rowLeft: rowRect.left,
          rowRight: rowRect.right,
          rowWidth: rowRect.width,
        };
      });
      assert.equal(toolbar.tabsHeight, 28);
      assert.equal(toolbar.buttonHeight, 28);
      assert.ok(Math.abs(toolbar.tabsLeft - toolbar.rowLeft) < 1);
      if (width === 320) {
        assert.ok(toolbar.actionsTop > toolbar.tabsTop);
        assert.ok(Math.abs(toolbar.actionsTop - toolbar.tabsBottom - 12) < 1);
        assert.ok(Math.abs(toolbar.tabTrackRight - toolbar.rowRight) < 1);
        assert.ok(toolbar.tabsRight < toolbar.tabTrackRight);
      } else {
        assert.ok(Math.abs(toolbar.actionsTop - toolbar.tabsTop) < 1);
        assert.ok(toolbar.tabsRight + 12 <= toolbar.actionsLeft + 1);
        assert.ok(toolbar.tabsRight < toolbar.rowRight - toolbar.rowWidth / 4);
      }
      const footerHeights = await panel
        .locator(".detail-footer button:visible")
        .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
      assert.ok(footerHeights.length > 0);
      assert.ok(footerHeights.every((height) => height === 28));
    }
    await page.close();
  });
});

test("circled quickstart help is available only on the board", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const help = panel.getByRole("button", { name: "OpenSpec quickstart" });
    await help.waitFor();
    assert.equal(await help.getAttribute("title"), "OpenSpec quickstart");
    await help.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => __requests.some((r) => r.path === "open-url"));
    await panel.getByRole("button", { name: "first-change" }).click();
    assert.equal(
      await panel
        .locator(".detail-toolbar")
        .getByRole("button", { name: "OpenSpec quickstart" })
        .count(),
      0,
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await help.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "open-url").length === 2);
    assert.deepEqual(
      await page.evaluate(() => __requests.filter((r) => r.path === "open-url").map((r) => r.body)),
      [
        { url: "https://openspec.dev/docs/quickstart" },
        { url: "https://openspec.dev/docs/quickstart" },
      ],
    );
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 1);
    await page.evaluate(() => __failOpenUrl());
    await help.click();
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "toast" && r.body.message === "Cannot open quickstart"),
    );
    await page.evaluate(() => __directory(null));
    await panel.getByText("Select an OpenChamber project or worktree", { exact: false }).waitFor();
    await help.click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "open-url").length === 4);
    await page.evaluate(() => {
      __failNextListing();
      __directory("/tmp/fixture-project");
    });
    await panel.getByText("Cannot check listing").waitFor();
    await help.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => __requests.filter((r) => r.path === "open-url").length === 5);
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth),
      true,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      0,
    );
    await page.close();
  });
});

test("long change titles and completed-card actions remain reachable at sidebar width", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const name = "a-deliberately-long-disposable-change-name-that-wraps-in-the-detail-header";
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate((next) => {
      __rename("first-change", next);
      __edit("done");
    }, name);
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    const card = panel.locator(".change-card").filter({ hasText: name });
    await card.getByRole("button", { name: "verify" }).waitFor();
    for (const label of ["archive", "verify"]) {
      const box = await card.getByRole("button", { name: label, exact: true }).boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 320, `${label} fits the sidebar`);
    }
    await card.getByRole("button", { name, exact: true }).click();
    await panel.getByRole("heading", { name, level: 1 }).waitFor();
    for (const label of ["Delete change"]) {
      const box = await panel
        .locator(".detail-toolbar")
        .getByRole("button", { name: label })
        .boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 320, `${label} fits the detail`);
    }
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth),
      true,
    );
    await page.close();
  });
});

test("delete confirmation stays visible and width-stable while the request is pending", async () => {
  await withPanel(async (browser, url) => {
    for (const width of [320, 1076]) {
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      await panel.getByRole("button", { name: "first-change" }).click();
      const toolbarDelete = panel.getByRole("button", { name: "Delete change" });
      assert.equal(await toolbarDelete.innerText(), "delete");
      assert.equal(await toolbarDelete.locator("svg").count(), 1);
      await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
      const dialog = panel.getByRole("dialog", { name: /Delete first-change/ });
      const confirm = dialog.getByRole("button", { name: "delete", exact: true });
      assert.equal(await dialog.getByRole("button", { name: "cancel", exact: true }).count(), 1);
      assert.equal(await confirm.locator("svg:visible").count(), 1);
      const before = await confirm.boundingBox();
      assert.equal(before.height, 28);
      await page.evaluate(() => __holdDelete());
      await confirm.click();
      await confirm.locator(".oc-sdk-spinner-ring").waitFor();
      assert.equal(await dialog.getByText("Deleting change…").count(), 0);
      assert.equal(await confirm.isVisible(), true);
      assert.equal(await confirm.isDisabled(), true);
      assert.equal(await confirm.getAttribute("aria-busy"), "true");
      assert.equal(await confirm.locator("svg:visible").count(), 0);
      assert.ok(Math.abs((await confirm.boundingBox()).width - before.width) < 1);
      await confirm.evaluate((button) => button.click());
      await page.keyboard.press("Escape");
      assert.equal(await dialog.isVisible(), true);
      assert.equal(
        await page.evaluate(
          () => __requests.filter((request) => request.path === "/delete").length,
        ),
        1,
      );
      await page.evaluate(() => __releaseDelete());
      await panel.getByRole("heading", { name: "Planning 0" }).waitFor();
      await page.close();
    }
  });
});

test("delete requires confirmation and invalidates it when context changes", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    const dialog = panel.getByRole("dialog", { name: /Delete first-change/ });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /permanent.*planning folder/i);
    assert.match(await dialog.innerText(), /implementation.*main spec/i);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      0,
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await panel
        .locator(".detail-toolbar")
        .getByRole("button", { name: "delete" })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await page.evaluate(() => __directory("/tmp/other-project"));
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      0,
    );
    await page.close();
  });
});

test("confirmed deletion removes one change and returns to a refreshed, searched board", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const search = panel.getByRole("searchbox", { name: "Search changes" });
    await search.fill("first");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __holdDelete());
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    const dialog = panel.getByRole("dialog", { name: /Delete first-change/ });
    await dialog.getByRole("button", { name: "delete" }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/delete").length === 1);
    assert.equal(await dialog.getByRole("button", { name: "delete" }).isDisabled(), true);
    assert.equal(
      await dialog.getByRole("button", { name: "delete" }).locator(".oc-sdk-spinner-ring").count(),
      1,
    );
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), true);
    await page.evaluate(() => __releaseDelete());
    await panel.getByRole("heading", { name: "Planning 0" }).waitFor();
    assert.equal(await search.inputValue(), "first");
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 0);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await page.close();
  });
});

test("confirmed deletion invalidates old actions while its next listing is held or fails", async () => {
  await withPanel(async (browser, url) => {
    for (const mode of ["held", "failed"]) {
      const page = await browser.newPage();
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      await panel.getByRole("button", { name: "first-change" }).click();
      await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
      await page.evaluate(
        (next) => (next === "held" ? __holdListing() : __failNextListing()),
        mode,
      );
      await panel.getByRole("dialog").getByRole("button", { name: "delete", exact: true }).click();
      await page.waitForFunction(() => __requests.some((item) => item.path === "/delete"));
      await panel.locator(".detail:visible").waitFor({ state: "detached" });
      assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 0);
      assert.equal(
        await page.evaluate(() => __requests.filter((item) => item.path === "compose").length),
        0,
      );
      if (mode === "held") {
        await page.evaluate(() => __releaseListing());
        await panel.getByRole("button", { name: "refresh", exact: true }).waitFor();
      } else await panel.getByText("Cannot check listing").waitFor();
      assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 0);
      await page.close();
    }
  });
});

test("pre-removal summary cannot restore a deleted card, but a new listing can show recreation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __holdSummaries());
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/summary").length >= 4,
    );
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await page.evaluate(() => __holdListing());
    await panel.getByRole("dialog").getByRole("button", { name: "delete", exact: true }).click();
    await panel.locator(".detail:visible").waitFor({ state: "detached" });
    await page.evaluate(() => __releaseSummaries());
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 0);
    await page.evaluate(() => {
      __recreate("first-change");
      __releaseListing();
    });
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await panel.getByLabel("Search changes").fill("Recreated goal");
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 1);
    await page.close();
  });
});

test("late document data cannot reopen a deleted change", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __holdProposal());
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "/document"));
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await panel
      .getByRole("dialog", { name: /Delete first-change/ })
      .getByRole("button", { name: "delete" })
      .click();
    await panel.getByRole("heading", { name: "Planning 0" }).waitFor();
    await page.evaluate(() => __releaseFile());
    assert.equal(await panel.locator(".detail:visible").count(), 0);
    assert.equal(await panel.getByText("First version of proposal").count(), 0);
    await page.close();
  });
});

test("unknown deletion checks original listing, without retrying the mutation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __unknownDelete());
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await panel
      .getByRole("dialog", { name: /Delete first-change/ })
      .getByRole("button", { name: "delete" })
      .click();
    await panel.getByRole("heading", { name: "Planning 0" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    assert.ok(
      await page.evaluate(
        () =>
          __requests.filter((r) => r.path === "/changes" && r.body.expectedRoot === root).length >=
          1,
      ),
    );
    await page.close();
  });
});

test("an unconfirmed deletion remains non-repeatable until a fresh confirmation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => {
      __keepOnUnknownDelete();
      __failNextListing();
    });
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    const dialog = panel.getByRole("dialog", { name: /Delete first-change/ });
    await dialog.getByRole("button", { name: "delete" }).click();
    await dialog.getByText(/outcome is unresolved/).waitFor();
    assert.equal(await dialog.getByRole("button", { name: "delete" }).count(), 0);
    assert.equal(await dialog.getByRole("button", { name: "cancel" }).isDisabled(), true);
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), true);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await dialog.getByRole("button", { name: "Retry read" }).click();
    await dialog.getByText(/change is still listed/).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await dialog.getByRole("button", { name: "Close" }).click();
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    assert.equal(await dialog.getByRole("button", { name: "delete" }).count(), 1);
    await page.close();
  });
});

test("unresolved deletion after a context switch requires original-root read on return", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => {
      __keepOnUnknownDelete();
      __failNextListing();
    });
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    const dialog = panel.getByRole("dialog", { name: /Delete first-change/ });
    await dialog.getByRole("button", { name: "delete" }).click();
    await dialog.getByText(/outcome is unresolved/).waitFor();
    await page.evaluate(() => __directory("/tmp/other-project"));
    await panel.getByRole("heading", { name: "other-project" }).waitFor();
    await page.evaluate(() => __directory(directory));
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    assert.equal(await dialog.getByRole("button", { name: "delete" }).count(), 0);
    await dialog.getByRole("button", { name: "Retry read" }).click();
    await dialog.getByText(/change is still listed/).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await dialog.getByRole("button", { name: "Close" }).click();
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    assert.equal(await dialog.getByRole("button", { name: "delete" }).count(), 1);
    await page.close();
  });
});

test("a malformed delete success reconciles by listing rather than claiming success", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __malformedDelete());
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await panel
      .getByRole("dialog", { name: /Delete first-change/ })
      .getByRole("button", { name: "delete" })
      .click();
    await panel.getByRole("heading", { name: "Planning 0" }).waitFor();
    assert.ok(
      await page.evaluate(() =>
        __requests.some((r) => r.path === "/changes" && r.body.expectedRoot === root),
      ),
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await page.close();
  });
});

test("a context switch during uncertain deletion reconciles the original root only", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => {
      __holdDelete();
      __unknownDelete();
    });
    await panel.locator(".detail-toolbar").getByRole("button", { name: "Delete change" }).click();
    await panel
      .getByRole("dialog", { name: /Delete first-change/ })
      .getByRole("button", { name: "delete" })
      .click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "/delete"));
    await page.evaluate(() => __directory("/tmp/other-project"));
    await page.evaluate(() => __releaseDelete());
    await page.waitForFunction(() =>
      __requests.some(
        (r) =>
          r.path === "/changes" &&
          r.body.directory === "/tmp/fixture-project" &&
          r.body.expectedRoot === root,
      ),
    );
    assert.equal(await panel.getByRole("heading", { name: "No project selected" }).count(), 0);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await page.close();
  });
});

test("completed board and detail independently prepare Verify and Archive without changing stage", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __edit("new text"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    await card.getByRole("button", { name: "archive", exact: true }).waitFor();
    assert.deepEqual(await card.locator(".card-actions button:visible").allTextContents(), [
      "verify",
      "archive",
    ]);
    assert.equal(
      await card.getByRole("button", { name: "archive" }).getAttribute("data-variant"),
      "default",
    );
    assert.equal(
      await card.getByRole("button", { name: "verify" }).getAttribute("data-variant"),
      "secondary",
    );
    const colours = await card.locator(".card-actions").evaluate((row) => {
      const primary = row.querySelector('[data-variant="default"]');
      const secondary = row.querySelector('[data-variant="secondary"]');
      return {
        primary: getComputedStyle(primary).backgroundColor,
        secondary: getComputedStyle(secondary).backgroundColor,
      };
    });
    assert.equal(colours.secondary, "rgb(32, 38, 42)");
    assert.notEqual(colours.primary, colours.secondary);
    await card.getByRole("button", { name: "archive", exact: true }).click();
    await page.waitForFunction(() => __draft() === "/openspec-archive-change first-change");
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    assert.equal(await card.getByRole("button", { name: "verify" }).isEnabled(), true);
    assert.equal(await panel.getByRole("heading", { name: "Complete 1" }).count(), 1);
    await card.getByRole("button", { name: "first-change" }).click();
    assert.equal(
      await panel
        .locator(".detail-footer")
        .getByRole("button", { name: "archive" })
        .getAttribute("data-variant"),
      "default",
    );
    assert.equal(
      await panel
        .locator(".detail-footer")
        .getByRole("button", { name: "verify" })
        .getAttribute("data-variant"),
      "secondary",
    );
    assert.equal(
      await panel
        .locator(".detail-footer")
        .getByRole("button", { name: "verify" })
        .evaluate((button) => getComputedStyle(button).backgroundColor),
      colours.secondary,
    );
    assert.equal(
      await panel
        .locator(".detail-heading-actions")
        .getByRole("button", { name: "refresh" })
        .getAttribute("data-variant"),
      "ghost",
    );
    await panel.getByRole("button", { name: "verify", exact: true }).click();
    await page.waitForFunction(() => __draft() === "/openspec-verify-change first-change");
    assert.equal(
      await panel.getByRole("button", { name: "archive", exact: true }).isEnabled(),
      true,
    );
    await panel.getByRole("button", { name: "archive", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 3);
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["prompt", "start-session", "/archive"].includes(r.path)),
      ),
      [],
    );
    assert.equal(await panel.locator(".stage-label").innerText(), "Complete");
    await page.close();
  });
});

test("a refreshed incomplete summary removes Archive from an already open detail", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __edit("complete proposal"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Complete 1" }).waitFor();
    await page.evaluate(() => {
      __unedit();
      __holdSummaries();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/summary").length >= 6);
    await panel.getByRole("button", { name: "first-change" }).click();
    assert.equal(await panel.locator(".stage-label").innerText(), "Complete");
    await page.evaluate(() => __releaseSummaries());
    await panel.locator(".stage h2", { hasText: "In Progress 1" }).waitFor({ state: "attached" });
    await panel.locator(".stage-label").getByText("In Progress").waitFor();
    assert.equal(
      await panel
        .locator(".detail-footer button:visible")
        .allInnerTexts()
        .then((labels) => labels.includes("archive")),
      false,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      0,
    );
    await page.close();
  });
});

test("readiness-only summary changes update focused tab names without losing focus", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __proposalStatus("ready");
      __holdSummaries();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/summary").length >= 4,
    );
    await panel.getByRole("button", { name: "first-change" }).click();
    const proposal = panel.getByRole("tab", { name: /Proposal · Written/ });
    await proposal.focus();
    await page.waitForFunction(
      () =>
        __requests.some((item) => item.path === "/tasks") &&
        __requests.some((item) => item.path === "/document"),
    );
    const before = await page.evaluate(
      () => __requests.filter((item) => ["/tasks", "/document"].includes(item.path)).length,
    );
    await page.evaluate(() => __releaseSummaries());
    const updated = panel.getByRole("tab", { name: /Proposal · Ready to write/ });
    await updated.waitFor({ timeout: 5000 });
    assert.equal(await updated.evaluate((node) => document.activeElement === node), true);
    assert.equal(await updated.getAttribute("aria-selected"), "true");
    assert.equal(
      await page.evaluate(
        () => __requests.filter((item) => ["/tasks", "/document"].includes(item.path)).length,
      ),
      before,
    );
    await page.close();
  });
});

test("refresh does not overlap and reports partial failure without clearing retained cards", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __holdListing());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/changes").length === 2,
    );
    assert.equal(
      await panel.getByRole("button", { name: "refresh", exact: true }).isDisabled(),
      true,
    );
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 1);
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/changes").length),
      2,
    );
    await page.evaluate(() => {
      __releaseListing();
      __failSummary();
    });
    await panel.getByText(/first-change is stale/).waitFor();
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByText(/first-change is stale/).waitFor({ state: "hidden" });
    await page.evaluate(() => __remove("first-change"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).waitFor({ state: "detached" });
    await page.close();
  });
});

test("refresh swaps its icon for an in-button spinner without moving itself or the tally", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    await card.waitFor();
    assert.equal(await card.locator(".progress-label").innerText(), "3 of 3 artefacts");
    assert.match(await card.locator(".oc-sdk-progress-label").innerText(), /1 of 2 tasks complete/);
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      const refresh = panel.getByRole("button", { name: "refresh", exact: true });
      const tally = panel.locator(".board-tally");
      const before = { button: await refresh.boundingBox(), tally: await tally.boundingBox() };
      assert.equal(await refresh.locator("svg:visible").count(), 1);
      await page.evaluate(() => __holdListing());
      await refresh.click();
      await refresh.locator(".oc-sdk-spinner-ring").waitFor();
      assert.equal(await refresh.getAttribute("aria-busy"), "true");
      assert.equal(await refresh.locator("svg:visible").count(), 0);
      assert.equal(await refresh.isDisabled(), true);
      assert.equal(await panel.locator(".refresh-indicator").count(), 0);
      const during = { button: await refresh.boundingBox(), tally: await tally.boundingBox() };
      assert.ok(Math.abs(during.button.width - before.button.width) < 1);
      assert.ok(Math.abs(during.button.x - before.button.x) < 1);
      assert.ok(Math.abs(during.tally.x - before.tally.x) < 1);
      assert.equal(
        await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
        false,
      );
      const requests = await page.evaluate(
        () => __requests.filter((r) => r.path === "/changes").length,
      );
      await refresh.evaluate((button) => button.click());
      assert.equal(
        await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
        requests,
      );
      await page.evaluate(() => __releaseListing());
      await refresh.locator(".oc-sdk-spinner-ring").waitFor({ state: "detached" });
      assert.equal(await refresh.locator("svg:visible").count(), 1);
      assert.ok(Math.abs((await refresh.boundingBox()).width - before.button.width) < 1);
    }
    await page.close();
  });
});

test("refresh button reports context loading and returns to idle after failure", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const refresh = panel.getByRole("button", { name: "refresh", exact: true });
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __holdListing();
      __directory("/tmp/other-project");
    });
    await refresh.locator(".oc-sdk-spinner-ring").waitFor();
    await page.evaluate(() => __releaseListing());
    await refresh.locator(".oc-sdk-spinner-ring").waitFor({ state: "detached" });
    await page.evaluate(() => __failNextListing());
    await refresh.click();
    await panel.getByText("Cannot check listing").waitFor();
    assert.equal(await refresh.isEnabled(), true);
    assert.equal(await refresh.locator("svg:visible").count(), 1);
    await page.close();
  });
});

test("a first-load summary failure names the unreadable change and offers retry", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url + "?fail-summary");
    const panel = page.frameLocator("iframe");
    await panel.getByText(/first-change could not be read/).waitFor();
    await panel.getByRole("button", { name: "Retry", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.close();
  });
});

test("focused Retry keeps keyboard focus while an unrelated held summary completes", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url + "?fail-summary");
    const panel = page.frameLocator("iframe");
    const notice = panel.getByText(/first-change could not be read/);
    await notice.waitFor();
    await page.evaluate(() => __holdSummaries());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/summary").length === 4,
    );
    const retry = panel.locator(".board-notices").getByRole("button", { name: "Retry" });
    await retry.focus();
    await page.evaluate(() => __releaseOneSummary(1));
    await page.waitForFunction(
      () => __completed.filter((path) => path === "/summary").length === 3,
    );
    await retry.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    assert.equal(await retry.evaluate((node) => node === document.activeElement), true);
    await page.evaluate(() => __theme("light"));
    await panel.getByLabel("Search changes").fill("second");
    await retry.focus();
    assert.equal(await retry.evaluate((node) => node === document.activeElement), true);
    await retry.press("Enter");
    await page.evaluate(() => __releaseSummaries());
    await retry.waitFor({ state: "detached" });
    await page.close();
  });
});

test("board standalone controls and wrapped retry notice have panel spacing", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url + "?fail-summary");
    const panel = page.frameLocator("iframe");
    const notice = panel.locator(".board-notices .notice");
    await notice.waitFor();
    const sizes = await panel
      .locator(".heading-actions button, .board-notices button, .card-actions button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().height).filter(Boolean),
      );
    assert.deepEqual(sizes.slice(0, 4), [28, 28, 28, 28]);
    assert.ok(sizes.slice(4).every((height) => height === 28));
    const message = await notice.getByText(/could not be read/).boundingBox();
    const retry = await notice.getByRole("button", { name: "Retry" }).boundingBox();
    if (retry.y >= message.y + message.height) assert.ok(retry.y - message.y - message.height >= 8);
    else assert.ok(retry.x - message.x - message.width >= 8);
    const board = await panel.locator(".board").boundingBox();
    const box = await notice.boundingBox();
    assert.ok(board.y - box.y - box.height >= 12);
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
      false,
    );
    await page.close();
  });
});

test("confirmed unavailable detail keeps the selection and disables its workflow action", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __unavailable());
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText(/This change is no longer available/).waitFor();
    assert.equal(await panel.locator(".detail-content .document-issue:visible").count(), 0);
    assert.equal(await panel.locator(".detail-footer button:visible").isDisabled(), true);
    assert.equal(
      await panel
        .locator(".detail-toolbar")
        .getByRole("button", { name: "Delete change" })
        .isDisabled(),
      true,
    );
    assert.equal(await panel.locator(".detail h1").innerText(), "first-change");
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.equal(
      await panel
        .locator(".change-card")
        .filter({ hasText: "first-change" })
        .getByRole("button", { name: "continue", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await panel
        .locator(".change-card")
        .filter({ hasText: "first-change" })
        .getByRole("button", { name: "explore" })
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "compose").length),
      0,
    );
    await page.close();
  });
});

test("failed document retries locally; a custom task owner remains a document", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => {
      __custom();
      __failDocument();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("Retry this document").waitFor();
    await panel.getByRole("button", { name: "Retry document" }).click();
    await panel.getByText("First version of proposal").waitFor();
    await panel.getByRole("tab", { name: /checklist · Written/ }).click();
    await panel.getByText("Content of checklist.md").waitFor();
    await panel.getByRole("tab", { name: "Tasks 2", exact: true }).click();
    assert.equal(await panel.locator(".readiness-note:visible").count(), 0);
    await panel.getByText("1.1 CLI description").waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter(
            (item) => item.path === "/document" && item.body.selector === "tasks.md",
          ).length,
      ),
      0,
    );
    await page.close();
  });
});

test("zero-count Tasks tab does not claim implementation completion", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "second-change" }).click();
    await panel.getByRole("tab", { name: /Tasks · Written 0/ }).click();
    await panel.getByText("No tasks tracked yet.").waitFor();
    assert.equal(await panel.locator(".stage-label").innerText(), "Ready");
    await page.close();
  });
});

test("long custom tabs scroll within a 320 px panel without hiding fallback Tasks", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __longArtifact());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    assert.deepEqual(await card.locator(".card-actions button:visible").allTextContents(), [
      "explore",
      "propose",
    ]);
    await panel.getByRole("button", { name: "first-change" }).click();
    const custom = panel.getByRole("tab", {
      name: /long-artifact-name-that-must-wrap-at-sidebar-width/,
    });
    await custom.waitFor();
    assert.equal(await panel.getByRole("tab", { name: "Tasks 2" }).count(), 1);
    assert.equal(
      await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
      false,
    );
    assert.equal(
      await panel.locator(".oc-sdk-tabs").evaluate((node) => node.scrollWidth > node.clientWidth),
      true,
    );
    await custom.focus();
    await custom.press("End");
    assert.equal(
      await panel.getByRole("tab", { name: "Tasks 2" }).getAttribute("aria-selected"),
      "true",
    );
    await page.close();
  });
});

test("custom artefacts with delimiter characters keep their document identities distinct", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __collidingLabels());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /specs:a · Written/ }).waitFor({ timeout: 5000 });
    await panel.getByRole("tab", { name: /specs:a · Written/ }).click();
    await panel.getByText("Content of b", { exact: true }).waitFor();
    await panel.getByRole("tab", { name: /Specs · Written/ }).click();
    await panel.locator(".detail-content details summary").first().click();
    await panel.getByText("Content of a:b", { exact: true }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests
          .filter((request) => request.path === "/document")
          .map((request) => [request.body.artifactId, request.body.selector]),
      ),
      [
        ["specs", "a:b"],
        ["specs:a", "b"],
      ],
    );
    await page.close();
  });
});

test("a failed Specs file is labelled on its collapsed path and retries without reloading siblings", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __failSpec2());
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs · Written/ }).click();
    const second = panel.locator("details").filter({ hasText: "specs/2.md" });
    await second.getByText("Read failed").waitFor();
    assert.match(await panel.getByRole("tab", { name: /Specs · Written/ }).innerText(), /3/);
    await second.locator("summary").click();
    await second.getByText("Second file unavailable").waitFor();
    await second.getByRole("button", { name: "Retry document" }).click();
    await second.getByText("Content of specs/2.md").waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter(
            (item) => item.path === "/document" && item.body.selector === "specs/1.md",
          ).length,
      ),
      1,
    );
    await page.close();
  });
});

test("collapsed Specs completion never moves an expanded sibling's reading position", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 500 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() => {
      __longSpec();
      __holdFiles();
    });
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs/ }).click();
    await page.waitForFunction(
      () =>
        __requests.filter((item) => item.path === "/document" && item.body.artifactId === "specs")
          .length === 3,
    );
    await page.evaluate(() => __releaseFile());
    const first = panel.locator("details").filter({ hasText: "specs/1.md" });
    await first.locator("summary").click();
    await first
      .locator("pre")
      .getByText(/Long document line/)
      .waitFor();
    const content = panel.locator(".detail-content");
    await content.evaluate((node) => (node.scrollTop = 200));
    const before = await content.evaluate((node) => node.scrollTop);
    assert.ok(before >= 190);
    await page.evaluate(() => __releaseFile());
    await panel
      .locator("details")
      .filter({ hasText: "specs/2.md" })
      .getByText("Content of specs/2.md")
      .waitFor({ state: "attached" });
    assert.equal(await content.evaluate((node) => node.scrollTop), before);
    assert.equal(await first.getAttribute("open"), "");
    await page.close();
  });
});

test("long goals remain fully scrollable with reachable detail controls", async () => {
  await withPanel(async (browser, url) => {
    for (const [width, mode] of [
      [320, "dark"],
      [320, "light"],
      [1076, "dark"],
      [1076, "light"],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 400 } });
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      const goal = `A multi-line goal.\n${"one two three ".repeat(120)}\n${"Z".repeat(600)}`;
      await page.evaluate((value) => __goal("first-change", value), goal);
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel.getByRole("button", { name: "first-change" }).click();
      if (mode === "light") await page.evaluate(() => __theme("light"));
      const region = panel.getByRole("region", { name: "Recorded objective" });
      assert.equal(await region.textContent(), goal);
      const geometry = await region.evaluate((node) => ({
        height: node.clientHeight,
        scrollHeight: node.scrollHeight,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        overflow: getComputedStyle(node).overflowY,
      }));
      assert.ok(geometry.height <= 80);
      assert.ok(geometry.scrollHeight > geometry.height);
      assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1);
      assert.equal(geometry.overflow, "auto");
      await region.focus();
      await region.press("End");
      await page.waitForFunction(() =>
        [...document.querySelectorAll("iframe")].some(
          (frame) => frame.contentDocument?.querySelector(".detail-header > .goal")?.scrollTop > 0,
        ),
      );
      assert.ok(
        await panel
          .locator(".detail-footer")
          .evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight),
      );
      assert.ok(await panel.locator(".detail-content").evaluate((node) => node.clientHeight > 0));
      assert.equal(
        await panel.locator("html").evaluate((node) => node.scrollWidth > innerWidth),
        false,
      );
      await page.evaluate(() => __goal("first-change", "Short goal"));
      await panel.getByRole("button", { name: "Back to changes" }).click();
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel.getByRole("button", { name: "first-change" }).click();
      await region.getByText("Short goal").waitFor();
      assert.ok(await region.evaluate((node) => node.scrollHeight <= node.clientHeight));
      await page.close();
    }
  });
});

test("Planning detail explores the same goal with secondary action before propose", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() => __readiness("pending"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).click();
    const footer = panel.locator(".detail-footer");
    assert.deepEqual(await footer.locator("button:visible").allTextContents(), [
      "explore",
      "propose",
    ]);
    await footer.getByRole("button", { name: "explore" }).click();
    await page.waitForFunction(() => __draft().includes("openspec-explore"));
    assert.match(await page.evaluate(() => __draft()), /Read the proposal/);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "compose").length),
      1,
    );
    await page.close();
  });
});

test("detail refresh keeps its selection and replaces content without leaving the reader", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 1076, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("searchbox", { name: "Search changes" }).fill("first");
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByText("First version of proposal").waitFor();
    await page.evaluate(() => {
      __edit("Edited after detail refresh");
      __holdListing();
    });
    const refresh = panel.locator(".detail").getByRole("button", { name: "refresh", exact: true });
    const before = await refresh.boundingBox();
    await refresh.click();
    await refresh.locator(".oc-sdk-spinner-ring").waitFor();
    assert.ok(Math.abs((await refresh.boundingBox()).width - before.width) < 1);
    assert.equal(await refresh.isDisabled(), true);
    await page.evaluate(() => __releaseListing());
    await panel.getByText("Edited after detail refresh").waitFor();
    assert.equal(
      await panel.getByRole("tab", { name: /Proposal/ }).getAttribute("aria-selected"),
      "true",
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    assert.equal(
      await panel.getByRole("searchbox", { name: "Search changes" }).inputValue(),
      "first",
    );
    await page.close();
  });
});

test("detail refresh reports listing failures and retries in place", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __failNextListing());
    await panel.locator(".detail").getByRole("button", { name: "refresh", exact: true }).click();
    await panel.locator(".detail").getByText("Cannot check listing").waitFor();
    await panel.locator(".detail").getByRole("button", { name: "Retry" }).click();
    await panel.locator(".detail").getByText("Cannot check listing").waitFor({ state: "hidden" });
    await panel.getByRole("heading", { name: "first-change" }).waitFor();
    await page.close();
  });
});

test("detail refresh recovers a selected summary failure and a removed tab", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs/ }).click();
    await page.evaluate(() => __failSummary());
    const detail = panel.locator(".detail");
    await detail.getByRole("button", { name: "refresh", exact: true }).click();
    await detail.getByText("Read failed").waitFor();
    await page.evaluate(() => __custom());
    await detail.getByRole("button", { name: "Retry" }).click();
    await detail.getByRole("tab", { name: /checklist/ }).waitFor();
    assert.equal(
      await detail.getByRole("tab", { name: /Proposal/ }).getAttribute("aria-selected"),
      "true",
    );
    assert.equal(await detail.getByRole("tab", { name: /Specs/ }).count(), 0);
    await page.close();
  });
});

test("detail refresh marks a removed change unavailable and ignores old context completions", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.evaluate(() => __remove("first-change"));
    await panel.locator(".detail").getByRole("button", { name: "refresh", exact: true }).click();
    await panel
      .locator(".detail")
      .getByText("This change is no longer available", { exact: false })
      .waitFor();
    assert.equal(await panel.locator(".detail-footer button:enabled").count(), 0);
    assert.equal(await panel.getByRole("button", { name: "Delete change" }).isDisabled(), true);
    assert.equal(
      await panel
        .locator(".detail")
        .getByRole("button", { name: "refresh", exact: true })
        .isEnabled(),
      true,
    );
    await page.evaluate(() => {
      __holdListing();
      __directory("/tmp/other-project");
    });
    await panel.getByRole("button", { name: "Back to changes" }).waitFor({ state: "hidden" });
    await page.evaluate(() => __releaseListing());
    assert.equal(await panel.locator(".detail").isVisible(), false);
    assert.equal(await panel.locator(".board-shell").getByText("first-change").count(), 0);
    await page.close();
  });
});

test("theme precedes first paint and detail fills narrow and expanded widths", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url + "?hold-ready");
    await page.waitForFunction(() => !!window.__releaseReady);
    const frame = page.frameLocator("iframe");
    assert.equal(
      await frame.locator("#root").evaluate((node) => getComputedStyle(node).visibility),
      "hidden",
    );
    assert.equal(
      await frame.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    await page.evaluate(() => __releaseReady());
    await frame.getByRole("button", { name: "first-change" }).click();
    const narrow = await frame.locator(".detail").evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      available: document.querySelector("#root").getBoundingClientRect().width,
      border: getComputedStyle(node).borderLeftWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(narrow.width, narrow.available);
    assert.equal(narrow.border, "0px");
    assert.equal(narrow.overflow, false);
    assert.ok(
      await frame
        .locator(".artifact-tabs button")
        .first()
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 12),
    );
    assert.equal(
      await frame
        .locator(".change-card")
        .first()
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(29, 34, 38)",
    );
    await page.evaluate(() => __theme("light"));
    assert.equal(
      await frame.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(255, 255, 255)",
    );
    assert.equal(
      await frame
        .locator(".change-card")
        .first()
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(245, 247, 248)",
    );
    await page.setViewportSize({ width: 1076, height: 720 });
    assert.equal(
      await frame.locator(".detail").evaluate((node) => node.getBoundingClientRect().width),
      await frame.locator("#root").evaluate((node) => node.getBoundingClientRect().width),
    );
    await page.close();
  });
});

test("uncertain creation reconciles in the original context and opens the observed change", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).waitFor();
    await page.evaluate(() => __unknownCreate());
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("observed-change");
    await panel.getByLabel("Goal").fill("Observe before retry");
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "Inspect change" }).click();
    await panel.locator(".detail").getByRole("heading", { name: "observed-change" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/create").length),
      1,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/changes").length),
      3,
    );
    assert.deepEqual(
      await page.evaluate(
        () => __requests.find((item) => item.path === "/changes" && item.body.expectedRoot).body,
      ),
      { directory, expectedRoot: root },
    );
    await page.close();
  });
});

test("malformed creation replies reconcile instead of permitting another write", async () => {
  await withPanel(async (browser, url) => {
    for (const reply of ["invalid-json", "null", "bad-success", "bad-error"]) {
      const page = await browser.newPage();
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      await page.evaluate((value) => __createReply(value), reply);
      await panel.getByRole("button", { name: "new change" }).click();
      await panel.getByLabel("Change name").fill(`created-${reply}`);
      await panel.getByLabel("Goal").fill("Retain uncertain write");
      await panel.getByRole("button", { name: "create", exact: true }).click();
      await panel.getByRole("button", { name: "Inspect change" }).waitFor({ timeout: 5000 });
      assert.equal(
        await panel.getByRole("button", { name: "create", exact: true }).isDisabled(),
        true,
      );
      assert.equal(
        await page.evaluate(
          () => __requests.filter((request) => request.path === "/create").length,
        ),
        1,
      );
      assert.equal(
        await page.evaluate(
          () =>
            __requests.filter((request) => request.path === "/changes" && request.body.expectedRoot)
              .length,
        ),
        1,
      );
      await page.close();
    }
  });
});

test("failed creation reconciliation survives dismissal and closes safely across contexts", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("uncertain-change");
    await panel.getByLabel("Goal").fill("Retain the draft");
    await page.evaluate(() => {
      __createReply("null");
      __failNextListing();
    });
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByText(/Retry the read before creating again/).waitFor();
    assert.equal(await panel.getByRole("button", { name: "Dismiss attempt" }).isVisible(), false);
    await panel.getByRole("button", { name: "cancel", exact: true }).click();
    await panel.getByRole("button", { name: "new change" }).click();
    assert.equal(await panel.getByLabel("Change name").inputValue(), "uncertain-change");
    assert.equal(
      await panel.getByRole("button", { name: "create", exact: true }).isDisabled(),
      true,
    );
    await page.evaluate(() => __failNextListing());
    await panel.getByRole("button", { name: "Retry read" }).click();
    await panel.getByText(/Retry the read before creating again/).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "/create").length),
      1,
    );
    await page.evaluate(() => __directory("/tmp/other-project"));
    await panel.getByText(/Return to \/tmp\/fixture-project/).waitFor();
    await panel.getByRole("button", { name: "Dismiss attempt" }).click();
    await page.evaluate(() => __directory(directory));
    await panel.getByRole("button", { name: "new change" }).click();
    assert.equal(
      await panel.getByRole("button", { name: "create", exact: true }).isDisabled(),
      true,
    );
    await panel.getByRole("button", { name: "Retry read" }).click();
    await panel.getByRole("button", { name: "Inspect change" }).waitFor();
    await page.close();
  });
});

test("creation no-match reconciliation permits only explicit resubmission and known rejection stays editable", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("not-created");
    await panel.getByLabel("Goal").fill("A retained draft");
    await page.evaluate(() => __createReply("invalid-json", false));
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByText(/no matching change was found/).waitFor();
    assert.equal(await panel.getByLabel("Goal").inputValue(), "A retained draft");
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "/create").length),
      1,
    );
    await page.evaluate(() => __createReply("success"));
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "not-created" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((request) => request.path === "/create").length),
      2,
    );
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("known-rejected");
    await panel.getByLabel("Goal").fill("Retain on rejection");
    await page.evaluate(() => __createReply("known-error", false));
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByText("Known rejection").waitFor();
    assert.equal(await panel.getByLabel("Goal").inputValue(), "Retain on rejection");
    assert.equal(
      await panel.getByRole("button", { name: "create", exact: true }).isEnabled(),
      true,
    );
    await page.close();
  });
});

test("uncertain creation still inspects while board summaries are pending", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url + "?hold-summary");
    const panel = page.frameLocator("iframe");
    const create = panel.getByRole("button", { name: "new change" });
    await create.waitFor();
    await create.click();
    await panel.getByLabel("Change name").fill("observed-while-loading");
    await panel.getByLabel("Goal").fill("Confirm a pending write");
    await page.evaluate(() => __unknownCreate());
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "Inspect change" }).click();
    await page.evaluate(() => __releaseSummaries());
    await panel
      .locator(".detail h1")
      .getByText("observed-while-loading")
      .waitFor({ timeout: 5000 });
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/create").length),
      1,
    );
    await page.close();
  });
});

test("uncertain creation checks its original project after the selected project changes", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name").fill("observed-after-switch");
    await panel.getByLabel("Goal").fill("Keep the original scope");
    await page.evaluate(() => {
      __unknownCreate();
      __holdCreate();
    });
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await page.waitForFunction(() => __requests.some((item) => item.path === "/create"));
    await page.evaluate(() => __directory("/tmp/other-project"));
    await panel.getByRole("heading", { name: "other-project" }).waitFor();
    await page.evaluate(() => __releaseCreate());
    await panel.getByText(/Return to \/tmp\/fixture-project/).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((item) => item.path === "/changes" && item.body.expectedRoot),
      ),
      [{ path: "/changes", body: { directory, expectedRoot: root } }],
    );
    assert.equal(await panel.getByRole("button", { name: "Inspect change" }).isDisabled(), true);
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/create").length),
      1,
    );
    await page.close();
  });
});

test("old reads cannot reopen detail after Back or project replacement", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __holdProposal());
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => __directory("/tmp/other-project"));
    await panel.getByRole("heading", { name: "other-project" }).waitFor();
    await page.evaluate(() => __releaseFile());
    assert.equal(await panel.locator(".detail:visible").count(), 0);
    assert.equal(await panel.getByRole("button", { name: "first-change" }).count(), 0);
    await page.close();
  });
});

test("Tasks and documents independently invalidate a replaced root before later reads", async () => {
  await withPanel(async (browser, url) => {
    for (const route of ["/tasks", "/document"]) {
      const page = await browser.newPage();
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      await panel.getByRole("button", { name: "first-change" }).waitFor();
      await page.evaluate((path) => {
        __holdListing();
        __root("/tmp/new-canonical-root");
        __rootErrorOn(path);
      }, route);
      await panel.getByRole("button", { name: "first-change" }).click();
      await page.waitForFunction((path) => __completed.includes(path), route);
      assert.equal(
        await page.evaluate(() => __requests.filter((item) => item.path === "/changes").length),
        2,
      );
      assert.equal(await panel.locator(".detail:visible").count(), 0);
      await page.evaluate(() => __releaseListing());
      await panel.getByRole("button", { name: "first-change" }).waitFor();
      await page.close();
    }
  });
});

test("reopening a cached unavailable Tasks read disables an empty scaffold", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() => {
      __clearTasks();
      __holdTasks();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() => __requests.some((item) => item.path === "/tasks"));
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => {
      __unavailableOnRelease();
      __releaseFile();
    });
    await page.waitForFunction(() => __completed.includes("/tasks"));
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel
      .locator(".detail")
      .getByText(/no longer available/)
      .waitFor({ timeout: 5000 });
    assert.equal(
      await panel
        .locator(".detail-toolbar")
        .getByRole("button", { name: "Delete change" })
        .isDisabled(),
      true,
    );
    assert.equal(await panel.locator(".detail-footer button:visible").first().isDisabled(), true);
    assert.equal(
      await page.evaluate(() => __requests.filter((item) => item.path === "/tasks").length),
      1,
    );
    await page.close();
  });
});

test("cached unavailable Proposal stops later document groups on reopening", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() => {
      __design();
      __holdProposal();
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await page.waitForFunction(() =>
      __requests.some((item) => item.path === "/document" && item.body.artifactId === "proposal"),
    );
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => {
      __unavailableOnRelease();
      __releaseFile();
    });
    await page.waitForFunction(() => __completed.includes("/document"));
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel
      .locator(".detail")
      .getByText(/no longer available/)
      .waitFor({ timeout: 5000 });
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter((item) => item.path === "/document" && item.body.artifactId === "specs")
            .length,
      ),
      0,
    );
    await page.close();
  });
});

test("search keeps its caret across refresh and same-stage cards stay ordered", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const search = panel.getByLabel("Search changes");
    await search.fill("change");
    await search.evaluate((input) => input.setSelectionRange(2, 2));
    await page.evaluate(() => __addSameStage());
    await panel
      .getByRole("button", { name: "refresh", exact: true })
      .evaluate((button) => button.click());
    await panel.getByRole("button", { name: "alpha-change" }).waitFor();
    assert.equal(await search.inputValue(), "change");
    assert.equal(await search.evaluate((input) => input.selectionStart), 2);
    assert.equal(await search.evaluate((input) => document.activeElement === input), true);
    assert.deepEqual(
      await panel
        .locator(".stage")
        .filter({ hasText: "In Progress" })
        .locator(".card-main")
        .allTextContents(),
      ["alpha-change", "first-change"],
    );
    await page.close();
  });
});

test("Back restores the board scroll and theme updates preserve detail navigation focus", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 300 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await panel.getByRole("button", { name: "first-change" }).scrollIntoViewIfNeeded();
    const scroll = await panel.locator("html").evaluate(() => scrollY);
    assert.ok(scroll > 0);
    await panel.getByRole("button", { name: "first-change" }).click();
    const tasks = panel.getByRole("tab", { name: /Tasks · Written/ });
    await tasks.focus();
    await page.evaluate(() => __theme("light"));
    assert.equal(await tasks.evaluate((button) => document.activeElement === button), true);
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await panel
      .locator("html")
      .evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    assert.equal(await panel.locator("html").evaluate(() => scrollY), scroll);
    await page.close();
  });
});
