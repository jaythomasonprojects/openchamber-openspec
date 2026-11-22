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
function hostHtml(statusCase, pointer, popovers) {
  const data = JSON.stringify({ directory, root, artifacts, theme: theme("dark") });
  const themes = JSON.stringify({ dark: theme("dark"), light: theme("light") });
  return `<!doctype html><script>
    const { directory, root, artifacts, theme } = ${data};
    const statusCase = ${JSON.stringify(statusCase)};
    const pointer = ${JSON.stringify(pointer)};
    const popovers = ${JSON.stringify(popovers)};
    const statusDirectory = statusCase === "worktree" ? "/tmp/fixture-worktree" : directory;
    let currentRoot = root;
    let currentPlanning = "fixture-planning";
    let projects = [{ id: "origin-project", name: "Origin", directory }];
    let worktrees = [];
    let sessions = [];
    window.__projects = value => { projects = value; };
    window.__worktrees = value => { worktrees = value; };
    const guests = new Set();
    let popover = null;
    let board = null;
    let pendingFocus = null;
    window.__focusClaims = [];
    const post = (guest, type, payload) =>
      guest.postMessage({ channel: "openchamber.sdk", v: 1, type, payload }, "*");
    const readyFor = (guest) => popover && popover.frame.contentWindow === guest
      ? { ...ready, directory: popover.directory, surface: "popover", item: null, features: undefined, popover: popover.context }
      : board && board.frame.contentWindow === guest
      ? { ...ready, surface: "panel", directory: board.directory }
      : ready;
    window.__mountBoard = (boardDirectory = directory) => {
      if (board) {
        guests.delete(board.frame.contentWindow);
        board.frame.remove();
      }
      const frame = document.createElement("iframe");
      frame.src = "/panel/index.html";
      frame.title = "OpenSpec test board";
      frame.style.height = "700px";
      board = { frame, directory: boardDirectory };
      document.body.append(frame);
    };
    const closePopover = (reason) => {
      if (!popover) return;
      const { owner, frame, context } = popover;
      guests.delete(frame.contentWindow);
      frame.remove();
      popover = null;
      post(owner, "popover-closed", { id: context.id, reason });
    };
    window.__closePopover = closePopover;
    window.__serviceEvent = (topic, data) => {
      for (const guest of guests) post(guest, "service-event", { topic, data });
    };
    const changes = [
      { id: "first-change", goal: "Read the proposal", completedTasks: 1, totalTasks: 2 },
      { id: "second-change", goal: "Review the specs", completedTasks: 0, totalTasks: 0 },
    ];
    let proposal = "First version of proposal";
    const documents = {};
    let customSelector = "checklist.md";
    window.__document = (selector, text) => { documents[selector] = text; };
    window.__customSelector = (selector) => { customSelector = selector; custom = true; };
    let tasks = [{ id: "1", description: "1.1 CLI description", done: true },
      { id: "2", description: "Second description", done: false }];
    let holdFiles = false;
    let holdListing = false;
    let holdSummaries = location.search.includes("hold-summary");
    const pendingSummaries = [];
    const pendingValidation = [];
    let holdValidation = false;
    let validationResult = null;
    window.__validation = (value) => { validationResult = value; };
    let rejectNextPopover = false;
    window.__holdValidation = () => { holdValidation = true; };
    window.__releaseValidation = () => {
      holdValidation = false;
      pendingValidation.splice(0).forEach((finish) => finish());
    };
    window.__rejectNextPopover = () => { rejectNextPopover = true; };
    let failSummary = location.search.includes("fail-summary");
    let batchReply = "";
    window.__batchReply = (value) => { batchReply = value; };
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
    let workflows = ["propose", "explore", "apply", "update", "sync", "archive"];
    window.__workflows = (value) => { workflows = value; };
    let archivedChanges = [];
    window.__archived = (changes) => { archivedChanges = changes; };
    let mainSpecs = [];
    const mainSpecContent = new Map();
    window.__specs = (specs) => { mainSpecs = specs; };
    window.__spec = (id, content) => { mainSpecContent.set(id, content); };
    let holdWorkflows = false;
    const pendingWorkflows = [];
    window.__holdWorkflows = () => { holdWorkflows = true; };
    window.__releaseWorkflows = () => {
      holdWorkflows = false;
      pendingWorkflows.splice(0).forEach((finish) => finish());
    };
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
    const storage = new Map();
    const deviceStorage = new Map();
    let failStorage = false;
    window.__stored = () => Object.fromEntries(storage);
    window.__seedStorage = (entries) => { for (const [key, value] of entries) storage.set(key, value); };
    window.__deviceStored = () => Object.fromEntries(deviceStorage);
    window.__seedDeviceStorage = (entries) => { for (const [key, value] of entries) deviceStorage.set(key, value); };
    window.__remountStatus = () => {
      const frame = document.querySelector('iframe[title="OpenSpec test panel"]');
      guests.delete(frame.contentWindow);
      frame.replaceWith(frame.cloneNode(false));
    };
    window.__failStorage = () => { failStorage = true; };
    let failOpenUrl = false;
    let holdClipboard = false;
    let failClipboard = false;
    let failToast = false;
    const pendingClipboard = [];
    window.__holdClipboard = () => { holdClipboard = true; };
    window.__releaseClipboard = () => { holdClipboard = false; pendingClipboard.splice(0).forEach((finish) => finish()); };
    window.__failClipboard = () => { failClipboard = true; };
    window.__failToast = () => { failToast = true; };
    let holdStart = false;
    let startResult = { sessionId: "archive-session", directory, sent: "sent", linked: true };
    let startError = null;
    const pendingStarts = [];
    window.__startResult = (result) => { startResult = result; startError = null; };
    window.__startError = (code) => { startError = code; };
    window.__holdStart = () => { holdStart = true; };
    window.__releaseStart = () => { holdStart = false; pendingStarts.splice(0).forEach((finish) => finish()); };
    window.__surface = (surface) => { ready.surface = surface;
      for (const guest of guests) guest.postMessage({ channel: "openchamber.sdk", v: 1, type: "ready", payload: ready }, "*"); };
    const pendingCompose = [];
    const pending = [];
    window.__requests = [];
    window.__completed = [];
    window.__edit = (text) => { proposal = text;
      if (statusCase === "progress" || statusCase === "compact-progress") { tasks[3].done = true; changes[0].completedTasks = 4; }
      else { tasks[1].done = true; changes[0].completedTasks = 2; }
    };
    window.__unedit = () => { tasks[1].done = false; changes[0].completedTasks = 1; };
    window.__goal = (id, value) => { changes.find((item) => item.id === id).goal = value; };
    window.__areas = (id, value) => { changes.find((item) => item.id === id).affectedAreas = value; };
    window.__rename = (before, after) => { changes.find((item) => item.id === before).id = after; };
    window.__remove = (id) => { const index = changes.findIndex((item) => item.id === id); changes.splice(index, 1); };
    window.__recreate = (id) => { changes.push({ id, goal: "Recreated goal", completedTasks: 0, totalTasks: 0 }); };
    window.__addSameStage = () => { changes.push({ id: "alpha-change", goal: "Another goal", completedTasks: 1, totalTasks: 2 }); };
    window.__theme = (mode) => {
      ready.theme = ${themes}[mode];
      for (const guest of guests) post(guest, "ready", readyFor(guest));
    };
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
    window.__releaseReads = () => { holdProposal = false; holdTasks = false; pending.splice(0).forEach((finish) => finish()); };
    window.__design = () => { withDesign = true; };
    window.__longSpec = () => { longSpec = true; };
    window.__failSpec2 = () => { failSpec2 = true; };
    window.__custom = () => { custom = true; };
    window.__collidingLabels = () => { collidingLabels = true; };
    window.__longArtifact = () => { longArtifact = true; };
    window.__readiness = (mode) => { readinessCase = mode; };
    window.__proposalStatus = (status) => { artifacts[0].status = status; };
    window.__specsStatus = (status) => { artifacts[1].status = status; };
    window.__draft = () => draft;
    window.__session = (id, busy = false) => { ready.session = id ? { id, busy } : null;
      for (const guest of guests) post(guest, "ready", readyFor(guest));
      for (const guest of guests) post(guest, "session", { session: ready.session });
      if (statusCase && id) __lifecycle(id, busy ? "started" : "completed");
    };
    window.__lifecycle = (sessionId, phase) => {
      if (ready.session?.id === sessionId) ready.session.busy = phase === "started";
      for (const guest of guests) guest.postMessage({ channel: "openchamber.sdk", v: 1,
        type: "session-lifecycle", payload: { sessionId, phase } }, "*");
    };
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
    window.__directory = (next) => {
      if (next !== ready.directory) closePopover("owner");
      ready.directory = next;
      for (const guest of guests) post(guest, "directory", { directory: next });
    };
    window.__root = (next) => { currentRoot = next; };
    window.__planning = next => { currentPlanning = next; };
    const ready = { directory: statusDirectory, theme, locale: "en-AU",
      session: statusCase === "new" ? null : { id: "fixture-session", busy: false },
      surface: statusCase ? "status" : "panel", connection: { connected: true, account: "" }, settings: {}, item: null };
    if (popovers) ready.features = { popovers: true };
    if (location.search.includes("device-storage")) ready.features = { ...ready.features, deviceStorage: true };
    if (statusCase === "mount-burst") ready.session.busy = true;
    if (pointer) ready.device = { formFactor: pointer === "coarse" ? "phone" : "desktop", pointer,
      insets: { top: 0, right: 0, bottom: 0, left: 0 }, keyboard: 0 };
    window.__device = (bottom, keyboard) => {
      ready.device = { ...ready.device, insets: { ...ready.device.insets, bottom }, keyboard };
      __theme("light");
    };
    if (statusCase) {
      const worktree = statusCase === "worktree"
        ? { directory: statusDirectory, name: "second-change", branch: "second-change", status: "ready" } : null;
      if (worktree) worktrees = [worktree];
      const items = statusCase === "archive"
        ? [{ id: "archive-all", data: { kind: "archive-all" } }]
        : [{ id: "first-change", data: { kind: "change", change: "first-change" } }];
      sessions = [{ id: "fixture-session", title: "Fixture", projectId: "origin-project",
        directory: statusDirectory, parentId: null, createdAt: 1, updatedAt: 1, archivedAt: null,
        worktree, activity: "idle", outcome: null, items: worktree ? [] : items }];
      if (statusCase === "saved" || statusCase === "stale" || statusCase === "legacy-value")
        storage.set("session-change:fixture-session", statusCase === "legacy-value"
          ? { change: "second-change", savedAt: 1 }
          : { changes: [statusCase === "saved" ? "second-change" : "old-change"], savedAt: 1 });
      if (statusCase === "other-directory-error" || statusCase === "unregistered-saved")
        storage.set("session-change:fixture-session", { changes: ["second-change"], savedAt: 1 });
      if (statusCase.startsWith("unregistered-")) projects = [];
      if (statusCase === "stale") sessions[0].items = [];
      if (statusCase === "switch") sessions.push({ ...sessions[0], id: "replacement-session",
        items: [{ id: "second-change", data: { kind: "change", change: "second-change" } }] });
      if (statusCase === "header") ready.features = { ...ready.features, statusControls: true };
      if (statusCase === "picker") {
        sessions[0].items = [];
        changes.unshift(
          { id: "complete-change", goal: null, completedTasks: 2, totalTasks: 2 },
          { id: "not-started-change", goal: null, completedTasks: 0, totalTasks: 2 },
          { id: "z-progress-change", goal: null, completedTasks: 1, totalTasks: 3 },
        );
      }
      if (statusCase === "archive") changes.push({ id: "archive-all", goal: null, completedTasks: 0, totalTasks: 0 });
      if (statusCase === "long-goal") changes[0].goal = "a".repeat(17000);
      if (statusCase === "escaped-goal") changes[0].goal = String.fromCharCode(1).repeat(17000);
      if (statusCase.startsWith("compact-"))
        storage.set("session-change:fixture-session", { changes: ["first-change", "second-change"], savedAt: 1 });
      if (["progress", "complete", "compact-progress", "compact-complete", "compact-read-error", "compact-touch"].includes(statusCase)) {
        changes[0].completedTasks = statusCase.endsWith("complete") ? 7 : 3;
        changes[0].totalTasks = 7;
        tasks = Array.from({ length: 7 }, (_, index) => ({
          id: String(index + 1),
          description: index === 3 ? "2.1 Add a section that tracks a change\\nKeep the whole description readable when expanded." : "Task " + (index + 1),
          done: index < changes[0].completedTasks,
        }));
      }
      if (statusCase === "compact-touch") tasks[3].description = "long-task-title-".repeat(20);
      if (statusCase === "long-card-name") {
        changes[0].id = "long-name-".repeat(15) + "change";
        changes[0].completedTasks = changes[0].totalTasks = 6;
        sessions[0].items = [{ id: changes[0].id }];
        tasks = Array.from({ length: 6 }, (_, i) => ({
          id: String(i + 1), description: "Task " + (i + 1), done: true,
        }));
      }
      if (statusCase === "compact-read-error") failSummary = true;
      if (statusCase === "planning" || statusCase === "compact-planning") {
        changes[0].completedTasks = changes[0].totalTasks = 0;
        tasks = [];
        readinessCase = "blocked-tasks";
      }
    }
    addEventListener("message", (event) => {
      const message = event.data;
      if (!message || message.channel !== "openchamber.sdk" || message.v !== 1) return;
       const reply = (payload) => { if (message.type === "service-request") __completed.push(message.payload.path);
         event.source.postMessage({ channel: "openchamber.sdk", v: 1,
           type: "result", id: message.id, ok: true, ...(payload === undefined ? {} : { payload }) }, "*"); };
      if (message.type === "hello") {
        guests.add(event.source);
         const show = () => {
           const context = readyFor(event.source);
           post(event.source, "ready", context);
           if (statusCase) {
             post(event.source, "directory", { directory: context.directory });
             post(event.source, "session", { session: context.session });
           }
           if (statusCase && context.session) post(event.source, "session-lifecycle", {
             sessionId: context.session.id, phase: context.session.busy ? "started" : "completed",
           });
         };
        if (location.search.includes("hold-ready") && readyFor(event.source).surface !== "popover")
          window.__releaseReady = show;
        else show();
        return;
      }
       if (message.type === "service-request") {
         const path = message.payload.path;
         if (path === "/focus" && message.payload.method === "GET") {
           const targetDirectory = message.payload.query?.directory;
           __focusClaims.push(targetDirectory);
           const claim = pendingFocus?.directory === targetDirectory ? pendingFocus : null;
           if (claim) pendingFocus = null;
           reply({ status: 200, body: JSON.stringify(claim) });
           return;
         }
         const body = JSON.parse(message.payload.body);
        window.__requests.push({ path, body });
        const send = (value, status = 200) => reply({ status, body: JSON.stringify(value && typeof value === "object" ? { planning: currentPlanning, ...value } : value) });
        if (body.expectedPlanning && body.expectedPlanning !== currentPlanning) {
          send({error:{code:"PLANNING_CHANGED",message:"Planning target changed. Refresh to establish the new scope."}},409); return;
        }
          if (path === "/workflows") {
            const configured = workflows;
            const finish = () => {
              if (configured === null)
                reply({ status: 422, body: JSON.stringify({ error: { code: "OPENSPEC_ERROR", message: "Cannot read workflows" } }) });
              else reply({ status: 200, body: JSON.stringify({ workflows: configured }) });
            };
            if (holdWorkflows) pendingWorkflows.push(finish); else finish();
         }
         else if (path === "/changes") {
           if (failNextListing) { failNextListing = false;
             send({ error: { code: "CLI_UNAVAILABLE", message: "Cannot check listing" } }, 503); return; }
           const local = body.directory === statusDirectory;
           const finish = () => send({ directory: body.directory, root: local ? currentRoot : body.directory + "/openspec",
             changes: local ? changes.map(({ id, completedTasks, totalTasks }) => ({ id, completedTasks, totalTasks })) : [] });
          if (holdListing) pending.push(finish); else finish();
        }
         else if (path === "/archived") {
           if (archivedChanges === null)
             send({ error: { code: "OPENSPEC_ERROR", message: "Cannot list archived changes" } }, 422);
           else send({ changes: archivedChanges });
         }
         else if (path === "/specs") {
           if (mainSpecs === null)
             send({ error: { code: "OPENSPEC_ERROR", message: "Cannot list specs" } }, 422);
           else send({ specs: mainSpecs });
         }
         else if (path === "/spec") {
           const content = mainSpecContent.get(body.spec);
           if (typeof content !== "string")
             send({ error: { code: "SPEC_UNAVAILABLE", message: "Spec is no longer listed." } }, 404);
           else reply({ status: 200, body: JSON.stringify({ id: body.spec, content }) });
         }
         else if (path === "/summaries") {
          if (body.directory !== directory) { send({ root: body.directory + "/openspec", changes: [] }); return; }
          if (batchReply) {
            const mode = batchReply; batchReply = "";
            if (mode === "malformed") send({ root: currentRoot, changes: null });
            else if (mode === "root") send({ error: { code: "ROOT_CHANGED", message: "Root changed" } }, 409);
            else send({ error: { code: "CLI_UNAVAILABLE", message: "Batch read failed" } }, 503);
            return;
          }
          const finish = () => {
            const results = changes.map((item) => {
              let result;
              respondSummary({ ...body, change: item.id }, (value) => { result = value.error ? { id: item.id, error: value.error } : { id: item.id, summary: value }; });
              return result;
            });
            send({ root: currentRoot, changes: results });
          };
          if (holdSummaries) {
            pendingSummaries.push(finish);
          } else finish();
         }
         else if (path === "/summary") respondSummary(body, send);
         else if (path === "/focus") {
           pendingFocus = body;
           __serviceEvent("focus");
           send({ ok: true });
         }
          else if (path === "/validate") {
            if (body.change === "first-change") {
              const value = validationResult ?? { valid: true, issues: [] };
              const finish = () => send(value);
             if (holdValidation) pendingValidation.push(finish); else finish();
           }
           else if (statusCase === "compact-validation-budget") send({ valid: false,
               issues: [
                 { level: "INFO", path: "file", message: "This note does not affect validation." },
                 ...Array.from({ length: 23 }, (_, i) => ({
                   level: "ERROR", path: "specs/" + i, message: String.fromCharCode(1).repeat(400),
                 })),
                 { level: "INFO", path: "file", message: "An omitted note is not an omitted issue." },
               ] });
           else send({ valid: false, issues: Array.from({ length: 23 }, (_, i) => ({
             level: "ERROR", path: "specs/" + i, message: ("Issue " + i + " ").padEnd(400, "x"),
           })) });
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
              content: documents[body.selector] ?? (body.selector === "proposal.md" ? proposal
                : longSpec && body.selector === "specs/1.md" ? "Long document line\\n\\n".repeat(200)
                : "Content of " + body.selector) });
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
      if (message.type === "storage") {
        const { op, key, value, scope } = message.payload;
        window.__requests.push({ path: "storage", body: message.payload });
        if (failStorage || (scope === "device" && !ready.features?.deviceStorage)) {
          event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result",
            id: message.id, ok: false, code: "HOST_REJECTED", error: "Storage unavailable" }, "*");
          return;
        }
        const shelf = scope === "device" ? deviceStorage : storage;
        if (op === "get") reply(shelf.has(key)
          ? { storage: true, op, found: true, value: shelf.get(key) }
          : { storage: true, op, found: false });
        else if (op === "keys") reply({ storage: true, op, keys: [...shelf.keys()].sort() });
        else if (op === "set" || op === "delete") {
          if (op === "set") shelf.set(key, value);
          else shelf.delete(key);
          reply({ storage: true, op });
        }
        return;
      }
      if (message.type === "start-session") {
        window.__requests.push({ path: "start-session", body: message.payload, directory: ready.directory });
        const finish = () => startError
          ? event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id,
              ok: false, code: startError, error: "Launch refused" }, "*")
          : reply(startResult);
        if (holdStart) pendingStarts.push(finish); else finish();
        return;
      }
      if (message.type === "workspace-read") {
         window.__requests.push({path:message.type,body:message.payload});
         const query = message.payload;
         const sessionState = statusCase === "unready-tracking" ? "loading" : "ready";
         reply(query.kind === "projects" ? {kind:"projects",state:"ready",projects} :
           query.kind === "worktrees" ? {kind:"worktrees",projectId:query.projectId,state:"ready",worktrees} :
           {kind:"sessions",projectId:query.projectId,state:sessionState,coverage:[{ directory: statusDirectory, state: sessionState }],sessions});
        return;
      }
      if (message.type === "workspace-subscribe") {
        window.__requests.push({path:message.type,body:message.payload});
        const { subscriptionId, query } = message.payload;
         const sessionState = statusCase === "unready-tracking" ? "loading" : "ready";
         const coverage = [{ directory: statusDirectory, state: sessionState }];
        if (statusCase === "other-directory-error") coverage.push({ directory: "/tmp/other-worktree", state: "error" });
        event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "workspace",
          payload: { subscriptionId, snapshot: { kind: "sessions", projectId: query.projectId,
             state: statusCase === "other-directory-error" ? "error" : sessionState, coverage, sessions } } }, "*");
        reply();
        return;
      }
        if (message.type === "popover-open") {
          window.__requests.push({ path: message.type, body: message.payload });
          if (rejectNextPopover) {
            rejectNextPopover = false;
            event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result",
              id: message.id, ok: false, code: "HOST_REJECTED", error: "Popover anchor was not visible" }, "*");
            return;
          }
         const { id, data, width, height } = message.payload;
         const ownerFrame = [...document.querySelectorAll("iframe")].find((frame) => frame.contentWindow === event.source);
         closePopover("replaced");
         const frame = document.createElement("iframe");
         frame.src = ownerFrame.src;
         frame.title = "OpenSpec test popover";
         frame.style.width = width + "px";
         frame.style.height = height + "px";
         popover = { owner: event.source, directory: readyFor(event.source).directory, frame, context: { id, data } };
         document.body.append(frame);
         reply();
         return;
       }
       if (message.type === "popover-close" || message.type === "popover-anchor") {
         window.__requests.push({ path: message.type, body: message.payload });
         if (popover?.frame.contentWindow === event.source && message.payload.id !== popover.context.id) {
           event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id,
             ok: false, code: "HOST_REJECTED", error: "A popover may close or report activity only for itself." }, "*");
           return;
         }
         reply();
         if (message.type === "popover-close" && message.payload.id === popover?.context.id)
           closePopover(message.payload.reason ?? "closed");
         return;
       }
       if (message.type === "status-controls") {
         window.__requests.push({ path: message.type, body: message.payload });
         const context = readyFor(event.source);
         if (context.surface !== "status" || !context.features?.statusControls) {
           event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id,
             ok: false, code: "UNSUPPORTED", error: "This frame has no status header." }, "*");
           return;
         }
         reply();
         return;
       }
       if (["workspace-unsubscribe", "resize", "open-surface"].includes(message.type)) {
         window.__requests.push({path:message.type,body:message.payload});
         if (message.type === "open-surface" && location.search.includes("open-board") && !board)
           __mountBoard(readyFor(event.source).directory);
         if (statusCase && message.type === "resize") {
           const frame = [...document.querySelectorAll("iframe")].find((frame) => frame.contentWindow === event.source);
           if (frame === popover?.frame)
             frame.style.height = Math.max(48, Math.min(480, message.payload.height + (pointer === "coarse" ? 0 : 2))) + "px";
           else if (frame && !board?.frame.isSameNode(frame))
             frame.style.height = Math.max(24, Math.min(480, message.payload.height)) + "px";
         }
        reply();
        return;
      }
      if (message.type === "open-session") {
        window.__requests.push({path:message.type,body:message.payload}); reply(); return;
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
        if (message.type === "toast" && failToast) { failToast = false;
          event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id,
            ok: false, code: "HOST_REJECTED", error: "Toast unavailable" }, "*"); return; }
        reply(message.type === "prompt" ? { sent: "skipped" } : undefined);
      }
      if (message.type === "clipboard-write") {
        window.__requests.push({ path: message.type, body: message.payload });
        const finish = () => {
          if (failClipboard) { failClipboard = false;
            event.source.postMessage({ channel: "openchamber.sdk", v: 1, type: "result", id: message.id,
              ok: false, code: "HOST_REJECTED", error: "Clipboard unavailable" }, "*"); }
          else reply();
        };
        if (holdClipboard) pendingClipboard.push(finish); else finish();
      }
    });
    function respondSummary(body, send) {
           const reply = send;
           send = (value, status) => reply(value.error ? value : { affectedAreas: changes.find((change) => change.id === body.change)?.affectedAreas ?? [], ...value }, status);
          const item = changes.find((change) => change.id === body.change);
          if (!item) send({ error: { code: "CHANGE_UNAVAILABLE", message: "Removed" } }, 404);
          else if (failSummary && item.id === "first-change") { failSummary = false;
            send({ error: { code: "UNAVAILABLE", message: "Read failed" } }, 503); }
            else if (readinessCase && (statusCase !== "compact-planning" || item.id === "first-change")) send({ id: item.id, goal: item.goal, root: currentRoot,
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
              artifacts: custom ? [artifacts[0], { id: "checklist", status: "done", outputPath: customSelector, requires: ["proposal"] }] :
               withDesign ? [artifacts[0], artifacts[1], { id: "design", status: "done", outputPath: "design.md", requires: ["specs"] }, artifacts[2]] : artifacts,
            applyRequires: custom ? ["checklist"] : ["tasks"], documents: [
            { artifactId: "proposal", selector: "proposal.md", label: "proposal.md" },
             ...(custom ? [{ artifactId: "checklist", selector: customSelector, label: customSelector }] : [
               ...[1, 2, 3].map((n) => ({ artifactId: "specs", selector: "specs/" + n + ".md", label: "specs/" + n + ".md" })),
               ...(withDesign ? [{ artifactId: "design", selector: "design.md", label: "design.md" }] : []),
              { artifactId: "tasks", selector: "tasks.md", label: "tasks.md" }]),
          ] });
    }
  </script><style>body{margin:0}iframe{display:block;width:100%;height:${statusCase ? "160px" : "100vh"};border:0}</style><iframe src="/panel/${statusCase ? "status" : "index"}.html" title="OpenSpec test panel"></iframe>`;
}

