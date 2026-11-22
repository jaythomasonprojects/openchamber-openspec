"use strict";
(() => {
  // node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

  // node_modules/@openchamber/sdk/dist/scrollbar-style.js
  var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
  var GUEST_SCROLLBAR_CSS = `
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
  function installGuestScrollbarActivity(doc) {
    const root2 = doc.documentElement;
    if (root2.hasAttribute("data-oc-scrollbar-activity"))
      return;
    root2.setAttribute("data-oc-scrollbar-activity", "");
    const timers = /* @__PURE__ */ new WeakMap();
    doc.addEventListener("scroll", (event) => {
      const target = event.target === doc ? root2 : event.target;
      if (!(target instanceof Element))
        return;
      if (!target.hasAttribute("data-oc-scrolling"))
        target.setAttribute("data-oc-scrolling", "");
      const pending = timers.get(target);
      if (pending !== void 0)
        clearTimeout(pending);
      timers.set(target, setTimeout(() => {
        timers.delete(target);
        target.removeAttribute("data-oc-scrolling");
      }, 1e3));
    }, { capture: true, passive: true });
  }
  var GUEST_SCROLLBAR_SCRIPT = `(${installGuestScrollbarActivity.toString()})(document);`;

  // node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // node_modules/@openchamber/sdk/dist/shells.js
  var GUEST_SHELL_ID_MAX = 128;
  var GUEST_SHELL_OUTPUT_TAIL_MAX = 65536;

  // node_modules/@openchamber/sdk/dist/microphone.js
  var GUEST_MICROPHONE_SAMPLE_RATE_MIN = 8e3;
  var GUEST_MICROPHONE_SAMPLE_RATE_MAX = 192e3;
  var GUEST_MICROPHONE_OPEN_TIMEOUT_MS = 12e4;
  var createSampleQueue = (capacity) => {
    const chunks = [];
    let offset = 0;
    let queued2 = 0;
    return {
      push: (samples) => {
        chunks.push(samples);
        queued2 += samples.length;
        while (queued2 - offset > capacity && chunks.length > 1) {
          const dropped = chunks.shift();
          queued2 -= dropped?.length ?? 0;
          offset = 0;
        }
      },
      pull: (out) => {
        let written = 0;
        while (written < out.length && chunks.length > 0) {
          const head = chunks[0];
          const count2 = Math.min(out.length - written, head.length - offset);
          out.set(head.subarray(offset, offset + count2), written);
          written += count2;
          offset += count2;
          if (offset >= head.length) {
            chunks.shift();
            queued2 -= head.length;
            offset = 0;
          }
        }
        out.fill(0, written);
      },
      clear: () => {
        chunks.length = 0;
        offset = 0;
        queued2 = 0;
      },
      get size() {
        return queued2 - offset;
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/status-controls.js
  var GUEST_STATUS_CONTROLS_MAX = 4;
  var GUEST_STATUS_CONTROL_ID = /^[a-z][a-z0-9-]{0,39}$/;
  var GUEST_STATUS_CONTROL_LABEL_MAX = 60;
  var GUEST_STATUS_CONTROL_OPTIONS_MAX = 16;
  var GUEST_STATUS_CONTROL_VALUE_MAX = 80;
  var isControlObject = (value) => Object(value) === value && !Array.isArray(value);
  var hasOnlyKeys = (value, keys) => Object.keys(value).every((key2) => keys.includes(key2));
  var isLabel = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_LABEL_MAX;
  var isValue = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_VALUE_MAX;
  var isGuestStatusControls = (controls2) => {
    if (!Array.isArray(controls2) || controls2.length > GUEST_STATUS_CONTROLS_MAX)
      return false;
    const ids = /* @__PURE__ */ new Set();
    for (const control of controls2) {
      if (!isControlObject(control) || !GUEST_STATUS_CONTROL_ID.test(control.id) || !isLabel(control.label))
        return false;
      if (control.disabled !== void 0 && control.disabled !== true && control.disabled !== false)
        return false;
      if (ids.has(control.id))
        return false;
      ids.add(control.id);
      if (control.kind === "button") {
        if (!hasOnlyKeys(control, ["kind", "id", "label", "disabled"]))
          return false;
        continue;
      }
      if (control.kind !== "select" || !hasOnlyKeys(control, ["kind", "id", "label", "value", "options", "disabled"]))
        return false;
      if (!isValue(control.value) || !Array.isArray(control.options) || control.options.length < 1 || control.options.length > GUEST_STATUS_CONTROL_OPTIONS_MAX)
        return false;
      const values = /* @__PURE__ */ new Set();
      for (const option of control.options) {
        if (!isControlObject(option) || !hasOnlyKeys(option, ["value", "label"]) || !isValue(option.value) || !isLabel(option.label) || values.has(option.value))
          return false;
        values.add(option.value);
      }
      if (!values.has(control.value))
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/manifest.js
  var GUEST_PROVIDER_LOGO_BYTES_MAX = 1024 * 1024;
  var TRACKER_URL_TOKENS = ["{id}", "{segment}", "{segments+}"];
  var TRACKER_URL_TOKEN_SET = new Set(TRACKER_URL_TOKENS);

  // node_modules/@openchamber/sdk/dist/session-events.js
  var GUEST_SESSION_EVENT_TYPES = [
    "turn-finished",
    "turn-failed",
    "permission-asked",
    "question-asked",
    "turn-started",
    "session-created",
    "session-archived",
    "session-deleted"
  ];
  var SESSION_EVENTS_IDLE_MS = 10 * 6e4;
  var EVENT_TYPES = new Set(GUEST_SESSION_EVENT_TYPES);

  // node_modules/@openchamber/sdk/dist/service-host.js
  var SERVICE_SCHEDULE_IDLE_MS = 10 * 6e4;
  var MENTIONS_IDLE_MS = 10 * 6e4;

  // node_modules/@openchamber/sdk/dist/file-editor.js
  var GUEST_FILE_EDITOR_CONTENT_MAX = 2e7;
  var GUEST_FILE_EDITOR_VERSION_MAX = 256;
  var fileEditorPayloadSize = (value) => "bytes" in value ? value.bytes.byteLength : value.content.length;
  var sameFileEditorDocument = (left, right) => {
    if (left.path !== right.path || left.readOnly !== right.readOnly)
      return false;
    if (left.encoding === "text" || right.encoding === "text") {
      return left.encoding === "text" && right.encoding === "text" && left.content === right.content;
    }
    if (left.bytes.byteLength !== right.bytes.byteLength)
      return false;
    for (let index = 0; index < left.bytes.byteLength; index += 1) {
      if (left.bytes[index] !== right.bytes[index])
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/popover.js
  var GUEST_POPOVER_ID = /^[A-Za-z0-9_-]{1,80}$/;
  var GUEST_POPOVER_COORDINATE_MAX = 1e5;
  var GUEST_POPOVER_WIDTH_MIN = 160;
  var GUEST_POPOVER_WIDTH_MAX = 640;
  var GUEST_POPOVER_HEIGHT_MIN = 48;
  var GUEST_POPOVER_HEIGHT_MAX = 480;
  var GUEST_POPOVER_DATA_MAX = 16e3;
  var GUEST_POPOVER_DATA_DEPTH_MAX = 32;
  var GUEST_POPOVER_SIDES = ["left", "right", "top", "bottom"];
  var hasBoundedJsonTree = (value, depth = 0, budget = { remaining: GUEST_POPOVER_DATA_MAX }) => {
    if (--budget.remaining < 0 || depth >= GUEST_POPOVER_DATA_DEPTH_MAX)
      return false;
    if (value === null)
      return true;
    const children = Array.isArray(value) ? value : Object(value) === value ? Object.values(value) : [];
    for (const item of children) {
      if (!hasBoundedJsonTree(item, depth + 1, budget))
        return false;
    }
    return true;
  };
  var isFiniteJson = (value) => {
    if (value === null || value === true || value === false)
      return true;
    if (Array.isArray(value))
      return Object.keys(value).every((key2) => /^(0|[1-9]\d*)$/.test(key2) && Number(key2) < value.length) && value.every(isFiniteJson);
    if (Object(value) === value) {
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype) && Object.values(value).every(isFiniteJson);
    }
    return String(value) === value || Number.isFinite(value);
  };
  var isGuestPopoverRequest = (request) => {
    try {
      if (String(request.id) !== request.id || !GUEST_POPOVER_ID.test(request.id) || !Number.isFinite(request.anchor.x) || Math.abs(request.anchor.x) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.y) || Math.abs(request.anchor.y) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.width) || !Number.isFinite(request.anchor.height) || request.anchor.width <= 0 || request.anchor.height <= 0 || request.anchor.width > GUEST_POPOVER_COORDINATE_MAX || request.anchor.height > GUEST_POPOVER_COORDINATE_MAX || !Number.isInteger(request.width) || request.width < GUEST_POPOVER_WIDTH_MIN || request.width > GUEST_POPOVER_WIDTH_MAX || !Number.isInteger(request.height) || request.height < GUEST_POPOVER_HEIGHT_MIN || request.height > GUEST_POPOVER_HEIGHT_MAX || request.side !== void 0 && !GUEST_POPOVER_SIDES.includes(request.side) || request.focus !== void 0 && request.focus !== true && request.focus !== false || !hasBoundedJsonTree(request.data) || !isFiniteJson(request.data))
        return false;
      return JSON.stringify(request.data).length <= GUEST_POPOVER_DATA_MAX;
    } catch {
      return false;
    }
  };

  // node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_BLOCK_ANSWER_MAX = 2e3;
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
  var GUEST_COMMIT_SHA = /^[0-9a-f]{7,64}$/i;
  var isGuestCommitSha = (value) => GUEST_COMMIT_SHA.test(value);
  var GUEST_TOAST_MAX = 500;
  var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
  var GUEST_COMPOSE_TEXT_MAX = 16e3;
  var GUEST_ATTACH_ID_MAX = 128;
  var GUEST_ATTACH_TITLE_MAX = 200;
  var GUEST_ATTACH_URL_MAX = 2e3;
  var GUEST_ATTACH_TEXT_MAX = 16e3;
  var GUEST_ATTACH_AUTHOR_MAX = 80;
  var GUEST_ATTACH_BRANCH_MAX = 200;
  var GUEST_ATTACH_DATA_MAX = 16e3;
  var GUEST_REQUEST_PATH_MAX = 2e3;
  var GUEST_REQUEST_TIMEOUT_MS = 2e4;
  var GUEST_FILE_PATH_MAX = 1024;
  var GUEST_FILE_CONTENT_MAX = 2e6;
  var GUEST_GENERATE_PROMPT_MAX = 64e3;
  var GUEST_GENERATE_SYSTEM_MAX = 8e3;
  var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
  var GUEST_GENERATE_TIMEOUT_MS = 96e4;
  var GUEST_GENERATE_LATE_KEEP_MS = 60 * 6e4;
  var GUEST_BADGE_MAX = 999;
  var GUEST_FRAME_HEIGHT_MAX = 1e4;
  var GUEST_RESOLVE_ERROR_MAX = 500;
  var HOST_REQUEST_ERROR_CODES = [
    "HOST_UNAVAILABLE",
    "HOST_TIMEOUT",
    "HOST_REJECTED",
    "DISCONNECTED",
    "DISABLED",
    "BAD_PATH",
    "NO_INTEGRATION",
    "NO_SERVICE",
    "SERVICE_FAILED",
    "REQUEST_FAILED",
    "RESPONSE_TOO_LARGE",
    "NO_SESSION",
    "SESSION_BUSY",
    "NOT_GRANTED",
    "NO_DIRECTORY",
    "NOT_FOUND",
    "FILE_TOO_LARGE",
    "DENIED",
    "NO_MODEL",
    "MODEL_FAILED",
    "UNSUPPORTED"
  ];
  var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
  var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
  var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
  var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
  var isJsonValue = (value) => {
    if (value === void 0)
      return false;
    if (value === null || value === true || value === false)
      return true;
    if (String(value) === value)
      return true;
    if (Number(value) === value)
      return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(isJsonValue);
    if (Object(value) === value)
      return Object.values(value).every(isJsonValue);
    return false;
  };
  var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= GUEST_ATTACH_DATA_MAX;
  var clampBranch = (value) => value?.trim().slice(0, GUEST_ATTACH_BRANCH_MAX) ?? "";
  var clampAttachRequest = (request) => {
    const id = request.id.trim().slice(0, GUEST_ATTACH_ID_MAX);
    const title = request.title.trim().slice(0, GUEST_ATTACH_TITLE_MAX);
    const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
    const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text) {
      next.text = text;
    }
    if (author) {
      next.author = author;
    }
    if (kind === "pull") {
      const head = clampBranch(request.branches?.head);
      const base = clampBranch(request.branches?.base);
      if (head && base) {
        next.branches = { head, base };
      }
    }
    if (isAttachData(request.data)) {
      next.data = request.data;
    }
    return next;
  };
  var clampStartSessionRequest = (request) => {
    const next = clampAttachRequest(request);
    if (request.projectId)
      next.projectId = request.projectId;
    if (request.navigation)
      next.navigation = request.navigation;
    if (request.worktree) {
      next.worktree = request.worktree;
    }
    return next;
  };
  var clampPromptRequest = (request) => {
    const next = {
      text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX)
    };
    if (request.send) {
      next.send = true;
    }
    return next;
  };
  var clampBadgeCount = (count2) => {
    if (count2 === null || !Number.isFinite(count2))
      return null;
    return Math.min(GUEST_BADGE_MAX, Math.max(0, Math.round(count2)));
  };
  var clampFrameHeight = (height) => {
    if (!Number.isFinite(height))
      return 0;
    return Math.min(GUEST_FRAME_HEIGHT_MAX, Math.max(0, Math.ceil(height)));
  };
  var isGuestFilePath = (value) => value.length > 0 && value.length <= GUEST_FILE_PATH_MAX && !value.includes("\0") && !value.includes("\\");
  var isGuestRequestPath = (value) => {
    if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) {
      return false;
    }
    if (value.length > GUEST_REQUEST_PATH_MAX) {
      return false;
    }
    const segments = value.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  };
  var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
  var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
  var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
  var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
  var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
  var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
  var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
  var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
  var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
  var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
    "workspace",
    "shells",
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action",
    "service-event",
    "status-control-event",
    "popover-closed",
    "file-open",
    "file-snapshot",
    "file-saved",
    "generate-late",
    "microphone-audio",
    "microphone-ended"
  ]);
  var asWireRecord = (data) => Object(data) === data ? data : null;
  var isNonEmptyString = (value) => String(value) === value && value.length > 0;
  var readResultMessage = (wire) => {
    if (!isNonEmptyString(wire.id))
      return null;
    if (wire.ok === true) {
      const message = {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: true
      };
      if (Object(wire.payload) === wire.payload) {
        message.payload = wire.payload;
      }
      return message;
    }
    if (wire.ok === false && isNonEmptyString(wire.error)) {
      return {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: false,
        error: wire.error,
        code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
      };
    }
    return null;
  };
  var readHostMessage = (data) => {
    const wire = asWireRecord(data);
    if (!wire || wire.channel !== OPENCHAMBER_SDK_CHANNEL || wire.v !== OPENCHAMBER_SDK_API_VERSION)
      return null;
    if (wire.type === "result")
      return readResultMessage(wire);
    if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload)
      return null;
    return wire;
  };

  // node_modules/@openchamber/sdk/dist/host.js
  var isKeyEvent = (event) => "key" in event && "metaKey" in event && "ctrlKey" in event;
  var isSaveShortcut = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
  var HostRequestError = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "HostRequestError";
      this.code = code;
    }
  };
  var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", 'Request path must start with "/" and stay on the declared origin.'));
  var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
  var deviceStorageScope = (options2) => {
    if (options2 === void 0)
      return void 0;
    if (Object(options2) !== options2 || Array.isArray(options2) || options2.scope !== void 0 && options2.scope !== "instance" && options2.scope !== "device") {
      throw new HostRequestError("HOST_REJECTED", 'Storage scope must be "instance" or "device".');
    }
    return options2.scope === "device" ? "device" : void 0;
  };
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options2 = {}) => {
    const target = options2.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options2.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options2.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    const blockListeners = /* @__PURE__ */ new Set();
    const serviceEventListeners = /* @__PURE__ */ new Set();
    const statusControlListeners = /* @__PURE__ */ new Set();
    const popoverClosedListeners = /* @__PURE__ */ new Set();
    const lateGenerateListeners = /* @__PURE__ */ new Set();
    const unclaimedLateGenerate = [];
    let resolveHandler = null;
    let actionHandler = null;
    const fileOpenListeners = /* @__PURE__ */ new Set();
    const fileSavedListeners = /* @__PURE__ */ new Set();
    let fileSnapshotHandler = null;
    let lastFile = null;
    let saveShortcutInstalled = false;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    const shellsListeners = /* @__PURE__ */ new Map();
    let disposed2 = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
    let popoverPointerActive = false;
    let popoverFocusActive = false;
    let popoverActivityReported = null;
    let microphone = null;
    const lifecycleFromSession = (session) => {
      if (!session)
        return null;
      return {
        sessionId: session.id,
        phase: session.busy ? "started" : "completed"
      };
    };
    const post = (message) => {
      target.parent.postMessage(message, "*");
    };
    const listenForLateGenerate = () => {
      if (disposed2 || target.parent === target || lateGenerateListeners.size === 0 || lastReady?.features?.lateGenerateResults !== true)
        return;
      post({ channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION, type: "generate-late-listen" });
    };
    const emit = (listeners, value) => {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const onMessage = (event) => {
      if (!(event instanceof MessageEvent))
        return;
      if (!acceptSource(event.source))
        return;
      const message = readHostMessage(event.data);
      if (!message)
        return;
      if (message.type === "workspace") {
        const listener = workspaceListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "shells") {
        const listener = shellsListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "microphone-audio") {
        microphone?.queue.push(message.payload.samples);
        return;
      }
      if (message.type === "microphone-ended") {
        const open = microphone;
        if (!open)
          return;
        microphone = null;
        open.release();
        emit(open.endedListeners, message.payload.reason);
        return;
      }
      if (message.type === "ready") {
        lastReady = message.payload;
        lastLifecycle = lifecycleFromSession(message.payload.session);
        emit(readyListeners, message.payload);
        emit(directoryListeners, message.payload.directory);
        emit(sessionListeners, message.payload.session);
        if (lastLifecycle) {
          emit(lifecycleListeners, lastLifecycle);
        }
        emit(connectionListeners, message.payload.connection);
        emit(settingsListeners, message.payload.settings);
        emit(itemListeners, message.payload.item);
        if (message.payload.block)
          emit(blockListeners, message.payload.block);
        listenForLateGenerate();
        return;
      }
      if (message.type === "service-event") {
        emit(serviceEventListeners, message.payload);
        return;
      }
      if (message.type === "generate-late") {
        if (lateGenerateListeners.size === 0)
          unclaimedLateGenerate.push(message.payload);
        else
          emit(lateGenerateListeners, message.payload);
        return;
      }
      if (message.type === "directory") {
        if (lastReady) {
          lastReady = { ...lastReady, directory: message.payload.directory };
        }
        emit(directoryListeners, message.payload.directory);
        return;
      }
      if (message.type === "session") {
        if (lastReady) {
          lastReady = { ...lastReady, session: message.payload.session };
        }
        if (!message.payload.session) {
          lastLifecycle = null;
        } else if (lastLifecycle?.sessionId !== message.payload.session.id) {
          lastLifecycle = lifecycleFromSession(message.payload.session);
        }
        emit(sessionListeners, message.payload.session);
        return;
      }
      if (message.type === "session-lifecycle") {
        lastLifecycle = message.payload;
        emit(lifecycleListeners, message.payload);
        return;
      }
      if (message.type === "connection") {
        if (lastReady) {
          lastReady = { ...lastReady, connection: message.payload.connection };
        }
        emit(connectionListeners, message.payload.connection);
        return;
      }
      if (message.type === "settings") {
        if (lastReady) {
          lastReady = { ...lastReady, settings: message.payload.settings };
        }
        emit(settingsListeners, message.payload.settings);
        return;
      }
      if (message.type === "item") {
        if (lastReady) {
          lastReady = { ...lastReady, item: message.payload.item };
        }
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "status-control-event") {
        emit(statusControlListeners, message.payload);
        return;
      }
      if (message.type === "popover-closed") {
        emit(popoverClosedListeners, message.payload);
        return;
      }
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed2)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "action-result",
              id: message.id,
              payload
            });
        };
        const handler = actionHandler;
        if (!handler) {
          answer({ ok: false, error: "This extension does not handle background actions." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      if (message.type === "file-open") {
        const next = message.payload;
        if (lastFile && sameFileEditorDocument(lastFile, next))
          return;
        lastFile = next;
        emit(fileOpenListeners, message.payload);
        return;
      }
      if (message.type === "file-saved") {
        emit(fileSavedListeners, message.payload.version);
        return;
      }
      if (message.type === "file-snapshot") {
        const answer = (payload) => {
          if (!disposed2)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "file-snapshot-result",
              id: message.id,
              payload
            });
        };
        const fail = (text) => answer({ error: (text.trim() || "Could not read the edited file.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        const handler = fileSnapshotHandler;
        if (!handler) {
          fail("This extension does not edit files.");
          return;
        }
        Promise.resolve().then(() => handler(message.payload.purpose)).then((snapshot) => {
          if (fileEditorPayloadSize(snapshot) > GUEST_FILE_EDITOR_CONTENT_MAX) {
            fail(`The file is over ${GUEST_FILE_EDITOR_CONTENT_MAX} ${"bytes" in snapshot ? "bytes" : "characters"}.`);
            return;
          }
          if (snapshot.version.length > GUEST_FILE_EDITOR_VERSION_MAX) {
            fail(`The snapshot version is over ${GUEST_FILE_EDITOR_VERSION_MAX} characters.`);
            return;
          }
          answer({ snapshot: "bytes" in snapshot ? { bytes: snapshot.bytes, version: snapshot.version } : { content: snapshot.content, version: snapshot.version } });
        }, (error) => fail(error instanceof Error ? error.message : String(error)));
        return;
      }
      if (message.type === "resolve") {
        const answer = (payload) => {
          post({
            channel: OPENCHAMBER_SDK_CHANNEL,
            v: OPENCHAMBER_SDK_API_VERSION,
            type: "resolve-result",
            id: message.id,
            payload
          });
        };
        const handler = resolveHandler;
        if (!handler) {
          answer({ error: "This extension does not resolve commands." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      const waiter = pending.get(message.id);
      if (!waiter)
        return;
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.ok) {
        waiter.resolve(message.payload);
        return;
      }
      waiter.reject(new HostRequestError(message.code, message.error));
    };
    target.addEventListener("message", onMessage);
    post({
      channel: OPENCHAMBER_SDK_CHANNEL,
      v: OPENCHAMBER_SDK_API_VERSION,
      type: "hello"
    });
    const send = (message, timeoutMs = requestTimeoutMs) => {
      if (disposed2 || target.parent === target) {
        return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(message.id);
          reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
        }, timeoutMs);
        pending.set(message.id, { resolve, reject, timer });
        post(message);
      });
    };
    const request = (message) => send(message).then(() => void 0);
    const envelope = { channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION };
    const notify = (message) => {
      if (!disposed2 && target.parent !== target)
        post(message);
    };
    const requestFileSave = () => notify({ ...envelope, type: "file-save" });
    const postMicrophoneClose = () => {
      if (!disposed2 && target.parent !== target)
        post({ ...envelope, type: "microphone-close", id: nextId(ids) });
    };
    const openMicrophone = async () => {
      if (microphone)
        throw new HostRequestError("HOST_REJECTED", "The microphone is already open in this frame.");
      if (lastReady?.features?.microphone !== true) {
        throw new HostRequestError("UNSUPPORTED", "This OpenChamber cannot share the microphone with extensions.");
      }
      const AudioContextCtor = globalThis.AudioContext;
      if (typeof AudioContextCtor !== "function")
        throw new HostRequestError("UNSUPPORTED", "This frame has no Web Audio.");
      const context = new AudioContextCtor();
      if (context.sampleRate < GUEST_MICROPHONE_SAMPLE_RATE_MIN || context.sampleRate > GUEST_MICROPHONE_SAMPLE_RATE_MAX) {
        void context.close().catch(() => void 0);
        throw new HostRequestError("UNSUPPORTED", `Audio at ${context.sampleRate} Hz is not supported.`);
      }
      const resumed = context.state === "suspended" ? context.resume().catch(() => void 0) : void 0;
      const queue = createSampleQueue(Math.round(context.sampleRate / 4));
      const processor = context.createScriptProcessor(1024, 1, 1);
      processor.onaudioprocess = (event) => queue.pull(event.outputBuffer.getChannelData(0));
      const destination = context.createMediaStreamDestination();
      processor.connect(destination);
      const endedListeners = /* @__PURE__ */ new Set();
      const open = {
        queue,
        endedListeners,
        release: () => {
          processor.onaudioprocess = null;
          processor.disconnect();
          queue.clear();
          for (const track of destination.stream.getTracks())
            track.stop();
          void context.close().catch(() => void 0);
        }
      };
      microphone = open;
      try {
        const result = await send({ ...envelope, type: "microphone-open", id: nextId(ids), payload: { sampleRate: context.sampleRate } }, GUEST_MICROPHONE_OPEN_TIMEOUT_MS);
        if (!result || !("opened" in result) || result.opened !== true) {
          throw new HostRequestError("HOST_REJECTED", "Host did not open the microphone.");
        }
        await resumed;
        if (microphone !== open)
          throw new HostRequestError("DISCONNECTED", "The microphone closed while it was opening.");
      } catch (error) {
        if (microphone === open)
          microphone = null;
        open.release();
        postMicrophoneClose();
        throw error;
      }
      return {
        stream: destination.stream,
        close: () => {
          if (microphone !== open)
            return;
          microphone = null;
          open.release();
          postMicrophoneClose();
        },
        onEnded: (listener) => {
          endedListeners.add(listener);
          return () => {
            endedListeners.delete(listener);
          };
        }
      };
    };
    const onSaveShortcut = (event) => {
      if (!isKeyEvent(event) || !isSaveShortcut(event))
        return;
      event.preventDefault();
      requestFileSave();
    };
    const onPopoverEscape = (event) => {
      if (!isKeyEvent(event) || event.key !== "Escape" || lastReady?.surface !== "popover" || !lastReady.popover)
        return;
      event.preventDefault();
      void closePopover(lastReady.popover.id, "escape").catch(() => void 0);
    };
    const reportPopoverActivity = () => {
      const popover = lastReady?.surface === "popover" ? lastReady.popover : void 0;
      if (!popover)
        return;
      const active2 = popoverPointerActive || popoverFocusActive;
      if (popoverActivityReported === active2)
        return;
      popoverActivityReported = active2;
      void setPopoverAnchorActive(popover.id, active2).catch(() => void 0);
    };
    const onPopoverPointerOver = () => {
      if (lastReady?.surface !== "popover" || popoverPointerActive)
        return;
      popoverPointerActive = true;
      reportPopoverActivity();
    };
    const onPopoverPointerOut = (event) => {
      if (lastReady?.surface !== "popover" || event.relatedTarget !== null || !popoverPointerActive)
        return;
      popoverPointerActive = false;
      reportPopoverActivity();
    };
    const onPopoverFocus = () => {
      if (lastReady?.surface !== "popover" || popoverFocusActive)
        return;
      popoverFocusActive = true;
      reportPopoverActivity();
    };
    const onPopoverBlur = () => {
      if (lastReady?.surface !== "popover" || !popoverFocusActive)
        return;
      popoverFocusActive = false;
      reportPopoverActivity();
    };
    const requireIdentity = (value, maximum = 1024) => {
      if (!value.trim() || value.length > maximum)
        throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
    };
    const readWorkspace = async (query) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const result = await send({ ...envelope, type: "workspace-read", id: nextId(ids), payload: query });
      if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) {
        throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
      }
      return result;
    };
    const subscribeWorkspace = async (query, listener) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const subscriptionId = nextId(ids);
      workspaceListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "workspace-subscribe", id: nextId(ids), payload: { subscriptionId, query } });
      } catch (error) {
        workspaceListeners.delete(subscriptionId);
        if (!disposed2)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed2)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const subscribeShells = async (scope, listener) => {
      if (scope.kind === "session")
        requireIdentity(scope.sessionId);
      if (scope.kind === "project")
        requireIdentity(scope.projectId);
      const subscriptionId = nextId(ids);
      shellsListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "shells-subscribe", id: nextId(ids), payload: { subscriptionId, scope } });
      } catch (error) {
        shellsListeners.delete(subscriptionId);
        if (!disposed2)
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!shellsListeners.delete(subscriptionId) || disposed2)
          return;
        post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const storage = async (payload) => {
      if ("key" in payload && (payload.key.length === 0 || payload.key.length > GUEST_STORAGE_KEY_MAX)) {
        throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
      }
      if (payload.op === "set" && !isJsonValue(payload.value)) {
        throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
      }
      if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > GUEST_STORAGE_VALUE_BYTES) {
        throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
      }
      if (payload.scope === "device" && lastReady?.features?.deviceStorage !== true) {
        throw new HostRequestError("UNSUPPORTED", "This host does not support device storage.");
      }
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
    const closePopover = (id, reason) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-close", id: nextId(ids), payload: reason ? { id, reason } : { id } });
    const setPopoverAnchorActive = (id, active2) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-anchor", id: nextId(ids), payload: { id, active: active2 } });
    target.addEventListener("keydown", onPopoverEscape, true);
    target.addEventListener("pointerover", onPopoverPointerOver);
    target.addEventListener("pointermove", onPopoverPointerOver);
    target.addEventListener("pointerout", onPopoverPointerOut);
    target.addEventListener("focus", onPopoverFocus);
    target.addEventListener("blur", onPopoverBlur);
    return {
      onAction: (handler) => {
        actionHandler = handler;
        return () => {
          if (actionHandler === handler)
            actionHandler = null;
        };
      },
      listProjects: async () => {
        const result = await readWorkspace({ kind: "projects" });
        if (result.kind !== "projects")
          throw new HostRequestError("HOST_REJECTED", "Expected projects.");
        return result;
      },
      listWorktrees: async (projectId) => {
        const result = await readWorkspace({ kind: "worktrees", projectId });
        if (result.kind !== "worktrees")
          throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
        return result;
      },
      listSessions: async (projectId) => {
        const result = await readWorkspace({ kind: "sessions", projectId });
        if (result.kind !== "sessions")
          throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
        return result;
      },
      onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
        if (snapshot.kind === "projects")
          listener(snapshot);
      }),
      onWorktrees: (projectId, listener) => subscribeWorkspace({ kind: "worktrees", projectId }, (snapshot) => {
        if (snapshot.kind === "worktrees")
          listener(snapshot);
      }),
      onSessions: (projectId, listener) => subscribeWorkspace({ kind: "sessions", projectId }, (snapshot) => {
        if (snapshot.kind === "sessions")
          listener(snapshot);
      }),
      onRunningShells: (scope, listener) => subscribeShells(scope, listener),
      readShellOutput: async (shellId, options3) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const cursor = options3?.cursor;
        if (cursor !== void 0 && (!Number.isInteger(cursor) || cursor < 0)) {
          throw new HostRequestError("HOST_REJECTED", "Shell output cursor must be a non-negative integer.");
        }
        const tailBytes = options3?.tailBytes;
        if (tailBytes !== void 0 && (!Number.isInteger(tailBytes) || tailBytes < 1 || tailBytes > GUEST_SHELL_OUTPUT_TAIL_MAX)) {
          throw new HostRequestError("HOST_REJECTED", `Shell output tailBytes must be an integer between 1 and ${GUEST_SHELL_OUTPUT_TAIL_MAX}.`);
        }
        const result = await send({ ...envelope, type: "shell-output", id: nextId(ids), payload: { shellId, cursor, tailBytes } });
        const output = result;
        if (!output || typeof output.output !== "string" || !Number.isFinite(output.cursor)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return shell output.");
        }
        return output;
      },
      stopShell: async (shellId) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const result = await send({ ...envelope, type: "shell-stop", id: nextId(ids), payload: { shellId } });
        if (result?.stopped !== true)
          throw new HostRequestError("HOST_REJECTED", "Host did not stop the shell.");
        return { stopped: true };
      },
      openSession: async (sessionId2) => {
        requireIdentity(sessionId2);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId: sessionId2 } });
      },
      storage: {
        get: async (key2, options3) => {
          const scope = deviceStorageScope(options3);
          const payload = { op: "get", key: key2 };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key2, value, options3) => {
          const scope = deviceStorageScope(options3);
          const payload = { op: "set", key: key2, value };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        delete: async (key2, options3) => {
          const scope = deviceStorageScope(options3);
          const payload = { op: "delete", key: key2 };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        keys: async (options3) => {
          const scope = deviceStorageScope(options3);
          const payload = { op: "keys" };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          if (result.op !== "keys")
            throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
          return result.keys;
        }
      },
      onReady: (listener) => {
        readyListeners.add(listener);
        if (lastReady)
          listener(lastReady);
        return () => {
          readyListeners.delete(listener);
        };
      },
      onDirectory: (listener) => {
        directoryListeners.add(listener);
        if (lastReady)
          listener(lastReady.directory);
        return () => {
          directoryListeners.delete(listener);
        };
      },
      onSession: (listener) => {
        sessionListeners.add(listener);
        if (lastReady)
          listener(lastReady.session);
        return () => {
          sessionListeners.delete(listener);
        };
      },
      onSessionLifecycle: (listener) => {
        lifecycleListeners.add(listener);
        if (lastLifecycle)
          listener(lastLifecycle);
        return () => {
          lifecycleListeners.delete(listener);
        };
      },
      onConnection: (listener) => {
        connectionListeners.add(listener);
        if (lastReady)
          listener(lastReady.connection);
        return () => {
          connectionListeners.delete(listener);
        };
      },
      onSettings: (listener) => {
        settingsListeners.add(listener);
        if (lastReady)
          listener(lastReady.settings);
        return () => {
          settingsListeners.delete(listener);
        };
      },
      onItem: (listener) => {
        itemListeners.add(listener);
        if (lastReady)
          listener(lastReady.item);
        return () => {
          itemListeners.delete(listener);
        };
      },
      onBlock: (listener) => {
        blockListeners.add(listener);
        if (lastReady?.block)
          listener(lastReady.block);
        return () => {
          blockListeners.delete(listener);
        };
      },
      onServiceEvent: (listener) => {
        serviceEventListeners.add(listener);
        return () => {
          serviceEventListeners.delete(listener);
        };
      },
      onStatusControl: (listener) => {
        statusControlListeners.add(listener);
        return () => {
          statusControlListeners.delete(listener);
        };
      },
      onPopoverClosed: (listener) => {
        popoverClosedListeners.add(listener);
        return () => {
          popoverClosedListeners.delete(listener);
        };
      },
      setStatusControls: (controls2) => {
        if (lastReady?.features?.statusControls !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support status controls."));
        }
        if (!isGuestStatusControls(controls2)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Status controls must have unique bounded ids and valid selected options."));
        }
        return request({ ...envelope, type: "status-controls", id: nextId(ids), payload: { controls: controls2 } });
      },
      openPopover: (payload) => {
        if (lastReady?.features?.popovers !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers."));
        }
        if (!isGuestPopoverRequest(payload)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Popover requests need bounded geometry and JSON data."));
        }
        return request({ ...envelope, type: "popover-open", id: nextId(ids), payload });
      },
      closePopover,
      setPopoverAnchorActive,
      onResolve: (handler) => {
        resolveHandler = handler;
        return () => {
          if (resolveHandler === handler)
            resolveHandler = null;
        };
      },
      toast: (payload) => {
        const message = payload.message.trim();
        if (!message || message.length > GUEST_TOAST_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to ${GUEST_TOAST_MAX} characters.`));
        }
        if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > GUEST_CLIPBOARD_TEXT_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
        }
        return request({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "toast",
          id: nextId(ids),
          payload: { ...payload, message }
        });
      },
      openUrl: (url) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-url",
        id: nextId(ids),
        payload: { url }
      }),
      openCommit: (sha) => isGuestCommitSha(sha) ? request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-commit",
        id: nextId(ids),
        payload: { sha }
      }) : Promise.reject(new HostRequestError("HOST_REJECTED", "Commit id must be 7 to 64 hex characters.")),
      answerBlock: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "block-answer",
        id: nextId(ids),
        payload: { text: text.trim().slice(0, GUEST_BLOCK_ANSWER_MAX) }
      }),
      openSurface: (surfaceId) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-surface",
        id: nextId(ids),
        payload: { surfaceId }
      }),
      writeClipboard: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text }
      }),
      compose: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "compose",
        id: nextId(ids),
        payload
      }),
      attach: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "attach",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      startSession: async (payload) => {
        if (payload.projectId !== void 0)
          requireIdentity(payload.projectId);
        const worktree = payload.worktree;
        if (worktree && worktree !== true) {
          if (worktree.kind === "existing")
            requireIdentity(worktree.directory);
          else {
            if (worktree.name !== void 0)
              requireIdentity(worktree.name, 200);
            if (worktree.baseBranch !== void 0)
              requireIdentity(worktree.baseBranch, 200);
          }
        }
        const result = await send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "start-session",
          id: nextId(ids),
          payload: clampStartSessionRequest(payload)
        }, options2.requestTimeoutMs ?? 18e4);
        if (!isStartSessionResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
        }
        return result;
      },
      prompt: (payload) => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "prompt",
        id: nextId(ids),
        payload: clampPromptRequest(payload)
      }).then((result) => {
        if (!isPromptResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
        }
        return result;
      }),
      sessionLink: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "session-link",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      close: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "close",
        id: nextId(ids)
      }),
      oauthStart: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-start",
        id: nextId(ids)
      }),
      oauthDisconnect: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-disconnect",
        id: nextId(ids)
      }),
      request: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
        }
        return result;
      }),
      serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
        }
        return result;
      }),
      serviceStatus: () => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-status",
        id: nextId(ids)
      }).then((result) => {
        if (!isServiceStatusResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
        }
        return result;
      }),
      readFile: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-read",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileReadResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
        }
        return result;
      }),
      writeFile: (path, content2) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content2.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content: content2 }
        }).then((result) => {
          if (!isFileWriteResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
          }
          return result;
        });
      },
      listDir: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-list",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileListResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
        }
        return result;
      }),
      stat: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-stat",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileStatResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
        }
        return result;
      }),
      generate: (input) => {
        const prompt = input.prompt.trim();
        const system = input.system?.trim();
        if (prompt.length === 0 || prompt.length > GUEST_GENERATE_PROMPT_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
        }
        if (system !== void 0 && (system.length === 0 || system.length > GUEST_GENERATE_SYSTEM_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
        }
        const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
        if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
        }
        const payload = { prompt };
        if (system !== void 0)
          payload.system = system;
        if (maxOutputTokens !== void 0)
          payload.maxOutputTokens = maxOutputTokens;
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "generate",
          id: nextId(ids),
          payload
        }, options2.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      onLateGenerateResult: (listener) => {
        lateGenerateListeners.add(listener);
        for (const result of unclaimedLateGenerate.splice(0))
          emit([listener], result);
        listenForLateGenerate();
        return () => {
          lateGenerateListeners.delete(listener);
        };
      },
      openMicrophone,
      setBadge: (count2) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count2) }
      }),
      setHeight: (height) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "resize",
        id: nextId(ids),
        payload: { height: clampFrameHeight(height) }
      }),
      onFileOpen: (listener) => {
        fileOpenListeners.add(listener);
        if (!saveShortcutInstalled) {
          saveShortcutInstalled = true;
          target.addEventListener("keydown", onSaveShortcut, true);
        }
        if (lastFile)
          listener(lastFile);
        return () => {
          fileOpenListeners.delete(listener);
        };
      },
      onFileSnapshot: (handler) => {
        fileSnapshotHandler = handler;
        return () => {
          if (fileSnapshotHandler === handler)
            fileSnapshotHandler = null;
        };
      },
      onFileSaved: (listener) => {
        fileSavedListeners.add(listener);
        return () => {
          fileSavedListeners.delete(listener);
        };
      },
      reportFileChange: (change) => notify({ ...envelope, type: "file-change", payload: { dirty: change.dirty, edited: change.edited } }),
      requestFileSave,
      reportFileUnsupported: () => notify({ ...envelope, type: "file-unsupported" }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        for (const subscriptionId of shellsListeners.keys()) {
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        shellsListeners.clear();
        if (microphone) {
          postMicrophoneClose();
          microphone.release();
          microphone = null;
        }
        disposed2 = true;
        resolveHandler = null;
        actionHandler = null;
        fileSnapshotHandler = null;
        fileOpenListeners.clear();
        fileSavedListeners.clear();
        if (saveShortcutInstalled)
          target.removeEventListener("keydown", onSaveShortcut, true);
        target.removeEventListener("message", onMessage);
        target.removeEventListener("keydown", onPopoverEscape, true);
        target.removeEventListener("pointerover", onPopoverPointerOver);
        target.removeEventListener("pointermove", onPopoverPointerOver);
        target.removeEventListener("pointerout", onPopoverPointerOut);
        target.removeEventListener("focus", onPopoverFocus);
        target.removeEventListener("blur", onPopoverBlur);
        for (const waiter of pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
        }
        pending.clear();
        readyListeners.clear();
        directoryListeners.clear();
        sessionListeners.clear();
        lifecycleListeners.clear();
        connectionListeners.clear();
        settingsListeners.clear();
        itemListeners.clear();
        blockListeners.clear();
        serviceEventListeners.clear();
        statusControlListeners.clear();
        popoverClosedListeners.clear();
        lateGenerateListeners.clear();
        unclaimedLateGenerate.length = 0;
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/service-providers.js
  var BROWSER_CONTROL_ACTIONS = [
    "browser.open",
    "browser.snapshot",
    "browser.click",
    "browser.type",
    "browser.select",
    "browser.scroll",
    "browser.back",
    "browser.forward",
    "browser.inspect",
    "browser.capture",
    "browser.resize",
    "browser.close"
  ];
  var BROWSER_PROVIDER_IDLE_MS = 10 * 6e4;
  var CONTROL_ACTIONS = new Set(BROWSER_CONTROL_ACTIONS);
  var SOURCE_CONTROL_PROVIDER_IDLE_MS = 10 * 6e4;
  var NOTIFICATIONS_PROVIDER_IDLE_MS = 10 * 6e4;
  var TRACKER_PROVIDER_IDLE_MS = 10 * 6e4;
  var QUOTA_PROVIDER_IDLE_MS = 10 * 6e4;

  // node_modules/@openchamber/sdk/dist/service-surface.js
  var SURFACE_CONTROLLERS = ["none", "agent", "user"];
  var CONTROLLERS = new Set(SURFACE_CONTROLLERS);

  // node_modules/@openchamber/sdk/dist/ui/theme.js
  var TOKEN_VARS = [
    ["--oc-bg", "background"],
    ["--oc-elevated", "elevated"],
    ["--oc-fg", "foreground"],
    ["--oc-muted", "muted"],
    ["--oc-subtle", "subtle"],
    ["--oc-border", "border"],
    ["--oc-hover", "hover"],
    ["--oc-selection", "selection"],
    ["--oc-focus", "focus"],
    ["--oc-primary", "primary"],
    ["--oc-muted-surface", "mutedSurface"],
    ["--oc-elevated-fg", "elevatedForeground"],
    ["--oc-active", "active"],
    ["--oc-selection-fg", "selectionForeground"],
    ["--oc-primary-fg", "primaryForeground"],
    ["--oc-primary-text", "primaryText"],
    ["--oc-success-text", "successText"],
    ["--oc-warning-text", "warningText"],
    ["--oc-error-text", "errorText"],
    ["--oc-info-text", "infoText"],
    ["--oc-success", "success"],
    ["--oc-warning", "warning"],
    ["--oc-error", "error"],
    ["--oc-info", "info"],
    ["--oc-font", "font"],
    ["--oc-mono", "mono"],
    ["--oc-radius", "radius"],
    ["--surface-background", "background"],
    ["--surface-elevated", "elevated"],
    ["--surface-foreground", "foreground"],
    ["--surface-muted-foreground", "muted"],
    ["--surface-subtle", "subtle"],
    ["--interactive-border", "border"],
    ["--interactive-hover", "hover"],
    ["--interactive-selection", "selection"],
    ["--interactive-focus-ring", "focus"],
    ["--primary", "primary"],
    ["--surface-muted", "mutedSurface"],
    ["--surface-elevated-foreground", "elevatedForeground"],
    ["--interactive-active", "active"],
    ["--interactive-selection-foreground", "selectionForeground"],
    ["--primary-foreground", "primaryForeground"],
    ["--primary-text", "primaryText"],
    ["--success-text", "successText"],
    ["--warning-text", "warningText"],
    ["--error-text", "errorText"],
    ["--info-text", "infoText"],
    ["--status-success", "success"],
    ["--status-warning", "warning"],
    ["--status-error", "error"],
    ["--status-info", "info"],
    ["--font-sans", "font"],
    ["--font-mono", "mono"],
    ["--radius", "radius"]
  ];
  var SYNTAX_TOKEN_VARS = [
    ["--oc-syntax-keyword", "--syntax-keyword", "syntaxKeyword"],
    ["--oc-syntax-string", "--syntax-string", "syntaxString"],
    ["--oc-syntax-number", "--syntax-number", "syntaxNumber"],
    ["--oc-syntax-function", "--syntax-function", "syntaxFunction"],
    ["--oc-syntax-type", "--syntax-type", "syntaxType"],
    ["--oc-syntax-comment", "--syntax-comment", "syntaxComment"],
    ["--oc-syntax-variable", "--syntax-variable", "syntaxVariable"],
    ["--oc-syntax-operator", "--syntax-operator", "syntaxOperator"]
  ];
  var applyHostTheme = (theme, root2) => {
    root2.style.colorScheme = theme.mode;
    for (const [name, key2] of TOKEN_VARS) {
      root2.style.setProperty(name, theme.tokens[key2]);
    }
    for (const [alias, hostName, key2] of SYNTAX_TOKEN_VARS) {
      const value = theme.tokens[key2] ?? "";
      root2.style.setProperty(alias, value);
      root2.style.setProperty(hostName, value);
    }
    root2.style.setProperty("font-family", theme.tokens.font);
    root2.style.setProperty("font-size", theme.tokens.fontSize ?? "0.875rem");
    root2.style.setProperty("line-height", "1.45");
    root2.style.setProperty("color", theme.tokens.foreground);
  };
  var applyHostReady = (ctx, root2) => {
    applyHostTheme(ctx.theme, root2);
    if (root2.dataset) {
      root2.dataset.ocSurface = ctx.surface;
      root2.dataset.ocTheme = ctx.theme.mode;
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/style.js
  var OC_ALIAS = {
    "surface-background": "bg",
    "surface-elevated": "elevated",
    "surface-elevated-foreground": "elevated-fg",
    "surface-foreground": "fg",
    "surface-muted-foreground": "muted",
    "surface-muted": "muted-surface",
    "surface-subtle": "subtle",
    "interactive-border": "border",
    "interactive-hover": "hover",
    "interactive-active": "active",
    "interactive-selection": "selection",
    "interactive-selection-foreground": "selection-fg",
    "interactive-focus-ring": "focus",
    "primary": "primary",
    "primary-foreground": "primary-fg",
    "primary-text": "primary-text",
    "success-text": "success-text",
    "warning-text": "warning-text",
    "error-text": "error-text",
    "info-text": "info-text",
    "status-success": "success",
    "status-warning": "warning",
    "status-error": "error",
    "status-info": "info",
    "font-sans": "font",
    "font-mono": "mono",
    "radius": "radius"
  };
  var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
  var bg = v("surface-background", "transparent");
  var elevated = v("surface-elevated", "transparent");
  var elevatedFg = v("surface-elevated-foreground", "inherit");
  var fg = v("surface-foreground", "inherit");
  var muted = v("surface-muted-foreground", "gray");
  var secondary = v("surface-muted", "transparent");
  var border = v("interactive-border", "currentColor");
  var hover = v("interactive-hover", "transparent");
  var active = v("interactive-active", "transparent");
  var selection = v("interactive-selection", "transparent");
  var selectionFg = v("interactive-selection-foreground", "inherit");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var controlRadius = `calc(${radius} - 2px)`;
  var smallRadius = `calc(${radius} - 4px)`;
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusFill = `background-image: linear-gradient(${hover}, ${hover});`;
  var field = (edge, width = "0.5px") => `box-shadow: inset 0 0 0 ${width} ${edge}, var(--oc-sdk-field-lift);`;
  var raised = "border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);";
  var litButton = "box-shadow: var(--oc-sdk-lit);";
  var darkLift = `inset 0 0.5px 0 0 ${mix(fg, 8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`;
  var THEME_VARS = `
:root {
  --oc-sdk-edge: ${mix(fg, 16)};
  --oc-sdk-field-bg: ${elevated};
  --oc-sdk-raised-bg: ${bg};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${mix(fg, 14)};
  --oc-sdk-field-bg: ${mix(bg, 50, elevated)};
  --oc-sdk-raised-bg: ${elevated};
  --oc-sdk-field-lift: ${darkLift};
  --oc-sdk-raised-lift: ${darkLift};
  --oc-sdk-lit: ${darkLift};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var len = (px) => `calc(${px}rem / 14)`;
  var UI_SIZE_CSS = `
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: ${len(8)}; height: ${len(32)}; padding: 0 ${len(12)}; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: ${len(6)}; height: ${len(28)}; padding: 0 ${len(10)}; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: ${len(4)}; height: ${len(24)}; padding: 0 ${len(8)}; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: ${len(14)}; height: ${len(14)}; }

.oc-sdk-field { display: flex; flex-direction: column; gap: ${len(4)}; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: ${len(32)}; padding: 0 ${len(10)}; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: ${len(8)} ${len(10)}; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: ${len(34)}; padding-right: ${len(34)}; }
.oc-sdk-search-icon { position: absolute; left: ${len(11)}; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: ${len(6)}; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: ${len(24)}; height: ${len(24)}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: ${len(4)}; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: ${len(6)}; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: ${len(28)}; padding: 0 ${len(10)}; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: ${len(2)}; min-width: ${len(160)}; max-width: calc(100vw - ${len(16)}); max-height: min(${len(320)}, calc(100vh - ${len(16)})); overflow: auto; padding: ${len(4)}; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: ${len(2)} ${len(2)} ${len(4)}; }
.oc-sdk-popup-search .oc-sdk-input { height: ${len(28)}; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: ${len(8)}; width: 100%; padding: ${len(6)} ${len(8)}; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: ${len(14)}; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: ${len(8)}; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: ${len(8)}; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: ${len(14)}; height: ${len(14)}; margin-top: ${len(3)}; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: ${len(36)}; height: ${len(20)}; --oc-sdk-thumb-travel: ${len(16)}; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: ${len(2)}; left: ${len(2)}; width: ${len(16)}; height: ${len(16)}; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: ${len(2)}; padding: ${len(2)}; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: ${len(6)}; height: ${len(28)}; padding: 0 ${len(10)}; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: ${len(1)} ${len(6)}; font-size: ${len(11)}; font-weight: 500; line-height: ${len(16)}; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: ${len(8)}; width: 100%; padding: ${len(6)} ${len(8)}; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: ${len(64)}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: ${len(16)} ${len(8)}; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${len(4)}; padding: ${len(40)} ${len(16)}; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: ${len(12)}; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: ${len(8)}; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: ${len(16)}; height: ${len(16)}; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: ${len(12)}; height: ${len(12)}; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: ${len(12)}; padding: ${len(8)} ${len(12)}; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: ${len(2)}; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: ${len(8)}; width: 100%; margin: ${len(8)} 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: ${len(4)} 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: ${len(4)}; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: ${len(6)}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: ${len(2)}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: ${len(8)} 0; }

/* Under a finger the controls reach the app's touch sizes: rows and options 44px like its sheets, every other
   control at least 36px. Inputs keep 16px text, below which iOS zooms the page on focus. */
@media (pointer: coarse) {
  .oc-sdk-btn, .oc-sdk-input { height: ${len(40)}; }
  .oc-sdk-btn[data-size="sm"], .oc-sdk-btn[data-size="xs"], .oc-sdk-trigger, .oc-sdk-tab, .oc-sdk-popup-search .oc-sdk-input { height: ${len(36)}; }
  .oc-sdk-input, .oc-sdk-popup-search .oc-sdk-input { font-size: max(16px, 0.875rem); }
  .oc-sdk-search-clear { width: ${len(36)}; height: ${len(36)}; right: 0; }
  .oc-sdk-row, .oc-sdk-option { min-height: ${len(44)}; }
  .oc-sdk-check { min-height: ${len(36)}; padding: ${len(8)} 0; }
}
`;
  var GUEST_UI_LOOK_CSS = `${THEME_VARS}
.oc-sdk { color: ${fg}; font-family: ${font}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${focusFill} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { border-radius: ${controlRadius}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${smallRadius}; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; ${litButton} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; ${litButton} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; box-shadow: none; }

.oc-sdk-field-note { color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { border-radius: ${controlRadius}; background: var(--oc-sdk-field-bg); color: ${elevatedFg}; ${field("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${field(mix(fg, 26), "1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${field(v("status-error", "red"), "1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search-icon { color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { border-radius: ${smallRadius}; color: ${muted}; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-trigger { border-radius: ${controlRadius}; background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { color: ${muted}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${elevated}; background-clip: padding-box; color: ${elevatedFg}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option-check { color: ${fg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-hint { color: ${muted}; }
.oc-sdk-popup-empty { color: ${muted}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${border}; border-radius: 4px; color: ${fg}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(fg, 60, border)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(var(--oc-sdk-thumb-travel, 16px)); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusFill} }
.oc-sdk-check-desc { color: ${muted}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${muted}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${elevatedFg}; background: var(--oc-sdk-raised-bg); ${raised} }
.oc-sdk-tab-count { color: ${muted}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${mix(fg, 6)}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { font-family: ${mono}; color: ${muted}; }
.oc-sdk-row-sub { color: ${muted}; }
.oc-sdk-row-meta { color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${muted}; }

.oc-sdk-empty-body { color: ${muted}; }

.oc-sdk-spinner { color: ${muted}; }
.oc-sdk-spinner-ring { border-color: ${border}; border-top-color: ${primary}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${muted}; }

.oc-sdk-separator { color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${mix(border, 40)}; }

.oc-sdk-progress-label { color: ${muted}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${mix(fg, 6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${v("status-success", "currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${v("success-text", "inherit")}; }

.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
${UI_SIZE_CSS}
${GUEST_UI_LOOK_CSS}`;

  // node_modules/@openchamber/sdk/dist/ui/dom.js
  var STYLE_ID = "oc-sdk-ui-style";
  var ensureStyle = (css) => {
    const existing = document.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== css) {
        existing.textContent = css;
      }
      return;
    }
    installGuestScrollbarActivity(document);
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  };
  var el = (tag, className) => {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  };
  var button = (className) => {
    const node = el("button", className);
    node.type = "button";
    return node;
  };
  var setText = (node, text) => {
    const next = text ?? "";
    if (node.textContent !== next) {
      node.textContent = next;
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/button.js
  var ring = () => {
    const spinner = document.createElement("span");
    spinner.className = "oc-sdk-spinner-ring";
    spinner.setAttribute("aria-hidden", "true");
    return spinner;
  };
  var mountButton = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = button("oc-sdk oc-sdk-btn");
    const spinner = ring();
    const label = document.createElement("span");
    node.append(label);
    root2.append(node);
    const paint = () => {
      node.dataset.variant = props.variant ?? "default";
      node.dataset.size = props.size ?? "default";
      node.disabled = Boolean(props.disabled) || Boolean(props.loading);
      node.dataset.loading = props.loading ? "true" : "false";
      node.setAttribute("aria-busy", props.loading ? "true" : "false");
      if (props.loading && spinner.parentNode !== node) {
        node.prepend(spinner);
      } else if (!props.loading && spinner.parentNode === node) {
        spinner.remove();
      }
      setText(label, props.label);
    };
    const onClick = () => {
      if (props.disabled || props.loading) {
        return;
      }
      props.onClick();
    };
    node.addEventListener("click", onClick);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.removeEventListener("click", onClick);
        node.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/popover-anchor.js
  var nextPopoverAnchorId = 0;
  var isKeyboardEvent = (event) => "key" in event;
  var mountPopoverAnchor = (element, options2) => {
    const document2 = element.ownerDocument;
    const window2 = document2.defaultView;
    let timer = null;
    let activeId = null;
    let disposed2 = false;
    let ignoreNextFocus = false;
    let pointerActive = false;
    let focusActive = false;
    let touchPointerDown = false;
    let observer = null;
    const previousExpanded = element.getAttribute("aria-expanded");
    const previousPopup = element.getAttribute("aria-haspopup");
    const previousLabel = element.getAttribute("aria-label");
    const ownsExpanded = previousExpanded === null;
    const clearTimer = () => {
      if (timer !== null)
        clearTimeout(timer);
      timer = null;
    };
    const removeActiveListeners = () => {
      document2.removeEventListener("scroll", closeForAnchor, true);
      document2.removeEventListener("pointerdown", closeForOutside, true);
      window2?.removeEventListener("resize", closeForAnchor);
      observer?.disconnect();
      observer = null;
    };
    const close = (reason = "closed", restoreFocus = false) => {
      const id = activeId;
      clearTimer();
      activeId = null;
      removeActiveListeners();
      element.removeAttribute("data-oc-popover-open");
      if (ownsExpanded)
        element.setAttribute("aria-expanded", "false");
      if (id)
        void options2.host.closePopover(id, reason).catch(() => void 0);
      if (restoreFocus) {
        ignoreNextFocus = true;
        element.focus();
        queueMicrotask(() => {
          ignoreNextFocus = false;
        });
      }
    };
    const closeForAnchor = () => close();
    const closeForOutside = (event) => {
      const target = event.target;
      if (target !== element && !element.contains(target))
        close();
    };
    const watchActive = () => {
      document2.addEventListener("scroll", closeForAnchor, true);
      document2.addEventListener("pointerdown", closeForOutside, true);
      window2?.addEventListener("resize", closeForAnchor);
      observer = new MutationObserver(() => {
        if (!document2.contains(element))
          close();
      });
      observer.observe(document2, { childList: true, subtree: true });
    };
    const reportAnchorActivity = () => {
      if (activeId)
        void options2.host.setPopoverAnchorActive(activeId, pointerActive || focusActive).catch(() => void 0);
    };
    const open = (focus) => {
      clearTimer();
      if (disposed2 || activeId || !element.isConnected)
        return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0)
        return;
      const id = `oc-popover-${++nextPopoverAnchorId}`;
      let data;
      try {
        data = options2.getData();
      } catch {
        return;
      }
      activeId = id;
      element.setAttribute("data-oc-popover-open", "true");
      if (ownsExpanded)
        element.setAttribute("aria-expanded", "true");
      watchActive();
      void options2.host.openPopover({
        id,
        anchor: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        width: options2.width,
        height: options2.height,
        side: options2.side,
        focus,
        data
      }).catch(() => {
        if (activeId === id)
          close();
      });
    };
    const scheduleOpen = () => {
      if (!activeId && !disposed2 && timer === null)
        timer = setTimeout(() => open(false), 250);
    };
    const onPointerEnter = (event) => {
      if ("pointerType" in event && event.pointerType && event.pointerType !== "mouse")
        return;
      pointerActive = true;
      if (activeId)
        reportAnchorActivity();
      else if (!ignoreNextFocus)
        scheduleOpen();
    };
    const onPointerLeave = (event) => {
      if ("pointerType" in event && event.pointerType && event.pointerType !== "mouse")
        return;
      pointerActive = false;
      clearTimer();
      reportAnchorActivity();
    };
    const onPointerDown = (event) => {
      touchPointerDown = "pointerType" in event && typeof event.pointerType === "string" && event.pointerType !== "" && event.pointerType !== "mouse";
    };
    const onPointerCancel = () => {
      touchPointerDown = false;
    };
    const onClick = (event) => {
      const tapped = touchPointerDown;
      touchPointerDown = false;
      if (!tapped || "detail" in event && event.detail === 0)
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (activeId)
        close();
      else
        open(false);
    };
    const onFocus = () => {
      focusActive = true;
      if (activeId)
        reportAnchorActivity();
      else if (!ignoreNextFocus && element.matches(":focus-visible"))
        open(false);
    };
    const onFocusOut = () => {
      focusActive = false;
      reportAnchorActivity();
    };
    const onKeyDown = (event) => {
      if (!isKeyboardEvent(event))
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (activeId)
          close();
        open(true);
      } else if (event.key === "Escape" && activeId) {
        event.preventDefault();
        close("escape", true);
      }
    };
    const unsubscribe = options2.host.onPopoverClosed((event) => {
      if (event.id !== activeId)
        return;
      activeId = null;
      clearTimer();
      removeActiveListeners();
      element.removeAttribute("data-oc-popover-open");
      if (ownsExpanded)
        element.setAttribute("aria-expanded", "false");
      if (event.reason === "escape") {
        ignoreNextFocus = true;
        element.focus();
        queueMicrotask(() => {
          ignoreNextFocus = false;
        });
      }
    });
    element.setAttribute("aria-haspopup", "dialog");
    if (ownsExpanded)
      element.setAttribute("aria-expanded", "false");
    if (options2.label)
      element.setAttribute("aria-label", options2.label);
    element.addEventListener("pointerenter", onPointerEnter);
    element.addEventListener("pointermove", onPointerEnter);
    element.addEventListener("pointerleave", onPointerLeave);
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointercancel", onPointerCancel);
    element.addEventListener("click", onClick, true);
    element.addEventListener("focus", onFocus);
    element.addEventListener("focusout", onFocusOut);
    element.addEventListener("keydown", onKeyDown);
    return { dispose: () => {
      if (disposed2)
        return;
      disposed2 = true;
      clearTimer();
      close();
      unsubscribe();
      element.removeAttribute("data-oc-popover-open");
      if (previousExpanded === null)
        element.removeAttribute("aria-expanded");
      if (previousPopup === null)
        element.removeAttribute("aria-haspopup");
      else
        element.setAttribute("aria-haspopup", previousPopup);
      if (options2.label) {
        if (previousLabel === null)
          element.removeAttribute("aria-label");
        else
          element.setAttribute("aria-label", previousLabel);
      }
      element.removeEventListener("pointerenter", onPointerEnter);
      element.removeEventListener("pointermove", onPointerEnter);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointercancel", onPointerCancel);
      element.removeEventListener("click", onClick, true);
      element.removeEventListener("focus", onFocus);
      element.removeEventListener("focusout", onFocusOut);
      element.removeEventListener("keydown", onKeyDown);
    } };
  };

  // src/model.ts
  function requiredArtifactIds(change) {
    const byId = new Map(change.artifacts.map((artifact) => [artifact.id, artifact]));
    const required = /* @__PURE__ */ new Set();
    const visit = (id) => {
      if (required.has(id)) return;
      required.add(id);
      byId.get(id)?.requires.forEach(visit);
    };
    change.applyRequires.forEach(visit);
    return required;
  }
  function deriveChange(change) {
    const required = requiredArtifactIds(change);
    const applicable = change.artifacts.filter((artifact) => required.has(artifact.id));
    const completedArtifacts = applicable.filter(
      (artifact) => artifact.status === "done" || artifact.status === "skipped"
    ).length;
    const pendingCondition = applicable.some(
      (artifact) => artifact.status !== "done" && artifact.status !== "skipped"
    );
    const stage = pendingCondition ? "planning" : change.totalTasks === 0 || change.completedTasks === 0 ? "ready" : change.completedTasks === change.totalTasks ? "complete" : "progress";
    return {
      ...change,
      stage,
      completedArtifacts,
      totalArtifacts: applicable.length,
      pendingCondition
    };
  }
  function isChangeName(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  }
  function resolveTrackedChanges({
    saved,
    items,
    worktreeName,
    active: active2
  }) {
    if (saved !== null) return { changes: saved.filter((name) => active2.has(name)), source: "saved" };
    for (const { data } of items) {
      if (data && typeof data === "object" && "kind" in data && data.kind === "change" && "change" in data && typeof data.change === "string" && active2.has(data.change))
        return { changes: [data.change], source: "item" };
    }
    const legacy = items.find(({ id, data }) => data === void 0 && active2.has(id));
    if (legacy) return { changes: [legacy.id], source: "item" };
    if (worktreeName !== null && active2.has(worktreeName))
      return { changes: [worktreeName], source: "worktree" };
    return { changes: [], source: "none" };
  }
  function taskWindow(tasks, size = 5) {
    const incomplete = tasks.findIndex((task) => !task.done);
    const current = incomplete === -1 ? tasks.length - 1 : incomplete;
    const start = Math.max(0, Math.min(current - Math.floor(size / 2), tasks.length - size));
    return tasks.slice(start, start + size);
  }

  // src/contracts.ts
  function decodePlanning(value) {
    if (typeof value !== "string" || !value.length || value.length > 4096 || value.includes("\0"))
      throw new Error("Invalid planning identity.");
    return value;
  }
  var documentKey = (artifactId, selector) => JSON.stringify([artifactId, selector]);
  var ALL_WORKFLOWS = [
    "propose",
    "explore",
    "new",
    "continue",
    "apply",
    "update",
    "ff",
    "sync",
    "archive",
    "bulk-archive",
    "verify",
    "onboard"
  ];
  var CORE_WORKFLOWS = ["propose", "explore", "apply", "update", "sync", "archive"];
  function isWorkflow(value) {
    return ALL_WORKFLOWS.some((name) => name === value);
  }
  function record(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data.");
    return value;
  }
  function decodeWorkflows(value) {
    const { workflows: workflows2 } = record(value);
    if (!Array.isArray(workflows2) || !workflows2.every(isWorkflow))
      throw new Error("Invalid workflows.");
    return workflows2;
  }
  function string(value) {
    if (typeof value !== "string" || !value.length) throw new Error("Invalid string.");
    return value;
  }
  function count(value) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid task count.");
    return value;
  }
  function names(value) {
    if (!Array.isArray(value)) throw new Error("Invalid dependency list.");
    return value.map(string);
  }
  function decodeValidation(value) {
    const { valid, issues } = record(value);
    if (typeof valid !== "boolean" || !Array.isArray(issues))
      throw new Error("Invalid validation result.");
    return {
      valid,
      issues: issues.map((value2) => {
        const { level, path, message } = record(value2);
        return { level: string(level), path: string(path), message: string(message) };
      })
    };
  }
  function decodeListingEntry(value, key2 = "id") {
    const item = record(value);
    const id = string(item[key2]);
    if (!isChangeName(id)) throw new Error("Invalid change name.");
    const completedTasks = count(item.completedTasks);
    const totalTasks = count(item.totalTasks);
    if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
    return { id, completedTasks, totalTasks };
  }
  function decodeArchived(value) {
    const { changes } = record(value);
    if (!Array.isArray(changes)) throw new Error("Invalid archived listing.");
    const archived = changes.map((value2) => {
      const item = record(value2);
      const name = string(item.name);
      const completedTasks = count(item.completedTasks);
      const totalTasks = count(item.totalTasks);
      if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
      return { name, completedTasks, totalTasks };
    });
    if (new Set(archived.map(({ name }) => name)).size !== archived.length)
      throw new Error("Duplicate archived change.");
    return archived;
  }
  function decodeSpecs(value) {
    const { specs } = record(value);
    if (!Array.isArray(specs)) throw new Error("Invalid spec listing.");
    const entries = specs.map((value2) => {
      const { id, requirementCount } = record(value2);
      return { id: string(id), requirementCount: count(requirementCount) };
    });
    if (new Set(entries.map(({ id }) => id)).size !== entries.length)
      throw new Error("Duplicate spec.");
    return entries;
  }
  function decodeListing(value) {
    const input = record(value);
    const directory2 = string(input.directory);
    const root2 = string(input.root);
    if (!Array.isArray(input.changes)) throw new Error("Invalid listing.");
    const changes = input.changes.map((item) => decodeListingEntry(item));
    if (new Set(changes.map((item) => item.id)).size !== changes.length)
      throw new Error("Duplicate change.");
    return { directory: directory2, root: root2, planning: decodePlanning(input.planning), changes };
  }
  function decodeArtifacts(value, requires) {
    if (!Array.isArray(value)) throw new Error("Invalid artefacts.");
    const artifacts = value.map((value2) => {
      const item = record(value2);
      const id = string(item.id);
      const status = item.status;
      if (status !== "done" && status !== "skipped" && status !== "ready" && status !== "blocked")
        throw new Error("Invalid artefact status.");
      return { id, status, outputPath: string(item.outputPath), requires: names(item.requires) };
    });
    const byId = new Map(artifacts.map((item) => [item.id, item]));
    if (byId.size !== artifacts.length) throw new Error("Duplicate artefact.");
    const visiting = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    function visit(id) {
      const item = byId.get(id);
      if (!item || visiting.has(id)) throw new Error("Invalid artefact dependency.");
      if (visited.has(id)) return;
      visiting.add(id);
      item.requires.forEach(visit);
      visiting.delete(id);
      visited.add(id);
    }
    artifacts.forEach((item) => visit(item.id));
    names(requires).forEach((id) => {
      if (!byId.has(id)) throw new Error("Invalid apply requirement.");
    });
    return artifacts;
  }
  function decodeSummary(value) {
    const item = record(value);
    const id = string(item.id);
    if (!isChangeName(id)) throw new Error("Invalid change name.");
    if (item.goal !== null && typeof item.goal !== "string") throw new Error("Invalid goal.");
    const artifacts = decodeArtifacts(item.artifacts, item.applyRequires);
    if (!Array.isArray(item.documents)) throw new Error("Invalid documents.");
    const documents = item.documents.map((value2) => {
      const document2 = record(value2);
      const artifactId = string(document2.artifactId);
      if (!artifacts.some((item2) => item2.id === artifactId))
        throw new Error("Unknown document artefact.");
      return { artifactId, selector: string(document2.selector), label: string(document2.label) };
    });
    if (new Set(documents.map((item2) => documentKey(item2.artifactId, item2.selector))).size !== documents.length)
      throw new Error("Duplicate document.");
    return {
      id,
      root: string(item.root),
      goal: item.goal,
      affectedAreas: names(item.affectedAreas),
      artifacts,
      applyRequires: names(item.applyRequires),
      documents
    };
  }
  function decodeTasks(value) {
    if (!Array.isArray(value)) throw new Error("Invalid tasks.");
    const tasks = value.map((value2) => {
      const task = record(value2);
      if (typeof task.done !== "boolean") throw new Error("Invalid task state.");
      return {
        id: string(task.id),
        description: string(task.description),
        done: task.done
      };
    });
    if (new Set(tasks.map((task) => task.id)).size !== tasks.length)
      throw new Error("Duplicate task.");
    return tasks;
  }
  function decodeSummaries(value) {
    const input = record(value);
    const root2 = string(input.root);
    if (!Array.isArray(input.changes)) throw new Error("Invalid summaries.");
    const changes = input.changes.map((value2) => {
      const item = record(value2);
      const id = string(item.id);
      if (!isChangeName(id) || "summary" in item === "error" in item)
        throw new Error("Invalid summary entry.");
      if ("summary" in item) {
        const summary = decodeSummary(item.summary);
        if (summary.id !== id || summary.root !== root2) throw new Error("Invalid summary scope.");
        return { id, summary };
      }
      const error = record(item.error);
      return { id, error: { code: string(error.code), message: string(error.message) } };
    });
    if (new Set(changes.map((entry) => entry.id)).size !== changes.length)
      throw new Error("Duplicate change.");
    return { root: root2, planning: decodePlanning(input.planning), changes };
  }
  function decodeTaskResponse(value) {
    const item = record(value);
    return decodeTasks(item.tasks);
  }

  // src/panel/button-icon.ts
  var paths = {
    refresh: "M20 11a8 8 0 1 1-2.4-5.7M20 4v5h-5",
    create: "M12 5v14M5 12h14",
    copy: "M9 9h11v11H9zM15 9V4H4v11h5",
    archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
    delete: "M4 7h16M10 4h4m4 3-1 13H7L6 7m4 4v5m4-5v5"
  };
  function addButtonIcon(root2, name) {
    root2.classList.add("loading-action");
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
    root2.querySelector("button").prepend(svg);
  }

  // src/panel/client.ts
  var ServiceRequestError = class extends Error {
    constructor(code, message, outcome) {
      super(message);
      this.code = code;
      this.outcome = outcome;
    }
    code;
    outcome;
  };
  function invalid() {
    return new ServiceRequestError(
      "BAD_SERVICE_DATA",
      "The local OpenSpec service returned invalid data."
    );
  }
  function createClient(host2) {
    async function request(path, body) {
      return send({ method: "POST", path, body: JSON.stringify(body) });
    }
    async function send(payload) {
      const result = await host2.serviceRequest(payload);
      let value;
      try {
        value = JSON.parse(result.body);
      } catch {
        throw invalid();
      }
      if (result.status >= 400) {
        const issue = value && typeof value === "object" && "error" in value ? value.error : null;
        if (!issue || typeof issue !== "object" || !("code" in issue) || !("message" in issue) || typeof issue.code !== "string" || typeof issue.message !== "string")
          throw invalid();
        throw new ServiceRequestError(
          issue.code,
          issue.message,
          "outcome" in issue && issue.outcome === "unknown" ? "unknown" : void 0
        );
      }
      return value;
    }
    function decode2(value, decoder) {
      try {
        return decoder(value);
      } catch {
        throw invalid();
      }
    }
    const record2 = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
      return value;
    };
    return {
      archived: async ({ directory: directory2, root: root2, planning }) => decode2(
        await request("/archived", { directory: directory2, expectedRoot: root2, expectedPlanning: planning }),
        decodeArchived
      ),
      specs: async ({ directory: directory2, root: root2, planning }) => decode2(
        await request("/specs", { directory: directory2, expectedRoot: root2, expectedPlanning: planning }),
        decodeSpecs
      ),
      spec: async ({ directory: directory2, root: root2, planning }, spec) => {
        const value = record2(
          await request("/spec", { directory: directory2, expectedRoot: root2, expectedPlanning: planning, spec })
        );
        if (value.id !== spec || typeof value.content !== "string") throw invalid();
        return value.content;
      },
      workflows: async (directory2) => decode2(await request("/workflows", { directory: directory2 }), decodeWorkflows),
      list: async (directory2, expectedRoot, expectedPlanning) => {
        const value = await request("/changes", {
          directory: directory2,
          ...expectedRoot ? { expectedRoot } : {},
          ...expectedPlanning ? { expectedPlanning } : {}
        });
        const listing = decode2(value, decodeListing);
        if (listing.directory !== directory2 || expectedRoot && listing.root !== expectedRoot)
          throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
        if (expectedPlanning && listing.planning !== expectedPlanning)
          throw new ServiceRequestError("PLANNING_CHANGED", "OpenSpec planning target changed.");
        return listing;
      },
      summary: async (scope, change) => {
        const value = decode2(
          await request("/summary", {
            directory: scope.directory,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning,
            change
          }),
          decodeSummary
        );
        if (value.root !== scope.root)
          throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
        if (value.id !== change) throw invalid();
        return value;
      },
      validate: async (scope, change) => decode2(
        await request("/validate", {
          directory: scope.directory,
          expectedRoot: scope.root,
          planning: scope.planning,
          change
        }),
        decodeValidation
      ),
      setFocus: async (directory2, change) => {
        if (record2(await request("/focus", { directory: directory2, change })).ok !== true) throw invalid();
      },
      claimFocus: async (directory2) => {
        const value = await send({ method: "GET", path: "/focus", query: { directory: directory2 } });
        if (value === null) return null;
        const { directory: target, change } = record2(value);
        if (target !== directory2 || typeof change !== "string" || !isChangeName(change))
          throw invalid();
        return change;
      },
      summaries: async (scope, entries) => {
        const value = decode2(
          await request("/summaries", {
            directory: scope.directory,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning
          }),
          decodeSummaries
        );
        if (value.root !== scope.root)
          throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
        if (value.planning !== scope.planning)
          throw new ServiceRequestError("PLANNING_CHANGED", "OpenSpec planning target changed.");
        const byId = new Map(value.changes.map((item) => [item.id, item]));
        return entries.map((entry) => {
          const item = byId.get(entry.id);
          if (!item)
            return {
              id: entry.id,
              error: new ServiceRequestError("CHANGE_UNAVAILABLE", "Change is no longer listed.")
            };
          if ("error" in item)
            return {
              id: entry.id,
              error: new ServiceRequestError(item.error.code, item.error.message)
            };
          return {
            id: entry.id,
            summary: {
              ...item.summary,
              completedTasks: entry.completedTasks,
              totalTasks: entry.totalTasks
            }
          };
        });
      },
      tasks: async (scope, change) => {
        return decode2(
          await request("/tasks", {
            ...scope,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning,
            change
          }),
          decodeTaskResponse
        );
      },
      document: async (scope, change, artifactId, selector) => {
        const value = record2(
          await request("/document", {
            ...scope,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning,
            change,
            artifactId,
            selector
          })
        );
        if (value.artifactId !== artifactId || value.selector !== selector || typeof value.content !== "string")
          throw invalid();
        return value.content;
      },
      create: async (scope, name, goal) => {
        let value;
        try {
          value = record2(
            await request("/create", {
              ...scope,
              expectedRoot: scope.root,
              expectedPlanning: scope.planning,
              name,
              goal
            })
          );
        } catch (caught) {
          if (caught instanceof ServiceRequestError && caught.outcome !== "unknown" && caught.code !== "BAD_SERVICE_DATA" && caught.code !== "CLI_TIMEOUT")
            throw caught;
          throw new ServiceRequestError(
            "CREATE_UNKNOWN",
            "Creation outcome is unknown; check the original project before retrying.",
            "unknown"
          );
        }
        if (value.root !== scope.root || value.change !== name)
          throw new ServiceRequestError(
            "BAD_SERVICE_DATA",
            "Creation outcome is unknown.",
            "unknown"
          );
      },
      delete: async (scope, change) => {
        let value;
        try {
          value = record2(
            await request("/delete", {
              ...scope,
              expectedRoot: scope.root,
              expectedPlanning: scope.planning,
              change
            })
          );
        } catch (caught) {
          if (caught instanceof ServiceRequestError && caught.outcome !== "unknown" && caught.code !== "BAD_SERVICE_DATA")
            throw caught;
          throw new ServiceRequestError(
            "DELETE_UNKNOWN",
            "Deletion outcome is unknown; check the original project before retrying.",
            "unknown"
          );
        }
        if (value.root !== scope.root || value.change !== change)
          throw new ServiceRequestError(
            "DELETE_UNKNOWN",
            "Deletion outcome is unknown; check the original project before retrying.",
            "unknown"
          );
      }
    };
  }

  // src/panel/device.ts
  function applyDevice(device) {
    const { dataset, style } = document.documentElement;
    dataset.pointer = device?.pointer ?? (matchMedia("(pointer: coarse)").matches ? "coarse" : "fine");
    style.setProperty("--oc-inset-bottom", `${device?.insets.bottom ?? 0}px`);
    style.setProperty("--oc-keyboard", `${device?.keyboard ?? 0}px`);
  }

  // src/panel/project.ts
  async function ready(read2, subscribe) {
    const initial = await read2();
    if (initial.state === "ready") return initial;
    if (initial.state === "error")
      throw new Error(
        "Host workspace inspection failed. Inspect worktrees and sessions before trying again."
      );
    let off;
    let settled = false;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          settled = true;
          reject(new Error("Host workspace inspection timed out. No creation was requested."));
        }, 2e4);
        void subscribe((value) => {
          if (value.state === "loading") return;
          settled = true;
          if (value.state === "ready") resolve(value);
          else reject(new Error("Host workspace inspection failed."));
        }).then((unsubscribe) => {
          off = unsubscribe;
          if (settled) off();
        }, reject);
      });
    } finally {
      settled = true;
      clearTimeout(timer);
      off?.();
    }
  }
  async function findProject(host2, directory2) {
    const projects = await ready(
      () => host2.listProjects(),
      (listener) => host2.onProjects(listener)
    );
    const owners = projects.projects.filter((project) => project.directory === directory2);
    if (!owners.length) {
      const mappings = await Promise.all(
        projects.projects.map(async (project) => ({
          project,
          trees: await ready(
            () => host2.listWorktrees(project.id),
            (listener) => host2.onWorktrees(project.id, listener)
          )
        }))
      );
      owners.push(
        ...mappings.filter(({ trees }) => trees.worktrees.some((tree) => tree.directory === directory2)).map(({ project }) => project)
      );
    }
    return owners.length === 1 ? owners[0] : null;
  }

  // src/panel/prompts.ts
  function actionPrompt(change, intent) {
    const target = `OpenSpec change "${change.id}"`;
    const goal = change.goal?.trim() ? `
Goal: ${change.goal}` : "";
    if (intent === "explore")
      return `Use your skill tool to load and invoke the openspec-explore skill for ${target}.${goal}

Investigate the goal, relevant code, options and trade-offs for ${target}. Discuss findings without file changes or implementation. If no goal is recorded, inspect existing context and ask the user to clarify it if necessary; do not invent a goal.`;
    if (change.stage === "planning")
      return `Use your skill tool to load and invoke the openspec-propose skill for ${target} (existing change).${goal}

Inspect ${target}'s status and current metadata. Preserve existing decisions and any recorded goal; only if current metadata has no goal, establish and record a concise goal from existing change context. Ask the user for clarification if the goal is unclear. Finish planning this existing scaffold and complete missing planning artefacts using OpenSpec's artefact instructions. Do not create another change or implement code. If the skill requires new-change creation, explain the conflict rather than creating another change.`;
    if (change.stage === "ready" || change.stage === "progress") {
      const progress = change.stage === "progress" ? `
${change.completedTasks} of ${change.totalTasks} tasks complete. Pick up where implementation left off and complete the remaining tasks.` : "";
      return `Use your skill tool to load and invoke the openspec-apply-change skill for ${target}.${progress}

Complete all remaining tasks in ${target}, then verify the implementation against its change artefacts. Resolve any issues found and verify again until all tasks are complete and verification passes. If blocked, report the blocker rather than marking unfinished work complete.`;
    }
    if (intent === "verify")
      return `Use your skill tool to load and invoke the openspec-verify-change skill for ${target}.`;
    return `Use your skill tool to load and invoke the openspec-archive-change skill for ${target}.`;
  }
  function syncPrompt(change) {
    return `Use your skill tool to load and invoke the openspec-sync-specs skill for OpenSpec change "${change.id}".

Report what you synced without archiving the change.`;
  }
  function planningPrompt(change, intent) {
    const target = `OpenSpec change "${change.id}"`;
    const goal = change.goal?.trim() ? `
Goal: ${change.goal}` : "";
    if (intent === "ff")
      return `Use your skill tool to load and invoke the openspec-ff-change skill for ${target} (existing change).${goal}

Create every remaining planning artefact for ${target}, preserving existing decisions and any recorded goal. Do not create another change or implement code.`;
    if (intent === "continue")
      return `Use your skill tool to load and invoke the openspec-continue-change skill for ${target} (existing change).${goal}

Write the next planning artefact for ${target}, preserving existing decisions and any recorded goal. Do not implement code.`;
    return `Use your skill tool to load and invoke the openspec-update-change skill for ${target}.${goal}

Revise ${target}'s existing planning artefacts as I describe and keep them consistent with each other. If I have not described a revision, ask me what to change. Do not edit code.`;
  }
  function newChangePrompt() {
    return "Use your skill tool to load and invoke the openspec-new-change skill.\n\nAsk me what the change is for before creating it.";
  }

  // src/panel/workflows.ts
  async function loadWorkflows(client2, directory2) {
    try {
      return new Set(await client2.workflows(directory2));
    } catch (caught) {
      console.warn("Could not read OpenSpec workflows; using the core workflows.", caught);
      return new Set(CORE_WORKFLOWS);
    }
  }
  function planningWorkflow(set) {
    return set.has("ff") ? "ff" : set.has("continue") ? "continue" : "propose";
  }
  function cardChips(change, set) {
    return {
      primary: change.stage === "planning" ? planningWorkflow(set) : change.stage === "complete" ? "archive" : "apply",
      secondary: change.stage === "planning" ? "explore" : change.stage === "complete" && set.has("verify") ? "verify" : null,
      sync: !change.artifacts.some(({ id, status }) => id === "specs" && status === "skipped")
    };
  }

  // src/panel/workflow.ts
  var stages = [
    { id: "planning", label: "Planning" },
    { id: "ready", label: "Ready" },
    { id: "progress", label: "In Progress" },
    { id: "complete", label: "Complete" }
  ];
  var stageLabel = (stage) => stages.find((item) => item.id === stage).label;

  // src/panel/status-cache.ts
  var key = "work-status:cards";
  var options = { scope: "device" };
  var sessionLimit = 50;
  function decode(value) {
    if (!Array.isArray(value)) return [];
    const entries = [];
    for (const entry of value.slice(-sessionLimit)) {
      if (!entry || typeof entry.sessionId !== "string" || typeof entry.directory !== "string" || !Array.isArray(entry.cards))
        continue;
      try {
        const cards = entry.cards.map((card) => {
          const listing = decodeListingEntry(card);
          if (!card || typeof card !== "object" || !("stage" in card))
            throw new Error("Missing stage.");
          const stage = stages.find(({ id }) => id === card.stage)?.id;
          if (!stage || !("currentTaskTitle" in card) || card.currentTaskTitle !== null && typeof card.currentTaskTitle !== "string")
            throw new Error("Invalid status card.");
          return { ...listing, stage, currentTaskTitle: card.currentTaskTitle };
        });
        entries.push({ sessionId: entry.sessionId, directory: entry.directory, cards });
      } catch {
      }
    }
    return entries;
  }
  function createStatusCache(host2) {
    const memory = /* @__PURE__ */ new Map();
    let stored;
    function remember(sessionId2, snapshot) {
      memory.delete(sessionId2);
      memory.set(sessionId2, snapshot);
      if (memory.size > sessionLimit) memory.delete(memory.keys().next().value);
    }
    function load() {
      return stored ??= host2.storage.get(key, options).then((value) => {
        const recent = [...memory];
        memory.clear();
        for (const { sessionId: sessionId2, ...snapshot } of decode(value)) {
          remember(sessionId2, snapshot);
        }
        for (const [sessionId2, snapshot] of recent) remember(sessionId2, snapshot);
      }).catch(
        (caught) => console.warn("Could not read cached OpenSpec progress.", caught)
      );
    }
    function get(sessionId2, directory2) {
      const snapshot = memory.get(sessionId2);
      return snapshot?.directory === directory2 ? snapshot.cards : void 0;
    }
    return {
      get,
      async restore(sessionId2, directory2) {
        await load();
        return get(sessionId2, directory2);
      },
      set(sessionId2, directory2, cards, persist) {
        remember(sessionId2, { directory: directory2, cards });
        if (!persist) return;
        stored = load().then(async () => {
          const entries = Array.from(memory, ([sessionId3, snapshot]) => ({
            sessionId: sessionId3,
            ...snapshot
          }));
          const encoder = new TextEncoder();
          while (encoder.encode(JSON.stringify(entries)).length > GUEST_STORAGE_VALUE_BYTES)
            entries.shift();
          await host2.storage.set(key, entries, options);
        }).catch((caught) => console.warn("Could not cache OpenSpec progress.", caught));
      }
    };
  }

  // src/panel/tracked-change.ts
  var prefix = "session-change:";
  var readBatchSize = 32;
  async function readTrackedChanges(host2, sessionId2) {
    const value = await host2.storage.get(`${prefix}${sessionId2}`);
    if (!value || typeof value !== "object" || !("changes" in value) || !Array.isArray(value.changes))
      return null;
    if (!value.changes.every((name) => typeof name === "string" && isChangeName(name)))
      throw new Error("Invalid tracked OpenSpec changes.");
    return [...new Set(value.changes)];
  }
  function resolveSessionChanges(sessionId2, sessions2, saved, active2) {
    const candidate = sessions2?.sessions.find(({ id }) => id === sessionId2);
    const coverage = sessions2?.coverage.find(({ directory: directory2 }) => directory2 === candidate?.directory);
    if (saved === null && candidate && coverage?.state !== "ready") return null;
    return resolveTrackedChanges({
      saved,
      items: candidate?.items ?? [],
      worktreeName: candidate?.worktree?.name ?? null,
      active: active2
    }).changes;
  }
  async function updateTrackedChanges(host2, sessionId2, current, seed, update) {
    try {
      if (!current()) return false;
      const saved = await readTrackedChanges(host2, sessionId2);
      if (!current()) return false;
      const base = saved ?? await seed();
      if (!current()) return false;
      if (base === null) throw new Error("The session's directory coverage is not ready.");
      const changes = update(base);
      if (saved && changes === saved) return true;
      const keys = (await host2.storage.keys()).filter((key2) => key2.startsWith(prefix));
      if (keys.length >= 1900) {
        const choices2 = [];
        for (let i = 0; i < keys.length; i += readBatchSize) {
          if (!current()) return false;
          const batch = keys.slice(i, i + readBatchSize);
          const values = await Promise.all(
            batch.map(async (key2) => ({ key: key2, value: await host2.storage.get(key2) }))
          );
          for (const { key: key2, value } of values) {
            if (value && typeof value === "object" && "savedAt" in value && typeof value.savedAt === "number" && Number.isFinite(value.savedAt))
              choices2.push({ key: key2, savedAt: value.savedAt });
          }
        }
        choices2.sort((left, right) => left.savedAt - right.savedAt);
        for (const { key: key2 } of choices2.slice(0, 100)) {
          if (!current()) return false;
          await host2.storage.delete(key2);
        }
      }
      if (!current()) return false;
      await host2.storage.set(`${prefix}${sessionId2}`, { changes, savedAt: Date.now() });
      return true;
    } catch (caught) {
      console.warn("Could not save the tracked OpenSpec change.", caught);
      return false;
    }
  }
  function appendTrackedChange(host2, sessionId2, change, current, seed) {
    return updateTrackedChanges(
      host2,
      sessionId2,
      current,
      seed,
      (choices2) => choices2.includes(change) ? choices2 : [...choices2, change]
    );
  }

  // src/status.ts
  var isValidationIssue = ({ level }) => level !== "INFO";
  var root = document.querySelector("#root");
  if (!root) throw new Error("Status section root is missing");
  var host = connectHost();
  var client = createClient(host);
  var statusCache = createStatusCache(host);
  var panelRoot = root;
  var directory = null;
  var sessionId = null;
  var turnStarted = false;
  var epoch = 0;
  var projectEpoch = 0;
  var sessions = null;
  var offSessions;
  var workspace;
  var disposed = false;
  var reading = false;
  var queued = false;
  var workflows;
  var refreshWorkflows = false;
  var contextRead;
  var selection2 = null;
  var hasDeviceStorage = false;
  var hasPopovers = false;
  var popoverFrame = false;
  var notes = document.createElement("div");
  var content = document.createElement("div");
  content.className = "section-content";
  var controls = document.createElement("footer");
  controls.className = "section-controls";
  for (const element of [notes, content, controls]) element.hidden = true;
  panelRoot.append(notes, content, controls);
  var pickerRoot = document.createElement("div");
  var picker = document.createElement("div");
  picker.className = "section-picker";
  picker.id = "section-picker";
  picker.hidden = true;
  var choices = document.createElement("ul");
  choices.setAttribute("aria-label", "Changes");
  var emptyChoices = document.createElement("p");
  emptyChoices.className = "note";
  emptyChoices.textContent = "No untracked changes.";
  picker.append(choices, emptyChoices);
  panelRoot.append(picker);
  var footerActions = document.createElement("div");
  footerActions.className = "footer-actions";
  var newRoot = document.createElement("span");
  var boardRoot = document.createElement("span");
  var refreshRoot = document.createElement("span");
  footerActions.append(newRoot, boardRoot, refreshRoot);
  controls.append(pickerRoot, footerActions);
  var newButton = mountButton(newRoot, {
    label: "new",
    size: "sm",
    variant: "secondary",
    onClick: () => void preparePrompt(null, newChangePrompt(), captureContext())
  });
  var boardButton = mountButton(boardRoot, {
    label: "board",
    size: "sm",
    variant: "secondary",
    onClick: () => void openBoard(captureContext())
  });
  var refreshButton = mountButton(refreshRoot, {
    label: "",
    size: "sm",
    variant: "secondary",
    onClick: refresh
  });
  addButtonIcon(refreshRoot, "refresh");
  var refreshTrigger = refreshRoot.querySelector("button");
  refreshTrigger.setAttribute("aria-label", "Refresh");
  for (const action of [newRoot, boardRoot, refreshRoot])
    action.querySelector("button").classList.add("status-link");
  var pickerButton = mountButton(pickerRoot, {
    label: "\uFF0B Track a change",
    size: "sm",
    variant: "secondary",
    onClick: () => setPickerOpen(picker.hidden === true)
  });
  var pickerTrigger = pickerRoot.querySelector("button");
  pickerTrigger.classList.add("status-link");
  pickerTrigger.setAttribute("aria-controls", picker.id);
  pickerTrigger.setAttribute("aria-expanded", "false");
  var optionButtons = [];
  var cancelRoot = document.createElement("div");
  picker.append(cancelRoot);
  var cancelPicker = mountButton(cancelRoot, {
    label: "Cancel",
    size: "sm",
    variant: "secondary",
    onClick: () => setPickerOpen(false)
  });
  var pickerKey = "";
  var viewKey = "";
  var showingLive = false;
  var readError;
  var mountedCards = /* @__PURE__ */ new Map();
  function setPickerOpen(open, restoreFocus = true) {
    picker.hidden = !open;
    pickerTrigger.setAttribute("aria-expanded", String(open));
    if (open) choices.querySelector("button:enabled")?.focus();
    else if (restoreFocus) pickerTrigger.focus();
  }
  function escapePicker(event) {
    if (event.key !== "Escape" || picker.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(false);
  }
  panelRoot.addEventListener("keydown", escapePicker);
  function captureContext() {
    const capturedEpoch = epoch;
    return () => !disposed && epoch === capturedEpoch;
  }
  function render(view) {
    newRoot.hidden = !workflows?.has("new");
    const nextViewKey = JSON.stringify([epoch, view, workflows && [...workflows]]);
    if (viewKey === nextViewKey) return;
    viewKey = nextViewKey;
    showingLive = view.kind === "ready";
    markRefreshing(false);
    controls.hidden = !directory;
    const cards = view.kind === "ready" ? view.cards : view.kind === "stale" ? view.cards.map((display) => ({ id: display.id, display })) : [];
    content.hidden = !cards.length;
    for (const [id, mounted] of mountedCards) {
      if (cards.some((card) => card.id === id)) continue;
      mounted.dispose();
      mountedCards.delete(id);
    }
    for (const [index, card] of cards.entries()) {
      let mounted = mountedCards.get(card.id);
      if (!mounted) {
        mounted = mountTrackedCard(card.id);
        mountedCards.set(card.id, mounted);
      }
      const previous = content.children.item(index);
      if (previous !== mounted.element) content.insertBefore(mounted.element, previous);
      mounted.update(card, view.kind === "ready" ? view.listing : null);
    }
    notes.replaceChildren();
    if (view.kind === "ready") {
      if (!sessionId) note("Start a session to track a change.");
      if (!view.listing.changes.length) note("No active changes.");
    } else if (view.kind === "error") {
      note(view.message, "alert");
    } else if (view.kind === "stale") {
      if (view.message) note(view.message, "alert");
      note("Showing last known progress.", "status");
    } else if (view.kind === "loading") {
      note("Loading OpenSpec change\u2026", "status");
    }
    notes.hidden = !notes.childElementCount;
    pickerButton.update({ disabled: view.kind !== "ready" || !sessionId });
    cancelRoot.hidden = !cards.length;
    if (view.kind === "ready")
      updatePicker(
        view.listing,
        cards.map(({ id }) => id)
      );
    else setPickerOpen(false, false);
  }
  function pickerPriority({ completedTasks, totalTasks }) {
    if (!totalTasks) return 2;
    if (!completedTasks) return 1;
    return completedTasks < totalTasks ? 0 : 3;
  }
  function updatePicker(listing, tracked) {
    const items = [...listing.changes].filter(({ id }) => !tracked.includes(id)).sort((left, right) => pickerPriority(left) - pickerPriority(right)).map(({ id }) => id);
    const nextKey = JSON.stringify([sessionId, items]);
    if (pickerKey === nextKey) return;
    pickerKey = nextKey;
    emptyChoices.hidden = items.length !== 0;
    const focused = choices.contains(document.activeElement) ? document.activeElement?.textContent : null;
    for (const button2 of optionButtons) button2.dispose();
    choices.replaceChildren();
    optionButtons = items.map((id) => {
      const row = document.createElement("li");
      choices.append(row);
      const button2 = mountButton(row, {
        label: id,
        size: "sm",
        variant: "secondary",
        onClick: () => {
          const session = sessionId;
          const current = captureContext();
          if (!session || !current()) return;
          setPickerOpen(false);
          void (async () => {
            const saved = await appendTrackedChange(host, session, id, current, seedTrackedChanges);
            if (!current()) return;
            if (saved) read();
            else await showError(current, null, "Could not track the OpenSpec change. Try again.");
          })();
        }
      });
      if (focused === id) row.querySelector("button")?.focus();
      return button2;
    });
    if (focused && !choices.contains(document.activeElement))
      (choices.querySelector("button:enabled") ?? pickerTrigger).focus();
  }
  function seedTrackedChanges() {
    return selection2 ? resolveSessionChanges(sessionId, sessions, null, selection2.active) : [];
  }
  async function showError(current, caught, fallback) {
    if (!current()) return;
    await host.toast({
      kind: "error",
      message: caught instanceof HostRequestError ? caught.message : fallback
    }).catch((error) => console.warn("Could not show the OpenSpec error.", error));
  }
  async function openBoard(current, target) {
    try {
      if (!current()) return false;
      if (target) await client.setFocus(target.directory, target.change);
      if (!current()) return false;
      await host.openSurface("plugin:openspec-board");
      return current();
    } catch (caught) {
      await showError(current, caught, "Could not open the OpenSpec board.");
      return false;
    }
  }
  async function preparePrompt(change, text, current, session = sessionId, seed = seedTrackedChanges) {
    if (!current()) return false;
    try {
      await host.compose({ text, mode: "replace" });
    } catch (caught) {
      await showError(current, caught, "The workflow prompt could not be prepared.");
      return false;
    }
    if (!current()) return false;
    const saved = session && change && appendTrackedChange(host, session, change, current, seed);
    try {
      await host.toast({
        kind: "success",
        message: "Workflow prompt prepared in the open composer."
      });
    } catch (caught) {
      await showError(current, caught, "The workflow prompt could not be prepared.");
    }
    await saved;
    return current();
  }
  function taskTitle(task) {
    return task?.description.split("\n", 1)[0] ?? "";
  }
  function mountTaskTitle() {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = "flyout-trigger task-title";
    const inline = document.createElement("div");
    inline.hidden = true;
    let task = null;
    const flyout = mountFlyout(button2, inline, () => task ? taskFlyout(task) : null);
    return {
      button: button2,
      inline,
      update(next) {
        if (task?.id !== next?.id) flyout.reset();
        task = next;
        const title = taskTitle(task);
        if (button2.textContent !== title) button2.textContent = title;
        if (task) flyout.update();
      },
      refreshAnchor: flyout.update,
      dispose: flyout.dispose
    };
  }
  function mountTrackedCard(id) {
    const element = document.createElement("article");
    element.className = "status-card";
    const heading = document.createElement("div");
    heading.className = "section-heading";
    const title = document.createElement("h1");
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "flyout-trigger";
    nameButton.textContent = id;
    title.append(nameButton);
    heading.append(title);
    const inline = document.createElement("div");
    inline.hidden = true;
    let change = null;
    const nameAnchor = mountFlyout(
      nameButton,
      inline,
      () => change && scope && workflows ? changeFlyout(change, scope.directory, workflows) : null
    );
    const count2 = document.createElement("span");
    heading.append(count2);
    const meter = document.createElement("progress");
    meter.className = "section-progress";
    meter.setAttribute("aria-label", "Task completion");
    meter.max = 100;
    const disclosure = document.createElement("details");
    const summary = document.createElement("summary");
    const tasksLabel = document.createElement("span");
    tasksLabel.className = "tasks-label";
    tasksLabel.textContent = "Tasks:";
    const currentTask = mountTaskTitle();
    summary.append(tasksLabel, currentTask.button);
    const taskList = document.createElement("ul");
    taskList.className = "task-window";
    disclosure.append(summary, taskList);
    let taskKey = null;
    let taskRows = /* @__PURE__ */ new Map();
    const actions = document.createElement("div");
    actions.className = "card-actions";
    let scope = null;
    let chips = null;
    const primary2 = mountButton(actions, {
      label: "",
      size: "xs",
      onClick: () => {
        if (!change || !chips) return;
        const text = chips.primary === "ff" || chips.primary === "continue" ? planningPrompt(change, chips.primary) : actionPrompt(change, "primary");
        void preparePrompt(change.id, text, captureContext());
      }
    });
    const secondaryRoot = document.createElement("span");
    const syncRoot = document.createElement("span");
    actions.append(secondaryRoot, syncRoot);
    const secondary2 = mountButton(secondaryRoot, {
      label: "",
      size: "xs",
      variant: "secondary",
      onClick: () => {
        if (change && chips?.secondary)
          void preparePrompt(change.id, actionPrompt(change, chips.secondary), captureContext());
      }
    });
    const sync = mountButton(syncRoot, {
      label: "sync",
      size: "xs",
      variant: "secondary",
      onClick: () => {
        if (change) void preparePrompt(change.id, syncPrompt(change), captureContext());
      }
    });
    const validationInline = document.createElement("div");
    validationInline.hidden = true;
    const validateRoot = document.createElement("span");
    actions.append(validateRoot);
    let validationData = null;
    let validating = false;
    let disposedCard = false;
    const validate = mountButton(validateRoot, {
      label: "validate",
      size: "xs",
      variant: "secondary",
      onClick: () => {
        if (!change || !scope || validating) return;
        const captured = captureContext();
        const current = () => captured() && !disposedCard && change !== null;
        const plan = scope;
        validating = true;
        void client.validate(plan, id).then((result) => {
          if (!current()) return;
          validationData = validationFlyout(id, result);
          validationAnchor.update();
          validationAnchor.open();
          if (!validationAnchor.isOpen()) validationAnchor.reset();
        }).catch(
          (caught) => showError(current, caught, "Could not validate the OpenSpec change.")
        ).finally(() => {
          validating = false;
        });
      }
    });
    const validationAnchor = mountFlyout(
      validateRoot.querySelector("button"),
      validationInline,
      () => validationData,
      () => {
        validationData = null;
      }
    );
    const details = document.createElement("div");
    details.className = "section-content";
    details.append(disclosure, currentTask.inline, actions, validationInline);
    const cachedStage = document.createElement("p");
    cachedStage.className = "note";
    const cachedTask = document.createElement("p");
    cachedTask.className = "note cached-task";
    const errorCard = document.createElement("div");
    errorCard.className = "section-content";
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    errorCard.append(error);
    const retry = mountButton(errorCard, {
      label: "Refresh",
      size: "sm",
      variant: "secondary",
      onClick: refresh
    });
    element.append(heading, inline, meter, cachedStage, cachedTask, details, errorCard);
    function updateProgress({ completedTasks, totalTasks }) {
      const percentage = totalTasks ? 100 * completedTasks / totalTasks : 0;
      meter.value = percentage;
      meter.setAttribute("aria-valuenow", String(percentage));
      count2.textContent = `${completedTasks}/${totalTasks}`;
    }
    return {
      element,
      refreshAnchor() {
        nameAnchor.update();
        if (validationAnchor.isOpen()) validationAnchor.update();
        if (taskKey !== null) currentTask.refreshAnchor();
        for (const { title: title2 } of taskRows.values()) title2.refreshAnchor();
      },
      update(card, listing) {
        scope = listing;
        const display = "display" in card ? card.display : null;
        details.hidden = !("change" in card);
        const message = "message" in card ? card.message : void 0;
        errorCard.hidden = !message;
        error.textContent = message ?? "";
        count2.hidden = meter.hidden = details.hidden && !display;
        nameButton.disabled = details.hidden;
        element.classList.toggle("stale-card", !!display);
        cachedStage.hidden = !display;
        cachedTask.hidden = !display?.currentTaskTitle;
        if (!("change" in card)) {
          if (display) {
            updateProgress(display);
            cachedStage.textContent = stageLabel(display.stage);
            cachedTask.textContent = display.currentTaskTitle;
          }
          change = null;
          nameAnchor.reset();
          currentTask.update(null);
          for (const { title: title2 } of taskRows.values()) title2.update(null);
          validationAnchor.reset();
          return;
        }
        change = card.change;
        nameAnchor.update();
        chips = cardChips(change, workflows);
        primary2.update({ label: chips.primary });
        secondary2.update({ label: chips.secondary ?? "" });
        secondaryRoot.hidden = chips.secondary === null;
        syncRoot.hidden = !chips.sync;
        updateProgress(change);
        const next = card.tasks.find((task) => !task.done) ?? card.tasks.at(-1) ?? null;
        const nextKey = next?.id ?? null;
        if (nextKey !== taskKey) disclosure.open = false;
        taskKey = nextKey;
        disclosure.hidden = !next;
        currentTask.update(next);
        const rows = /* @__PURE__ */ new Map();
        for (const [index, task] of taskWindow(card.tasks).entries()) {
          let item = taskRows.get(task.id);
          if (!item) {
            const row = document.createElement("li");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.disabled = true;
            checkbox.setAttribute("aria-label", "Task completion");
            const title2 = mountTaskTitle();
            row.append(checkbox, title2.button, title2.inline);
            item = { row, checkbox, title: title2 };
          }
          item.checkbox.checked = task.done;
          item.title.update(task);
          rows.set(task.id, item);
          const previous = taskList.children.item(index);
          if (previous !== item.row) taskList.insertBefore(item.row, previous);
        }
        for (const [id2, item] of taskRows) {
          if (rows.has(id2)) continue;
          item.title.dispose();
          item.row.remove();
        }
        taskRows = rows;
      },
      dispose() {
        disposedCard = true;
        nameAnchor.dispose();
        validationAnchor.dispose();
        currentTask.dispose();
        for (const { title: title2 } of taskRows.values()) title2.dispose();
        for (const handle of [primary2, secondary2, sync, validate, retry]) handle.dispose();
        element.remove();
      }
    };
  }
  var FLYOUT_DATA_LIMIT = 15e3;
  function ellipsize(text, max) {
    return text.length <= max ? text : `${text.slice(0, max - 1)}\u2026`;
  }
  function fitText(text, max, measure) {
    const cut = ellipsize(text, max);
    if (measure(cut) <= FLYOUT_DATA_LIMIT) return cut;
    let low = 1;
    let high = cut.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (measure(ellipsize(text, mid)) <= FLYOUT_DATA_LIMIT) low = mid;
      else high = mid - 1;
    }
    return ellipsize(text, low);
  }
  function changeFlyout(change, directory2, workflows2) {
    const data = {
      kind: "change",
      name: change.id,
      stage: change.stage,
      goal: null,
      directory: directory2,
      offerContinue: change.stage === "planning" && workflows2.has("ff") && workflows2.has("continue")
    };
    if (change.goal) {
      data.goal = fitText(change.goal, 4e3, (goal) => JSON.stringify({ ...data, goal }).length);
    }
    return data;
  }
  function taskFlyout(task) {
    const data = { kind: "task", id: "", description: "" };
    data.id = fitText(
      task.id,
      FLYOUT_DATA_LIMIT,
      (id) => JSON.stringify({ ...data, id, description: "\u2026" }).length
    );
    data.description = fitText(
      task.description,
      4e3,
      (description) => JSON.stringify({ ...data, description }).length
    );
    return data;
  }
  function validationFlyout(change, validation) {
    const data = {
      kind: "validation",
      change,
      result: {
        valid: validation.valid,
        totalIssues: validation.issues.filter(isValidationIssue).length,
        issues: []
      }
    };
    for (const issue of validation.issues.slice(0, 20)) {
      data.result.issues.push({ ...issue, message: ellipsize(issue.message, 300) });
      if (JSON.stringify(data).length <= FLYOUT_DATA_LIMIT) continue;
      data.result.issues.pop();
      break;
    }
    return data;
  }
  function decodeFlyout(value) {
    if (!value || typeof value !== "object" || !("kind" in value)) return null;
    if (value.kind === "task")
      return "id" in value && typeof value.id === "string" && "description" in value && typeof value.description === "string" ? { kind: "task", id: value.id, description: value.description } : null;
    if (value.kind === "validation" && "change" in value && typeof value.change === "string") {
      try {
        if (!("result" in value) || !value.result || typeof value.result !== "object" || !("totalIssues" in value.result) || typeof value.result.totalIssues !== "number" || !Number.isSafeInteger(value.result.totalIssues))
          return null;
        const result = decodeValidation(value.result);
        if (value.result.totalIssues < result.issues.filter(isValidationIssue).length) return null;
        return {
          kind: "validation",
          change: value.change,
          result: { ...result, totalIssues: value.result.totalIssues }
        };
      } catch {
        return null;
      }
    }
    if (value.kind !== "change" || !("name" in value) || typeof value.name !== "string" || !("directory" in value) || typeof value.directory !== "string" || !("offerContinue" in value) || typeof value.offerContinue !== "boolean" || !("goal" in value) || value.goal !== null && typeof value.goal !== "string" || !("stage" in value) || value.stage !== "planning" && value.stage !== "ready" && value.stage !== "progress" && value.stage !== "complete")
      return null;
    return {
      kind: "change",
      name: value.name,
      goal: value.goal,
      stage: value.stage,
      directory: value.directory,
      offerContinue: value.offerContinue
    };
  }
  function renderFlyout(container, data, context) {
    container.classList.add("flyout");
    if (data.kind === "task") {
      const description = document.createElement("p");
      description.textContent = data.description;
      container.replaceChildren(description);
      return;
    }
    const heading = document.createElement(container === panelRoot ? "h1" : "p");
    heading.className = "flyout-heading";
    if (data.kind === "validation") {
      const { valid, issues, totalIssues } = data.result;
      heading.textContent = data.change;
      const result = document.createElement("p");
      result.textContent = `${valid ? "Valid" : "Invalid"} \xB7 ${totalIssues} ${totalIssues === 1 ? "issue" : "issues"}`;
      container.replaceChildren(heading, result);
      const list = document.createElement("ul");
      list.className = "validation-issues";
      for (const issue of issues) {
        const location = issue.path === "file" ? "" : ` \xB7 ${issue.path}`;
        if (!isValidationIssue(issue)) {
          const note2 = document.createElement("p");
          note2.className = "note";
          note2.textContent = `Note${location}: ${issue.message}`;
          container.append(note2);
          continue;
        }
        const item = document.createElement("li");
        const label = document.createElement("strong");
        label.textContent = `${issue.level}${location}`;
        const message = document.createElement("p");
        message.textContent = issue.message;
        item.append(label, message);
        list.append(item);
      }
      if (list.childElementCount) container.append(list);
      const hiddenIssues = totalIssues - list.childElementCount;
      if (hiddenIssues > 0) {
        const omitted = document.createElement("p");
        omitted.textContent = `+${hiddenIssues} more issues: open the board or run openspec validate`;
        container.append(omitted);
      }
      return;
    }
    heading.textContent = data.name;
    const stage = document.createElement("p");
    stage.textContent = stageLabel(data.stage);
    container.replaceChildren(heading, stage);
    if (data.goal) {
      const goal = document.createElement("p");
      goal.textContent = data.goal;
      container.append(goal);
    }
    const row = document.createElement("div");
    row.className = "card-actions";
    container.append(row);
    const { session, current, seed, afterAction, afterUntrack } = context;
    const actions = (data.offerContinue ? ["continue", "update"] : ["update"]).map(
      (intent) => mountButton(row, {
        label: intent,
        variant: "secondary",
        size: "xs",
        onClick: () => {
          void preparePrompt(
            data.name,
            planningPrompt({ id: data.name, goal: data.goal }, intent),
            current,
            session,
            seed
          ).then((prepared) => {
            if (prepared) afterAction?.();
          });
        }
      })
    );
    actions.push(
      mountButton(row, {
        label: "Open in board",
        variant: "secondary",
        size: "xs",
        onClick: () => {
          void openBoard(current, { directory: data.directory, change: data.name }).then((opened) => {
            if (opened) afterAction?.();
          });
        }
      })
    );
    if (session) {
      const button2 = mountButton(container, {
        label: "Untrack",
        variant: "secondary",
        size: "xs",
        onClick: () => void untrackChange(session, data.name, current, seed, afterUntrack)
      });
      container.lastElementChild.classList.add("status-link", "untrack-link");
      actions.push(button2);
    }
    return actions;
  }
  function mountFlyout(button2, inline, getData, onReset) {
    let anchor;
    let openedId = null;
    let actions;
    function closeInline() {
      actions?.forEach((action) => action.dispose());
      actions = void 0;
      inline.hidden = true;
      if (!anchor) button2.setAttribute("aria-expanded", "false");
    }
    function open() {
      const data = getData();
      if (!data) return;
      if (anchor) {
        if (button2.getAttribute("aria-expanded") !== "true")
          button2.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      } else {
        inline.hidden = false;
        actions = renderFlyout(inline, data, {
          session: sessionId,
          current: captureContext(),
          seed: seedTrackedChanges,
          afterUntrack: () => {
            closeInline();
            read();
          }
        });
        button2.setAttribute("aria-expanded", "true");
      }
    }
    function onClick(event) {
      event.preventDefault();
      if (!inline.hidden) closeInline();
      else open();
    }
    function reset() {
      openedId = null;
      anchor?.dispose();
      anchor = void 0;
      closeInline();
      onReset?.();
    }
    const offClosed = !onReset ? void 0 : host.onPopoverClosed(({ id }) => {
      if (id === openedId)
        queueMicrotask(() => {
          if (id === openedId) reset();
        });
    });
    if (onReset) button2.addEventListener("click", reset, true);
    else button2.addEventListener("click", onClick);
    return {
      open,
      reset,
      isOpen: () => button2.getAttribute("aria-expanded") === "true",
      update() {
        if (anchor && !hasPopovers) {
          anchor.dispose();
          anchor = void 0;
        }
        if (!hasPopovers) {
          button2.setAttribute("aria-expanded", String(!inline.hidden));
        } else if (!anchor) {
          closeInline();
          button2.removeAttribute("aria-expanded");
          anchor = mountPopoverAnchor(button2, {
            host: onReset ? {
              ...host,
              openPopover: (request) => {
                openedId = request.id;
                return host.openPopover(request).catch((caught) => {
                  if (openedId === request.id) reset();
                  throw caught;
                });
              }
            } : host,
            getData: () => {
              const data = getData();
              if (!data || JSON.stringify(data).length > FLYOUT_DATA_LIMIT)
                throw new Error("OpenSpec flyout data is unavailable.");
              return data;
            },
            width: 320,
            height: 160,
            side: "bottom"
          });
        }
      },
      dispose() {
        offClosed?.();
        reset();
        if (onReset) button2.removeEventListener("click", reset, true);
        else button2.removeEventListener("click", onClick);
      }
    };
  }
  function note(text, role) {
    const line = document.createElement("p");
    line.className = "note";
    if (role) line.setAttribute("role", role);
    line.textContent = text;
    notes.append(line);
  }
  async function untrackChange(session, change, current, seed, onSaved) {
    const saved = await updateTrackedChanges(
      host,
      session,
      current,
      seed,
      (changes) => changes.filter((name) => name !== change)
    );
    if (!current()) return;
    if (saved) onSaved();
    else await showError(current, null, "Could not untrack the OpenSpec change.");
  }
  function sameChanges(left, right) {
    return left === right || left !== null && right !== null && left.length === right.length && left.every((id, index) => id === right[index]);
  }
  function markRefreshing(stale) {
    content.classList.toggle("refreshing", stale);
    content.setAttribute("aria-busy", String(stale));
  }
  function showCached() {
    const cards = sessionId && directory ? statusCache.get(sessionId, directory) : void 0;
    if (cards?.length) render({ kind: "stale", cards, ...readError ? { message: readError } : {} });
    else if (readError) render({ kind: "error", message: readError });
    else render({ kind: directory ? "loading" : "empty" });
  }
  function queueContextRead() {
    clearTimeout(contextRead);
    contextRead = setTimeout(() => {
      contextRead = void 0;
      read();
    }, 32);
  }
  function read() {
    if (disposed || !directory) return;
    if (contextRead !== void 0) return;
    if (reading) {
      queued = true;
      return;
    }
    const capturedDirectory = directory;
    const capturedSession = sessionId;
    const capturedWorkspace = workspace;
    const capturedEpoch = epoch;
    const capturedProject = projectEpoch;
    const config = refreshWorkflows || !workflows;
    refreshWorkflows = false;
    const current = () => !disposed && epoch === capturedEpoch;
    reading = true;
    refreshTrigger.setAttribute("aria-busy", "true");
    if (showingLive && mountedCards.size) markRefreshing(true);
    void (async () => {
      try {
        const [listingResult, detected] = await Promise.allSettled([
          client.list(capturedDirectory),
          config ? loadWorkflows(client, capturedDirectory) : workflows
        ]);
        if (!disposed && projectEpoch === capturedProject && detected.status === "fulfilled")
          workflows = detected.value;
        if (!current()) return;
        if (listingResult.status === "rejected") throw listingResult.reason;
        const listing = listingResult.value;
        const saved = capturedSession ? await readTrackedChanges(host, capturedSession) : null;
        if (!current()) return;
        if (capturedSession && saved === null) {
          await capturedWorkspace;
          if (!current()) return;
        }
        const byId = new Map(listing.changes.map((item) => [item.id, item]));
        const active2 = new Set(byId.keys());
        const changes = resolveSessionChanges(capturedSession, sessions, saved, active2) ?? [];
        selection2 = { active: active2, saved, changes };
        const cards = await Promise.all(
          changes.map(async (id) => {
            try {
              const [summaryResponse, taskResponse] = await Promise.allSettled([
                client.summary(listing, id),
                client.tasks(listing, id)
              ]);
              if (summaryResponse.status === "rejected") throw summaryResponse.reason;
              if (taskResponse.status === "rejected") throw taskResponse.reason;
              return {
                id,
                change: deriveChange({ ...summaryResponse.value, ...byId.get(id) }),
                tasks: taskResponse.value
              };
            } catch (caught) {
              return {
                id,
                message: caught instanceof Error ? caught.message : "Could not read the OpenSpec change."
              };
            }
          })
        );
        if (!current()) return;
        const previous = new Map(
          (capturedSession ? statusCache.get(capturedSession, capturedDirectory) : void 0)?.map(
            (card) => [card.id, card]
          )
        );
        const display = [];
        const visibleCards = cards.map((card) => {
          if ("change" in card) {
            const { id, completedTasks, totalTasks, stage } = card.change;
            const task = card.tasks.find(({ done }) => !done) ?? card.tasks.at(-1) ?? null;
            display.push({
              id,
              completedTasks,
              totalTasks,
              stage,
              currentTaskTitle: taskTitle(task) || null
            });
            return card;
          }
          const old = previous.get(card.id);
          if (old) {
            display.push(old);
            return { ...card, display: old };
          }
          return card;
        });
        if (capturedSession)
          statusCache.set(capturedSession, capturedDirectory, display, hasDeviceStorage);
        readError = void 0;
        render({ kind: "ready", listing, cards: visibleCards });
      } catch (caught) {
        if (current()) {
          readError = caught instanceof Error ? caught.message : "Could not read the OpenSpec change.";
          showCached();
        }
      } finally {
        if (current()) markRefreshing(false);
        reading = false;
        refreshTrigger.setAttribute("aria-busy", "false");
        if (queued) {
          queued = false;
          read();
        }
      }
    })();
  }
  function subscribeToProject(capturedDirectory) {
    const capturedProject = ++projectEpoch;
    const current = () => !disposed && projectEpoch === capturedProject;
    return (async () => {
      try {
        const project = await findProject(host, capturedDirectory);
        if (!current() || !project) return;
        const off = await host.onSessions(project.id, (snapshot) => {
          if (!current()) return;
          sessions = snapshot;
          if (selection2 && !sameChanges(
            resolveSessionChanges(sessionId, sessions, selection2.saved, selection2.active) ?? [],
            selection2.changes
          )) {
            epoch++;
            selection2 = null;
            showCached();
            read();
          }
        });
        if (current()) offSessions = off;
        else off();
      } catch (caught) {
        if (current()) console.warn("Could not inspect OpenSpec session metadata.", caught);
      }
    })();
  }
  function refresh() {
    refreshWorkflows = true;
    read();
  }
  function updateContext(nextDirectory, nextSession) {
    const directoryChanged = nextDirectory !== directory;
    if (!directoryChanged && nextSession === sessionId) return;
    turnStarted = false;
    directory = nextDirectory;
    sessionId = nextSession;
    epoch++;
    selection2 = null;
    queued = false;
    readError = void 0;
    setPickerOpen(false, false);
    if (directoryChanged) {
      workflows = void 0;
      refreshWorkflows = false;
    }
    showCached();
    const current = captureContext();
    if (hasDeviceStorage && nextSession && nextDirectory && !statusCache.get(nextSession, nextDirectory))
      void statusCache.restore(nextSession, nextDirectory).then((cards) => {
        if (current() && cards?.length && !showingLive) showCached();
      });
    if (directoryChanged) {
      projectEpoch++;
      offSessions?.();
      offSessions = void 0;
      sessions = null;
      workspace = directory ? subscribeToProject(directory) : void 0;
    }
    queueContextRead();
  }
  var lastHeight = 0;
  var popoverSession;
  var popoverActions;
  var resize = new ResizeObserver(() => {
    const height = Math.ceil(panelRoot.getBoundingClientRect().height);
    if (height === lastHeight) return;
    lastHeight = height;
    void host.setHeight(height).catch((error) => console.warn("Could not resize the OpenSpec section.", error));
  });
  var offReady = host.onReady((ready2) => {
    hasDeviceStorage = ready2.features?.deviceStorage === true;
    applyHostReady(ready2, document.documentElement);
    applyDevice(ready2.device);
    if (ready2.surface === "popover") {
      const nextSession = ready2.session?.id ?? null;
      if (!popoverFrame) {
        popoverFrame = true;
        popoverSession = nextSession;
        panelRoot.replaceChildren();
        const data = decodeFlyout(ready2.popover?.data);
        const popoverId = ready2.popover?.id;
        if (data && popoverId) {
          const close = () => void host.closePopover(popoverId).catch((caught) => {
            console.warn("Could not close the OpenSpec flyout.", caught);
          });
          popoverActions = renderFlyout(panelRoot, data, {
            session: nextSession,
            current: () => !disposed && popoverSession === nextSession,
            seed: () => data.kind === "change" ? [data.name] : [],
            afterAction: close,
            afterUntrack: close
          });
        } else panelRoot.textContent = "OpenSpec details are unavailable.";
      } else if (nextSession !== popoverSession) {
        popoverSession = void 0;
        popoverActions?.forEach((action) => action.update({ disabled: true }));
      }
      resize.observe(panelRoot);
      return;
    }
    if (hasPopovers !== (ready2.features?.popovers === true)) {
      hasPopovers = ready2.features?.popovers === true;
      for (const card of mountedCards.values()) card.refreshAnchor();
    }
    updateContext(ready2.directory, ready2.session?.id ?? null);
    resize.observe(panelRoot);
  });
  var offDirectory = host.onDirectory((next) => {
    if (!popoverFrame && next !== directory) updateContext(next, sessionId);
  });
  var offSession = host.onSession((next) => {
    if (!popoverFrame) updateContext(directory, next?.id ?? null);
    else if ((next?.id ?? null) !== popoverSession) {
      popoverSession = void 0;
      popoverActions?.forEach((action) => action.update({ disabled: true }));
    }
  });
  var offLifecycle = host.onSessionLifecycle((event) => {
    if (event.sessionId !== sessionId) return;
    const completedTurn = turnStarted && event.phase === "completed";
    turnStarted = event.phase === "started";
    if (completedTurn) read();
  });
  var offPopover = host.onPopoverClosed(({ reason }) => {
    const session = sessionId;
    if (reason !== "closed" || !session || !selection2) return;
    const current = captureContext();
    void readTrackedChanges(host, session).then((saved) => {
      if (current() && selection2 && !sameChanges(saved, selection2.saved)) read();
    }).catch((caught) => {
      console.warn("Could not check the tracked OpenSpec changes.", caught);
    });
  });
  window.addEventListener(
    "pagehide",
    () => {
      disposed = true;
      clearTimeout(contextRead);
      resize.disconnect();
      offReady();
      offDirectory();
      offSession();
      offLifecycle();
      offPopover();
      offSessions?.();
      popoverActions?.forEach((action) => action.dispose());
      for (const card of mountedCards.values()) card.dispose();
      for (const handle of [
        refreshButton,
        newButton,
        boardButton,
        pickerButton,
        cancelPicker,
        ...optionButtons
      ])
        handle.dispose();
      panelRoot.removeEventListener("keydown", escapePicker);
      host.dispose();
    },
    { once: true }
  );
})();