async function withPanel(run) {
  const [html, js] = await Promise.all([
    readFile(new URL("../panel/index.html", import.meta.url)),
    readFile(new URL("../panel/main.js", import.meta.url)),
  ]);
  const server = createServer((request, response) => {
    const { pathname: path, searchParams } = new URL(request.url, "http://127.0.0.1");
    if (path === "/") {
      response.setHeader("content-type", "text/html");
      response.end(
        hostHtml(
          searchParams.get("status"),
          searchParams.get("pointer"),
          searchParams.has("popovers"),
        ),
      );
    } else if (path === "/panel/index.html") {
      response.setHeader("content-type", "text/html");
      response.end(html);
    } else if (path === "/panel/main.js") {
      response.setHeader("content-type", "text/javascript");
      response.end(js);
    } else if (path === "/panel/status.html" || path === "/panel/status.js") {
      void readFile(new URL(`..${path}`, import.meta.url)).then(
        (content) => {
          response.setHeader(
            "content-type",
            path.endsWith(".html") ? "text/html" : "text/javascript",
          );
          response.end(content);
        },
        () => {
          response.statusCode = 404;
          response.end();
        },
      );
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

for (const popovers of [true, false]) {
  test(`session section shows the change flyout ${popovers ? "in a host popover" : "inline"}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ hasTouch: popovers });
      await page.goto(`${url}?status=progress${popovers ? "&popovers&pointer=coarse" : ""}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const name = section.getByRole("button", { name: "first-change", exact: true });
      const goal = "Read the proposal";
      if (popovers) {
        await name.tap({ timeout: 3000 });
        const flyout = page.frameLocator('iframe[title="OpenSpec test popover"]');
        await flyout.getByText(goal, { exact: true }).waitFor({ timeout: 3000 });
        assert.equal(await section.getByText(goal, { exact: true }).count(), 0);
        assert.equal(await flyout.getByRole("button", { name: "board", exact: true }).count(), 0);
        await page.evaluate(() => __closePopover("outside"));
        await page.waitForFunction(
          () => !document.querySelector('iframe[title="OpenSpec test popover"]'),
        );
        await name.tap();
        await flyout.getByText(goal, { exact: true }).waitFor();
      } else {
        await name.click({ timeout: 3000 });
        await section.getByText(goal, { exact: true }).waitFor({ timeout: 3000 });
        assert.equal(await page.locator("iframe").count(), 1);
        await name.click();
        await section.getByText(goal, { exact: true }).waitFor({ state: "hidden" });
      }
    });
  });
}

test("session section shows the same shortened 17,000-character goal in either flyout", async () => {
  await withPanel(async (browser, url) => {
    for (const popovers of [true, false]) {
      const page = await browser.newPage({ hasTouch: popovers });
      await page.goto(`${url}?status=long-goal${popovers ? "&popovers&pointer=coarse" : ""}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const name = section.getByRole("button", { name: "first-change", exact: true });
      if (popovers) await name.tap({ timeout: 3000 });
      else await name.click({ timeout: 3000 });
      const destination = popovers
        ? page.frameLocator('iframe[title="OpenSpec test popover"]')
        : section;
      await destination
        .getByText(`${"a".repeat(3999)}…`, { exact: true })
        .waitFor({ timeout: 3000 });
      await page.close();
    }
  });
});

for (const [stage, chip, count, current, percent] of [
  ["progress", "apply", "3/7", "2.1 Add a section that tracks a change", 3 / 7],
  ["complete", "archive", "7/7", "Task 7", 1],
  ["planning", "propose", "0/0", null, 0],
]) {
  test(`session section shows compact cards for ${stage} and ready`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=compact-${stage}`);
      const frame = page.frameLocator("iframe");
      const first = frame
        .getByRole("article")
        .filter({ has: frame.getByRole("heading", { name: "first-change" }) });
      const second = frame
        .getByRole("article")
        .filter({ has: frame.getByRole("heading", { name: "second-change" }) });
      const bar = first.getByRole("progressbar", { name: "Task completion" });
      await bar.waitFor({ timeout: 3000 });
      assert.equal(await first.getByText(count, { exact: true }).isVisible(), true);
      assert.equal((await bar.boundingBox()).height, 3);
      const value = Number(await bar.getAttribute("aria-valuenow"));
      assert.ok(Math.abs(value / 100 - percent) < 0.001);
      const details = first.locator("details");
      assert.equal(await details.isVisible(), current !== null);
      if (current) {
        const summary = details.locator("summary");
        assert.equal(await details.getAttribute("open"), null);
        assert.equal(await summary.getByText("Tasks:", { exact: true }).isVisible(), true);
        assert.equal(
          await summary.getByRole("button", { name: current, exact: true }).isVisible(),
          true,
        );
      }
      for (const [card, action] of [
        [first, chip],
        [second, "apply"],
      ]) {
        const names = await card.getByRole("button").allTextContents();
        assert.deepEqual(
          names.slice(action === "propose" ? -4 : -3),
          action === "propose"
            ? [action, "explore", "sync", "validate"]
            : [action, "sync", "validate"],
        );
      }
      assert.equal(await second.getByText("0/0", { exact: true }).isVisible(), true);
      assert.equal(await second.locator("details").isVisible(), false);
    });
  });
}

for (const popovers of [false, true]) {
  test(`session section offers ordered change actions ${popovers ? "in a popover" : "inline"}`, async () => {
    await withPanel(async (browser, url) => {
      for (const [stage, workflows, labels] of [
        ["planning", ["ff", "continue"], ["continue", "update", "Open in board"]],
        ["planning", ["ff"], ["update", "Open in board"]],
        ["progress", ["ff", "continue"], ["update", "Open in board"]],
      ]) {
        const page = await browser.newPage({ hasTouch: popovers });
        await page.goto(
          `${url}?status=${stage}&hold-ready${popovers ? "&popovers&pointer=coarse" : ""}`,
        );
        await page.waitForFunction(() => typeof window.__releaseReady === "function");
        await page.evaluate((value) => {
          __workflows(value);
          __releaseReady();
        }, workflows);
        const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
        const name = section.getByRole("button", { name: "first-change", exact: true });
        if (popovers) await name.tap({ timeout: 3000 });
        else await name.click({ timeout: 3000 });
        const flyout = popovers
          ? page.frameLocator('iframe[title="OpenSpec test popover"]').locator("main")
          : section.getByText("Read the proposal", { exact: true }).locator("..");
        const untrack = flyout.getByRole("button", { name: "Untrack", exact: true });
        await untrack.waitFor({ timeout: 3000 });
        assert.deepEqual(await flyout.getByRole("button").allTextContents(), [
          ...labels,
          "Untrack",
        ]);
        const board = flyout.getByRole("button", { name: "Open in board", exact: true });
        assert.ok(
          (await untrack.boundingBox()).y >=
            (await board.boundingBox()).y + (await board.boundingBox()).height,
        );
        assert.ok(
          await untrack.evaluate(
            (node) =>
              node.getBoundingClientRect().right ===
                node.closest(".flyout").querySelector(".card-actions").getBoundingClientRect()
                  .right &&
              parseFloat(getComputedStyle(node).fontSize) <
                parseFloat(getComputedStyle(node.closest(".flyout")).fontSize),
          ),
        );
        await page.close();
      }
    });
  });
}

for (const action of ["continue", "update", "Open in board"]) {
  test(`session section closes its host popover after ${action}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ hasTouch: true });
      await page.goto(`${url}?status=planning&popovers&pointer=coarse&hold-ready&open-board`);
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate(() => {
        __workflows(["ff", "continue"]);
        __releaseReady();
      });
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      await section
        .getByRole("button", { name: "first-change", exact: true })
        .tap({ timeout: 3000 });
      const flyout = page.frameLocator('iframe[title="OpenSpec test popover"]');
      if (action === "Open in board") await page.evaluate(() => delete window.__releaseReady);
      await flyout.getByRole("button", { name: action, exact: true }).tap({ timeout: 3000 });
      await page.waitForFunction(
        () => {
          const opened = __requests.find(({ path }) => path === "popover-open");
          return __requests.some(
            ({ path, body }) => path === "popover-close" && body.id === opened?.body.id,
          );
        },
        null,
        { timeout: 3000 },
      );
      await page
        .locator('iframe[title="OpenSpec test popover"]')
        .waitFor({ state: "detached", timeout: 3000 });
      if (action === "Open in board") {
        const board = page.frameLocator('iframe[title="OpenSpec test board"]');
        await page.waitForFunction(() => typeof window.__releaseReady === "function", null, {
          timeout: 3000,
        });
        await page.evaluate(() => __releaseReady());
        await board.getByRole("button", { name: "Back to changes" }).waitFor({ timeout: 3000 });
        await board.getByRole("heading", { name: "first-change", exact: true }).waitFor();
        assert.deepEqual(
          await page.evaluate(() =>
            __requests.filter(({ path }) => path === "/focus" || path === "open-surface"),
          ),
          [
            { path: "/focus", body: { directory, change: "first-change" } },
            { path: "open-surface", body: { surfaceId: "plugin:openspec-board" } },
          ],
        );
      }
    });
  });
}

for (const [stage, workflows, chips] of [
  ["planning", null, ["propose", "explore", "sync", "validate"]],
  ["planning", ["continue"], ["continue", "explore", "sync", "validate"]],
  ["planning", ["ff"], ["ff", "explore", "sync", "validate"]],
  ["planning", ["ff", "continue"], ["ff", "explore", "sync", "validate"]],
  ["progress", [], ["apply", "sync", "validate"]],
  ["progress", ["ff", "verify"], ["apply", "validate"]],
  ["complete", [], ["archive", "sync", "validate"]],
  ["complete", ["verify"], ["archive", "verify", "sync", "validate"]],
]) {
  test(`session section selects ${stage} chips: ${chips.join(", ")}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=compact-${stage}&hold-ready`);
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate(
        ({ workflows, skipSpecs }) => {
          if (workflows !== null) __workflows(workflows);
          if (skipSpecs) __specsStatus("skipped");
          __releaseReady();
        },
        { workflows, skipSpecs: !chips.includes("sync") },
      );
      const frame = page.frameLocator("iframe");
      const first = frame
        .getByRole("article")
        .filter({ has: frame.getByRole("heading", { name: "first-change" }) });
      const second = frame
        .getByRole("article")
        .filter({ has: frame.getByRole("heading", { name: "second-change" }) });
      await first.getByRole("button", { name: "validate", exact: true }).waitFor();
      assert.deepEqual(
        await first.locator(".card-actions").getByRole("button").allTextContents(),
        chips,
      );
      assert.deepEqual(
        await second.locator(".card-actions").getByRole("button").allTextContents(),
        chips.includes("sync") ? ["apply", "sync", "validate"] : ["apply", "validate"],
      );
    });
  });
}

test("session section preserves a focused chip when configured workflows or stage change", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=compact-planning`);
    const section = page.frameLocator("iframe");
    const card = section
      .getByRole("article")
      .filter({ has: section.getByRole("heading", { name: "first-change" }) });
    const primary = card.getByRole("button", { name: "propose", exact: true });
    await primary.waitFor();
    await primary.evaluate((node) => {
      window.__focusedChip = node;
      node.focus();
    });
    await page.evaluate(() => __workflows(["ff"]));
    await section
      .locator("footer")
      .getByRole("button", { name: "Refresh" })
      .evaluate((node) => node.click());
    const fastForward = card.getByRole("button", { name: "ff", exact: true });
    await fastForward.waitFor({ timeout: 3000 });
    assert.equal(
      await fastForward.evaluate(
        (node) => node === window.__focusedChip && node === document.activeElement,
      ),
      true,
    );
    await page.evaluate(() => {
      __readiness("");
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
    });
    const apply = card.getByRole("button", { name: "apply", exact: true });
    await apply.waitFor({ timeout: 3000 });
    assert.equal(
      await apply.evaluate(
        (node) => node === window.__focusedChip && node === document.activeElement,
      ),
      true,
    );
    assert.equal(await card.getByRole("button", { name: "explore", exact: true }).count(), 0);
  });
});

test("session section expands the task window and opens a full task flyout", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=compact-progress`);
    const frame = page.frameLocator("iframe");
    const card = frame
      .getByRole("article")
      .filter({ has: frame.getByRole("heading", { name: "first-change" }) });
    const details = card.locator("details");
    const current = "2.1 Add a section that tracks a change";
    const summary = details.locator("summary");
    await summary.getByRole("button", { name: current, exact: true }).click({ timeout: 3000 });
    await card
      .getByText("Keep the whole description readable when expanded.", { exact: false })
      .waitFor();
    assert.equal(await details.getAttribute("open"), null);
    await summary.getByRole("button", { name: current, exact: true }).click();
    await summary.getByText("Tasks:", { exact: true }).click();
    const rows = details.getByRole("listitem");
    assert.deepEqual(await rows.getByRole("button").allTextContents(), [
      "Task 2",
      "Task 3",
      current,
      "Task 5",
      "Task 6",
    ]);
    const boxes = await rows
      .getByRole("checkbox")
      .evaluateAll((nodes) => nodes.map(({ checked, disabled }) => [checked, disabled]));
    assert.deepEqual(boxes, [
      [true, true],
      [true, true],
      [false, true],
      [false, true],
      [false, true],
    ]);
    await rows.getByRole("button", { name: "Task 6", exact: true }).click();
    await rows.last().getByText("Task 6", { exact: true }).last().waitFor();
  });
});

test("session section fits a JSON-escaped goal within the popover budget", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ hasTouch: true });
    await page.goto(`${url}?status=escaped-goal&popovers&pointer=coarse`);
    const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
    await section.getByRole("button", { name: "first-change", exact: true }).tap({ timeout: 3000 });
    const flyout = page.frameLocator('iframe[title="OpenSpec test popover"]');
    await flyout.getByRole("heading", { name: "first-change" }).waitFor({ timeout: 3000 });
    const data = await page.evaluate(
      () => __requests.find(({ path }) => path === "popover-open").body.data,
    );
    assert.ok(JSON.stringify(data).length <= 15_000);
    assert.ok(data.goal.length < 4000);
    assert.match(data.goal, /^\x01+…$/);
  });
});

for (const scenario of ["saved", "worktree", "archive", "stale", "legacy-value", "new"]) {
  test(`session section resolves ${scenario} context without reading the board`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=${scenario}`);
      const frame = page.frameLocator("iframe");
      if (scenario === "saved" || scenario === "worktree") {
        await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor({
          timeout: 3000,
        });
      } else if (scenario === "legacy-value") {
        await frame.getByRole("heading", { name: "first-change", exact: true }).waitFor({
          timeout: 3000,
        });
        assert.equal(await frame.getByRole("heading", { name: "second-change" }).count(), 0);
      } else if (scenario === "new") {
        const track = frame.getByRole("button", { name: "＋ Track a change" });
        await frame.getByText("Start a session to track a change.").waitFor({ timeout: 3000 });
        assert.equal(await track.isDisabled(), true);
      } else {
        await frame.getByRole("button", { name: "＋ Track a change" }).click({ timeout: 3000 });
        const option = frame.getByRole("button", { name: "first-change", exact: true });
        await option.waitFor();
        assert.equal(await option.isEnabled(), true);
        if (scenario === "stale")
          assert.equal(await frame.getByRole("heading", { name: "old-change" }).count(), 0);
        if (scenario === "archive")
          assert.equal(
            await frame.getByRole("button", { name: "archive-all", exact: true }).isVisible(),
            true,
          );
      }
      await page.waitForFunction(() => __requests.some((r) => r.path === "/changes"));
      await page.waitForFunction(() =>
        __requests.some((r) => r.path === "resize" && r.body.height > 0),
      );
      assert.equal(
        await page.evaluate(() => __requests.some((r) => r.path === "/summaries")),
        false,
      );
      await page.close();
    });
  });
}

test("session section isolates a failed card and refreshes each tracked change without a batch read", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=compact-read-error`);
    const frame = page.frameLocator("iframe");
    const first = frame
      .getByRole("article")
      .filter({ has: frame.getByRole("heading", { name: "first-change" }) });
    const second = frame
      .getByRole("article")
      .filter({ has: frame.getByRole("heading", { name: "second-change" }) });
    const error = first.getByRole("alert");
    await error.waitFor({ timeout: 3000 });
    assert.match(await error.innerText(), /Read failed/);
    assert.equal(await first.getByRole("progressbar").count(), 0);
    assert.equal(await first.getByText("3/7", { exact: true }).count(), 0);
    assert.equal(await second.getByText("0/0", { exact: true }).isVisible(), true);
    const before = await page.evaluate(() =>
      __requests
        .filter(
          ({ path }) =>
            path === "/changes" ||
            path === "/workflows" ||
            path === "/summary" ||
            path === "/tasks" ||
            path === "/summaries",
        )
        .map(({ path, body }) => (body.change ? `${path} ${body.change}` : path)),
    );
    const expected = [
      "/changes",
      "/workflows",
      "/summary first-change",
      "/summary second-change",
      "/tasks first-change",
      "/tasks second-change",
    ];
    assert.deepEqual(before.slice().sort(), expected.slice().sort());
    await first.getByRole("button", { name: "Refresh", exact: true }).click();
    await first.getByText("3/7", { exact: true }).waitFor();
    assert.equal(await error.count(), 0);
    const after = await page.evaluate(() =>
      __requests
        .filter(
          ({ path }) =>
            path === "/changes" ||
            path === "/workflows" ||
            path === "/summary" ||
            path === "/tasks" ||
            path === "/summaries",
        )
        .map(({ path, body }) => (body.change ? `${path} ${body.change}` : path)),
    );
    assert.deepEqual(after.slice(before.length).sort(), expected.slice().sort());
    await page.close();
  });
});

for (const surface of ["section", "board"]) {
  test(`unready session coverage prevents the ${surface} from replacing a derived change`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=unready-tracking`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const track = section.getByRole("button", { name: "＋ Track a change" });
      await track.waitFor();
      const warned = page.waitForEvent("console", {
        predicate: (message) =>
          message.type() === "warning" && /tracked OpenSpec/.test(message.text()),
        timeout: 5000,
      });
      if (surface === "section") {
        await track.click();
        await section
          .getByRole("list", { name: "Changes" })
          .getByRole("button", { name: "second-change" })
          .click();
      } else {
        await page.evaluate(() => __mountBoard());
        const board = page.frameLocator('iframe[title="OpenSpec test board"]');
        await board
          .locator(".change-card")
          .filter({ hasText: "second-change" })
          .getByRole("button", { name: "apply", exact: true })
          .click();
        await board.getByRole("menuitem", { name: "Prepare in current chat" }).click();
        await page.waitForFunction(() =>
          __requests.some(({ path, body }) => path === "toast" && body.kind === "success"),
        );
        assert.match(
          await page.evaluate(() => __draft()),
          /openspec-apply-change.*"second-change"/,
        );
      }
      await warned;
      if (surface === "section")
        await page.waitForFunction(() =>
          __requests.some(
            ({ path, body }) =>
              path === "toast" && body.kind === "error" && /try again/i.test(body.message),
          ),
        );
      assert.deepEqual(await page.evaluate(() => __stored()), {});
    });
  });
}

test("session section orders the picker by task counts and persists a choice", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=picker`);
    const frame = page.frameLocator("iframe");
    await frame.getByRole("button", { name: "＋ Track a change" }).click({ timeout: 3000 });
    const list = frame.getByRole("list", { name: "Changes", exact: true });
    const choices = list.getByRole("button");
    await choices.first().waitFor();
    assert.deepEqual(
      (await choices.allTextContents()).map((text) => text.trim()),
      [
        "z-progress-change",
        "first-change",
        "not-started-change",
        "second-change",
        "complete-change",
      ],
    );
    await list.getByRole("button", { name: "first-change", exact: true }).click();
    await frame
      .getByRole("heading", { name: "first-change", exact: true })
      .waitFor({ timeout: 3000 });
    await page.waitForFunction(
      () => __stored()["session-change:fixture-session"]?.changes?.join() === "first-change",
    );
    await frame.getByRole("button", { name: "＋ Track a change", exact: true }).click();
    assert.equal(await list.getByRole("button", { name: "first-change", exact: true }).count(), 0);
    await list.getByRole("button", { name: "second-change", exact: true }).click();
    await frame.getByRole("heading", { name: "first-change", exact: true }).waitFor();
    await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        __stored()["session-change:fixture-session"]?.changes?.join() ===
        "first-change,second-change",
    );
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "/tasks" && r.body.change === "second-change"),
    );
    assert.equal(await page.evaluate(() => __requests.some((r) => r.path === "/summaries")), false);
    await page.close();
  });
});

test("session tracking seeds a worktree's derived change and untracking all keeps it hidden", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ hasTouch: true });
    await page.goto(`${url}?status=worktree&popovers&pointer=coarse`);
    const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
    const flyout = page.frameLocator('iframe[title="OpenSpec test popover"]');
    const track = section.getByRole("button", { name: "＋ Track a change" });
    await track.tap({ timeout: 3000 });
    await section
      .getByRole("list", { name: "Changes" })
      .getByRole("button", { name: "first-change" })
      .tap();
    for (const name of ["second-change", "first-change"]) {
      await section.getByRole("heading", { name, exact: true }).waitFor();
    }
    assert.deepEqual(
      await page.evaluate(() => __stored()["session-change:fixture-session"].changes),
      ["second-change", "first-change"],
    );
    for (const name of ["first-change", "second-change"]) {
      const control = section.getByRole("button", { name, exact: true });
      await control.tap();
      await flyout.getByRole("button", { name: "Untrack" }).tap();
      await control.waitFor({ state: "hidden" });
    }
    assert.deepEqual(
      await page.evaluate(() => __stored()["session-change:fixture-session"].changes),
      [],
    );
    await section.getByRole("button", { name: "Refresh" }).tap();
    await page.waitForFunction(
      () => __completed.filter((path) => path === "/changes").length === 5,
    );
    await page.evaluate(() => __theme("light"));
    await section.locator('html[data-oc-theme="light"]').waitFor();
    assert.equal(await section.getByRole("heading").count(), 0);
  });
});

for (const [width, pointer, scenario] of [
  [720, "fine", "item"],
  [320, "coarse", "item"],
  [320, "coarse", "picker"],
]) {
  test(`session picker grows the ${width}px ${pointer} frame from ${scenario} context`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ viewport: { width, height: 720 } });
      await page.goto(`${url}?status=${scenario}&pointer=${pointer}`);
      const frame = page.frameLocator("iframe");
      const trigger = frame.getByRole("button", {
        name: "＋ Track a change",
        exact: true,
      });
      const list = frame.getByRole("list", { name: "Changes", exact: true });
      await trigger.and(frame.locator("button:enabled")).waitFor({ timeout: 3000 });
      await page.waitForFunction(() => {
        const frame = document.querySelector("iframe");
        const resize = __requests.findLast((r) => r.path === "resize");
        return (
          resize?.body.height ===
          Math.ceil(frame.contentDocument.querySelector("#root").getBoundingClientRect().height)
        );
      });
      const closedHeight = await page.locator("iframe").evaluate((node) => node.clientHeight);

      await trigger.press("Enter");
      await frame.getByText("second-change", { exact: true }).waitFor();
      await page
        .waitForFunction(
          (height) => __requests.findLast((r) => r.path === "resize")?.body.height > height,
          closedHeight,
          { timeout: 2000 },
        )
        .catch(() => assert.fail(`Opening the picker did not grow the ${closedHeight}px frame`));
      const reportedHeight = await page.evaluate(
        () => __requests.findLast((r) => r.path === "resize").body.height,
      );
      assert.equal(
        await page.locator("iframe").evaluate((node) => node.clientHeight),
        reportedHeight,
      );
      const options = list.getByRole("button");
      assert.equal(await options.count(), scenario === "item" ? 1 : 5);
      const boxes = await options.evaluateAll((buttons) =>
        buttons.map((button) => {
          const { top, right, bottom, left, height } = button.getBoundingClientRect();
          return { top, right, bottom, left, height, position: getComputedStyle(button).position };
        }),
      );
      for (const box of boxes) {
        assert.ok(box.top >= 0 && box.bottom <= reportedHeight);
        assert.ok(box.left >= 0 && box.right <= width);
        assert.ok(box.position === "static" || box.position === "relative");
        if (pointer === "coarse") assert.ok(box.height >= 44);
      }
      assert.equal(await options.first().evaluate((node) => node === document.activeElement), true);
      await options.first().press("Escape");
      await options.first().waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
      await page.waitForFunction(
        (height) => __requests.findLast((r) => r.path === "resize")?.body.height === height,
        closedHeight,
      );

      await trigger.press("Enter");
      const cancel = frame.getByRole("button", { name: "Cancel", exact: true });
      if (scenario === "item") {
        await cancel.click();
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
        await trigger.press("Enter");
      } else assert.equal(await cancel.count(), 0);
      await list.getByRole("button", { name: "second-change", exact: true }).press("Enter");
      await page.waitForFunction(
        (expected) => __stored()["session-change:fixture-session"]?.changes?.join() === expected,
        scenario === "item" ? "first-change,second-change" : "second-change",
      );
      await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor();
      assert.equal(
        await frame
          .getByRole("button", { name: "＋ Track a change", exact: true })
          .evaluate((node) => node === document.activeElement),
        true,
      );
      await page.close();
    });
  });
}

for (const [stage, chip, skill] of [
  ["progress", "apply", "openspec-apply-change"],
  ["planning", "propose", "openspec-propose"],
  ["complete", "archive", "openspec-archive-change"],
  ["progress", "sync", "openspec-sync-specs"],
]) {
  test(`session section ${chip} prepares the unsent workflow draft and tracks its change`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=compact-${stage}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const card = section
        .getByRole("article")
        .filter({ has: section.getByRole("heading", { name: "first-change" }) });
      await card.getByRole("button", { name: chip, exact: true }).waitFor();
      await page.evaluate(() =>
        __seedStorage([
          [
            "session-change:fixture-session",
            {
              changes: ["second-change"],
              savedAt: 1,
            },
          ],
        ]),
      );
      let expected;
      if (chip === "sync") {
        expected =
          /^Use your skill tool to load and invoke the openspec-sync-specs skill for OpenSpec change "first-change"\.\s+.*report what.*synced.*without archiving/is;
      } else {
        await page.evaluate(() => __mountBoard());
        const board = page.frameLocator('iframe[title="OpenSpec test board"]');
        const boardCard = board.locator(".change-card").filter({ hasText: "first-change" });
        const action = boardCard.getByRole("button", { name: chip, exact: true });
        await action.click({ timeout: 3000 });
        if (chip === "apply")
          await board
            .getByRole("menuitem", { name: "Prepare in current chat", exact: true })
            .click();
        await page.waitForFunction((skill) => __draft().includes(skill), skill);
        expected = await page.evaluate(() => __draft());
        await page.waitForFunction(
          () => __stored()["session-change:fixture-session"]?.changes?.length === 2,
        );
        await page.evaluate(() =>
          __seedStorage([
            ["session-change:fixture-session", { changes: ["second-change"], savedAt: 1 }],
          ]),
        );
      }
      await card.getByRole("button", { name: chip, exact: true }).click({ timeout: 3000 });
      await page.waitForFunction(
        () =>
          __stored()["session-change:fixture-session"]?.changes?.join() ===
          "second-change,first-change",
        null,
        { timeout: 3000 },
      );
      const draft = await page.evaluate(() => __draft());
      if (expected instanceof RegExp) assert.match(draft, expected);
      else assert.equal(draft, expected);
      assert.equal(
        await page.evaluate(() =>
          __requests.some(({ path }) => path === "prompt" || path === "start-session"),
        ),
        false,
      );
    });
  });
}

for (const [action, stage, workflows, surface, skill, instruction] of [
  [
    "ff",
    "planning",
    ["ff"],
    "card",
    "openspec-ff-change",
    /Create every remaining planning artefact/,
  ],
  [
    "continue",
    "planning",
    ["continue"],
    "card",
    "openspec-continue-change",
    /Write the next planning artefact/,
  ],
  [
    "continue",
    "planning",
    ["ff", "continue"],
    "popover",
    "openspec-continue-change",
    /Write the next planning artefact/,
  ],
  [
    "update",
    "progress",
    [],
    "popover",
    "openspec-update-change",
    /Revise .* existing planning artefacts/,
  ],
  ["explore", "planning", [], "card", "openspec-explore", /Investigate the goal/],
  ["verify", "complete", ["verify"], "card", "openspec-verify-change", null],
  [
    "new",
    "progress",
    ["new"],
    "footer",
    "openspec-new-change",
    /Ask me what the change is for before creating it/,
  ],
]) {
  test(`session section prepares an unsent ${action} prompt from the ${surface}`, async () => {
    await withPanel(async (browser, url) => {
      const popover = surface === "popover";
      const page = await browser.newPage({ hasTouch: popover });
      await page.goto(
        `${url}?status=${stage}&hold-ready${popover ? "&popovers&pointer=coarse" : ""}`,
      );
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate((configured) => {
        __workflows(configured);
        __releaseReady();
      }, workflows);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const first = section.getByRole("button", { name: "first-change", exact: true });
      await first.waitFor({ timeout: 3000 });
      await page.evaluate(() =>
        __seedStorage([
          ["session-change:fixture-session", { changes: ["second-change"], savedAt: 1 }],
        ]),
      );
      let controls =
        surface === "footer" ? section.locator("footer") : section.getByRole("article");
      if (popover) {
        await first.tap();
        controls = page.frameLocator('iframe[title="OpenSpec test popover"]').locator("main");
      }
      await controls.getByRole("button", { name: action, exact: true }).click({ timeout: 3000 });
      await page.waitForFunction((name) => __draft().includes(name), skill, { timeout: 3000 });
      if (action !== "new") {
        await page.waitForFunction(
          () =>
            __stored()["session-change:fixture-session"]?.changes.join() ===
            "second-change,first-change",
          null,
          { timeout: 3000 },
        );
      }
      await page.waitForFunction(() =>
        __requests.some(({ path, body }) => path === "toast" && body.kind === "success"),
      );
      const text = await page.evaluate(() => __draft());
      assert.match(text, /^Use your skill tool to load and invoke the /);
      assert.doesNotMatch(text, /\/tmp\/|openspec\/changes\//);
      const target = 'OpenSpec change "first-change"';
      if (action === "new") {
        assert.doesNotMatch(text, /\b(?:first|second)-change\b/);
        assert.deepEqual(await page.evaluate(() => __stored()["session-change:fixture-session"]), {
          changes: ["second-change"],
          savedAt: 1,
        });
      } else {
        assert.ok(text.includes(target));
        if (action === "verify")
          assert.equal(
            text,
            `Use your skill tool to load and invoke the openspec-verify-change skill for ${target}.`,
          );
        else assert.match(text, /Goal: Read the proposal/);
      }
      if (instruction) assert.match(text, instruction);
      assert.deepEqual(
        await page.evaluate(() =>
          __requests.filter(({ path }) => ["compose", "prompt", "start-session"].includes(path)),
        ),
        [{ path: "compose", body: { text, mode: "replace" } }],
      );
      await page.close();
    });
  });
}

test("session section discards late composition feedback and saving after a session switch", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item`);
    const frame = page.frameLocator("iframe");
    await page.evaluate(() => __holdCompose());
    await frame.getByRole("button", { name: "apply", exact: true }).click({ timeout: 3000 });
    await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));
    await page.evaluate(() => __session("replacement-session"));
    await frame.getByRole("button", { name: "＋ Track a change" }).waitFor();
    await page.evaluate(() => {
      __releaseCompose();
      __theme("light");
    });
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    assert.deepEqual(await page.evaluate(() => __stored()), {});
    assert.deepEqual(
      await page.evaluate(() =>
        __requests
          .filter((r) => ["compose", "toast", "prompt", "start-session"].includes(r.path))
          .map((r) => r.path),
      ),
      ["compose"],
    );
    await page.close();
  });
});

for (const mode of ["mounted", "later", "other-directory"]) {
  test(`session section board focus is claimed once by the ${mode} board`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=item${mode === "later" ? "&open-board" : ""}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const board = page.frameLocator('iframe[title="OpenSpec test board"]');
      await section.getByRole("button", { name: "first-change", exact: true }).click();
      const openInBoard = section.getByRole("button", { name: "Open in board", exact: true });
      await openInBoard.waitFor();
      if (mode !== "later") {
        await page.evaluate(
          (target) => __mountBoard(target),
          mode === "mounted" ? directory : "/tmp/other-project",
        );
        await page.waitForFunction(() => __focusClaims.length === 1, null, { timeout: 3000 });
      }
      await openInBoard.click();
      await page.waitForFunction(
        () => __requests.some(({ path }) => path === "open-surface"),
        null,
        { timeout: 3000 },
      );
      assert.deepEqual(
        await page.evaluate(() =>
          __requests.filter(({ path }) => path === "/focus" || path === "open-surface"),
        ),
        [
          { path: "/focus", body: { directory, change: "first-change" } },
          { path: "open-surface", body: { surfaceId: "plugin:openspec-board" } },
        ],
      );
      if (mode === "other-directory") {
        await page.waitForFunction(() => __focusClaims.length === 2, null, { timeout: 3000 });
        await page.evaluate(() => __theme("light"));
        await board.locator('html[data-oc-theme="light"]').waitFor();
        assert.equal(await board.getByRole("button", { name: "Back to changes" }).count(), 0);
        await page.evaluate(() => __mountBoard());
      }
      const back = board.getByRole("button", { name: "Back to changes" });
      await back.waitFor({ timeout: 3000 });
      await board.getByRole("heading", { name: "first-change" }).waitFor();
      assert.equal(
        await page.evaluate(() => __requests.filter(({ path }) => path === "/changes").length),
        mode === "other-directory" ? 3 : 2,
      );
      await page.evaluate(() => __mountBoard());
      await board.getByRole("button", { name: "first-change", exact: true }).waitFor();
      const expectedClaims = mode === "later" ? 2 : mode === "mounted" ? 3 : 4;
      await page.waitForFunction((count) => __focusClaims.length === count, expectedClaims);
      const nextTheme = mode === "other-directory" ? "dark" : "light";
      await page.evaluate((theme) => __theme(theme), nextTheme);
      await board.locator(`html[data-oc-theme="${nextTheme}"]`).waitFor();
      assert.equal(await back.count(), 0);
    });
  });
}

for (const exists of [true, false]) {
  test(`board focus reloads an unlisted change once when it ${exists ? "appears" : "stays missing"}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=item`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const board = page.frameLocator('iframe[title="OpenSpec test board"]');
      await section.getByRole("button", { name: "first-change", exact: true }).click();
      const openInBoard = section.getByRole("button", { name: "Open in board", exact: true });
      await openInBoard.waitFor();
      await page.evaluate(() => {
        __remove("first-change");
        __mountBoard();
      });
      const other = board.getByRole("button", { name: "second-change", exact: true });
      await other.waitFor();
      if (exists) await page.evaluate(() => __recreate("first-change"));
      else {
        await other.click();
        await board.getByRole("button", { name: "Back to changes" }).waitFor();
      }
      await openInBoard.click();
      if (exists) {
        await board
          .getByRole("heading", { name: "first-change", exact: true })
          .waitFor({ timeout: 3000 });
      } else {
        await page.waitForFunction(
          () =>
            __requests.some(
              ({ path, body }) =>
                path === "toast" && body.message === "first-change isn't in this board's list.",
            ),
          null,
          { timeout: 3000 },
        );
        await other.waitFor();
      }
      assert.equal(
        await page.evaluate(() => __requests.filter(({ path }) => path === "/changes").length),
        3,
      );
      assert.equal(
        await page.evaluate(() => __requests.filter(({ path }) => path === "/workflows").length),
        2,
      );
    });
  });
}

test("a hidden board does not claim a focus event but a new board still claims on mount", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item`);
    const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
    const board = page.frameLocator('iframe[title="OpenSpec test board"]');
    await section.getByRole("button", { name: "first-change", exact: true }).click();
    const openInBoard = section.getByRole("button", { name: "Open in board", exact: true });
    await openInBoard.waitFor();
    await page.evaluate(() => __mountBoard());
    await page.waitForFunction(() => __focusClaims.length === 1);
    const change = board.getByRole("button", { name: "first-change", exact: true });
    await change.evaluate(() =>
      Object.defineProperty(document, "visibilityState", { value: "hidden" }),
    );
    await openInBoard.click();
    await page.waitForFunction(() => __requests.some(({ path }) => path === "open-surface"));
    await page.evaluate(() => __theme("light"));
    await board.locator('html[data-oc-theme="light"]').waitFor();
    assert.equal(await page.evaluate(() => __focusClaims.length), 1);
    await page.evaluate(() => __mountBoard());
    await board
      .getByRole("heading", { name: "first-change", exact: true })
      .waitFor({ timeout: 3000 });
    assert.equal(await page.evaluate(() => __focusClaims.length), 2);
  });
});

test("session section validation opens a flyout only when a validation chip is activated", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ hasTouch: true });
    await page.goto(`${url}?status=compact-progress&popovers&pointer=coarse`);
    const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
    const flyout = page.frameLocator('iframe[title="OpenSpec test popover"]');
    for (const [change, valid] of [
      ["first-change", true],
      ["second-change", false],
    ]) {
      const card = section
        .getByRole("article")
        .filter({ has: section.getByRole("heading", { name: change }) });
      const chip = card.getByRole("button", { name: "validate" });
      await chip.waitFor();
      assert.equal(
        await page.evaluate(
          (name) =>
            __requests.some(({ path, body }) => path === "/validate" && body.change === name),
          change,
        ),
        false,
      );
      await chip.tap({ timeout: 3000 });
      await flyout
        .getByText(valid ? "Valid · 0 issues" : "Invalid · 23 issues", { exact: true })
        .waitFor({ timeout: 3000 });
      if (!valid) {
        const issues = flyout.getByRole("listitem");
        assert.equal(await issues.count(), 20);
        assert.match(await issues.first().innerText(), /ERROR.*specs\/0.*Issue 0 x+…/s);
        assert.equal((await issues.first().locator("p").innerText()).length, 300);
        await flyout
          .getByText("+3 more issues: open the board or run openspec validate", { exact: true })
          .waitFor();
      }
      const request = await page.evaluate(
        () => __requests.filter(({ path }) => path === "/validate").at(-1).body,
      );
      assert.deepEqual(request, {
        directory,
        expectedRoot: root,
        planning: "fixture-planning",
        change,
      });
      await page.evaluate(() => __closePopover("outside"));
    }
  });
});

for (const failure of ["no geometry", "host rejection"]) {
  test(`validation cannot reopen a stale result after ${failure}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=item&popovers`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const chip = section.getByRole("button", { name: "validate" });
      if (failure === "no geometry") await page.evaluate(() => __holdValidation());
      else await page.evaluate(() => __rejectNextPopover());
      await chip.click();
      await page.waitForFunction(() => __requests.some(({ path }) => path === "/validate"));
      if (failure === "no geometry") {
        await chip.evaluate((button) => {
          button.style.display = "none";
        });
        await page.evaluate(() => __releaseValidation());
      } else {
        await page.waitForFunction(() => __requests.some(({ path }) => path === "popover-close"));
      }
      await page.evaluate(() => __theme("light"));
      await section.locator('html[data-oc-theme="light"]').waitFor();
      await section
        .locator("button")
        .filter({ hasText: "validate" })
        .evaluate((button) => {
          button.style.removeProperty("display");
        });
      await chip.press("ArrowRight");
      await page.evaluate(() => __theme("dark"));
      await section.locator('html[data-oc-theme="dark"]').waitFor();
      const attempts = failure === "no geometry" ? 0 : 1;
      assert.equal(
        await page.evaluate(() => __requests.filter(({ path }) => path === "popover-open").length),
        attempts,
      );
      await chip.click();
      await page
        .frameLocator('iframe[title="OpenSpec test popover"]')
        .getByText("Valid · 0 issues")
        .waitFor({ timeout: 3000 });
      assert.equal(
        await page.evaluate(() => __requests.filter(({ path }) => path === "/validate").length),
        2,
      );
    });
  });
}

for (const popovers of [false, true]) {
  test(`validation distinguishes notes from warnings and real locations in the ${popovers ? "popover" : "inline result"}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ hasTouch: popovers });
      await page.goto(`${url}?status=item${popovers ? "&popovers&pointer=coarse" : ""}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const result = popovers
        ? page.frameLocator('iframe[title="OpenSpec test popover"]')
        : section;
      const chip = section.getByRole("button", { name: "validate" });
      await chip.waitFor();
      await page.evaluate(() =>
        __validation({
          valid: true,
          issues: [
            {
              level: "INFO",
              path: "file",
              message: "skip_specs is set in .openspec.yaml: zero deltas accepted",
            },
            { level: "WARNING", path: "specs/example/spec.md", message: "Check this requirement." },
            { level: "WARNING", path: "file", message: "Check the change." },
          ],
        }),
      );
      if (popovers) await chip.tap({ timeout: 3000 });
      else await chip.click({ timeout: 3000 });
      const note = result.getByText(
        "Note: skip_specs is set in .openspec.yaml: zero deltas accepted",
        {
          exact: true,
        },
      );
      await note.waitFor({ timeout: 3000 });
      assert.equal(
        await note.evaluate((node) => {
          const probe = document.createElement("span");
          probe.style.color = "var(--oc-muted)";
          node.append(probe);
          const muted = getComputedStyle(probe).color;
          probe.remove();
          return getComputedStyle(node).color === muted;
        }),
        true,
      );
      await result.getByText("Valid · 2 issues", { exact: true }).waitFor();
      const issues = result.getByRole("listitem");
      assert.equal(await issues.count(), 2);
      assert.match(
        await issues.first().innerText(),
        /WARNING · specs\/example\/spec\.md.*Check this requirement\./s,
      );
      assert.equal(await issues.last().getByText("WARNING", { exact: true }).count(), 1);
    });
  });

  test(`a repeat validate click reruns validation while its ${popovers ? "popover" : "inline result"} is open`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ hasTouch: popovers });
      await page.goto(`${url}?status=item${popovers ? "&popovers&pointer=coarse" : ""}`);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const chip = section.getByRole("button", { name: "validate" });
      const result = popovers
        ? page.frameLocator('iframe[title="OpenSpec test popover"]')
        : section;
      if (popovers) await chip.tap();
      else await chip.click();
      await result.getByText("Valid · 0 issues").waitFor();
      if (popovers) await chip.tap();
      else await chip.click();
      await page.waitForFunction(
        () => __requests.filter(({ path }) => path === "/validate").length === 2,
        null,
        { timeout: 3000 },
      );
      await result.getByText("Valid · 0 issues").waitFor();
    });
  });
}

test("session section omits additional validation issues to fit JSON-escaped messages", async () => {
  await withPanel(async (browser, url) => {
    for (const popovers of [true, false]) {
      const page = await browser.newPage({ hasTouch: popovers });
      await page.goto(
        `${url}?status=compact-validation-budget${popovers ? "&popovers&pointer=coarse" : ""}`,
      );
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const card = section
        .getByRole("article")
        .filter({ has: section.getByRole("heading", { name: "second-change" }) });
      const chip = card.getByRole("button", { name: "validate" });
      if (popovers) await chip.tap({ timeout: 3000 });
      else await chip.click({ timeout: 3000 });
      const flyout = popovers ? page.frameLocator('iframe[title="OpenSpec test popover"]') : card;
      await flyout.getByText("Invalid · 23 issues", { exact: true }).waitFor({ timeout: 3000 });
      await flyout
        .getByText("Note: This note does not affect validation.", { exact: true })
        .waitFor();
      const count = await flyout.getByRole("listitem").count();
      assert.ok(count > 0 && count < 20);
      await flyout
        .getByText(`+${23 - count} more issues: open the board or run openspec validate`, {
          exact: true,
        })
        .waitFor();
      if (popovers) {
        const data = await page.evaluate(
          () => __requests.find(({ path }) => path === "popover-open").body.data,
        );
        assert.ok(JSON.stringify(data).length <= 15_000);
      }
      await page.close();
    }
  });
});

test("Work Status coalesces a completed lifecycle event with its mount-time context", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=mount-burst&hold-ready`);
    const frame = page.frameLocator("iframe");
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate(() => {
      __holdListing();
      __releaseReady();
      __lifecycle("fixture-session", "completed");
    });
    await page.waitForFunction(() => __requests.some(({ path }) => path === "/changes"));
    await page.evaluate(() => __releaseListing());
    await frame.getByText("1/2", { exact: true }).waitFor();
    await page.evaluate(() => __theme("light"));
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter(({ path }) => path === "/changes").length),
      1,
    );
  });
});

for (const remount of [false, true]) {
  test(`Work Status restores display-only progress after a ${remount ? "frame remount" : "session switch"}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=switch${remount ? "&device-storage" : ""}`);
      const frame = page.frameLocator("iframe");
      await frame.getByText("1/2", { exact: true }).waitFor();
      if (remount) {
        await page.waitForFunction(() => Object.keys(__deviceStored()).length > 0, null, {
          timeout: 3000,
        });
        const stored = await page.evaluate(() => JSON.stringify(__deviceStored()));
        assert.match(stored, /fixture-session.*first-change.*Second description/s);
        assert.doesNotMatch(stored, /Read the proposal|CLI description|openspec-apply-change/);
      } else {
        await page.evaluate(() => __session("replacement-session"));
        await frame.getByRole("heading", { name: "second-change" }).waitFor();
      }
      await page.evaluate((remount) => {
        __holdListing();
        __edit("Done");
        if (remount) __remountStatus();
        else __session("fixture-session");
      }, remount);
      const refresh = frame.getByRole("status").filter({ hasText: "Showing last known progress" });
      await refresh.waitFor({ timeout: 3000 });
      await frame.getByText("Second description", { exact: true }).waitFor();
      assert.equal(await frame.getByText("1/2", { exact: true }).isVisible(), true);
      assert.equal(await frame.getByRole("heading", { name: "second-change" }).count(), 0);
      assert.equal(await frame.getByRole("button", { name: "apply", exact: true }).count(), 0);
      await page.waitForFunction(
        (count) => __requests.filter(({ path }) => path === "/changes").length === count,
        remount ? 2 : 3,
      );
      await page.evaluate(() => __releaseListing());
      await frame.getByText("2/2", { exact: true }).waitFor();
      await refresh.waitFor({ state: "hidden" });
    });
  });
}

test("Work Status keeps the last known progress when refreshing the listing fails", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item`);
    const frame = page.frameLocator("iframe");
    await frame.getByText("1/2", { exact: true }).waitFor();
    await page.evaluate(() => __failNextListing());
    await frame.getByRole("button", { name: "Refresh", exact: true }).click();
    await frame.getByRole("alert").filter({ hasText: "Cannot check listing" }).waitFor();
    assert.equal(await frame.getByText("1/2", { exact: true }).isVisible(), true);
    assert.equal(await frame.getByRole("button", { name: "apply", exact: true }).count(), 0);
  });
});

test("the Work Status device cache retains at most 50 sessions", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item&device-storage&hold-ready`);
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate((directory) => {
      __seedDeviceStorage([
        [
          "work-status:cards",
          Array.from({ length: 50 }, (_, index) => ({
            sessionId: "cached-session-" + index,
            directory,
            cards: [],
          })),
        ],
      ]);
      __releaseReady();
    }, directory);
    await page.waitForFunction(
      () =>
        __deviceStored()["work-status:cards"].some(
          ({ sessionId }) => sessionId === "fixture-session",
        ),
      null,
      { timeout: 3000 },
    );
    const sessions = await page.evaluate(() =>
      __deviceStored()["work-status:cards"].map(({ sessionId }) => sessionId),
    );
    assert.equal(sessions.length, 50);
    assert.equal(sessions.includes("cached-session-0"), false);
    assert.equal(sessions.at(-1), "fixture-session");
  });
});

test("session section reads configured workflows on mount, Refresh and directory change", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item`);
    const frame = page.frameLocator("iframe");
    await frame.getByText("1/2", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => __completed.filter((p) => p === "/workflows").length),
      1,
    );
    await page.evaluate(() => __edit("Completed"));
    await frame.getByRole("button", { name: "Refresh", exact: true }).click();
    await frame.getByText("2/2", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => __completed.filter((p) => p === "/workflows").length),
      2,
    );
    await page.evaluate(() => __directory("/tmp/workflows-other-project"));
    await frame.getByText("No active changes.", { exact: true }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter(({ path }) => path === "/workflows").map(({ body }) => body),
      ),
      [{ directory }, { directory }, { directory: "/tmp/workflows-other-project" }],
    );
    await page.close();
  });
});

test("session section falls back to core workflows without showing the config error", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=planning&hold-ready`);
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate(() => {
      __workflows(null);
      __releaseReady();
    });
    const frame = page.frameLocator("iframe");
    await frame.getByRole("button", { name: "propose", exact: true }).waitFor();
    assert.equal(await frame.getByRole("alert").count(), 0);
    assert.equal(
      await page.evaluate(() => __completed.filter((p) => p === "/workflows").length),
      1,
    );
    await page.close();
  });
});

test("session section refreshes once for a completed turn in the shown session only", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=progress`);
    const frame = page.frameLocator("iframe");
    await frame.getByText("3/7", { exact: true }).waitFor();
    await page.evaluate(() => {
      __lifecycle("other-session", "completed");
      __lifecycle("fixture-session", "started");
      __theme("light");
    });
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length === 1);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
      1,
    );
    await page.evaluate(() => {
      __edit("More tasks complete");
      __lifecycle("fixture-session", "completed");
    });
    await frame.getByText("4/7", { exact: true }).waitFor({ timeout: 3000 });
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length === 2);
    assert.deepEqual(
      await page.evaluate(() =>
        __requests
          .filter((r) =>
            ["/changes", "/workflows", "/summary", "/tasks", "/summaries"].includes(r.path),
          )
          .map((r) => r.path),
      ),
      ["/changes", "/workflows", "/summary", "/tasks", "/changes", "/summary", "/tasks"],
    );
    await page.close();
  });
});

test("session section reads once on an idle session switch, then once for a finished turn", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=switch`);
    const frame = page.frameLocator("iframe");
    await frame.getByText("1/2", { exact: true }).waitFor();
    await page.evaluate(() => {
      __session("replacement-session");
      __theme("light");
    });
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length >= 2);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
      2,
    );
    await page.evaluate(() => {
      __lifecycle("replacement-session", "started");
      __lifecycle("replacement-session", "completed");
      __theme("dark");
    });
    await frame.locator('html[data-oc-theme="dark"]').waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length >= 3);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
      3,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/workflows").length),
      1,
    );
    await page.close();
  });
});

test("session section preserves an open disclosure, focus, flyout and picker across finished-turn reads", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=compact-progress`);
    const frame = page.frameLocator("iframe");
    const first = frame
      .getByRole("article")
      .filter({ has: frame.getByRole("heading", { name: "first-change" }) });
    const detail = first.locator("details");
    await detail.locator("summary").getByText("Tasks:", { exact: true }).click();
    const task = detail.getByRole("button", { name: "Task 5", exact: true });
    await task.click();
    await detail.getByText("Task 5", { exact: true }).last().waitFor({ timeout: 3000 });
    await page.evaluate(() => {
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
    });
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length === 4);
    await page.evaluate(() => __theme("light"));
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    assert.notEqual(await detail.getAttribute("open"), null);
    assert.equal(await task.evaluate((node) => document.activeElement === node), true);
    assert.equal(await task.getAttribute("aria-expanded"), "true");

    await frame.getByRole("button", { name: "＋ Track a change", exact: true }).click();
    const picker = frame.getByRole("list", { name: "Changes", exact: true });
    const noChoices = frame.getByText("No untracked changes.");
    await noChoices.waitFor();
    await page.evaluate(() => {
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
    });
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length === 6);
    await page.evaluate(() => __theme("dark"));
    await frame.locator('html[data-oc-theme="dark"]').waitFor();
    assert.equal(await noChoices.isVisible(), true);
    assert.equal(await picker.getByRole("button").count(), 0);
    await page.close();
  });
});

test("session section collapses the disclosure when a finished turn changes the current task", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=progress`);
    const frame = page.frameLocator("iframe");
    const detail = frame.locator("details");
    await detail.locator("summary").getByText("Tasks:", { exact: true }).click();
    await page.evaluate(() => {
      __edit("More tasks complete");
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
    });
    await frame.getByText("4/7", { exact: true }).waitFor();
    assert.equal(
      await detail.locator("summary").getByRole("button", { name: "Task 5" }).isVisible(),
      true,
    );
    assert.equal(await detail.getAttribute("open"), null);
    await page.close();
  });
});

for (const scenario of ["other-directory-error", "unregistered-saved", "unregistered-picker"]) {
  test(`session section resolves ${scenario} without requiring project-wide session readiness`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=${scenario}`);
      const frame = page.frameLocator("iframe");
      if (scenario === "unregistered-picker") {
        await frame.getByRole("button", { name: "＋ Track a change", exact: true }).click({
          timeout: 3000,
        });
        await frame.getByRole("button", { name: "first-change", exact: true }).waitFor();
      } else {
        await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor({
          timeout: 3000,
        });
      }
      await page.waitForFunction(() =>
        __requests.some((r) => r.path === "storage" && r.body.op === "get"),
      );
      assert.equal(
        await page.evaluate(() => __requests.some((r) => r.path === "/summaries")),
        false,
      );
      await page.close();
    });
  });
}

test("session section coalesces refresh triggers during a read", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=item`);
    const frame = page.frameLocator("iframe");
    await frame.getByText("1/2", { exact: true }).waitFor();
    await page.evaluate(() => {
      __holdTasks();
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
    });
    await page.waitForFunction(
      () => __requests.filter((r) => r.path === "/tasks").length === 2,
      null,
      {
        timeout: 3000,
      },
    );
    await page.evaluate(() => {
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
      __lifecycle("fixture-session", "started");
      __lifecycle("fixture-session", "completed");
      __theme("light");
    });
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
      2,
    );
    await page.evaluate(() => {
      __edit("Completed");
      __releaseReads();
    });
    await frame.getByText("2/2", { exact: true }).waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/tasks").length === 3);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/changes").length),
      3,
    );
    await page.close();
  });
});

test("session section re-resolves on session switch without remounting or rendering stale reads", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?status=switch`);
    const frame = page.frameLocator("iframe");
    await frame.getByRole("heading", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => __holdTasks());
    await frame.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/tasks").length === 2);
    await page.evaluate(() => __session("replacement-session"));
    await frame.getByRole("status").filter({ hasText: "Loading OpenSpec change" }).waitFor();
    await frame.locator("#root").evaluate((node) => {
      window.__oldRendered = false;
      new MutationObserver(() => {
        if (node.querySelector("h1")?.textContent === "first-change") window.__oldRendered = true;
      }).observe(node, { childList: true, subtree: true });
    });
    await page.evaluate(() => __releaseReads());
    await frame.getByRole("heading", { name: "second-change", exact: true }).waitFor();
    assert.equal(await frame.locator("html").evaluate(() => window.__oldRendered), false);
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "/tasks" && r.body.change === "second-change"),
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "workspace-subscribe").length),
      1,
    );
    assert.equal(await page.evaluate(() => __requests.some((r) => r.path === "/summaries")), false);
    await page.close();
  });
});

for (const [scenario, optional] of [
  ["header", true],
  ["archive", false],
]) {
  test(`session section shows one footer after ${optional ? "the cards" : "no cards"}`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?status=${scenario}&hold-ready`);
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate((optional) => {
        if (optional) __workflows(["new"]);
        __releaseReady();
      }, optional);
      const section = page.frameLocator('iframe[title="OpenSpec test panel"]');
      const footer = section.locator("footer");
      const refresh = footer.getByRole("button", { name: "Refresh", exact: true });
      await refresh.waitFor({ timeout: 3000 });
      await footer
        .getByRole("button", { name: "＋ Track a change" })
        .and(footer.locator("button:enabled"))
        .waitFor({ timeout: 3000 });
      assert.deepEqual(
        await footer
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons.map((node) => node.getAttribute("aria-label") ?? node.textContent),
          ),
        optional
          ? ["＋ Track a change", "new", "board", "Refresh"]
          : ["＋ Track a change", "board", "Refresh"],
      );
      assert.equal(await refresh.innerText(), "");
      assert.equal(await refresh.locator("svg").count(), 1);
      assert.equal(await section.getByRole("article").count(), optional ? 1 : 0);
      assert.equal(
        await section
          .locator("article")
          .getByRole("button", { name: "board", exact: true })
          .count(),
        0,
      );
      if (optional) {
        const card = await section.getByRole("article").boundingBox();
        assert.ok((await footer.boundingBox()).y >= card.y + card.height);
        await page.evaluate(() => {
          delete window.__releaseReady;
          __mountBoard();
        });
        await page.waitForFunction(() => typeof window.__releaseReady === "function", null, {
          timeout: 3000,
        });
        await page.evaluate(() => __releaseReady());
        const board = page.frameLocator('iframe[title="OpenSpec test board"]');
        await board
          .getByRole("button", { name: "first-change", exact: true })
          .click({ timeout: 3000 });
        await board.getByRole("button", { name: "Back to changes" }).waitFor();
        await footer.getByRole("button", { name: "board", exact: true }).click();
        await page.waitForFunction(() => __requests.some(({ path }) => path === "open-surface"));
        await page.evaluate(() => __theme("light"));
        await board.locator('html[data-oc-theme="light"]').waitFor();
        assert.equal(
          await board.getByRole("heading", { name: "first-change", exact: true }).isVisible(),
          true,
        );
        assert.deepEqual(
          await page.evaluate(() =>
            __requests.filter(({ path }) => path === "open-surface" || path === "/focus"),
          ),
          [{ path: "open-surface", body: { surfaceId: "plugin:openspec-board" } }],
        );
        assert.equal(
          await page.evaluate(() => __completed.filter((path) => path === "/workflows").length),
          2,
        );
        await page.evaluate(() => __edit("Completed"));
        await refresh.click();
        await section.getByText("2/2", { exact: true }).waitFor();
        assert.equal(
          await page.evaluate(() => __completed.filter((path) => path === "/workflows").length),
          3,
        );
        assert.equal(
          await page.evaluate(() => __requests.filter(({ path }) => path === "/changes").length),
          3,
        );
      }
      assert.equal(
        await page.evaluate(() => __requests.some(({ path }) => path === "status-controls")),
        false,
      );
      await page.close();
    });
  });
}

test("a long Work Status change name truncates before the count wraps", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
    await page.goto(`${url}?status=long-card-name&pointer=coarse`);
    const frame = page.frameLocator("iframe");
    const name = frame.getByRole("button", { name: /^long-name-/ });
    await name.waitFor();
    const count = frame.getByText("6/6", { exact: true });
    const lines = await count.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    assert.equal(lines, 1);
    assert.equal(
      await name.evaluate(
        (node) =>
          node.scrollWidth > node.clientWidth && getComputedStyle(node).textOverflow === "ellipsis",
      ),
      true,
    );
    const summary = frame.locator("summary:visible");
    assert.equal(
      await summary
        .getByText("Tasks:", { exact: true })
        .evaluate((node) => getComputedStyle(node).textDecorationLine),
      "none",
    );
    assert.equal(
      await summary
        .getByRole("button", { name: "Task 6" })
        .evaluate((node) => getComputedStyle(node).textDecorationLine),
      "underline",
    );
  });
});

for (const pointer of ["coarse", "fine"]) {
  test(`Work Status keeps Untrack right-aligned on a ${pointer} pointer`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
      await page.goto(`${url}?status=item&pointer=${pointer}`);
      const frame = page.frameLocator("iframe");
      const track = frame.getByRole("button", { name: "＋ Track a change" });
      await track.waitFor();
      assert.equal(
        await track.evaluate((node) => getComputedStyle(node).textDecorationLine),
        "underline",
      );
      await frame.getByRole("button", { name: "first-change", exact: true }).click();
      const untrack = frame.getByRole("button", { name: "Untrack" });
      await untrack.waitFor();
      assert.equal(
        await untrack.evaluate((node) => getComputedStyle(node).textDecorationLine),
        "underline",
      );
      assert.ok(
        await untrack.evaluate((node) => {
          const { width, right } = node.getBoundingClientRect();
          const card = node.parentElement.getBoundingClientRect();
          return width < card.width / 2 && right === card.right;
        }),
      );
      assert.ok(
        pointer === "coarse"
          ? (await untrack.boundingBox()).height >= 44
          : (await untrack.boundingBox()).height <= 24,
      );
    });
  });

  test(`session section keeps two cards within 320px for a ${pointer} pointer`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({
        viewport: { width: 320, height: 720 },
        hasTouch: pointer === "coarse",
      });
      await page.goto(`${url}?status=compact-touch&pointer=${pointer}&hold-ready`);
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate(() => {
        __workflows(["new"]);
        __releaseReady();
      });
      const frame = page.frameLocator("iframe");
      await frame
        .getByRole("article")
        .filter({ hasText: "second-change" })
        .waitFor({ timeout: 3000 });
      await frame.locator("summary:visible").getByText("Tasks:", { exact: true }).click();
      const chips = await frame
        .locator("article .card-actions")
        .evaluateAll((rows) =>
          rows.map((row) =>
            [...row.querySelectorAll("button")]
              .filter((button) => button.getClientRects().length)
              .map((button) => button.getBoundingClientRect().toJSON()),
          ),
        );
      assert.deepEqual(
        chips.map((row) => row.length),
        [3, 3],
      );
      for (const row of chips) {
        for (const [index, box] of row.entries()) {
          if (pointer === "coarse") {
            assert.equal(box.height, 28);
            if (index > 0) {
              const previous = row[index - 1];
              assert.ok(box.left - previous.right >= 8 || box.top - previous.bottom >= 8);
            }
          } else assert.ok(box.height <= 24);
        }
      }
      const lines = await frame
        .locator("footer button:visible, article :is(summary, .flyout-trigger):visible")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            label: node.getAttribute("aria-label") ?? node.textContent.slice(0, 40),
            height: node.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(node).lineHeight),
          })),
        );
      assert.equal(lines.length, 13);
      for (const { label, height, lineHeight } of lines)
        assert.ok(
          height > 0 && height <= lineHeight + 0.05,
          `${label}: ${height}px exceeds line height ${lineHeight}px`,
        );
      const footer = frame.locator("footer");
      assert.ok(
        (await footer.boundingBox()).height <=
          Math.max(...lines.slice(-4).map(({ lineHeight }) => lineHeight)) + 0.05,
      );
      assert.ok(
        await frame
          .locator("html")
          .evaluate(({ scrollWidth, clientWidth }) => scrollWidth <= clientWidth),
      );
    });
  });

  test(`phone controls respect the host's ${pointer} pointer at 320px`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
      await page.goto(`${url}?pointer=${pointer}`);
      const frame = page.frameLocator("iframe");
      const card = frame.getByRole("button", { name: "first-change", exact: true });
      const create = frame.getByRole("button", { name: "new change", exact: true });
      await card.waitFor();
      const search = frame.getByRole("searchbox", { name: "Search changes" });
      const boardHeight = [
        (await create.boundingBox()).height,
        (await search.boundingBox()).height,
      ];
      await create.click();
      const dialog = frame.getByRole("dialog", { name: "New change" });
      const fields = dialog.getByRole("textbox");
      const dialogHeight = (await fields.first().boundingBox()).height;
      const cancel = dialog.getByRole("button", { name: "cancel", exact: true });
      const cancelHeight = (await cancel.boundingBox()).height;
      await cancel.click();
      await card.click();
      const back = frame.getByRole("button", { name: "Back to changes", exact: true });
      const tab = frame.getByRole("tab").first();
      const detailHeight = [(await back.boundingBox()).height, (await tab.boundingBox()).height];

      const heights = [...boardHeight, dialogHeight, cancelHeight, ...detailHeight];
      if (pointer === "coarse") {
        for (const height of heights)
          assert.ok(height >= 44, `Expected at least 44px, got ${height}px`);
      } else {
        assert.deepEqual(boardHeight, [28, 36]);
        assert.deepEqual(detailHeight, [28, 28]);
        assert.equal(cancelHeight, 28);
        assert.ok(dialogHeight < 44);
      }
      await page.close();
    });
  });
}

test("phone detail footer keeps its controls above a reported bottom inset", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
    await page.goto(`${url}?pointer=coarse`);
    const frame = page.frameLocator("iframe");
    await frame.getByRole("button", { name: "first-change", exact: true }).click();
    const footer = frame.locator(".detail-footer");
    const before = await footer.evaluate((node) =>
      parseFloat(getComputedStyle(node).paddingBottom),
    );
    await page.evaluate(() => __device(26, 0));
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    assert.equal(
      await footer.evaluate((node) => parseFloat(getComputedStyle(node).paddingBottom)),
      before + 26,
    );
    await page.close();
  });
});

test("phone create dialogue keeps its field and buttons above a reported keyboard", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await page.goto(`${url}?pointer=coarse`);
    const frame = page.frameLocator("iframe");
    await frame.getByRole("button", { name: "new change", exact: true }).click();
    const dialog = frame.getByRole("dialog", { name: "New change" });
    await dialog.getByRole("textbox").first().fill("phone-change");
    await page.evaluate(() => __device(0, 300));
    await frame.locator('html[data-oc-theme="light"]').waitFor();
    const layout = await dialog.evaluate((node) => ({
      bottom: node.getBoundingClientRect().bottom,
      maxBottom: innerHeight - 300,
      controls: [...node.querySelectorAll("input, button")]
        .filter((item) => item.getClientRects().length)
        .map((item) => {
          const rect = item.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
    }));
    assert.ok(layout.bottom <= layout.maxBottom, "Dialogue extends behind the keyboard");
    for (const { top, bottom } of layout.controls)
      assert.ok(top >= 0 && bottom <= layout.maxBottom);
    await page.close();
  });
});

for (const pointer of ["coarse", "fine"]) {
  test(`phone detail close and delete restore ${pointer}-pointer focus`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
      await page.goto(`${url}?pointer=${pointer}`);
      const frame = page.frameLocator("iframe");
      const card = frame.getByRole("button", { name: "first-change", exact: true });
      const back = frame.getByRole("button", { name: "Back to changes", exact: true });
      await card.click();
      await back.click();
      assert.equal(await card.evaluate((node) => node === document.activeElement), true);

      await card.click();
      await page.evaluate(() => __remove("first-change"));
      await frame.locator(".detail").getByRole("button", { name: "refresh", exact: true }).click();
      await frame.getByText("This change is no longer available", { exact: false }).waitFor();
      await back.click();
      const fallback =
        pointer === "coarse"
          ? frame.getByRole("button", { name: "new change", exact: true })
          : frame.getByRole("searchbox", { name: "Search changes" });
      assert.equal(
        await fallback.evaluate((node) => node === document.activeElement),
        true,
        "Close without a card should restore focus to the pointer-specific fallback",
      );

      await frame.getByRole("button", { name: "second-change", exact: true }).click();
      await frame.getByRole("button", { name: "Delete change", exact: true }).click();
      const dialog = frame.getByRole("dialog", { name: /Delete second-change/ });
      await dialog.getByRole("button", { name: "delete", exact: true }).click();
      await page.waitForFunction(() => __completed.includes("/delete"));
      await dialog.waitFor({ state: "hidden" });
      await fallback.waitFor();
      assert.equal(
        await fallback.evaluate((node) => node === document.activeElement),
        true,
        "Delete should restore focus to the pointer-specific fallback",
      );
      await page.close();
    });
  });
}

test("presentation modal backdrops dim every dialog without changing keyboard cancellation", async () => {
  await withPanel(async (browser, url) => {
    for (const width of [320, 1076]) {
      for (const mode of ["dark", "light"]) {
        const page = await browser.newPage({ viewport: { width, height: 700 } });
        await page.goto(url);
        const panel = page.frameLocator("iframe");
        await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
        await page.evaluate((mode) => __theme(mode), mode);
        await panel.locator(`html[data-oc-theme="${mode}"]`).waitFor();
        const nativeBackdrop = await page.evaluate(() => {
          const dialog = document.createElement("dialog");
          document.body.append(dialog);
          dialog.showModal();
          const style = getComputedStyle(dialog, "::backdrop");
          const result = { colour: style.backgroundColor, opacity: style.opacity };
          dialog.close();
          dialog.remove();
          return result;
        });
        const checkDialog = async (open, name) => {
          for (const cancel of ["Escape", "button"]) {
            await open();
            const dialog = panel.getByRole("dialog", { name });
            await dialog.waitFor();
            const backdrop = await dialog.evaluate((node) => {
              const style = getComputedStyle(node, "::backdrop");
              return {
                colour: style.backgroundColor,
                backdropOpacity: style.opacity,
                blur: style.backdropFilter,
                focusInside: node.contains(document.activeElement),
                opacity: getComputedStyle(node).opacity,
              };
            });
            assert.equal(backdrop.colour, nativeBackdrop.colour);
            assert.equal(backdrop.backdropOpacity, nativeBackdrop.opacity);
            assert.equal(backdrop.blur, "blur(4px)");
            assert.equal(backdrop.opacity, "1");
            assert.equal(backdrop.focusInside, true);
            await page.keyboard.press("Tab");
            assert.equal(
              await dialog.evaluate((node) => node.contains(document.activeElement)),
              true,
            );
            if (cancel === "Escape") await page.keyboard.press("Escape");
            else await dialog.getByRole("button", { name: "cancel", exact: true }).click();
            await dialog.waitFor({ state: "hidden" });
            assert.equal(await panel.locator("dialog[open]").count(), 0);
          }
        };
        await checkDialog(
          () => panel.getByRole("button", { name: "new change", exact: true }).click(),
          "New change",
        );
        await panel.getByRole("button", { name: "first-change", exact: true }).click();
        await checkDialog(
          () => panel.getByRole("button", { name: "Delete change", exact: true }).click(),
          /Delete first-change/,
        );
        await panel.getByRole("button", { name: "Back to changes" }).click();
        await page.evaluate(() => __edit("Completed"));
        await panel.getByRole("button", { name: "refresh", exact: true }).click();
        await panel
          .getByRole("button", { name: "archive all", exact: true })
          .and(panel.locator(":enabled"))
          .waitFor();
        await checkDialog(
          () => panel.getByRole("button", { name: "archive all", exact: true }).click(),
          "Archive all completed changes?",
        );
        assert.equal(
          await page.evaluate(() =>
            __requests.some((r) => ["/create", "/delete", "start-session"].includes(r.path)),
          ),
          false,
        );
        await page.close();
      }
    }
  });
});

test("presentation footer keeps equal 12px control gaps and an external separator", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    const footer = panel.locator(".detail-footer");
    const checkSpacing = async (wrapped = false) => {
      const layout = await footer.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const buttons = [...node.querySelectorAll("button")]
          .filter((button) => button.checkVisibility())
          .map((button) => button.getBoundingClientRect());
        const separator = getComputedStyle(node, "::before");
        return {
          topGap: Math.min(...buttons.map((rect) => rect.top)) - rect.top,
          bottomGap: rect.bottom - Math.max(...buttons.map((rect) => rect.bottom)),
          heights: buttons.map((rect) => rect.height),
          rows: new Set(buttons.map((rect) => rect.top)).size,
          separatorHeight: separator.height,
          separatorBottom: separator.bottom,
          separatorPosition: separator.position,
          separatorColour: separator.backgroundColor,
          borderWidth: getComputedStyle(node).borderTopWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(layout.topGap, 12);
      assert.equal(layout.bottomGap, 12);
      assert.ok(layout.heights.every((height) => height === 28));
      assert.equal(layout.separatorHeight, "1px");
      assert.equal(layout.separatorPosition, "absolute");
      assert.equal(layout.borderWidth, "0px");
      assert.equal(
        layout.separatorColour,
        await footer.evaluate((node) => {
          const probe = document.createElement("span");
          probe.style.color = getComputedStyle(node).getPropertyValue("--oc-border");
          node.append(probe);
          const colour = getComputedStyle(probe).color;
          probe.remove();
          return colour;
        }),
      );
      assert.equal(
        parseFloat(layout.separatorBottom),
        await footer.evaluate((node) => node.getBoundingClientRect().height),
      );
      assert.equal(layout.overflow, false);
      if (wrapped) assert.ok(layout.rows > 1);
    };
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      for (const mode of ["dark", "light"]) {
        await page.evaluate((mode) => __theme(mode), mode);
        await panel.locator(`html[data-oc-theme="${mode}"]`).waitFor();
        await checkSpacing();
      }
    }
    await footer.getByRole("button", { name: "apply", exact: true }).click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() =>
      __draft().startsWith(
        'Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "first-change".',
      ),
    );
    await page.evaluate(() => {
      __edit("Completed");
      __workflows(["verify"]);
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await footer.getByRole("button", { name: "verify", exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 700 });
    await footer.evaluate((node) => {
      node.style.width = "90px";
    });
    await checkSpacing(true);
    await page.close();
  });
});

test("presentation page fills short boards and preserves long board and detail scrolling", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 1076, height: 1000 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    for (const viewport of [
      { width: 320, height: 1000 },
      { width: 1076, height: 850 },
    ]) {
      await page.setViewportSize(viewport);
      for (const mode of ["dark", "light"]) {
        await page.evaluate((mode) => __theme(mode), mode);
        await panel.locator(`html[data-oc-theme="${mode}"]`).waitFor();
        const coverage = await panel.locator("html").evaluate((node) => ({
          rootHeight: node.getBoundingClientRect().height,
          bodyHeight: document.body.getBoundingClientRect().height,
          boardHeight: document.querySelector(".board-shell").getBoundingClientRect().height,
          viewportHeight: innerHeight,
          overflow: node.scrollWidth > innerWidth,
          colour: getComputedStyle(node).backgroundColor,
        }));
        assert.ok(coverage.boardHeight < coverage.viewportHeight);
        assert.ok(coverage.rootHeight >= coverage.viewportHeight);
        assert.ok(coverage.bodyHeight >= coverage.viewportHeight);
        assert.equal(coverage.overflow, false);
        assert.equal(coverage.colour, mode === "dark" ? "rgb(21, 25, 28)" : "rgb(255, 255, 255)");
        for (const modal of [false, true]) {
          if (modal) await panel.getByRole("button", { name: "new change", exact: true }).click();
          const screenshot = (await page.screenshot()).toString("base64");
          const colours = await panel.locator("html").evaluate(async (node, png) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(2, 0, 1, image.height).data;
            const dialog = document.querySelector("dialog[open]")?.getBoundingClientRect();
            const colours = new Set();
            // Exclude the modal and viewport edges affected by the backdrop blur.
            for (let y = dialog ? 16 : 2; y < image.height - (dialog ? 16 : 2); y++) {
              if (dialog && y >= dialog.top - 16 && y <= dialog.bottom + 16) continue;
              colours.add([...pixels.slice(y * 4, y * 4 + 3)].join(","));
            }
            return [...colours];
          }, screenshot);
          assert.equal(colours.length, 1, `Painted background seam in ${mode}, modal=${modal}`);
          if (modal)
            await panel
              .getByRole("dialog", { name: "New change" })
              .getByRole("button", { name: "cancel", exact: true })
              .click();
        }
      }
    }
    await page.evaluate(() => {
      for (let n = 0; n < 40; n++) __recreate(`long-board-${String(n).padStart(2, "0")}`);
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    const last = panel.getByRole("button", { name: "long-board-39", exact: true });
    await last.waitFor();
    await last.scrollIntoViewIfNeeded();
    assert.equal(
      await last.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return (
          rect.top >= 0 && rect.bottom <= innerHeight && document.scrollingElement.scrollTop > 0
        );
      }),
      true,
    );
    await page.evaluate(() => __document("proposal.md", "Long paragraph.\n\n".repeat(300)));
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await panel.locator(".document-content").filter({ hasText: "Long paragraph." }).waitFor();
    const scrolling = await panel.locator(".detail-content").evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return {
        contentScrolled: node.scrollTop > 0,
        outerHeight: document.scrollingElement.scrollHeight,
        viewportHeight: innerHeight,
        detailHeight: document.querySelector(".detail").getBoundingClientRect().height,
      };
    });
    assert.equal(scrolling.contentScrolled, true);
    assert.equal(scrolling.outerHeight, scrolling.viewportHeight);
    assert.equal(scrolling.detailHeight, scrolling.viewportHeight);
    await page.close();
  });
});

test("board tabs retain the Changes cards, scroll and focus without reading again", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 420, height: 460 } });
    await page.goto(`${url}?hold-ready`);
    const panel = page.frameLocator("iframe");
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate(() => {
      __edit("Completed");
      for (let i = 0; i < 16; i++) __recreate(`long-board-${String(i).padStart(2, "0")}`);
      __releaseReady();
    });
    const last = panel.getByRole("button", { name: "long-board-15", exact: true });
    await last.waitFor();
    const tabs = panel.getByRole("tablist", { name: "OpenSpec views" });
    const changes = tabs.getByRole("tab", { name: "Changes", exact: true });
    const archived = tabs.getByRole("tab", { name: "Archived", exact: true });
    const specs = tabs.getByRole("tab", { name: "Specs", exact: true });
    await changes.waitFor({ timeout: 3000 });
    assert.equal(await changes.getAttribute("aria-selected"), "true");
    assert.equal(await tabs.evaluate((node) => node.closest("header") === null), true);
    const before = await page.evaluate(
      () =>
        __requests.filter(({ path }) => ["/changes", "/workflows", "/summaries"].includes(path))
          .length,
    );
    await last.scrollIntoViewIfNeeded();
    const scroll = await last.evaluate((node) => {
      node.focus({ preventScroll: true });
      window.lastChangeControl = node;
      return window.scrollY;
    });
    assert.ok(scroll > 0);
    await archived.evaluate((node) => node.click());
    assert.equal(await archived.getAttribute("aria-selected"), "true");
    assert.equal(await last.count(), 0);
    await specs.evaluate((node) => node.click());
    assert.equal(await specs.getAttribute("aria-selected"), "true");
    assert.equal(await panel.getByRole("button", { name: "new change" }).isEnabled(), true);
    assert.equal(await panel.getByRole("button", { name: "archive all" }).isEnabled(), true);
    const search = panel.getByRole("searchbox", { name: "Search changes" });
    await search.fill("long-board");
    await changes.evaluate((node) => node.click());
    assert.equal(await search.inputValue(), "long-board");
    assert.equal(await panel.getByRole("button", { name: "first-change", exact: true }).count(), 0);
    assert.deepEqual(
      await last.evaluate((node) => ({
        same: node === window.lastChangeControl,
        focused: document.activeElement === node,
        scroll: window.scrollY,
      })),
      { same: true, focused: true, scroll },
    );
    await search.fill("Recreated goal");
    assert.equal(await last.count(), 0);
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter(({ path }) => ["/changes", "/workflows", "/summaries"].includes(path))
            .length,
      ),
      before,
    );
  });
});

test("coarse-pointer board tabs are touch-sized and reachable with arrow keys", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 }, hasTouch: true });
    await page.goto(`${url}?pointer=coarse`);
    const tabs = page.frameLocator("iframe").getByRole("tablist", { name: "OpenSpec views" });
    const changes = tabs.getByRole("tab", { name: "Changes", exact: true });
    const archived = tabs.getByRole("tab", { name: "Archived", exact: true });
    const specs = tabs.getByRole("tab", { name: "Specs", exact: true });
    await changes.waitFor({ timeout: 3000 });
    for (const tab of [changes, archived, specs]) assert.ok((await tab.boundingBox()).height >= 44);
    await changes.press("ArrowRight");
    assert.equal(await archived.getAttribute("aria-selected"), "true");
    assert.equal(await archived.evaluate((node) => document.activeElement === node), true);
    await archived.press("ArrowRight");
    assert.equal(await specs.getAttribute("aria-selected"), "true");
    await specs.press("ArrowLeft");
    assert.equal(await archived.getAttribute("aria-selected"), "true");
  });
});

test("Archived orders and filters archived changes without reading them before opening", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() =>
      __archived([
        { name: "no-date", completedTasks: 0, totalTasks: 0 },
        { name: "2026-11-20-add-login", completedTasks: 7, totalTasks: 7 },
        { name: "2026-11-22-fix-cache", completedTasks: 3, totalTasks: 3 },
        { name: "2026-11-22-add-cache", completedTasks: 1, totalTasks: 2 },
      ]),
    );
    assert.equal(await page.evaluate(() => __requests.some((r) => r.path === "/archived")), false);
    await panel.getByRole("tab", { name: "Archived", exact: true }).click();
    const archive = panel.getByRole("tabpanel", { name: "Archived" });
    await archive.getByText("fix-cache", { exact: true }).waitFor({ timeout: 3000 });
    const rows = archive.getByRole("listitem");
    assert.deepEqual(await rows.allTextContents(), [
      "add-cache2026-11-221 of 2 tasks",
      "fix-cache2026-11-223 of 3 tasks",
      "add-login2026-11-207 of 7 tasks",
      "no-date0 of 0 tasks",
    ]);
    await panel.getByRole("searchbox", { name: "Search changes" }).fill("login");
    assert.deepEqual(await rows.allTextContents(), ["add-login2026-11-207 of 7 tasks"]);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/archived").length),
      1,
    );
  });
});

test("Archived retains reads across tab switches but a Refresh on Changes invalidates them", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const archived = panel.getByRole("tab", { name: "Archived", exact: true });
    const changes = panel.getByRole("tab", { name: "Changes", exact: true });
    const archive = panel.getByRole("tabpanel", { name: "Archived" });
    await archived.click();
    await archive.getByText("No changes are archived.").waitFor({ timeout: 3000 });
    await changes.click();
    await page.evaluate(() =>
      __archived([{ name: "2026-11-22-fix-cache", completedTasks: 3, totalTasks: 3 }]),
    );
    await archived.click();
    await archive.getByText("No changes are archived.").waitFor();
    assert.equal(await page.evaluate(() => __completed.filter((p) => p === "/archived").length), 1);
    await changes.click();
    await page.evaluate(() => __recreate("loaded-on-refresh"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "loaded-on-refresh", exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/archived").length),
      1,
    );
    await archived.click();
    await archive.getByText("fix-cache", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/archived").length),
      2,
    );
  });
});

test("Archived shows the CLI error without rows and refresh retries the shown view", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => __archived(null));
    await panel.getByRole("tab", { name: "Archived", exact: true }).click();
    const archive = panel.getByRole("tabpanel", { name: "Archived" });
    await archive.getByText("Cannot list archived changes").waitFor({ timeout: 3000 });
    assert.equal(await archive.getByRole("listitem").count(), 0);
    await page.evaluate(() => __archived([]));
    await archive.getByRole("button", { name: "refresh", exact: true }).click();
    await archive.getByText("No changes are archived.").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/archived").length),
      2,
    );
  });
});

test("Specs lists ids in CLI order, pluralizes counts and searches by id", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() =>
      __specs([
        { id: "team/nested", requirementCount: 5 },
        { id: "public-api", requirementCount: 1 },
      ]),
    );
    assert.equal(
      await page.evaluate(() => __requests.some((r) => ["/specs", "/spec"].includes(r.path))),
      false,
    );
    await panel.getByRole("tab", { name: "Specs", exact: true }).click();
    const list = panel.getByRole("tabpanel", { name: "Specs" });
    await list.getByText("5 requirements", { exact: true }).waitFor({ timeout: 3000 });
    const rows = list.getByRole("listitem");
    const labels = await rows.allTextContents();
    assert.match(labels[0], /team\/nested.*5 requirements/);
    assert.match(labels[1], /public-api.*1 requirement$/);
    await panel.getByRole("searchbox", { name: "Search changes" }).fill("API");
    assert.deepEqual(await rows.allTextContents(), [labels[1]]);
  });
});

test("Specs renders the entire file safely and Back preserves the scrolled list without rereading", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 420, height: 460 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => {
      __specs(Array.from({ length: 40 }, (_, n) => ({ id: `readable-${n}`, requirementCount: 1 })));
      __spec(
        "readable-39",
        "# Main spec\n\n## Purpose\n\nA real document.\n\n## Extra notes\n\n- As written\n\n" +
          '<button id="untrusted">Raw HTML</button>\n\n[Unsafe link](mailto:inert@example.com)',
      );
    });
    await panel.getByRole("tab", { name: "Specs", exact: true }).click();
    const last = panel.getByRole("button", { name: /readable-39/ });
    await last.waitFor({ timeout: 3000 });
    await last.scrollIntoViewIfNeeded();
    const listScroll = await last.evaluate(() => window.scrollY);
    assert.ok(listScroll > 0);
    await last.click();
    const doc = panel.locator(".document-content:visible");
    await doc.getByRole("heading", { name: "Extra notes" }).waitFor({ timeout: 3000 });
    assert.equal(await doc.getByRole("listitem").filter({ hasText: "As written" }).count(), 1);
    await doc.getByText('<button id="untrusted">Raw HTML</button>', { exact: true }).waitFor();
    assert.equal(await doc.getByRole("button", { name: "Raw HTML" }).count(), 0);
    assert.equal(await doc.getByRole("link", { name: "Unsafe link" }).count(), 0);
    await panel.getByRole("button", { name: "Back to specs" }).click();
    assert.equal(await last.evaluate(() => window.scrollY), listScroll);
    await last.click();
    await doc.getByRole("heading", { name: "Extra notes" }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/spec"],
    );
  });
});

test("Specs retains the list and documents across tabs until a Refresh elsewhere", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const specs = panel.getByRole("tab", { name: "Specs", exact: true });
    const changes = panel.getByRole("tab", { name: "Changes", exact: true });
    await page.evaluate(() => {
      __specs([{ id: "example", requirementCount: 1 }]);
      __spec("example", "# Before Refresh");
    });
    await specs.click();
    await panel.getByRole("button", { name: /example/ }).click({ timeout: 3000 });
    await panel.getByRole("heading", { name: "Before Refresh" }).waitFor();
    await panel.getByRole("button", { name: "Back to specs" }).click();
    await changes.click();
    await page.evaluate(() => {
      __specs([{ id: "example", requirementCount: 5 }]);
      __spec("example", "# After Refresh");
    });
    await specs.click();
    await panel.getByText("1 requirement", { exact: true }).waitFor();
    await panel.getByRole("button", { name: /example/ }).click();
    await panel.getByRole("heading", { name: "Before Refresh" }).waitFor();
    await panel.getByRole("button", { name: "Back to specs" }).click();
    await changes.click();
    await page.evaluate(() => __recreate("loaded-on-refresh"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "loaded-on-refresh", exact: true }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/spec"],
    );
    await specs.click();
    await panel.getByText("5 requirements", { exact: true }).waitFor();
    await panel.getByRole("button", { name: /example/ }).click();
    await panel.getByRole("heading", { name: "After Refresh" }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/spec", "/specs", "/spec"],
    );
  });
});

test("a failed spec read offers a retry without showing partial content", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => __specs([{ id: "example", requirementCount: 1 }]));
    await panel.getByRole("tab", { name: "Specs", exact: true }).click();
    await panel.getByRole("button", { name: /example/ }).click({ timeout: 3000 });
    await panel.getByText("Spec is no longer listed.").waitFor({ timeout: 3000 });
    assert.equal(await panel.locator(".document-content:visible").count(), 0);
    await page.evaluate(() => __spec("example", "# Recovered spec"));
    await panel.getByRole("button", { name: "Retry document", exact: true }).click();
    await panel.getByRole("heading", { name: "Recovered spec" }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/spec", "/spec"],
    );
  });
});

test("Refresh reads the shown spec without prefetching the hidden list", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await panel.getByRole("tab", { name: "Specs", exact: true }).click();
    await panel.getByText("No specs exist yet.").waitFor();
    await page.evaluate(() => {
      __specs([{ id: "example", requirementCount: 1 }]);
      __spec("example", "# First spec version");
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: /example/ }).click();
    await panel.getByRole("heading", { name: "First spec version" }).waitFor();
    await page.evaluate(() => __spec("example", "# Refreshed spec version"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Refreshed spec version" }).waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/specs", "/spec", "/spec"],
    );
    await page.evaluate(() => __specs([]));
    await panel.getByRole("button", { name: "Back to specs" }).click();
    await panel.getByText("No specs exist yet.").waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => ["/specs", "/spec"].includes(r.path)).map((r) => r.path),
      ),
      ["/specs", "/specs", "/spec", "/spec", "/specs"],
    );
  });
});

test("one board load requests one listing, workflow read and summaries batch", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const paths = await page.evaluate(() => __requests.map((item) => item.path));
    assert.deepEqual(
      paths.filter((path) => path.startsWith("/")),
      ["/changes", "/workflows", "/summaries"],
    );
  });
});

test("board reads configured workflows on mount, refresh and directory change", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => __recreate("loaded-on-refresh"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "loaded-on-refresh", exact: true }).waitFor();
    await page.evaluate(() => __directory("/tmp/board-workflows-other-project"));
    await panel.getByText("0 changes · 0 of 0 tasks complete", { exact: true }).waitFor();
    await panel.locator(".new-change-control button:enabled").waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter(({ path }) => path === "/workflows").map(({ body }) => body),
      ),
      [{ directory }, { directory }, { directory: "/tmp/board-workflows-other-project" }],
    );
  });
});

for (const first of ["/changes", "/workflows"]) {
  test(`board waits for both the listing and workflows when ${first} answers first`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?hold-ready`);
      const panel = page.frameLocator("iframe");
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate((path) => {
        const frame = document.querySelector("iframe").contentWindow;
        frame.addEventListener("message", (event) => {
          const body = event.data?.payload?.body;
          if (event.data?.type !== "result" || typeof body !== "string") return;
          const value = JSON.parse(body);
          if (
            path === "/changes" ? !Array.isArray(value?.changes) : !Array.isArray(value?.workflows)
          )
            return;
          frame.document.documentElement.dataset.firstBoardReply = path;
        });
        if (path === "/changes") __holdWorkflows();
        else __holdListing();
        __releaseReady();
      }, first);
      await page.waitForFunction(
        () => ["/changes", "/workflows"].every((path) => __requests.some((r) => r.path === path)),
        null,
        { timeout: 3000 },
      );
      await panel.locator(`html[data-first-board-reply="${first}"]`).waitFor();
      assert.equal(await panel.locator(".change-card").count(), 0);
      assert.equal(
        await panel.locator(".board-tally").textContent(),
        "0 changes · 0 of 0 tasks complete",
      );
      await page.evaluate((path) => {
        if (path === "/changes") __releaseWorkflows();
        else __releaseListing();
      }, first);
      await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    });
  });
}

test("board falls back to core workflows without showing the config error", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?hold-ready`);
    const panel = page.frameLocator("iframe");
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate(() => {
      __workflows(null);
      __readiness("blocked-tasks");
      __releaseReady();
    });
    await panel
      .locator(".change-card")
      .filter({ hasText: "second-change" })
      .getByRole("button", { name: "propose", exact: true })
      .waitFor();
    assert.equal(await panel.getByText("Cannot read workflows").count(), 0);
    assert.equal(
      await page.evaluate(() => __completed.filter((p) => p === "/workflows").length),
      1,
    );
  });
});

test("Apply native menu dismisses without dispatch and prepares current-chat drafts on cards and detail", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    const trigger = card.getByRole("button", { name: "apply", exact: true });
    await trigger.click();
    await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).waitFor();
    await panel.getByRole("menu").press("Escape");
    assert.equal(
      await page.evaluate(() =>
        __requests.some((r) => r.path === "compose" || r.path === "start-session"),
      ),
      false,
    );
    assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
    await trigger.press("Enter");
    await panel.getByRole("menu").press("ArrowDown");
    await panel.getByRole("menu").press("Enter");
    await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));
    assert.match(
      await page.evaluate(() => __draft()),
      /^Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "first-change"\./,
    );
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await panel
      .locator(".detail-footer")
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 2);
    await page.close();
  });
});

test("new-worktree Apply delegates a path-free first message and opens only after submission", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() =>
      __startResult({
        sessionId: "apply-session",
        directory: "/new-worktree",
        sent: "sent",
        linked: true,
        worktree: {
          directory: "/new-worktree",
          name: "first-change",
          branch: "first-change",
          status: "ready",
        },
      }),
    );
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "open-session"), null, {
      timeout: 3000,
    });
    const requests = await page.evaluate(() => __requests);
    const start = requests.find((r) => r.path === "start-session").body;
    assert.equal(start.projectId, "origin-project");
    assert.deepEqual(start.data, { kind: "change", change: "first-change" });
    assert.deepEqual(start.worktree, { kind: "new", name: "first-change" });
    assert.equal(start.navigation, "preserve");
    assert.match(
      start.text,
      /^Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "first-change"\./,
    );
    assert.doesNotMatch(start.text, /\/tmp\/|copy|symlink/);
    assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
    assert.equal(
      requests.some((r) => r.path === "compose" || r.path === "prompt"),
      false,
    );
    assert.equal(requests.find((r) => r.path === "open-session").body.sessionId, "apply-session");
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));
    assert.equal(await page.evaluate(() => __draft()), start.text);
    await page.close();
  });
});

test("planning replacement closes stale confirmations and refresh retains search without automatic reload", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByLabel("Search changes", { exact: true }).fill("first");
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await panel.getByRole("tab", { name: /Tasks · Written/ }).waitFor();
    await panel.getByRole("tab", { name: /Proposal · Written/ }).waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/document").length >= 4);
    await page.evaluate(() => __planning("replacement"));
    await panel.getByRole("button", { name: "Delete change", exact: true }).click();
    await panel.getByRole("dialog").getByRole("button", { name: "delete", exact: true }).click();
    await panel.getByText("Planning target changed. Refresh to establish the new scope.").waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/delete").length),
      1,
    );
    await panel.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "Back to changes", exact: true }).click();
    assert.equal(await panel.getByLabel("Search changes", { exact: true }).inputValue(), "first");
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "/tasks" && r.body.expectedPlanning === "replacement"),
    );
    await page.close();
  });
});

test("worktree Apply preserves partial outcomes, inspects collisions and suppresses late navigation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const launch = async () => {
      await panel
        .locator(".change-card")
        .filter({ hasText: "first-change" })
        .getByRole("button", { name: "apply", exact: true })
        .click();
      await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).click();
    };
    const tree = {
      directory: "/retained",
      name: "first-change",
      branch: "first-change",
      status: "ready",
    };
    for (const result of [
      { sessionId: null, sent: "skipped", failure: "bootstrap-failed", worktree: tree },
      { sessionId: null, sent: "skipped", failure: "session-create-failed", worktree: tree },
      { sessionId: "retained-session", directory: "/retained", sent: "no-model", worktree: tree },
      { sessionId: "retained-session", directory: "/retained", sent: "failed", worktree: tree },
      { unexpected: true },
    ]) {
      const prior = await page.evaluate(() => __requests.filter((r) => r.path === "toast").length);
      await page.evaluate((value) => __startResult(value), result);
      await launch();
      await page.waitForFunction(
        (count) => __requests.filter((r) => r.path === "toast").length > count,
        prior,
      );
      assert.equal(
        await page.evaluate(() =>
          __requests.some((r) => r.path === "open-session" || r.path === "compose"),
        ),
        false,
      );
    }
    for (const code of ["HOST_REJECTED", "HOST_TIMEOUT"]) {
      const prior = await page.evaluate(() => __requests.filter((r) => r.path === "toast").length);
      await page.evaluate((value) => __startError(value), code);
      await launch();
      await page.waitForFunction(
        (count) => __requests.filter((r) => r.path === "toast").length > count,
        prior,
      );
      assert.match(
        await page.evaluate(() => __requests.filter((r) => r.path === "toast").at(-1).body.message),
        /uncertain.*Inspect/s,
      );
      assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
    }
    const launches = await page.evaluate(
      () => __requests.filter((r) => r.path === "start-session").length,
    );
    await page.evaluate((value) => __worktrees([value]), tree);
    await launch();
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "toast" && /already exists/.test(r.body.message)),
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "start-session").length),
      launches,
    );
    await page.evaluate(() => {
      __worktrees([]);
      __holdStart();
      __startResult({
        sessionId: "late",
        directory: "/late",
        sent: "sent",
        worktree: {
          directory: "/late",
          name: "first-change",
          branch: "first-change",
          status: "ready",
        },
      });
    });
    await launch();
    await page.waitForFunction(
      (count) => __requests.filter((r) => r.path === "start-session").length === count + 1,
      launches,
    );
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    assert.equal(
      await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).isDisabled(),
      true,
    );
    await panel.getByRole("menu").press("Escape");
    const feedback = await page.evaluate(() => __requests.filter((r) => r.path === "toast").length);
    await page.evaluate(() => {
      __session({ id: "unrelated" });
      __releaseStart();
    });
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.some((r) => r.path === "open-session")),
      false,
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "toast").length),
      feedback,
    );
    assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
    await page.close();
  });
});

test("worktree Apply resolves worktree ownership and fails missing projects without creation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const launch = async () => {
      await panel
        .locator(".change-card")
        .filter({ hasText: "first-change" })
        .getByRole("button", { name: "apply", exact: true })
        .click();
      await panel.getByRole("menuitem", { name: "Run in new worktree", exact: true }).click();
    };
    await page.evaluate(() => __projects([]));
    await launch();
    await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
    assert.equal(
      await page.evaluate(() => __requests.some((r) => r.path === "start-session")),
      false,
    );
    await page.evaluate(() => {
      __projects([{ id: "main-owner", directory: "/main", name: "Main" }]);
      __worktrees([
        {
          directory: "/tmp/fixture-project",
          name: "existing",
          branch: "existing",
          status: "ready",
        },
      ]);
      __startResult({
        sessionId: "owned",
        directory: "/created",
        sent: "sent",
        worktree: {
          directory: "/created",
          name: "first-change",
          branch: "first-change",
          status: "ready",
        },
      });
    });
    await launch();
    await page.waitForFunction(() => __requests.some((r) => r.path === "open-session"));
    assert.equal(
      await page.evaluate(() => __requests.find((r) => r.path === "start-session").body.projectId),
      "main-owner",
    );
    await page.close();
  });
});

test("Apply menu rejects a selection from a replaced chat but accepts a newly opened menu", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const trigger = panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true });
    await trigger.click();
    await page.evaluate(() => __session({ id: "replacement-chat" }));
    await page.evaluate(() => __theme("light"));
    await panel.locator('html[data-oc-theme="light"]').waitFor();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await assert.rejects(
      page.waitForFunction(
        () => __requests.some((r) => r.path === "compose" || r.path === "start-session"),
        null,
        { timeout: 500 },
      ),
      /Timeout/,
    );
    assert.equal(
      await page.evaluate(() =>
        __requests.some((r) => r.path === "compose" || r.path === "start-session"),
      ),
      false,
    );
    await trigger.click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));
    await page.close();
  });
});

test("four cards arrive together after the listing count and tally", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url + "?hold-summary");
    const panel = page.frameLocator("iframe");
    await page.waitForFunction(() => __requests.some((item) => item.path === "/summaries"));
    assert.equal(await panel.locator(".change-card").count(), 0);
    assert.equal(
      await panel.locator(".board-tally").textContent(),
      "2 changes · 1 of 2 tasks complete",
    );
    await page.evaluate(() => {
      __addSameStage();
      __recreate("fourth-change");
      __releaseSummaries();
    });
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    // The listing remains authoritative: newly appeared batch entries are ignored.
    assert.equal(await panel.locator(".change-card").count(), 2);
    await page.evaluate(() => __holdSummaries());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/summaries").length === 2,
    );
    assert.equal(
      await panel.locator(".board-tally").textContent(),
      "4 changes · 2 of 4 tasks complete",
    );
    assert.equal(await panel.locator(".change-card").count(), 2);
    await page.evaluate(() => __releaseSummaries());
    await panel.getByRole("button", { name: "fourth-change", exact: true }).waitFor();
    assert.equal(await panel.locator(".change-card").count(), 4);
    assert.deepEqual(await page.evaluate(() => __requests.map((item) => item.path)), [
      "/changes",
      "/workflows",
      "/summaries",
      "/changes",
      "/workflows",
      "/summaries",
    ]);
  });
});

test("whole batch failures retain stale cards and retry; changed roots reload", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    for (const [reply, text] of [
      ["error", "Batch read failed"],
      ["malformed", "The local OpenSpec service returned invalid data."],
    ]) {
      await page.evaluate((reply) => __batchReply(reply), reply);
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel.getByText(text, { exact: true }).waitFor();
      assert.equal(await panel.locator(".change-card").count(), 2);
      const summariesBeforeRetry = await page.evaluate(
        () => __requests.filter((item) => item.path === "/summaries").length,
      );
      await panel.getByRole("button", { name: "Retry", exact: true }).click();
      await panel.getByText(text, { exact: true }).waitFor({ state: "hidden" });
      await page.waitForFunction(
        (before) => __requests.filter((item) => item.path === "/summaries").length > before,
        summariesBeforeRetry,
      );
    }
    const before = await page.evaluate(
      () => __requests.filter((item) => item.path === "/changes").length,
    );
    await page.evaluate(() => __batchReply("root"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      (before) => __requests.filter((item) => item.path === "/changes").length === before + 2,
      before,
    );
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    assert.equal(await panel.locator(".change-card").count(), 2);
  });
});

test("copy change name routes exact IDs through the host with pointer and keyboard feedback", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await panel.getByText("First version of proposal", { exact: true }).waitFor();
    const copy = panel.getByRole("button", { name: "Copy change name", exact: true });
    await copy.waitFor({ timeout: 2000 });
    assert.equal(await copy.getAttribute("title"), "Copy change name");
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 4);
    const baseline = await page.evaluate(() => __requests.length);
    await page.evaluate(() => __holdClipboard());
    await copy.click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "clipboard-write"));
    assert.deepEqual(await page.evaluate((start) => __requests.slice(start), baseline), [
      { path: "clipboard-write", body: { text: "first-change" } },
    ]);
    await page.evaluate(() => __releaseClipboard());
    await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
    assert.deepEqual(await page.evaluate(() => __requests.find((r) => r.path === "toast").body), {
      kind: "success",
      message: "Change name copied",
    });
    await page.evaluate(() => __failClipboard());
    await copy.focus();
    await copy.press("Enter");
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "toast" && r.body.kind === "error"),
    );
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "clipboard-write").length),
      2,
    );
    assert.equal(
      await page.evaluate(
        () => __requests.find((r) => r.path === "toast" && r.body.kind === "error").body.message,
      ),
      "Clipboard unavailable",
    );
    await copy.press("Space");
    await page.waitForFunction(
      () => __requests.filter((r) => r.path === "toast" && r.body.kind === "success").length === 2,
    );
    assert.deepEqual(
      await page.evaluate((start) => __requests.slice(start).map((r) => r.path), baseline),
      ["clipboard-write", "toast", "clipboard-write", "toast", "clipboard-write", "toast"],
    );
    assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
  });
});

test("copy change name keeps badges below the wrapping name and above the goal", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const name = "long-change-" + "title-".repeat(20) + "end";
    await page.evaluate((name) => {
      __rename("first-change", name);
      __areas(name, ["area".repeat(40), "Several words in another affected area", "third"]);
    }, name);
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name, exact: true }).click();
    await panel.getByText("First version of proposal", { exact: true }).waitFor();
    for (const width of [1076, 320]) {
      await page.setViewportSize({ width, height: 700 });
      const layout = await panel.locator(".detail").evaluate((detail) => {
        const group = detail.querySelector(".detail-name-group");
        const title = detail.querySelector("h1");
        const copy = detail.querySelector('[aria-label="Copy change name"]');
        const areas = detail.querySelector(".affected-areas");
        const goal = detail.querySelector(".goal");
        const bounds = (node) => node.getBoundingClientRect();
        return {
          grouped: group.contains(title) && group.contains(copy) && !group.contains(areas),
          ordered:
            bounds(areas).top >= bounds(group).bottom && bounds(goal).top >= bounds(areas).bottom,
          visible:
            bounds(copy).width > 0 && bounds(copy).left >= 0 && bounds(copy).right <= innerWidth,
          wraps: bounds(title).height > parseFloat(getComputedStyle(title).lineHeight),
          badgeWraps: bounds(areas.children[1]).top > bounds(areas.children[0]).top,
          overflow: document.body.scrollWidth > innerWidth,
        };
      });
      assert.equal(layout.grouped, true);
      assert.equal(layout.ordered, true);
      assert.equal(layout.visible, true);
      assert.equal(layout.overflow, false);
      if (width === 320) {
        assert.equal(layout.wraps, true);
        assert.equal(layout.badgeWraps, true);
      }
    }
    await panel.getByRole("button", { name: "Copy change name" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
    assert.equal(
      await page.evaluate(() => __requests.find((r) => r.path === "clipboard-write").body.text),
      name,
    );
  });
});

test("copy change name retains focus during reads and captures navigation, refresh and unavailable IDs", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => {
      __holdProposal();
      __holdTasks();
      __holdClipboard();
    });
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    const copy = panel.getByRole("button", { name: "Copy change name", exact: true });
    await copy.focus();
    await copy.evaluate((button) => {
      window.__copyButton = button;
    });
    await page.waitForFunction(() => __requests.some((r) => r.path === "/document"));
    await page.evaluate(() => {
      __releaseFile();
      __releaseFile();
    });
    await panel.getByText("First version of proposal", { exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        __requests.some(
          (r) =>
            r.path === "/document" &&
            r.body.change === "first-change" &&
            r.body.selector === "specs/3.md",
        ) &&
        __completed.filter((path) => path === "/document").length ===
          __requests.filter((r) => r.path === "/document").length,
    );
    assert.ok(
      await copy.evaluate(
        (button) => button === window.__copyButton && button === document.activeElement,
      ),
    );
    await copy.press("Enter");
    await page.waitForFunction(() => __requests.some((r) => r.path === "clipboard-write"));
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await panel.getByRole("button", { name: "second-change", exact: true }).click();
    await page.evaluate(() => {
      __releaseReads();
      __releaseClipboard();
    });
    await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
    await page.waitForFunction(
      () =>
        __requests.some(
          (r) =>
            r.path === "/document" &&
            r.body.change === "second-change" &&
            r.body.selector === "specs/3.md",
        ) &&
        __completed.filter((path) => path === "/document").length ===
          __requests.filter((r) => r.path === "/document").length,
    );
    await page.evaluate(() => __failToast());
    let before = await page.evaluate(() => __requests.length);
    await copy.click();
    await page.waitForFunction(
      (before) => __requests.slice(before).some((r) => r.path === "toast"),
      before,
    );
    assert.deepEqual(
      await page.evaluate((before) => __requests.slice(before).map((r) => r.path), before),
      ["clipboard-write", "toast"],
    );
    await page.evaluate(() => __holdListing());
    await panel
      .getByRole("button", { name: "refresh", exact: true })
      .evaluate((button) => button.click());
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/changes").length === 2);
    before = await page.evaluate(() => __requests.length);
    await copy.click();
    await page.waitForFunction(
      (before) => __requests.slice(before).some((r) => r.path === "toast"),
      before,
    );
    assert.deepEqual(
      await page.evaluate((before) => __requests.slice(before).map((r) => r.path), before),
      ["clipboard-write", "toast"],
    );
    await page.evaluate(() => {
      __unavailable();
      __releaseListing();
    });
    await panel
      .getByText("This change is no longer available. Refresh or return to the board.", {
        exact: true,
      })
      .waitFor();
    before = await page.evaluate(() => __requests.length);
    await copy.click();
    await page.waitForFunction(
      (before) => __requests.slice(before).some((r) => r.path === "toast"),
      before,
    );
    assert.deepEqual(
      await page.evaluate((before) => __requests.slice(before).map((r) => r.path), before),
      ["clipboard-write", "toast"],
    );
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((r) => r.path === "clipboard-write").map((r) => r.body.text),
      ),
      ["first-change", "second-change", "second-change", "second-change"],
    );
    assert.equal(
      await page.evaluate(
        () =>
          __requests.filter((r) => ["compose", "prompt", "start-session"].includes(r.path)).length,
      ),
      0,
    );
    assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
  });
});

test("archive all uses secondary controls and requires cancellable confirmation", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    const archive = panel.getByRole("button", { name: "archive all", exact: true });
    assert.equal(await archive.count(), 1);
    assert.equal(await archive.isDisabled(), true);
    await page.evaluate(() => __edit("Completed"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await archive.waitFor();
    await page.waitForFunction(() => __completed.filter((p) => p === "/summaries").length >= 2);
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
    assert.equal(await archive.isEnabled(), true);
    assert.equal(await archive.getAttribute("data-variant"), "secondary");
    assert.equal(await archive.locator('svg[aria-hidden="true"]').count(), 1);
    assert.ok(
      await archive.evaluate((node) =>
        node.parentElement.nextElementSibling.textContent.includes("new change"),
      ),
    );
    await panel.locator('input[aria-label="Search changes"]').fill("no match");
    assert.equal(await archive.isEnabled(), true);
    await archive.click();
    const dialog = panel.getByRole("dialog", { name: "Archive all completed changes?" });
    await dialog.waitFor();
    assert.ok(
      await dialog.evaluate(
        (node) => node.getBoundingClientRect().right <= 320 && node.scrollWidth <= node.clientWidth,
      ),
    );
    assert.equal(
      await dialog
        .getByRole("button", { name: "cancel", exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await dialog
        .getByRole("button", { name: "start archiving", exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    assert.match(await dialog.textContent(), /new session.*sends a prompt/s);
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => ["start-session", "prompt"].includes(r.path)).length,
      ),
      0,
    );
    await dialog.getByRole("button", { name: "cancel", exact: true }).click();
    assert.equal(await archive.evaluate((node) => node === document.activeElement), true);
    await archive.click();
    await dialog.getByRole("button", { name: "start archiving", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0);
    assert.equal(
      await page.evaluate(
        () => __requests.filter((r) => ["start-session", "prompt"].includes(r.path)).length,
      ),
      0,
    );
    assert.ok(await panel.locator("body").evaluate((node) => node.scrollWidth <= 320));
  });
});

async function readyArchive(page, url) {
  await page.goto(url);
  const panel = page.frameLocator("iframe");
  await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
  await page.evaluate(() => __edit("Completed"));
  await panel.getByRole("button", { name: "refresh", exact: true }).click();
  await page.waitForFunction(() => __completed.filter((p) => p === "/summaries").length >= 2);
  return panel;
}

async function confirmArchive(panel) {
  await panel.getByRole("button", { name: "archive all", exact: true }).click();
  await panel
    .getByRole("dialog", { name: "Archive all completed changes?" })
    .getByRole("button", { name: "start archiving", exact: true })
    .click();
}

test("archive all submits one completed-only prompt and preserves rail/page fresh-chat drafts", async () => {
  await withPanel(async (browser, url) => {
    for (const surface of ["panel", "page"]) {
      const page = await browser.newPage();
      const panel = await readyArchive(page, url);
      await page.evaluate((surface) => {
        __surface(surface);
        __session(null);
      }, surface);
      const before = await page.evaluate(() => __requests.length);
      await confirmArchive(panel);
      await page.waitForFunction(() => __requests.some((r) => r.path === "start-session"));
      assert.equal(
        await page.evaluate(() => __requests.filter((r) => r.path === "start-session").length),
        1,
      );
      const requests = await page.evaluate((before) => __requests.slice(before), before);
      assert.deepEqual(
        requests.filter((r) => r.path !== "toast").map((r) => r.path),
        ["start-session"],
      );
      const launch = requests.find((r) => r.path === "start-session");
      assert.equal(launch.directory, directory);
      assert.equal(launch.body.navigation, "preserve");
      assert.equal(launch.body.worktree, undefined);
      assert.equal(launch.body.projectId, undefined);
      assert.equal(launch.body.providerId, "openspec-board");
      assert.deepEqual(launch.body.data, { kind: "archive-all" });
      assert.ok(launch.body.text.length < 16000);
      assert.equal(
        launch.body.text,
        `Archive all completed OpenSpec changes in this session's project/worktree.

Run openspec list --json for a fresh active-change listing and resolve its OpenSpec planning context, honouring declared stores and the selected CLI root. Inspect each change with openspec status --change "<name>" --json and current CLI-reported task counts. Only changes with every applicable planning artefact done or explicitly skipped, a positive task total, and all tasks complete qualify. Skip unfinished, zero-task, unavailable or unreadable changes. Never use an incomplete-work warning override or infer successful verification from a Complete card or task counts.

Use your skill tool to load and invoke the openspec-archive-change skill for each qualifying named change sequentially. Recheck completion before each archive and assess spec sync against the current main specs after any preceding archive. Preserve the skill's prerequisites, sync assessment, user choices and blockers; ask its required questions rather than treating this bulk request as permission to bypass them. Do not implement unfinished work or automatically resolve blockers.

Report archived, skipped and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that outcome.`,
      );
      assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
      assert.equal(await panel.locator(".board-shell").isVisible(), true);
      await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
      assert.match(
        await page.evaluate(() => __requests.find((r) => r.path === "toast").body.message),
        /submitted/,
      );
      await page.close();
    }
  });
});

test("archive all submits the selection-preserving bulk prompt when configured", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => {
      __workflows(["bulk-archive"]);
      __edit("Completed");
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await confirmArchive(panel);
    await page.waitForFunction(() => __requests.some((r) => r.path === "start-session"));
    const prompt = await page.evaluate(
      () => __requests.find((r) => r.path === "start-session").body.text,
    );
    assert.equal(
      prompt,
      `Archive all completed OpenSpec changes in this session's project/worktree.

Use your skill tool to load and invoke the openspec-bulk-archive-change skill. Before its selection step, run openspec list --json and openspec status --change "<name>" --json for each change. A change qualifies only when every applicable planning artefact is done or explicitly skipped and it has a positive task total with all tasks complete. When the skill asks which changes to archive, offer only qualifying changes and recommend all of them. Skip any selected change that does not qualify; never use an incomplete-work override or infer verification from task counts.

Preserve the skill's spec-sync assessment, user choices and blockers. Report archived, skipped and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that outcome.`,
    );
  });
});

test("archive all disables loading and absent contexts and invalidates old confirmations", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    const panel = await readyArchive(page, url);
    const archive = panel.getByRole("button", { name: "archive all", exact: true });
    await page.evaluate(() => __holdListing());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    assert.equal(await archive.isDisabled(), true);
    await page.evaluate(() => __releaseListing());
    await page.waitForFunction(() => __completed.filter((p) => p === "/summaries").length >= 3);
    await archive.click();
    await page.evaluate(() => __root("replacement-root"));
    await panel.locator("dialog[open]").evaluate(() => {
      // Refresh remains possible through controller callbacks while a modal is open.
      document.querySelector(".refresh-control button").click();
    });
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/changes").length >= 4);
    await panel.locator("dialog[open]").waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "start-session").length),
      0,
    );
    await page.evaluate(() => __directory(null));
    await page.waitForTimeout(30);
    assert.equal(await archive.isDisabled(), true);
  });
});

test("archive all holds one launch and discards late feedback without refresh or replay", async () => {
  await withPanel(async (browser, url) => {
    for (const replacement of ["session", "directory", "root", "dispose"]) {
      const page = await browser.newPage();
      const panel = await readyArchive(page, url);
      await page.evaluate(() => __holdStart());
      await confirmArchive(panel);
      const archive = panel.getByRole("button", { name: "archive all", exact: true });
      assert.equal(await archive.isDisabled(), true);
      const reads = await page.evaluate(
        () => __requests.filter((r) => r.path.startsWith("/")).length,
      );
      await page.waitForFunction(() => __requests.some((r) => r.path === "start-session"));
      await archive.evaluate((node) => node.click());
      assert.equal(
        await page.evaluate(() => __requests.filter((r) => r.path === "start-session").length),
        1,
      );
      if (replacement === "session") await page.evaluate(() => __session("other-session"));
      if (replacement === "directory") await page.evaluate(() => __directory("/tmp/other-project"));
      if (replacement === "root") {
        await page.evaluate(() => __root("other-root"));
        await panel.getByRole("button", { name: "refresh", exact: true }).click();
        await page.waitForFunction(
          () => __requests.filter((r) => r.path === "/changes").length >= 4,
        );
      }
      if (replacement === "dispose")
        await panel.locator("body").evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await page.evaluate(() => __releaseStart());
      if (replacement === "session")
        await panel
          .getByRole("button", { name: "archive all", exact: true, disabled: false })
          .waitFor();
      await page.waitForTimeout(50);
      assert.equal(
        await page.evaluate(() => __requests.filter((r) => r.path === "start-session").length),
        1,
      );
      assert.equal(
        await page.evaluate(() => __requests.filter((r) => r.path === "toast").length),
        0,
      );
      assert.equal(await page.evaluate(() => __draft()), "Earlier draft");
      if (replacement === "session") {
        assert.equal(
          await page.evaluate(() => __requests.filter((r) => r.path.startsWith("/")).length),
          reads,
        );
        assert.equal(await archive.isEnabled(), true);
      }
      await page.close();
    }
  });
});

test("archive all reports partial and uncertain launches without automatic retry", async () => {
  await withPanel(async (browser, url) => {
    const cases = [
      {
        sent: "sent",
        linked: false,
        match: /submitted.*reference could not be saved/,
        kind: "info",
      },
      ...["no-model", "failed", "skipped"].map((sent) => ({
        sent,
        linked: false,
        match: /archive-session.*not submitted successfully/,
        kind: "error",
      })),
      { error: "NOT_GRANTED", match: /launch failed.*Launch refused/, kind: "error" },
      {
        error: "HOST_TIMEOUT",
        match: /uncertain.*may already exist.*Inspect sessions/,
        kind: "error",
        persistent: true,
      },
      {
        error: "DISCONNECTED",
        match: /uncertain.*may already exist/,
        kind: "error",
        persistent: true,
      },
      { nullSession: true, match: /could not be created.*Inspect sessions/, kind: "error" },
    ];
    for (const entry of cases) {
      const page = await browser.newPage();
      const panel = await readyArchive(page, url);
      await page.evaluate((entry) => {
        if (entry.error) __startError(entry.error);
        else
          __startResult(
            entry.nullSession
              ? {
                  sessionId: null,
                  sent: "skipped",
                  directory: "/tmp/fixture-project",
                  worktree: { directory: "/tmp/worktree", branch: "test" },
                  failure: "session-create-failed",
                }
              : { sessionId: "archive-session", sent: entry.sent, linked: entry.linked },
          );
      }, entry);
      await confirmArchive(panel);
      await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
      const toast = await page.evaluate(() => __requests.find((r) => r.path === "toast").body);
      assert.match(toast.message, entry.match);
      assert.equal(toast.kind, entry.kind);
      if (entry.persistent) assert.equal(toast.persistent, true);
      assert.equal(
        await page.evaluate(
          () =>
            __requests.filter((r) => ["start-session", "prompt", "compose"].includes(r.path))
              .length,
        ),
        1,
      );
      assert.equal(await panel.locator(".board-shell").isVisible(), true);
      await page.close();
    }
  });
});

test("Markdown panel links use SDK feedback and unchanged DOM survives sibling reads and themes", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    await page.evaluate(() => {
      __holdFiles();
      __holdTasks();
      __document(
        "proposal.md",
        "# Proposal\n\n[Web](https://example.com/)\n\n```mermaid\nflowchart LR\n A --> B --> C --> D" +
          " --> E".repeat(80) +
          "\n```",
      );
      __goal("first-change", "# Literal goal");
    });
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
    await panel.getByRole("button", { name: "first-change", exact: true }).click();
    await panel.locator(".document-content pre code").waitFor();
    await panel.locator(".document-content").evaluate((node) => {
      window.retainedCode = node.querySelector("pre code");
      window.retainedHeading = node.querySelector("h1");
      node.querySelector("a").focus();
      node.querySelector("pre").scrollLeft = 30;
    });
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 4);
    await page.evaluate(() => {
      __releaseFile();
      __releaseFile();
      __releaseFile();
      __releaseFile();
      __theme("light");
    });
    await page.waitForFunction(
      () => __completed.filter((path) => path === "/document").length === 4,
    );
    assert.ok(
      await panel
        .locator(".document-content")
        .evaluate(
          (node) =>
            node.querySelector("pre code") === retainedCode &&
            node.querySelector("h1") === retainedHeading &&
            node.querySelector("a") === document.activeElement &&
            node.querySelector("pre").scrollLeft === 30,
        ),
    );
    assert.equal(await panel.locator(".goal").textContent(), "# Literal goal");
    assert.equal(await panel.locator(".goal h1").count(), 0);
    const reads = await page.evaluate(
      () => __requests.filter((r) => r.path === "/document").length,
    );
    await panel.getByRole("link", { name: "Web" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "open-url"));
    await page.evaluate(() => __failOpenUrl());
    await panel.getByRole("link", { name: "Web" }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "toast"));
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/document").length),
      reads,
    );
    assert.equal(
      await panel.locator("body").evaluate((node) => node.scrollWidth <= innerWidth),
      true,
    );
  });
});

test("custom Markdown extensions are case insensitive and plain outputs remain literal", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
    for (const selector of ["CHECKLIST.MD", "checklist.MarkDown", "checklist.txt"]) {
      await page.evaluate((selector) => {
        __customSelector(selector);
        __document(selector, "# Custom heading\n\n- [x] Read only");
      }, selector);
      await panel.getByRole("button", { name: "refresh", exact: true }).click();
      await panel.getByRole("button", { name: "first-change", exact: true }).click();
      await panel.getByRole("tab", { name: /checklist/ }).click();
      await panel.getByText("Custom heading", { exact: false }).waitFor();
      assert.equal(
        await panel.locator(".document-content h1").count(),
        selector.endsWith("txt") ? 0 : 1,
      );
      await panel.getByRole("tab", { name: /Tasks/ }).click();
      await panel.getByText("1.1 CLI description").waitFor();
      assert.equal(await panel.locator(".task-row h1").count(), 0);
      await panel.getByRole("button", { name: "Back to changes" }).click();
    }
  });
});

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
        return areas.top >= title.bottom;
      }),
      "detail areas sit below the title on a wide layout",
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
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 4);
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
    assert.equal(requests.filter((path) => path === "/workflows").length, 1);
    assert.equal(requests.filter((path) => path === "/summaries").length, 1);
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
      () => __requests.filter((request) => request.path === "/summaries").length >= 6,
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
      "/workflows",
      "/summaries",
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
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 4);
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
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 8);
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
    assert.equal(await panel.locator(".toolbar .heading-actions button").count(), 4);
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
    await page.waitForFunction(() => __requests.some((r) => r.path === "/document"));
    await page.evaluate(() => __releaseFile());
    await panel.getByText("First version of proposal").waitFor();
    assert.equal(
      await panel
        .locator(
          ".detail-content .document-status:visible, .detail-content .document-issue:visible",
        )
        .count(),
      0,
    );
    assert.equal(await panel.locator(".document-content p:visible").count(), 1);
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
      await panel.getByLabel("Change name", { exact: true }).fill("created-change");
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
      await page.waitForFunction(() => __requests.some((item) => item.path === "/create"));
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
    await panel.getByRole("main").waitFor();
    assert.equal(await panel.getByRole("main").count(), 1);
    await panel.getByRole("button", { name: "new change" }).click();
    const dialog = panel.getByRole("dialog", { name: "New change" });
    await dialog.getByRole("heading", { name: "New change" }).waitFor({ timeout: 5000 });
    await dialog.getByRole("button", { name: "cancel", exact: true }).click();
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel.getByRole("tab", { name: /Specs/ }).click();
    assert.equal(await panel.getByRole("main").count(), 1);
    assert.equal(await panel.locator(".detail-content details .document-content").count(), 3);
    assert.equal(await panel.locator("[id=document-content]").count(), 0);
    assert.equal(
      await panel.getByRole("tabpanel").and(panel.locator("[aria-labelledby]")).count(),
      1,
    );
    await page.close();
  });
});

test("numeric-prefixed names are created and shown on the board", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "new change" }).click();
    await panel.getByLabel("Change name", { exact: true }).fill("100-add-feature");
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
    await panel.getByLabel("Change name", { exact: true }).fill("created-change");
    await panel.getByLabel("Goal").fill("Test creation");
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "created-change" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/workflows").length),
      1,
    );
    await panel
      .locator(".change-card")
      .filter({ hasText: "created-change" })
      .getByRole("button", { name: "apply" })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __requests.some((request) => request.path === "compose"));
    const prompt = await page.evaluate(
      () => __requests.find((request) => request.path === "compose")?.body,
    );
    assert.match(
      prompt.text,
      /^Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "created-change"\.\n\nComplete all remaining tasks/,
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
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(
      () => __requests.some((request) => request.path === "compose"),
      null,
      { timeout: 3000 },
    );
    const result = await page.evaluate(() => ({
      draft: __draft(),
      requests: __requests.filter((r) => ["compose", "prompt", "start-session"].includes(r.path)),
    }));
    assert.match(
      result.draft,
      /^Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "first-change"\.\n1 of 2 tasks complete\./,
    );
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

test("preparing an unsent draft saves the tracked change for the open session", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const startedAt = Date.now();
    await page.evaluate(() =>
      __seedStorage([
        ["session-change:fixture-session", { changes: ["second-change"], savedAt: 0 }],
      ]),
    );
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "toast" && r.body.kind === "success"),
    );
    await page.waitForFunction(
      () => __stored()["session-change:fixture-session"]?.savedAt > 0,
      null,
      { timeout: 3000 },
    );
    const { stored, draft, requests } = await page.evaluate(() => ({
      stored: __stored(),
      draft: __draft(),
      requests: __requests.map((r) => r.path),
    }));
    const saved = stored["session-change:fixture-session"];
    assert.deepEqual(stored, {
      "session-change:fixture-session": {
        changes: ["second-change", "first-change"],
        savedAt: saved?.savedAt,
      },
    });
    assert.ok(Number.isInteger(saved.savedAt) && saved.savedAt >= startedAt);
    assert.match(draft, /openspec-apply-change.*"first-change"/);
    assert.equal(
      requests.some((path) => path === "prompt" || path === "start-session"),
      false,
    );
    await page.close();
  });
});

for (const scenario of ["fresh chat", "rejected composition", "replaced context"]) {
  test(`${scenario} does not save a tracked change`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(url);
      const panel = page.frameLocator("iframe");
      const action = panel
        .locator(".change-card")
        .filter({ hasText: "first-change" })
        .getByRole("button", { name: "apply", exact: true });
      await action.waitFor();
      await page.evaluate((scenario) => {
        if (scenario === "fresh chat") __session(null);
        if (scenario === "rejected composition") __failCompose();
        if (scenario === "replaced context") __holdCompose();
      }, scenario);
      if (scenario === "fresh chat") {
        await page.evaluate(() => __theme("light"));
        await panel.locator('html[data-oc-theme="light"]').waitFor();
      }
      await action.click();
      await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
      await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));

      if (scenario === "replaced context") {
        await page.evaluate(() => {
          __directory("/tmp/other-project");
          __releaseCompose();
        });
        await panel.getByRole("heading", { name: "other-project" }).waitFor();
      } else {
        await page.waitForFunction(
          (kind) => __requests.some((r) => r.path === "toast" && r.body.kind === kind),
          scenario === "fresh chat" ? "success" : "error",
        );
      }
      assert.deepEqual(await page.evaluate(() => __stored()), {});
      assert.equal(await page.evaluate(() => __requests.some((r) => r.path === "storage")), false);
      await page.close();
    });
  });
}

test("a tracked change storage failure leaves composition successful", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await page.evaluate(() => __failStorage());
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __requests.some((r) => r.path === "storage"), null, {
      timeout: 3000,
    });
    await page.waitForFunction(() =>
      __requests.some((r) => r.path === "toast" && r.body.kind === "success"),
    );
    assert.match(await page.evaluate(() => __draft()), /openspec-apply-change.*"first-change"/);
    assert.equal(
      await page.evaluate(() =>
        __requests.some((r) => r.path === "toast" && r.body.kind === "error"),
      ),
      false,
    );
    await page.close();
  });
});

test("saving a tracked change prunes the 100 oldest choices at 1,900 keys", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    const entries = Array.from({ length: 1900 }, (_, index) => [
      `session-change:seed-${String(index).padStart(4, "0")}`,
      { changes: ["seed-change"], savedAt: 1900 - index },
    ]);
    const unrelated = ["other-preference", { savedAt: 0 }];
    await page.evaluate((entries) => __seedStorage(entries), [...entries, unrelated]);
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() => __stored()["session-change:fixture-session"], null, {
      // Pruning takes about 160 sequential storage round trips.
      timeout: 30_000,
    });
    const stored = await page.evaluate(() => __stored());
    assert.deepEqual(stored["session-change:fixture-session"].changes, ["first-change"]);
    delete stored["session-change:fixture-session"];
    assert.deepEqual(stored, Object.fromEntries([...entries.slice(0, 1800), unrelated]));
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
      .getByRole("button", { name: "apply", exact: true });
    await action.waitFor();
    await page.evaluate(() => __failCompose());
    await action.click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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
      .getByRole("button", { name: "apply", exact: true })
      .click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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
      .getByRole("button", { name: "apply", exact: true });
    await action.waitFor();

    await page.evaluate(() => __holdCompose());
    await action.click();
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
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

test("core planning, ready and complete actions prepare the appropriate unsent composer text", async () => {
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
    await panel.getByRole("menuitem", { name: "Prepare in current chat", exact: true }).click();
    await page.waitForFunction(() =>
      __draft().startsWith(
        'Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "second-change".',
      ),
    );
    assert.match(await page.evaluate(() => __draft()), /Complete all remaining tasks/);
    assert.doesNotMatch(await page.evaluate(() => __draft()), /tasks complete\./);
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    await page.evaluate(() => __edit("new text"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Complete 1" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "archive", exact: true })
      .click();
    await page.waitForFunction(() => __draft().includes("openspec-archive-change"));
    assert.equal(
      await page.evaluate(() => __draft()),
      'Use your skill tool to load and invoke the openspec-archive-change skill for OpenSpec change "first-change".',
    );
    assert.doesNotMatch(await page.evaluate(() => __draft()), /\/tmp\/fixture-project/);
    await page.evaluate(() => __readiness("pending"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "Planning 2" }).waitFor();
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "propose" })
      .click();
    await page.waitForFunction(() => __draft().includes("openspec-propose"));
    assert.match(
      await page.evaluate(() => __draft()),
      /^Use your skill tool to load and invoke the openspec-propose skill for OpenSpec change "first-change" \(existing change\)\.\nGoal: Read the proposal\n\nInspect/,
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
          `Use your skill tool to load and invoke the openspec-propose skill for OpenSpec change "first-change" (existing change).${goal?.trim() ? `\nGoal: ${goal}` : ""}\n\n`,
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
              // Saving a new tracked list may inspect session metadata.
              .filter(({ path }) => !["toast", "storage", "workspace-read"].includes(path))
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
        await page.waitForFunction(() => __draft().includes("openspec-explore"));
        assert.match(await page.evaluate(() => __draft()), /first-change.*Read the proposal/s);
        assert.match(
          await page.evaluate(() => __draft()),
          /^Use your skill tool to load and invoke the openspec-explore skill for OpenSpec change "first-change"\.\nGoal: Read the proposal\n\nInvestigate/,
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
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
    await card.getByRole("button", { name: "explore" }).click();
    await page.waitForFunction(() => __draft().includes('"first-change".\n\n'));
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

test("board header keeps Help, Refresh, Archive all and New change in order at both widths", async () => {
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
        ["OpenSpec quickstart", "refresh", "archive all", "new change"],
      );
      assert.deepEqual(
        await actions.evaluateAll((buttons) => buttons.map((button) => button.dataset.variant)),
        ["ghost", "ghost", "secondary", "default"],
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
    await panel.getByRole("button", { name: "first-change", exact: true }).waitFor();
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
          tabsTop: rect(".board-tabs").top,
          tabsBottom: rect(".board-tabs").bottom,
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
      assert.ok(layout.tabsTop >= layout.headerBottom);
      assert.equal(layout.bodyTop - layout.tabsBottom, 24);
      assert.equal(layout.boardTop - layout.tabsBottom, 24);
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
      __workflows(["verify"]);
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
      await page.waitForFunction(() => __requests.some((item) => item.path === "/delete"));
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
    await page.waitForFunction(() => __completed.filter((p) => p === "/summaries").length === 2);
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/workflows").length),
      1,
    );
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
      () => __requests.filter((item) => item.path === "/summaries").length >= 2,
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
    await panel.getByRole("button", { name: "first-change" }).click();
    await panel
      .getByRole("region", { name: "Recorded objective" })
      .getByText("Recreated goal")
      .waitFor();
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

test("completed board and detail offer Verify only when configured", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(url);
    const panel = page.frameLocator("iframe");
    await panel.getByRole("button", { name: "first-change" }).waitFor();
    await page.evaluate(() => __edit("new text"));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    const card = panel.locator(".change-card").filter({ hasText: "first-change" });
    await card.getByRole("button", { name: "archive", exact: true }).waitFor();
    assert.equal(await card.getByRole("button", { name: "verify", exact: true }).count(), 0);
    await card.getByRole("button", { name: "first-change", exact: true }).click();
    const footer = panel.locator(".detail-footer");
    await footer.getByRole("button", { name: "archive", exact: true }).waitFor();
    assert.equal(await footer.getByRole("button", { name: "verify", exact: true }).count(), 0);
    await panel.getByRole("button", { name: "Back to changes" }).click();
    await page.evaluate(() => __workflows(["verify"]));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await card.getByRole("button", { name: "verify", exact: true }).waitFor({ timeout: 3000 });
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
    await page.waitForFunction(() => __draft().includes("openspec-archive-change"));
    assert.equal(
      await page.evaluate(() => __draft()),
      'Use your skill tool to load and invoke the openspec-archive-change skill for OpenSpec change "first-change".',
    );
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
    await page.waitForFunction(() => __draft().includes("openspec-verify-change"));
    assert.equal(
      await page.evaluate(() => __draft()),
      'Use your skill tool to load and invoke the openspec-verify-change skill for OpenSpec change "first-change".',
    );
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

for (const [label, workflows, skill] of [
  ["ff", ["continue", "ff"], "openspec-ff-change"],
  ["continue", ["continue"], "openspec-continue-change"],
  ["propose", ["propose"], "openspec-propose"],
]) {
  test(`board and detail Planning primary prepare ${label} for the configured workflows`, async () => {
    await withPanel(async (browser, url) => {
      const page = await browser.newPage();
      await page.goto(`${url}?hold-ready`);
      const panel = page.frameLocator("iframe");
      await page.waitForFunction(() => typeof window.__releaseReady === "function");
      await page.evaluate((configured) => {
        __workflows(configured);
        __readiness("pending");
        __releaseReady();
      }, workflows);
      const card = panel.locator(".change-card").filter({ hasText: "first-change" });
      await card.getByRole("button", { name: label, exact: true }).click({ timeout: 3000 });
      await card.getByRole("button", { name: "first-change", exact: true }).click();
      await panel
        .locator(".detail-footer")
        .getByRole("button", { name: label, exact: true })
        .click({ timeout: 3000 });
      await page.waitForFunction(() => __requests.filter((r) => r.path === "compose").length === 2);
      const prompts = await page.evaluate(() =>
        __requests.filter((r) => r.path === "compose").map(({ body }) => body),
      );
      for (const prompt of prompts) {
        assert.equal(prompt.mode, "replace");
        assert.ok(
          prompt.text.startsWith(
            `Use your skill tool to load and invoke the ${skill} skill for OpenSpec change "first-change"`,
          ),
          prompt.text,
        );
        assert.match(prompt.text, /Goal: Read the proposal/);
      }
    });
  });
}

test("a previously rendered Planning card keeps its captured ff intent after refresh", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(`${url}?hold-ready`);
    const panel = page.frameLocator("iframe");
    await page.waitForFunction(() => typeof window.__releaseReady === "function");
    await page.evaluate(() => {
      __workflows(["ff"]);
      __readiness("pending");
      __releaseReady();
    });
    await panel
      .locator(".change-card")
      .filter({ hasText: "first-change" })
      .getByRole("button", { name: "ff", exact: true })
      .evaluate(
        (button) => {
          window.previousPrimary = button;
        },
        undefined,
        { timeout: 3000 },
      );
    await panel.getByRole("searchbox", { name: "Search changes" }).fill("second-change");
    await page.evaluate(() => __workflows(["continue"]));
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await panel
      .locator(".change-card")
      .filter({ hasText: "second-change" })
      .getByRole("button", { name: "continue", exact: true })
      .waitFor({ timeout: 3000 });
    await panel.locator("html").evaluate(() => window.previousPrimary.click());
    await page.waitForFunction(() => __requests.some((r) => r.path === "compose"));
    assert.match(await page.evaluate(() => __draft()), /openspec-ff-change.*"first-change"/);
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
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/summaries").length >= 3);
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
      () => __requests.filter((item) => item.path === "/summaries").length >= 2,
    );
    await panel.getByRole("button", { name: "first-change" }).click();
    const proposal = panel.getByRole("tab", { name: /Proposal · Written/ });
    await proposal.focus();
    await page.waitForFunction(
      () =>
        __requests.some((item) => item.path === "/tasks") &&
        __requests.some((item) => item.path === "/document"),
    );
    await page.waitForFunction(() => __requests.filter((r) => r.path === "/document").length >= 4);
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
      const listed = await page.evaluate(
        () => __requests.filter((r) => r.path === "/changes").length,
      );
      await refresh.click();
      await refresh.locator(".oc-sdk-spinner-ring").waitFor();
      await page.waitForFunction(
        (n) => __requests.filter((r) => r.path === "/changes").length > n,
        listed,
      );
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

test("focused Retry keeps keyboard focus when a held batch retains a per-change failure", async () => {
  await withPanel(async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url + "?fail-summary");
    const panel = page.frameLocator("iframe");
    const notice = panel.getByText(/first-change could not be read/);
    await notice.waitFor();
    await page.evaluate(() => __holdSummaries());
    await panel.getByRole("button", { name: "refresh", exact: true }).click();
    await page.waitForFunction(
      () => __requests.filter((item) => item.path === "/summaries").length === 2,
    );
    const retry = panel.locator(".board-notices").getByRole("button", { name: "Retry" });
    await retry.focus();
    await page.evaluate(() => {
      __failSummary();
      __releaseSummaries();
    });
    await page.waitForFunction(
      () => __completed.filter((path) => path === "/summaries").length === 2,
    );
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
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
        .getByRole("button", { name: "apply", exact: true })
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
      await panel
        .getByRole("tablist", { name: "Planning artefacts" })
        .evaluate((node) => node.scrollWidth > node.clientWidth),
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
    await page.waitForFunction(() => __completed.filter((p) => p === "/summaries").length >= 2);
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
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
      .locator(".document-content")
      .getByText(/Long document line/)
      .first()
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
    await panel
      .locator(".detail")
      .getByRole("button", { name: "refresh", exact: true })
      .locator(".oc-sdk-spinner-ring")
      .waitFor({ state: "detached" });
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
    await frame.locator('html[data-oc-theme="light"]').waitFor();
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
    await panel.getByLabel("Change name", { exact: true }).fill("observed-change");
    await panel.getByLabel("Goal").fill("Observe before retry");
    await panel.getByRole("button", { name: "create", exact: true }).click();
    await panel.getByRole("button", { name: "Inspect change" }).click();
    await panel.locator(".detail").getByRole("heading", { name: "observed-change" }).waitFor();
    assert.equal(
      await page.evaluate(() => __requests.filter((r) => r.path === "/workflows").length),
      1,
    );
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
      { directory, expectedRoot: root, expectedPlanning: "fixture-planning" },
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
      await panel.getByLabel("Change name", { exact: true }).fill(`created-${reply}`);
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
    await panel.getByLabel("Change name", { exact: true }).fill("uncertain-change");
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
    assert.equal(
      await panel.getByLabel("Change name", { exact: true }).inputValue(),
      "uncertain-change",
    );
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
    await panel.getByLabel("Change name", { exact: true }).fill("not-created");
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
    await panel.getByLabel("Change name", { exact: true }).fill("known-rejected");
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
    await panel.getByLabel("Change name", { exact: true }).fill("observed-while-loading");
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
    await panel.getByLabel("Change name", { exact: true }).fill("observed-after-switch");
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
    await page.waitForFunction(() =>
      __requests.some((item) => item.path === "/changes" && item.body.expectedRoot),
    );
    assert.deepEqual(
      await page.evaluate(() =>
        __requests.filter((item) => item.path === "/changes" && item.body.expectedRoot),
      ),
      [
        {
          path: "/changes",
          body: { directory, expectedRoot: root, expectedPlanning: "fixture-planning" },
        },
      ],
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
      await page.waitForFunction(
        () => __requests.filter((item) => item.path === "/changes").length >= 2,
      );
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
    await panel.getByRole("button", { name: "refresh", exact: true, disabled: false }).waitFor();
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
