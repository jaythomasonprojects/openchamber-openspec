"use strict";
(() => {
  // node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

  // node_modules/@openchamber/sdk/dist/scrollbar-style.js
  var GUEST_SCROLLBAR_CSS = `
:root {
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 40%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 65%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  * { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  :root::-webkit-scrollbar, body::-webkit-scrollbar { background: var(--oc-bg, inherit); }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--oc-scrollbar-thumb);
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  * { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;

  // node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
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
  var GUEST_GENERATE_TIMEOUT_MS = 9e4;
  var GUEST_BADGE_MAX = 999;
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
    "NO_SESSION",
    "SESSION_BUSY",
    "NOT_GRANTED",
    "NO_DIRECTORY",
    "NOT_FOUND",
    "FILE_TOO_LARGE",
    "DENIED",
    "NO_MODEL",
    "MODEL_FAILED"
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
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action"
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
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options = {}) => {
    const target = options.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    let resolveHandler = null;
    let actionHandler = null;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    let disposed = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
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
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed)
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
      if (disposed || target.parent === target) {
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
        if (!disposed)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
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
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
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
      openSession: async (sessionId) => {
        requireIdentity(sessionId);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId } });
      },
      storage: {
        get: async (key) => {
          const result = await storage({ op: "get", key });
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key, value) => {
          await storage({ op: "set", key, value });
        },
        delete: async (key) => {
          await storage({ op: "delete", key });
        },
        keys: async () => {
          const result = await storage({ op: "keys" });
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
        }, options.requestTimeoutMs ?? 18e4);
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
      writeFile: (path, content) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content }
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
        }, options.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      setBadge: (count2) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count2) }
      }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        disposed = true;
        resolveHandler = null;
        actionHandler = null;
        target.removeEventListener("message", onMessage);
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
      }
    };
  };

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
  var applyHostTheme = (theme, root2) => {
    root2.style.colorScheme = theme.mode;
    for (const [name, key] of TOKEN_VARS) {
      root2.style.setProperty(name, theme.tokens[key]);
    }
    root2.style.setProperty("font-family", theme.tokens.font);
    root2.style.setProperty("font-size", "0.875rem");
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

  // node_modules/@openchamber/sdk/dist/ui/dom.js
  var STYLE_ID = "oc-sdk-ui-style";
  var clearNode = (node) => {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };
  var ensureStyle = (css) => {
    const existing = document.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== css) {
        existing.textContent = css;
      }
      return;
    }
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
  var setAttr = (node, name, value) => {
    if (value === void 0 || value === null || value === "") {
      node.removeAttribute(name);
    } else if (node.getAttribute(name) !== value) {
      node.setAttribute(name, value);
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
  var focus = v("interactive-focus-ring", "currentColor");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusRing = `box-shadow: 0 0 0 2px ${focus};`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
.oc-sdk { box-sizing: border-box; color: ${fg}; font-family: ${font}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${focusRing} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${radius}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: ${elevated}; color: ${elevatedFg}; border-color: ${border}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${radius}; background: ${elevated}; color: ${elevatedFg}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${mix(border, 60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${focus}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${v("status-error", "red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${v("status-error", "red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${muted}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${border}; border-radius: 6px; background: ${elevated}; color: ${elevatedFg}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${muted}; }
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${mix(border, 60)}; border-radius: 12px; background: ${elevated}; color: ${elevatedFg}; box-shadow: 0 8px 24px ${mix(fg, 12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
.oc-sdk-option[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${border}; border-radius: 4px; color: ${primary}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(primary, 65, border)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusRing} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${muted}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${muted}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${hover}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${mono}; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${border}; border-top-color: ${primary}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${mix("var(--oc-sdk-tone)", 40)}; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${mix(border, 40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${muted}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${border}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;

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

  // node_modules/@openchamber/sdk/dist/ui/field.js
  var mountTextField = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const field = el("label", "oc-sdk oc-sdk-field");
    const caption = el("span", "oc-sdk-field-label");
    const input = props.multiline ? el("textarea", "oc-sdk-input") : el("input", "oc-sdk-input");
    const note = el("span", "oc-sdk-field-note");
    field.append(caption, input, note);
    root2.append(field);
    const paint = () => {
      setText(caption, props.label);
      caption.hidden = !props.label;
      if (input instanceof HTMLInputElement) {
        input.type = props.password ? "password" : "text";
      } else {
        input.rows = props.rows ?? 3;
      }
      if (input.value !== props.value) {
        input.value = props.value;
      }
      input.disabled = Boolean(props.disabled);
      setAttr(input, "placeholder", props.placeholder);
      input.dataset.mono = props.mono ? "true" : "false";
      const invalid2 = Boolean(props.error);
      field.dataset.invalid = invalid2 ? "true" : "false";
      input.setAttribute("aria-invalid", invalid2 ? "true" : "false");
      const text = props.error ?? props.helper ?? "";
      setText(note, text);
      note.hidden = text === "";
    };
    const onInput = () => {
      props.onChange(input.value);
    };
    input.addEventListener("input", onInput);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        input.removeEventListener("input", onInput);
        field.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/icons.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICON_PATH = {
    search: "M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.868-3.133-7-7-7-3.868 0-7 3.132-7 7 0 3.867 3.132 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z",
    chevron: "M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z",
    check: "M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z",
    close: "M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"
  };
  var icon = (name, size, className) => {
    const node = document.createElementNS(SVG_NS, "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("width", String(size));
    node.setAttribute("height", String(size));
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("fill", "currentColor");
    if (className) {
      node.setAttribute("class", className);
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICON_PATH[name]);
    node.append(path);
    return node;
  };

  // node_modules/@openchamber/sdk/dist/ui/search.js
  var mountSearchField = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const wrap = el("div", "oc-sdk oc-sdk-search");
    const input = el("input", "oc-sdk-input");
    input.type = "text";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.setAttribute("role", "searchbox");
    const clear = button("oc-sdk-search-clear");
    clear.append(icon("close", 14));
    clear.tabIndex = -1;
    wrap.append(icon("search", 16, "oc-sdk-search-icon"), input, clear);
    root2.append(wrap);
    const paint = () => {
      const placeholder = props.placeholder ?? "Search";
      setAttr(input, "placeholder", placeholder);
      input.setAttribute("aria-label", props.label ?? placeholder);
      clear.setAttribute("aria-label", "Clear search");
      if (input.value !== props.value) {
        input.value = props.value;
      }
      wrap.dataset.active = props.value.trim() === "" ? "false" : "true";
    };
    const clearValue = () => {
      if (props.value !== "") {
        props.onChange("");
      }
      input.focus();
    };
    const onInput = () => {
      props.onChange(input.value);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape" && input.value !== "") {
        event.preventDefault();
        clearValue();
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown);
    clear.addEventListener("click", clearValue);
    paint();
    if (props.autofocus) {
      input.focus();
    }
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        input.removeEventListener("input", onInput);
        input.removeEventListener("keydown", onKeyDown);
        clear.removeEventListener("click", clearValue);
        wrap.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/navigation.js
  var navigationKey = (event, axis = "vertical") => {
    const [next, previous] = axis === "vertical" ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
    if (event.key === next || event.ctrlKey && event.key.toLowerCase() === "n")
      return "next";
    if (event.key === previous || event.ctrlKey && event.key.toLowerCase() === "p")
      return "previous";
    if (event.key === "Home")
      return "first";
    if (event.key === "End")
      return "last";
    return null;
  };
  var moveListSelection = (items, currentId, key) => {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) {
      return null;
    }
    const first = enabled[0];
    const last = enabled[enabled.length - 1];
    if (key === "first" || !first || !last) {
      return first?.id ?? null;
    }
    if (key === "last") {
      return last.id;
    }
    const index = enabled.findIndex((item) => item.id === currentId);
    if (index === -1) {
      return key === "next" ? first.id : last.id;
    }
    const target = enabled[Math.min(enabled.length - 1, Math.max(0, index + (key === "next" ? 1 : -1)))];
    return target?.id ?? null;
  };

  // node_modules/@openchamber/sdk/dist/ui/tabs.js
  var mountTabs = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const track = el("div", "oc-sdk oc-sdk-tabs");
    track.setAttribute("role", "tablist");
    root2.append(track);
    const paint = () => {
      clearNode(track);
      track.dataset.track = props.trackBackground ? "true" : "false";
      for (const item of props.items) {
        const tab = button("oc-sdk-tab");
        tab.setAttribute("role", "tab");
        const active2 = item.id === props.activeId;
        tab.setAttribute("aria-selected", active2 ? "true" : "false");
        tab.tabIndex = active2 ? 0 : -1;
        tab.dataset.id = item.id;
        const label = el("span");
        label.textContent = item.label;
        tab.append(label);
        if (item.count !== void 0) {
          const count2 = el("span", "oc-sdk-tab-count");
          count2.textContent = String(item.count);
          tab.append(count2);
        }
        tab.addEventListener("click", () => {
          if (item.id !== props.activeId)
            props.onChange(item.id);
        });
        track.append(tab);
      }
    };
    const onKeyDown = (event) => {
      const step = navigationKey(event, "horizontal");
      if (!step) {
        return;
      }
      const next = moveListSelection(props.items, props.activeId, step);
      if (next && next !== props.activeId) {
        event.preventDefault();
        props.onChange(next);
        const tab = track.querySelector(`[data-id="${CSS.escape(next)}"]`);
        if (tab instanceof HTMLElement)
          tab.focus();
      }
    };
    track.addEventListener("keydown", onKeyDown);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        track.removeEventListener("keydown", onKeyDown);
        track.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/badge.js
  var applyTone = (node, tone2) => {
    setAttr(node, "data-tone", tone2 && tone2 !== "neutral" ? tone2 : null);
  };
  var mountBadge = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = el("span", "oc-sdk oc-sdk-badge");
    root2.append(node);
    const paint = () => {
      setText(node, props.label);
      applyTone(node, props.tone);
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/progress.js
  var clampProgress = (value) => Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  var mountProgress = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = el("div", "oc-sdk oc-sdk-progress");
    const caption = el("div", "oc-sdk-progress-label");
    const label = el("span");
    const percent = el("span");
    caption.append(label, percent);
    const track = el("div", "oc-sdk-progress-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    const fill = el("div", "oc-sdk-progress-fill");
    track.append(fill);
    node.append(caption, track);
    root2.append(node);
    const paint = () => {
      const value = clampProgress(props.value);
      applyTone(fill, props.tone);
      fill.style.transform = `scaleX(${value / 100})`;
      track.setAttribute("aria-valuenow", String(value));
      if (props.label)
        track.setAttribute("aria-label", props.label);
      else
        track.removeAttribute("aria-label");
      setText(label, props.label);
      setText(percent, `${value}%`);
      caption.hidden = !props.label;
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.remove();
      }
    };
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

  // src/contracts.ts
  var documentKey = (artifactId, selector) => JSON.stringify([artifactId, selector]);
  function record(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data.");
    return value;
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
  function decodeListingEntry(value, key = "id") {
    const item = record(value);
    const id = string(item[key]);
    if (!isChangeName(id)) throw new Error("Invalid change name.");
    const completedTasks = count(item.completedTasks);
    const totalTasks = count(item.totalTasks);
    if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
    return { id, completedTasks, totalTasks };
  }
  function decodeListing(value) {
    const input = record(value);
    const directory = string(input.directory);
    const root2 = string(input.root);
    if (!Array.isArray(input.changes)) throw new Error("Invalid listing.");
    const changes = input.changes.map((item) => decodeListingEntry(item));
    if (new Set(changes.map((item) => item.id)).size !== changes.length)
      throw new Error("Duplicate change.");
    return { directory, root: root2, changes };
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
  function decodeTaskResponse(value) {
    const item = record(value);
    return decodeTasks(item.tasks);
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
      const result = await host2.serviceRequest({ method: "POST", path, body: JSON.stringify(body) });
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
    function decode(value, decoder) {
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
      list: async (directory, expectedRoot) => {
        const value = await request("/changes", {
          directory,
          ...expectedRoot ? { expectedRoot } : {}
        });
        const listing = decode(value, decodeListing);
        if (listing.directory !== directory || expectedRoot && listing.root !== expectedRoot)
          throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
        return listing;
      },
      summary: async (scope, entry) => {
        const value = decode(
          await request("/summary", { ...scope, expectedRoot: scope.root, change: entry.id }),
          decodeSummary
        );
        if (value.id !== entry.id || value.root !== scope.root) throw invalid();
        return { ...value, completedTasks: entry.completedTasks, totalTasks: entry.totalTasks };
      },
      tasks: async (scope, change) => {
        return decode(
          await request("/tasks", { ...scope, expectedRoot: scope.root, change }),
          decodeTaskResponse
        );
      },
      document: async (scope, change, artifactId, selector) => {
        const value = record2(
          await request("/document", {
            ...scope,
            expectedRoot: scope.root,
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
            await request("/create", { ...scope, expectedRoot: scope.root, name, goal })
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
          value = record2(await request("/delete", { ...scope, expectedRoot: scope.root, change }));
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

  // src/panel/resources.ts
  function createResources(client, options = {}) {
    const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
    const cache = /* @__PURE__ */ new Map();
    let context = null;
    let generation = 0;
    let bytes = 0;
    let disposed = false;
    const scopeKey = (scope) => JSON.stringify([scope.directory, scope.root]);
    const keyFor = (scope, change, kind, artifact = "", selector = "") => JSON.stringify([scope.directory, scope.root, change, kind, artifact, selector]);
    const active2 = (scope) => !disposed && !!context && scopeKey(context) === scopeKey(scope);
    const state = (entry) => ({
      value: entry.value,
      pending: entry.pending !== null,
      error: entry.error
    });
    function refresh() {
      generation++;
      cache.clear();
      bytes = 0;
    }
    function setContext(scope) {
      if (context && scope && scopeKey(context) === scopeKey(scope)) return;
      refresh();
      context = scope;
    }
    function read(scope, key, load, retry = false) {
      if (!active2(scope))
        return {
          state: { value: null, pending: false, error: new Error("OpenSpec context changed.") },
          completion: null
        };
      let entry = cache.get(key);
      if (!entry) {
        entry = { value: null, error: null, pending: null, bytes: 0 };
        cache.set(key, entry);
      }
      if (entry.pending) return { state: state(entry), completion: entry.pending };
      if (entry.value !== null || entry.error && !retry)
        return { state: state(entry), completion: null };
      const current = entry;
      const started = generation;
      current.error = null;
      const completion = Promise.resolve().then(load).then(
        (value) => {
          if (started !== generation || !active2(scope) || cache.get(key) !== current) return;
          const size = new TextEncoder().encode(JSON.stringify(value)).length;
          if (bytes + size > maxBytes) {
            current.error = new Error(
              "Session read limit reached. Refresh to clear retained reads."
            );
          } else {
            current.value = value;
            current.bytes = size;
            bytes += size;
          }
        },
        (caught) => {
          if (started === generation && active2(scope) && cache.get(key) === current)
            current.error = caught instanceof Error ? caught : new Error("OpenSpec read failed.");
        }
      ).then(() => {
        if (current.pending === completion) current.pending = null;
        return state(current);
      });
      current.pending = completion;
      return { state: state(current), completion };
    }
    return {
      setContext,
      refresh,
      taskState(scope, change) {
        const entry = cache.get(keyFor(scope, change, "tasks"));
        return active2(scope) && entry ? state(entry) : null;
      },
      documentState(scope, change, artifact, selector) {
        const entry = cache.get(keyFor(scope, change, "document", artifact, selector));
        return active2(scope) && entry ? state(entry) : null;
      },
      tasks(scope, change, retry = false) {
        return read(scope, keyFor(scope, change, "tasks"), () => client.tasks(scope, change), retry);
      },
      document(scope, change, artifact, selector, retry = false) {
        return read(
          scope,
          keyFor(scope, change, "document", artifact, selector),
          () => client.document(scope, change, artifact, selector),
          retry
        );
      },
      invalidateChange(scope, change) {
        const prefix = JSON.stringify([scope.directory, scope.root, change]).slice(0, -1) + ",";
        for (const [key, entry] of cache)
          if (key.startsWith(prefix)) {
            bytes -= entry.bytes;
            cache.delete(key);
          }
      },
      dispose() {
        disposed = true;
        setContext(null);
      }
    };
  }

  // src/panel/workflow.ts
  var stages = [
    { id: "planning", label: "Planning", action: "propose" },
    { id: "ready", label: "Ready", action: "apply" },
    { id: "progress", label: "In Progress", action: "continue" },
    { id: "complete", label: "Complete", action: "archive" }
  ];
  var workflowLabel = (stage) => stages.find((item) => item.id === stage).action;
  var stageLabel = (stage) => stages.find((item) => item.id === stage).label;

  // src/panel/help-button.ts
  function mountHelpButton(root2, onClick) {
    root2.className = "help-control";
    const handle = mountButton(root2, { label: "", variant: "ghost", size: "sm", onClick });
    const button2 = root2.querySelector("button");
    button2.setAttribute("aria-label", "OpenSpec quickstart");
    button2.title = "OpenSpec quickstart";
    const icon2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon2.setAttribute("viewBox", "0 0 24 24");
    icon2.setAttribute("width", "16");
    icon2.setAttribute("height", "16");
    icon2.setAttribute("aria-hidden", "true");
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
    icon2.append(outline, hook, dot);
    button2.prepend(icon2);
    return handle;
  }

  // src/panel/button-icon.ts
  var paths = {
    refresh: "M20 11a8 8 0 1 1-2.4-5.7M20 4v5h-5",
    create: "M12 5v14M5 12h14",
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

  // src/panel/board-view.ts
  function mountBoardView(root2, callbacks) {
    const main = document.createElement("div");
    main.className = "board-shell";
    const header = document.createElement("header");
    header.className = "board-header";
    const body = document.createElement("div");
    body.className = "view-body board-body";
    const heading = document.createElement("div");
    heading.className = "heading";
    const project = document.createElement("h1");
    const headingActions = document.createElement("div");
    headingActions.className = "heading-actions";
    const newChangeRoot = document.createElement("span");
    const newChange = mountButton(newChangeRoot, {
      label: "new change",
      variant: "default",
      size: "sm",
      disabled: true,
      onClick: callbacks.create
    });
    addButtonIcon(newChangeRoot, "create");
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    const tally = document.createElement("span");
    tally.className = "board-tally";
    const tallyGroup = document.createElement("span");
    tallyGroup.className = "board-tally-group";
    const refreshRoot = document.createElement("span");
    refreshRoot.className = "refresh-control";
    const refresh = mountButton(refreshRoot, {
      label: "refresh",
      variant: "ghost",
      size: "sm",
      onClick: callbacks.retry
    });
    addButtonIcon(refreshRoot, "refresh");
    const helpRoot = document.createElement("span");
    const help = mountHelpButton(helpRoot, callbacks.help);
    headingActions.append(helpRoot, refreshRoot, newChangeRoot);
    const searchRoot = document.createElement("span");
    searchRoot.className = "board-search";
    let searchValue = "";
    const search = mountSearchField(searchRoot, {
      value: "",
      placeholder: "Search changes",
      label: "Search changes",
      onChange: (value) => {
        searchValue = value;
        callbacks.search(value);
      }
    });
    tallyGroup.append(tally);
    heading.append(project, tallyGroup);
    toolbar.append(searchRoot, headingActions);
    header.append(heading, toolbar);
    const notices = document.createElement("div");
    notices.className = "board-notices";
    const board = document.createElement("section");
    board.className = "board";
    const sections = stages.map((stage) => {
      const section = document.createElement("section");
      section.className = "stage";
      const label = document.createElement("h2");
      const grid = document.createElement("div");
      grid.className = "card-grid";
      const empty = document.createElement("p");
      empty.className = "empty-stage";
      section.append(label, grid);
      board.append(section);
      return { stage, label, grid, empty };
    });
    body.append(notices, board);
    main.append(header, body);
    root2.append(main);
    let noticesMounted = [];
    let noticeSignature = "";
    const cards = /* @__PURE__ */ new Map();
    function addAction(target, label) {
      const mount = document.createElement("span");
      target.append(mount);
      noticesMounted.push(
        mountButton(mount, { label, variant: "secondary", size: "sm", onClick: callbacks.retry })
      );
    }
    function cardFor(item) {
      let entry = cards.get(item.change.id);
      if (!entry) {
        const node = document.createElement("article");
        node.className = "change-card";
        const title = document.createElement("button");
        title.className = "card-main";
        title.type = "button";
        const progressLabel = document.createElement("p");
        progressLabel.className = "progress-label";
        const progressRoot = document.createElement("div");
        const progress = mountProgress(progressRoot, { value: 0, label: "Task completion" });
        const actionRoot = document.createElement("span");
        actionRoot.className = "card-actions";
        const id = item.change.id;
        const action = mountButton(actionRoot, {
          label: "propose",
          variant: "default",
          size: "sm",
          onClick: () => cards.get(id)?.current.action("primary")
        });
        const exploreRoot = document.createElement("span");
        const explore = mountButton(exploreRoot, {
          label: "explore",
          variant: "secondary",
          size: "sm",
          onClick: () => cards.get(id)?.current.action("explore")
        });
        const verifyRoot = document.createElement("span");
        const verify = mountButton(verifyRoot, {
          label: "verify",
          variant: "secondary",
          size: "sm",
          onClick: () => cards.get(id)?.current.action("verify")
        });
        actionRoot.prepend(exploreRoot, verifyRoot);
        title.addEventListener("click", () => cards.get(id)?.current.open());
        const status = document.createElement("p");
        status.className = "stale-label";
        node.append(title, progressLabel, progressRoot, actionRoot, status);
        entry = {
          node,
          title,
          progressLabel,
          progressRoot,
          progress,
          action,
          explore,
          exploreRoot,
          verify,
          verifyRoot,
          status,
          current: item
        };
        cards.set(id, entry);
      }
      entry.current = item;
      const change = item.change;
      if (entry.title.textContent !== change.id) entry.title.textContent = change.id;
      const label = `${change.completedArtifacts} of ${change.totalArtifacts} artefacts${change.totalTasks === 0 ? " \xB7 No tasks yet" : ""}`;
      if (entry.progressLabel.textContent !== label) entry.progressLabel.textContent = label;
      entry.progressRoot.hidden = !change.totalTasks;
      entry.progress.update({
        value: change.totalTasks ? Math.round(100 * change.completedTasks / change.totalTasks) : 0,
        label: `${change.completedTasks} of ${change.totalTasks} tasks complete`
      });
      entry.action.update({
        label: workflowLabel(change.stage),
        disabled: item.unavailable
      });
      entry.explore.update({ disabled: item.unavailable });
      entry.exploreRoot.hidden = change.stage !== "planning";
      entry.verifyRoot.hidden = change.stage !== "complete";
      entry.verify.update({ disabled: item.unavailable });
      entry.status.hidden = !item.stale && !item.unavailable;
      if (item.unavailable) entry.status.textContent = `${change.id} is no longer available.`;
      else if (item.stale)
        entry.status.textContent = `${change.id} is stale; latest summary unavailable.`;
      return entry.node;
    }
    return {
      setVisible(visible) {
        main.hidden = !visible;
      },
      update(state) {
        project.textContent = state.directory?.split("/").filter(Boolean).at(-1) ?? "No project selected";
        newChange.update({ disabled: !state.canCreate });
        if (searchValue !== state.search) {
          searchValue = state.search;
          search.update({ value: searchValue });
        }
        tally.textContent = `${state.listedCount} changes \xB7 ${state.completedTasks} of ${state.totalTasks} tasks complete`;
        refresh.update({ disabled: !state.directory, loading: state.loading });
        const nextNoticeSignature = JSON.stringify([
          !!state.directory,
          state.error,
          state.failures.map(({ id }) => id)
        ]);
        if (noticeSignature !== nextNoticeSignature) {
          noticeSignature = nextNoticeSignature;
          noticesMounted.forEach((handle) => handle.dispose());
          noticesMounted = [];
          notices.replaceChildren();
          if (!state.directory) {
            const notice = document.createElement("p");
            notice.className = "notice";
            notice.textContent = "Select an OpenChamber project or worktree to view its OpenSpec changes.";
            notices.append(notice);
          }
          if (state.error) {
            const notice = document.createElement("div");
            notice.className = "notice error";
            const message = document.createElement("span");
            message.textContent = state.error;
            notice.append(message);
            addAction(notice, "Retry");
            notices.append(notice);
          }
          if (state.failures.length) {
            const notice = document.createElement("div");
            notice.className = "notice";
            const message = document.createElement("span");
            message.textContent = `${state.failures.map(({ id }) => id).join(", ")} could not be read. Refresh to try again.`;
            notice.append(message);
            addAction(notice, "Retry");
            notices.append(notice);
          }
        }
        const ids = new Set(state.cards.map(({ change }) => change.id));
        for (const [id, entry] of cards) {
          if (ids.has(id)) continue;
          entry.action.dispose();
          entry.explore.dispose();
          entry.verify.dispose();
          entry.progress.dispose();
          entry.node.remove();
          cards.delete(id);
        }
        const query = state.search.trim().toLocaleLowerCase();
        for (const entry of cards.values()) {
          const change = entry.current.change;
          if (!`${change.id} ${change.goal ?? ""}`.toLocaleLowerCase().includes(query))
            entry.node.remove();
        }
        for (const { stage, label, grid, empty } of sections) {
          const matching = state.cards.filter(
            ({ change }) => change.stage === stage.id && `${change.id} ${change.goal ?? ""}`.toLocaleLowerCase().includes(query)
          ).sort((a, b) => a.change.id < b.change.id ? -1 : a.change.id > b.change.id ? 1 : 0);
          label.textContent = `${stage.label} ${matching.length}`;
          for (const child of [...grid.children]) {
            if (child !== empty && !matching.some((item) => cards.get(item.change.id)?.node === child))
              child.remove();
          }
          empty.textContent = state.loading && !state.settled && state.pendingSummaries ? "Loading\u2026" : query ? "No matching changes" : "No changes here";
          if (!matching.length) {
            if (empty.parentElement !== grid) grid.append(empty);
          } else empty.remove();
          matching.forEach((item, index) => {
            const node = cardFor(item);
            if (grid.children[index] !== node) grid.insertBefore(node, grid.children[index] ?? null);
          });
        }
      },
      dispose() {
        noticesMounted.forEach((handle) => handle.dispose());
        for (const entry of cards.values()) {
          entry.action.dispose();
          entry.explore.dispose();
          entry.verify.dispose();
          entry.progress.dispose();
        }
        cards.clear();
        newChange.dispose();
        refresh.dispose();
        help.dispose();
        search.dispose();
        main.remove();
      }
    };
  }

  // src/panel/document-view.ts
  function mountDocumentView(root2) {
    const content = document.createElement("pre");
    const status = document.createElement("p");
    status.className = "document-status";
    const issue = document.createElement("p");
    issue.className = "document-issue";
    const retryRoot = document.createElement("span");
    let onRetry = () => {
    };
    const retry = mountButton(retryRoot, {
      label: "Retry document",
      variant: "secondary",
      size: "sm",
      onClick: () => onRetry()
    });
    root2.append(content, status, issue, retryRoot);
    let displayed = "";
    return {
      update(next) {
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
        root2.replaceChildren();
      }
    };
  }

  // src/panel/tasks-view.ts
  function mountTasksView(root2, retryRead) {
    root2.className = "tasks-view";
    const summary = document.createElement("p");
    summary.className = "content-status";
    const progressRoot = document.createElement("div");
    const progress = mountProgress(progressRoot, { value: 0, label: "Task completion" });
    const issue = document.createElement("p");
    issue.className = "notice error";
    const retryRoot = document.createElement("span");
    const retry = mountButton(retryRoot, {
      label: "Retry tasks",
      variant: "secondary",
      size: "sm",
      onClick: retryRead
    });
    const list = document.createElement("ol");
    list.className = "task-rows";
    root2.append(summary, progressRoot, issue, retryRoot, list);
    const rows = /* @__PURE__ */ new Map();
    function clear() {
      rows.clear();
      list.replaceChildren();
    }
    return {
      update(state, retryable = true, emptyMessage = "") {
        const tasks = state?.value ?? [];
        const completed = tasks.filter((task) => task.done).length;
        summary.textContent = tasks.length || state?.error || !retryable ? "" : state?.pending ? "Loading tasks\u2026" : emptyMessage || "No tasks tracked yet.";
        summary.hidden = !summary.textContent;
        progressRoot.hidden = !tasks.length;
        progress.update({
          value: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
          label: tasks.length ? `${completed} of ${tasks.length} tasks complete` : "Task completion"
        });
        issue.textContent = retryable ? state?.error?.message ?? "" : "";
        issue.hidden = !issue.textContent;
        retryRoot.hidden = !state?.error || !retryable;
        const ids = new Set(tasks.map((task) => task.id));
        for (const [id, row] of rows)
          if (!ids.has(id)) {
            row.row.remove();
            rows.delete(id);
          }
        tasks.forEach((task, index) => {
          let item = rows.get(task.id);
          if (!item) {
            const row = document.createElement("li");
            row.className = "task-row";
            const mark = document.createElement("span");
            mark.className = "task-indicator";
            mark.setAttribute("role", "img");
            const label = document.createElement("span");
            label.className = "task-title";
            row.append(mark, label);
            item = { row, mark, label };
            rows.set(task.id, item);
          }
          item.row.classList.toggle("done", task.done);
          item.mark.textContent = task.done ? "\u2713" : "\u25CB";
          item.mark.setAttribute("aria-label", task.done ? "Complete" : "Pending");
          item.label.textContent = task.description;
          if (list.children[index] !== item.row)
            list.insertBefore(item.row, list.children[index] ?? null);
        });
      },
      reset: clear,
      dispose() {
        progress.dispose();
        retry.dispose();
        clear();
        root2.replaceChildren();
      }
    };
  }

  // src/panel/detail-view.ts
  var tones = {
    planning: "neutral",
    ready: "info",
    progress: "primary",
    complete: "success"
  };
  var artifactLabels = {
    proposal: "Proposal",
    specs: "Specs",
    design: "Design",
    tasks: "Tasks"
  };
  var readiness = {
    done: "Written",
    ready: "Ready to write",
    blocked: "Blocked",
    skipped: "Skipped"
  };
  var tabId = (id) => `artifact:${id}`;
  var fallbackId = "tasks:fallback";
  function taskArtifact(change) {
    return change.artifacts.some((artifact) => artifact.id === "tasks") ? "tasks" : null;
  }
  function mountDetailView(root2, callbacks) {
    const shell = document.createElement("section");
    shell.className = "detail";
    shell.hidden = true;
    const header = document.createElement("header");
    header.className = "detail-header";
    const body = document.createElement("div");
    body.className = "view-body detail-body";
    const titleRow = document.createElement("div");
    titleRow.className = "detail-title-row";
    const backRoot = document.createElement("span");
    backRoot.className = "detail-back";
    const back = mountButton(backRoot, {
      label: "",
      variant: "ghost",
      size: "sm",
      onClick: callbacks.close
    });
    const backButton = backRoot.querySelector("button");
    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("width", "16");
    chevron.setAttribute("height", "16");
    chevron.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m15 5-7 7 7 7");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    chevron.append(path);
    backButton.prepend(chevron);
    backButton.setAttribute("aria-label", "Back to changes");
    backButton.title = "Back to changes";
    const title = document.createElement("h1");
    title.id = "change-detail-title";
    shell.setAttribute("aria-labelledby", title.id);
    titleRow.append(backRoot, title);
    const headingActions = document.createElement("div");
    headingActions.className = "detail-heading-actions";
    const refreshRoot = document.createElement("span");
    refreshRoot.className = "refresh-control";
    const refresh = mountButton(refreshRoot, {
      label: "refresh",
      variant: "ghost",
      size: "sm",
      onClick: callbacks.refresh
    });
    addButtonIcon(refreshRoot, "refresh");
    const deleteRoot = document.createElement("span");
    deleteRoot.className = "detail-delete";
    const deleteAction = mountButton(deleteRoot, {
      label: "delete",
      variant: "destructive",
      size: "sm",
      onClick: callbacks.delete
    });
    const deleteButton = deleteRoot.querySelector("button");
    deleteButton.setAttribute("aria-label", "Delete change");
    deleteButton.title = "Delete change";
    addButtonIcon(deleteRoot, "delete");
    headingActions.append(refreshRoot, deleteRoot);
    const goal = document.createElement("p");
    goal.className = "goal";
    goal.setAttribute("role", "region");
    goal.setAttribute("aria-label", "Recorded objective");
    goal.tabIndex = 0;
    const stage = document.createElement("div");
    stage.className = "stage-label";
    const stageBadge = mountBadge(stage, { label: "Planning", tone: "neutral" });
    titleRow.append(stage);
    const unavailable = document.createElement("p");
    unavailable.className = "notice error detail-issue";
    const refreshIssue = document.createElement("div");
    refreshIssue.className = "notice error detail-refresh-issue";
    const refreshMessage = document.createElement("span");
    const retryRoot = document.createElement("span");
    const retry = mountButton(retryRoot, {
      label: "Retry",
      variant: "secondary",
      size: "sm",
      onClick: callbacks.refresh
    });
    refreshIssue.append(refreshMessage, retryRoot);
    const tabs = document.createElement("nav");
    tabs.className = "artifact-tabs";
    tabs.setAttribute("aria-label", "Planning artefacts");
    const toolbar = document.createElement("div");
    toolbar.className = "detail-toolbar";
    toolbar.append(tabs, headingActions);
    header.append(titleRow, goal);
    const content = document.createElement("div");
    content.className = "detail-content";
    content.id = "change-detail-panel";
    content.setAttribute("role", "tabpanel");
    content.tabIndex = 0;
    const readinessNote = document.createElement("p");
    readinessNote.className = "readiness-note";
    const documents = document.createElement("section");
    const tasks = document.createElement("section");
    const tasksView = mountTasksView(tasks, callbacks.retryTasks);
    content.append(readinessNote, documents, tasks);
    const footer = document.createElement("footer");
    footer.className = "detail-footer";
    const actionRoot = document.createElement("span");
    const action = mountButton(actionRoot, {
      label: "continue in chat",
      variant: "default",
      size: "sm",
      onClick: () => callbacks.action("primary")
    });
    const verifyRoot = document.createElement("span");
    const verify = mountButton(verifyRoot, {
      label: "verify",
      variant: "secondary",
      size: "sm",
      onClick: () => callbacks.action("verify")
    });
    const exploreRoot = document.createElement("span");
    const explore = mountButton(exploreRoot, {
      label: "explore",
      variant: "secondary",
      size: "sm",
      onClick: () => callbacks.action("explore")
    });
    footer.append(exploreRoot, verifyRoot, actionRoot);
    body.append(toolbar, unavailable, refreshIssue, content);
    shell.append(header, body, footer);
    root2.append(shell);
    let currentOwner = null;
    let tabSignature = "";
    const tabControl = mountTabs(tabs, {
      items: [],
      activeId: "",
      trackBackground: true,
      onChange: (id) => {
        if (id === fallbackId || id === tabId("tasks") && currentOwner === "tasks")
          callbacks.selectTasks();
        else if (id.startsWith("artifact:")) callbacks.selectArtifact(id.slice("artifact:".length));
      }
    });
    tabs.querySelector("[role=tablist]")?.setAttribute("aria-label", "Planning artefacts");
    const files = /* @__PURE__ */ new Map();
    let changeId = "";
    let artifactId = "";
    let scrollSelection = "";
    function reset() {
      tasksView.reset();
      tabControl.update({ items: [], activeId: "" });
      tabSignature = "";
      for (const file2 of files.values()) file2.view.dispose();
      files.clear();
      documents.replaceChildren();
      artifactId = "";
      scrollSelection = "";
    }
    function file(descriptor) {
      const key = documentKey(descriptor.artifactId, descriptor.selector);
      let entry = files.get(key);
      if (!entry) {
        const node = document.createElement("details");
        const summary = document.createElement("summary");
        const path2 = document.createElement("span");
        path2.textContent = descriptor.label;
        const status = document.createElement("span");
        status.className = "document-status";
        summary.append(path2, status);
        const body2 = document.createElement("div");
        const view = mountDocumentView(body2);
        node.append(summary, body2);
        node.addEventListener("toggle", () => {
          if (node.open) {
            for (const other of files.values()) if (other.node !== node) other.node.open = false;
          }
        });
        entry = { node, view };
        files.set(key, entry);
      }
      return entry;
    }
    return {
      update(state) {
        shell.hidden = !state;
        if (!state) {
          reset();
          changeId = "";
          return;
        }
        if (changeId !== state.change.id) {
          reset();
          changeId = state.change.id;
        }
        title.textContent = state.change.id;
        goal.textContent = state.change.goal ?? "Goal unavailable";
        stageBadge.update({
          label: stageLabel(state.change.stage),
          tone: tones[state.change.stage]
        });
        unavailable.hidden = !state.unavailable;
        unavailable.textContent = state.unavailable ? "This change is no longer available. Refresh or return to the board." : "";
        refresh.update({ loading: state.loading });
        refreshMessage.textContent = state.refreshError ?? "";
        refreshIssue.hidden = !state.refreshError;
        retry.update({ disabled: state.loading });
        action.update({ label: workflowLabel(state.change.stage) });
        action.update({ disabled: state.unavailable });
        exploreRoot.hidden = state.change.stage !== "planning";
        explore.update({ disabled: state.unavailable });
        deleteAction.update({ disabled: state.unavailable });
        verifyRoot.hidden = state.change.stage !== "complete";
        verify.update({ disabled: state.unavailable });
        currentOwner = taskArtifact(state.change);
        const items = state.change.artifacts.map((item) => ({
          id: tabId(item.id),
          label: artifactLabels[item.id] ?? item.id,
          count: item.id === "specs" ? (state.change.documents ?? []).filter((document2) => document2.artifactId === item.id).length : item.id === currentOwner ? state.change.totalTasks : void 0
        }));
        if (!currentOwner)
          items.push({ id: fallbackId, label: "Tasks", count: state.change.totalTasks });
        const activeId = state.activeView === "tasks" ? currentOwner ? tabId(currentOwner) : fallbackId : tabId(state.selectedArtifact);
        const signature = JSON.stringify([items, activeId]);
        if (signature !== tabSignature) {
          const focused = tabs.contains(document.activeElement);
          tabControl.update({ items, activeId });
          tabSignature = signature;
          tabs.querySelectorAll("[role=tab]").forEach((tab, index) => {
            tab.id = `change-detail-tab-${index}`;
            tab.setAttribute("aria-controls", content.id);
          });
          if (focused) tabs.querySelector('[role=tab][aria-selected="true"]')?.focus();
        }
        tabs.querySelectorAll("[role=tab]").forEach((tab, index) => {
          const artifact = state.change.artifacts[index];
          if (!artifact) return;
          const label = `${items[index].label} \xB7 ${readiness[artifact.status]}${items[index].count === void 0 ? "" : ` ${items[index].count}`}`;
          if (tab.getAttribute("aria-label") !== label) tab.setAttribute("aria-label", label);
        });
        content.setAttribute(
          "aria-labelledby",
          tabs.querySelector('[role=tab][aria-selected="true"]')?.id ?? ""
        );
        const selected = state.change.artifacts.find(
          (item) => item.id === (state.activeView === "tasks" ? currentOwner : state.selectedArtifact)
        );
        const unresolved = selected?.requires.filter((id) => {
          const prerequisite = state.change.artifacts.find((item) => item.id === id);
          return prerequisite && prerequisite.status !== "done" && prerequisite.status !== "skipped";
        }) ?? [];
        const readinessMessage = selected?.status === "ready" ? "Ready to write this artefact. Continue planning in chat." : selected?.status === "blocked" ? unresolved.length ? `Blocked until ${unresolved.join(", ")} is written or skipped.` : "Blocked by planning prerequisites; their details are not available." : selected?.status === "skipped" ? "This artefact was skipped." : "";
        documents.hidden = state.activeView === "tasks";
        tasks.hidden = state.activeView !== "tasks";
        if (state.activeView === "tasks" && !state.refreshError)
          tasksView.update(state.tasks, !state.unavailable, readinessMessage);
        const nextScrollSelection = `${state.activeView}:${state.selectedArtifact}`;
        if (scrollSelection !== nextScrollSelection) {
          scrollSelection = nextScrollSelection;
          content.scrollTop = 0;
        }
        if (artifactId !== state.selectedArtifact) {
          artifactId = state.selectedArtifact;
          for (const entry of files.values()) entry.node.open = false;
        }
        const available = (state.change.documents ?? []).filter(
          (item) => item.artifactId === state.selectedArtifact
        );
        readinessNote.textContent = state.activeView === "document" && !state.unavailable && !available.length ? readinessMessage || (state.selectedArtifact ? "This artefact has no available documents yet." : "This change has no available planning documents.") : "";
        readinessNote.hidden = !!state.refreshError || !readinessNote.textContent;
        content.hidden = !!state.refreshError;
        const multi = state.selectedArtifact === "specs" || available.length > 1;
        const current = new Set(available.map((item) => documentKey(item.artifactId, item.selector)));
        for (const [key, entry] of files)
          if (!current.has(key)) {
            entry.view.dispose();
            entry.node.remove();
            files.delete(key);
          }
        for (const [index, descriptor] of available.entries()) {
          const key = documentKey(descriptor.artifactId, descriptor.selector);
          const entry = file(descriptor);
          const status = entry.node.querySelector("summary .document-status");
          if (status) status.textContent = state.files.get(key)?.error ? " \xB7 Read failed" : "";
          const current2 = state.files.get(key);
          entry.view.update({
            text: current2?.value ?? "",
            hasContent: current2?.value !== null && !!current2,
            status: !state.unavailable && !current2?.error && current2?.value == null ? "Loading document\u2026" : null,
            error: state.unavailable ? null : current2?.error?.message ?? null,
            retry: () => callbacks.retryDocument(descriptor.artifactId, descriptor.selector),
            canRetry: !state.unavailable
          });
          entry.node.classList.toggle("single-document", !multi);
          if (!multi) entry.node.open = true;
          if (documents.children[index] !== entry.node)
            documents.insertBefore(entry.node, documents.children[index] ?? null);
        }
      },
      dispose() {
        reset();
        back.dispose();
        refresh.dispose();
        retry.dispose();
        deleteAction.dispose();
        stageBadge.dispose();
        action.dispose();
        explore.dispose();
        verify.dispose();
        tabControl.dispose();
        tasksView.dispose();
        shell.remove();
      }
    };
  }

  // src/panel/create-dialog.ts
  function mountCreateDialog(client, callbacks) {
    const dialog = document.createElement("dialog");
    const form = document.createElement("form");
    const heading = document.createElement("h2");
    heading.id = "new-change-title";
    dialog.setAttribute("aria-labelledby", heading.id);
    heading.textContent = "New change";
    const nameRoot = document.createElement("div");
    const goalRoot = document.createElement("div");
    let name = "";
    let goal = "";
    let mode = "editing";
    let attempt = null;
    let draftScope = null;
    let messageText = "";
    let generation = 0;
    let disposed = false;
    const nameField = mountTextField(nameRoot, {
      label: "Change name",
      value: "",
      placeholder: "add-change-board",
      mono: true,
      onChange: (value) => {
        name = value;
        nameField.update({ value, error: void 0 });
      }
    });
    const goalField = mountTextField(goalRoot, {
      label: "Goal",
      value: "",
      placeholder: "What should this change make possible?",
      multiline: true,
      rows: 4,
      onChange: (value) => {
        goal = value;
        goalField.update({ value, error: void 0 });
      }
    });
    const message = document.createElement("p");
    message.setAttribute("role", "status");
    const actions = document.createElement("div");
    actions.className = "create-actions";
    const cancelRoot = document.createElement("span");
    const submitRoot = document.createElement("span");
    const retryRoot = document.createElement("span");
    const inspectRoot = document.createElement("span");
    const forgetRoot = document.createElement("span");
    const dismiss = mountButton(cancelRoot, {
      label: "cancel",
      variant: "secondary",
      size: "sm",
      onClick: () => dialog.close()
    });
    const submit = mountButton(submitRoot, {
      label: "create",
      variant: "default",
      size: "sm",
      onClick: () => void submitChange()
    });
    addButtonIcon(submitRoot, "create");
    const retry = mountButton(retryRoot, {
      label: "Retry read",
      variant: "secondary",
      size: "sm",
      onClick: () => void reconcile()
    });
    const inspect = mountButton(inspectRoot, {
      label: "Inspect change",
      variant: "secondary",
      size: "sm",
      onClick: () => {
        if (!attempt || !sameContext(attempt.scope)) return;
        callbacks.inspect(attempt.scope, attempt.name);
        dialog.close();
      }
    });
    const forget = mountButton(forgetRoot, {
      label: "Dismiss attempt",
      variant: "ghost",
      size: "sm",
      onClick: () => {
        if (mode === "submitting" || mode === "reconciling") return;
        const contextChanged = !!attempt && !sameContext(attempt.scope);
        if (mode === "read-failed" && !contextChanged) return;
        const originalAttempt = attempt;
        attempt = null;
        if (contextChanged) {
          discardDraft();
          if (mode === "read-failed") {
            attempt = originalAttempt;
            messageText = "Creation outcome is unknown. Retry the read before creating again.";
          } else mode = "editing";
          dialog.close();
          return;
        }
        draftScope = callbacks.current();
        mode = "editing";
        messageText = "";
        paint();
      }
    });
    actions.append(cancelRoot, forgetRoot, retryRoot, inspectRoot, submitRoot);
    form.append(heading, nameRoot, goalRoot, message, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitChange();
    });
    dialog.append(form);
    document.body.append(dialog);
    const sameContext = (scope) => {
      const current = callbacks.current();
      return current?.directory === scope.directory && current.root === scope.root;
    };
    function discardDraft() {
      draftScope = null;
      name = "";
      goal = "";
      messageText = "";
      nameField.update({ value: "", error: void 0 });
      goalField.update({ value: "", error: void 0 });
    }
    dialog.addEventListener("close", () => {
      if (!attempt && draftScope && !sameContext(draftScope)) discardDraft();
    });
    function paint() {
      if (disposed) return;
      const current = callbacks.current();
      const origin = attempt?.scope ?? draftScope;
      const usable = origin ? sameContext(origin) : current !== null;
      const busy = mode === "submitting" || mode === "reconciling";
      nameField.update({ disabled: busy || mode === "read-failed" || mode === "observed-existing" });
      goalField.update({ disabled: busy || mode === "read-failed" || mode === "observed-existing" });
      submit.update({ disabled: mode !== "editing" || !usable, loading: mode === "submitting" });
      retryRoot.hidden = mode !== "read-failed";
      retry.update({ disabled: mode !== "read-failed", loading: mode === "reconciling" });
      inspectRoot.hidden = mode !== "observed-existing";
      inspect.update({ disabled: mode !== "observed-existing" || !usable });
      forgetRoot.hidden = !attempt || busy || mode === "read-failed" && usable;
      forget.update({ disabled: busy });
      const contextNotice = origin && !usable ? ` Return to ${origin.directory} (OpenSpec root ${origin.root}) to inspect or submit in the original project.` : "";
      message.textContent = messageText + contextNotice;
      message.hidden = !message.textContent;
    }
    async function reconcile() {
      if (!attempt || mode !== "reconciling" && mode !== "read-failed") return;
      const original = attempt;
      const currentGeneration = ++generation;
      mode = "reconciling";
      messageText = "Checking the original project for a matching change\u2026";
      paint();
      try {
        const listing = await client.list(original.scope.directory, original.scope.root);
        if (disposed || currentGeneration !== generation) return;
        if (listing.changes.some((entry) => entry.id === original.name)) {
          mode = "observed-existing";
          messageText = "Creation outcome is unknown. An existing change with this name was found for inspection.";
        } else {
          mode = "editing";
          messageText = "Creation outcome is unknown. The original project was refreshed; no matching change was found.";
        }
      } catch (caught) {
        if (disposed || currentGeneration !== generation) return;
        mode = "read-failed";
        messageText = `Creation outcome is unknown. ${caught instanceof Error ? caught.message : "The original project could not be read."} Retry the read before creating again.`;
      }
      paint();
    }
    async function submitChange() {
      if (mode !== "editing" || disposed) return;
      const current = callbacks.current();
      if (!current || draftScope && !sameContext(draftScope) || attempt && !sameContext(attempt.scope)) {
        paint();
        return;
      }
      const submittedName = name.trim();
      const submittedGoal = goal.trim();
      if (!isChangeName(submittedName)) {
        nameField.update({ error: "Use lowercase letters or digits separated by single hyphens." });
        return;
      }
      if (!submittedGoal) {
        goalField.update({ error: "Goal is required." });
        return;
      }
      attempt = { scope: current, name: submittedName, goal: submittedGoal };
      const original = attempt;
      const currentGeneration = ++generation;
      mode = "submitting";
      messageText = "";
      paint();
      try {
        await client.create(original.scope, original.name, original.goal);
        if (disposed || currentGeneration !== generation) return;
        mode = "confirmed-success";
        messageText = "Change created.";
        paint();
        if (sameContext(original.scope)) callbacks.created(original.scope);
        if (dialog.open) dialog.close();
        attempt = null;
        draftScope = null;
        name = "";
        goal = "";
        nameField.update({ value: "" });
        goalField.update({ value: "" });
        mode = "editing";
        messageText = "";
        paint();
      } catch (caught) {
        if (disposed || currentGeneration !== generation) return;
        if (caught instanceof ServiceRequestError && !caught.outcome && caught.code !== "CLI_TIMEOUT") {
          mode = "editing";
          messageText = caught.message;
          paint();
          return;
        }
        mode = "reconciling";
        await reconcile();
      }
    }
    return {
      open() {
        if (!disposed && !dialog.open) {
          if (!attempt && draftScope && !sameContext(draftScope)) discardDraft();
          draftScope ??= callbacks.current();
          paint();
          dialog.showModal();
        }
      },
      update: paint,
      dispose() {
        disposed = true;
        generation++;
        dismiss.dispose();
        submit.dispose();
        retry.dispose();
        inspect.dispose();
        forget.dispose();
        nameField.dispose();
        goalField.dispose();
        if (dialog.open) dialog.close();
        dialog.remove();
      }
    };
  }

  // src/panel/delete-dialog.ts
  function mountDeleteDialog(root2, client, callbacks) {
    const dialog = document.createElement("dialog");
    const heading = document.createElement("h2");
    heading.id = "delete-change-title";
    dialog.setAttribute("aria-labelledby", heading.id);
    const description = document.createElement("p");
    const message = document.createElement("p");
    message.setAttribute("role", "status");
    const actions = document.createElement("div");
    actions.className = "delete-actions";
    const cancelRoot = document.createElement("span");
    const retryRoot = document.createElement("span");
    const deleteRoot = document.createElement("span");
    let target = null;
    let mode = "confirming";
    let disposed = false;
    const unresolved = /* @__PURE__ */ new Set();
    const key = (attempt) => JSON.stringify([attempt.scope.directory, attempt.scope.root, attempt.name]);
    const matches = (attempt) => {
      const current = callbacks.current();
      return current?.scope === attempt.scope && current.epoch === attempt.epoch && current.selection === attempt.selection && current.name === attempt.name;
    };
    function close() {
      dialog.close();
      target = null;
      mode = "confirming";
      message.textContent = "";
    }
    const cancel = mountButton(cancelRoot, {
      label: "cancel",
      variant: "secondary",
      size: "sm",
      onClick: () => {
        if (mode === "confirming" || mode === "present") close();
      }
    });
    const retry = mountButton(retryRoot, {
      label: "Retry read",
      variant: "secondary",
      size: "sm",
      onClick: () => {
        if (target && mode === "unresolved") void reconcile(target);
      }
    });
    const confirm = mountButton(deleteRoot, {
      label: "delete",
      variant: "destructive",
      size: "sm",
      onClick: () => {
        if (target && mode === "confirming" && matches(target)) void remove(target);
      }
    });
    addButtonIcon(deleteRoot, "delete");
    actions.append(cancelRoot, retryRoot, deleteRoot);
    dialog.append(heading, description, message, actions);
    root2.append(dialog);
    function display() {
      message.hidden = !message.textContent;
      retryRoot.hidden = mode !== "unresolved";
      deleteRoot.hidden = mode !== "confirming" && mode !== "deleting";
      cancel.update({
        disabled: mode === "deleting" || mode === "reconciling" || mode === "unresolved",
        label: mode === "present" ? "Close" : "cancel"
      });
      confirm.update({ disabled: mode !== "confirming", loading: mode === "deleting" });
    }
    dialog.addEventListener("cancel", (event) => {
      if (mode === "deleting" || mode === "reconciling" || mode === "unresolved")
        event.preventDefault();
    });
    dialog.addEventListener("close", () => {
      if (mode !== "deleting" && mode !== "reconciling") {
        target = null;
        mode = "confirming";
        message.textContent = "";
      }
    });
    async function reconcile(attempt) {
      if (matches(attempt) && target === attempt) {
        mode = "reconciling";
        message.textContent = "Checking the original project for this change\u2026";
        display();
      }
      try {
        const listing = await client.list(attempt.scope.directory, attempt.scope.root);
        if (disposed || !matches(attempt) || target !== attempt) return;
        unresolved.delete(key(attempt));
        if (!listing.changes.some((item) => item.id === attempt.name)) {
          close();
          callbacks.removed(attempt);
        } else {
          mode = "present";
          message.textContent = "Removal was not confirmed. The change is still listed. Close and confirm again before another attempt.";
          display();
        }
      } catch {
        if (disposed || !matches(attempt) || target !== attempt) return;
        unresolved.add(key(attempt));
        mode = "unresolved";
        message.textContent = "Deletion outcome is unresolved. Retry the read of the original project before another attempt.";
        display();
      }
    }
    async function remove(attempt) {
      mode = "deleting";
      message.textContent = "";
      display();
      try {
        await client.delete(attempt.scope, attempt.name);
        if (disposed || !matches(attempt) || target !== attempt) return;
        unresolved.delete(key(attempt));
        close();
        callbacks.removed(attempt);
      } catch (caught) {
        if (disposed) return;
        if (caught instanceof ServiceRequestError && caught.outcome !== "unknown" && caught.code !== "CHANGE_UNAVAILABLE") {
          if (!matches(attempt) || target !== attempt) return;
          mode = "present";
          message.textContent = caught.message;
          display();
        } else {
          await reconcile(attempt);
        }
      }
    }
    return {
      open(attempt) {
        if (dialog.open || disposed || !matches(attempt)) return;
        target = attempt;
        mode = unresolved.has(key(attempt)) ? "unresolved" : "confirming";
        heading.textContent = `Delete ${attempt.name}?`;
        description.textContent = `Permanently remove the planning folder for ${attempt.name}? This does not undo implementation or delete main specifications.`;
        message.textContent = mode === "unresolved" ? "Deletion outcome is unresolved. Retry the read of the original project before another attempt." : "";
        display();
        dialog.showModal();
        cancelRoot.querySelector("button")?.focus();
      },
      update() {
        if (target && !matches(target)) {
          if (mode === "deleting" || mode === "reconciling" || mode === "unresolved")
            unresolved.add(key(target));
          dialog.close();
          target = null;
        }
      },
      dispose() {
        disposed = true;
        dialog.close();
        cancel.dispose();
        retry.dispose();
        confirm.dispose();
        dialog.remove();
      }
    };
  }

  // src/panel/controller.ts
  function mountController(host2, appRoot) {
    const client = createClient(host2);
    const resources = createResources(client);
    let directory = null;
    let scope = null;
    let sessionId = null;
    let epoch = 0;
    let boardOperation = 0;
    let boardActive = false;
    let reconcileQueued = false;
    let pendingInspection = null;
    let changes = [];
    let staleIds = /* @__PURE__ */ new Set();
    let unavailableIds = /* @__PURE__ */ new Set();
    let failures = [];
    let listedCount = 0;
    let completedTasks = 0;
    let totalTasks = 0;
    let pendingSummaries = 0;
    let loading = false;
    let settled = false;
    let errorMessage = null;
    let search = "";
    let selectedChange = null;
    let selectedArtifact = "";
    let activeView = "document";
    let taskState = null;
    let files = /* @__PURE__ */ new Map();
    let selection2 = 0;
    let detailOpening = 0;
    let readGeneration = 0;
    let boardScroll = 0;
    function invalidate() {
      epoch++;
      boardOperation++;
      boardActive = false;
      reconcileQueued = false;
      pendingInspection = null;
      scope = null;
      resources.setContext(null);
      changes = [];
      staleIds = /* @__PURE__ */ new Set();
      unavailableIds = /* @__PURE__ */ new Set();
      failures = [];
      listedCount = completedTasks = totalTasks = pendingSummaries = 0;
      loading = settled = false;
      selectedChange = null;
      selectedArtifact = "";
      taskState = null;
      files = /* @__PURE__ */ new Map();
      selection2++;
      detailOpening++;
      readGeneration++;
      search = "";
      errorMessage = null;
      render();
    }
    function loadBoard(refresh = false, reconcile = false) {
      if (boardActive) {
        if (reconcile) reconcileQueued = true;
        return;
      }
      const currentDirectory = directory;
      if (!currentDirectory) {
        invalidate();
        return;
      }
      if (refresh) {
        resources.refresh();
        readGeneration++;
        detailOpening++;
        files = /* @__PURE__ */ new Map();
        taskState = null;
      }
      boardActive = true;
      const operation = ++boardOperation;
      const startingEpoch = epoch;
      loading = true;
      errorMessage = null;
      render();
      void (async () => {
        try {
          const listing = await client.list(currentDirectory);
          if (directory !== currentDirectory || epoch !== startingEpoch || operation !== boardOperation)
            return;
          if (scope && scope.root !== listing.root) {
            invalidate();
            loadBoard();
            return;
          }
          scope = scope?.root === listing.root ? scope : { directory: currentDirectory, root: listing.root };
          const current = scope;
          resources.setContext(current);
          const listed = new Set(listing.changes.map((entry) => entry.id));
          if (selectedChange && !listed.has(selectedChange.id)) {
            unavailableIds.add(selectedChange.id);
            detailOpening++;
          }
          if (pendingInspection?.scope === current && pendingInspection.epoch === epoch && operation >= pendingInspection.minOperation && !listed.has(pendingInspection.name)) {
            pendingInspection = null;
            errorMessage = "The observed change is no longer available for inspection.";
          }
          for (const change of changes)
            if (!listed.has(change.id)) resources.invalidateChange(current, change.id);
          changes = changes.filter((change) => listed.has(change.id));
          staleIds = new Set([...staleIds].filter((id) => listed.has(id)));
          unavailableIds = new Set(
            [...unavailableIds].filter((id) => listed.has(id) || id === selectedChange?.id)
          );
          failures = failures.filter((item) => listed.has(item.id));
          listedCount = listing.changes.length;
          completedTasks = listing.changes.reduce((count2, entry) => count2 + entry.completedTasks, 0);
          totalTasks = listing.changes.reduce((count2, entry) => count2 + entry.totalTasks, 0);
          pendingSummaries = listedCount;
          settled = true;
          render();
          let next = 0;
          async function worker() {
            while (next < listing.changes.length && epoch === startingEpoch && scope === current && operation === boardOperation) {
              const entry = listing.changes[next++];
              try {
                const summary = await client.summary(current, entry);
                if (epoch !== startingEpoch || scope !== current || operation !== boardOperation)
                  return;
                const derived = deriveChange(summary);
                changes = [...changes.filter((item) => item.id !== derived.id), derived].sort(
                  (a, b) => a.id.localeCompare(b.id)
                );
                unavailableIds.delete(derived.id);
                if (selectedChange?.id === derived.id) {
                  selectedChange = derived;
                  if (refresh) {
                    const owner = taskArtifact(derived);
                    const valid = derived.artifacts.some(
                      (item) => item.id === (activeView === "tasks" ? owner : selectedArtifact)
                    );
                    if (!valid) {
                      const first = derived.artifacts.find(
                        (item) => item.id !== owner && derived.documents?.some((document2) => document2.artifactId === item.id)
                      );
                      selectedArtifact = first?.id ?? derived.artifacts[0]?.id ?? "";
                      activeView = selectedArtifact === owner || !selectedArtifact ? "tasks" : "document";
                    }
                    startContent(derived);
                  }
                }
                staleIds.delete(derived.id);
                failures = failures.filter((item) => item.id !== derived.id);
                if (pendingInspection?.scope === current && pendingInspection.epoch === epoch && operation >= pendingInspection.minOperation && pendingInspection.name === derived.id) {
                  pendingInspection = null;
                  openDetail(derived, current, epoch);
                }
              } catch (caught) {
                if (epoch !== startingEpoch || scope !== current || operation !== boardOperation)
                  return;
                if (caught instanceof ServiceRequestError && caught.code === "ROOT_CHANGED") {
                  invalidate();
                  loadBoard();
                  return;
                }
                failures = [
                  ...failures.filter((item) => item.id !== entry.id),
                  {
                    id: entry.id,
                    error: caught instanceof Error ? caught.message : "Change could not be read."
                  }
                ];
                if (changes.some((item) => item.id === entry.id)) staleIds.add(entry.id);
                if (caught instanceof ServiceRequestError && caught.code === "CHANGE_UNAVAILABLE")
                  unavailableIds.add(entry.id);
                if (pendingInspection?.scope === current && pendingInspection.name === entry.id)
                  pendingInspection = null;
              } finally {
                if (epoch === startingEpoch && scope === current && operation === boardOperation) {
                  pendingSummaries--;
                  render();
                }
              }
            }
          }
          await Promise.all(
            Array.from({ length: Math.min(3, listing.changes.length) }, () => worker())
          );
        } catch (caught) {
          if (directory !== currentDirectory || epoch !== startingEpoch || operation !== boardOperation)
            return;
          errorMessage = caught instanceof Error ? caught.message : "The board could not be loaded.";
        } finally {
          if (epoch === startingEpoch && directory === currentDirectory && operation === boardOperation) {
            loading = false;
            boardActive = false;
            render();
            if (reconcileQueued) {
              reconcileQueued = false;
              loadBoard(true);
            }
          }
        }
      })();
    }
    function actionPrompt(change, intent) {
      const target = `OpenSpec change "${change.id}"`;
      const goal = change.goal?.trim() ? `
Goal: ${change.goal}` : "";
      if (intent === "explore")
        return `/openspec-explore ${change.id}${goal}

Investigate the goal, relevant code, options and trade-offs for ${target}. Discuss findings without file changes or implementation. If no goal is recorded, inspect existing context and ask the user to clarify it if necessary; do not invent a goal.`;
      if (change.stage === "planning")
        return `/openspec-propose ${change.id} (existing change)${goal}

Inspect ${target}'s status and current metadata. Preserve existing decisions and any recorded goal; only if current metadata has no goal, establish and record a concise goal from existing change context. Ask the user for clarification if the goal is unclear. Finish planning this existing scaffold and complete missing planning artefacts using OpenSpec's artefact instructions. Do not create another change or implement code. If the skill requires new-change creation, explain the conflict rather than creating another change.`;
      if (change.stage === "ready" || change.stage === "progress") {
        const progress = change.stage === "progress" ? `
${change.completedTasks} of ${change.totalTasks} tasks complete. Pick up where implementation left off and complete the remaining tasks.` : "";
        return `/openspec-apply-change ${change.id}${progress}

Complete all remaining tasks in ${target}, then verify the implementation against its change artefacts. Resolve any issues found and verify again until all tasks are complete and verification passes. If blocked, report the blocker rather than marking unfinished work complete.`;
      }
      if (intent === "verify") return `/openspec-verify-change ${change.id}`;
      return `/openspec-archive-change ${change.id}`;
    }
    async function preparePrompt(change, captured, originatingEpoch, intent) {
      const current = changes.find((item) => item.id === change.id);
      if (!captured || scope !== captured || epoch !== originatingEpoch || unavailableIds.has(change.id) || !current || intent === "verify" && current.stage !== "complete" || intent === "explore" && current.stage !== "planning" || intent === "primary" && current.stage !== change.stage)
        return;
      const expectedSession = sessionId;
      try {
        await host2.compose({ text: actionPrompt(change, intent), mode: "replace" });
        if (scope !== captured || epoch !== originatingEpoch || sessionId !== expectedSession) return;
        await host2.toast({
          kind: "success",
          message: "Workflow prompt prepared in the open composer."
        });
      } catch (caught) {
        if (scope !== captured || epoch !== originatingEpoch || sessionId !== expectedSession) return;
        await host2.toast({
          kind: "error",
          message: caught instanceof HostRequestError ? caught.message : "The workflow prompt could not be prepared."
        });
      }
    }
    function applyContentError(state, captured, change) {
      if (!(state?.error instanceof ServiceRequestError)) return false;
      if (state.error.code === "ROOT_CHANGED") {
        invalidate();
        loadBoard();
        return true;
      }
      if (state.error.code === "CHANGE_UNAVAILABLE") {
        unavailableIds.add(change);
        return true;
      }
      return false;
    }
    function readTasks(retry = false) {
      if (!scope || !selectedChange || unavailableIds.has(selectedChange.id)) return;
      const captured = scope;
      const change = selectedChange.id;
      const opening = detailOpening;
      const generation = readGeneration;
      const read = resources.tasks(captured, change, retry);
      taskState = read.state;
      if (applyContentError(read.state, captured, change)) {
        render();
        return;
      }
      render();
      if (read.completion)
        void read.completion.then((result) => {
          if (scope !== captured || selectedChange?.id !== change || detailOpening !== opening || readGeneration !== generation || unavailableIds.has(change))
            return;
          if (applyContentError(result, captured, change) && scope !== captured) return;
          taskState = result;
          render();
        });
    }
    function readFile(artifact, selector, retry = false) {
      if (!scope || !selectedChange || unavailableIds.has(selectedChange.id)) return null;
      const captured = scope;
      const change = selectedChange.id;
      const generation = readGeneration;
      const opening = detailOpening;
      const key = documentKey(artifact, selector);
      const read = resources.document(captured, change, artifact, selector, retry);
      files.set(key, read.state);
      if (applyContentError(read.state, captured, change)) {
        render();
        return null;
      }
      render();
      if (read.completion)
        void read.completion.then((result) => {
          if (scope !== captured || selectedChange?.id !== change || readGeneration !== generation || detailOpening !== opening || unavailableIds.has(change))
            return;
          if (applyContentError(result, captured, change) && scope !== captured) return;
          files.set(key, result);
          render();
        });
      return read.completion;
    }
    function selectArtifact(artifact) {
      if (!selectedChange || !scope) return;
      selectedArtifact = artifact;
      selection2++;
      if (taskArtifact(selectedChange) === artifact) {
        activeView = "tasks";
        render();
        return;
      }
      activeView = "document";
      render();
    }
    function startContent(change) {
      if (!scope || selectedChange?.id !== change.id) return;
      const captured = scope;
      const opening = ++detailOpening;
      const generation = readGeneration;
      const current = () => scope === captured && selectedChange?.id === change.id && detailOpening === opening && readGeneration === generation && !unavailableIds.has(change.id);
      const documents = change.documents ?? [];
      files = new Map(
        documents.filter((item) => item.artifactId !== "tasks").map((item) => [
          documentKey(item.artifactId, item.selector),
          resources.documentState(captured, change.id, item.artifactId, item.selector) ?? {
            value: null,
            pending: true,
            error: null
          }
        ])
      );
      taskState = resources.taskState(captured, change.id);
      if (applyContentError(taskState, captured, change.id) && scope !== captured) return;
      for (const state of files.values())
        if (applyContentError(state, captured, change.id) && scope !== captured) return;
      render();
      if (unavailableIds.has(change.id)) return;
      readTasks();
      const groups = change.artifacts.filter((item) => item.id !== "tasks");
      const standard = groups.every((item) => ["proposal", "specs", "design"].includes(item.id));
      if (standard)
        groups.sort(
          (a, b) => ["proposal", "specs", "design"].indexOf(a.id) - ["proposal", "specs", "design"].indexOf(b.id)
        );
      void (async () => {
        for (const group of groups) {
          if (!current()) return;
          const reads = documents.filter((item) => item.artifactId === group.id).map((item) => readFile(group.id, item.selector));
          await Promise.all(reads);
        }
      })();
    }
    function openDetail(change, captured, originatingEpoch) {
      if (!captured || scope !== captured || epoch !== originatingEpoch || unavailableIds.has(change.id) || !changes.some((item) => item.id === change.id))
        return;
      selectedChange = change;
      boardScroll = window.scrollY;
      selectedArtifact = "";
      render();
      const first = change.artifacts.find(
        (item) => item.id !== taskArtifact(change) && change.documents?.some((document2) => document2.artifactId === item.id)
      );
      selectArtifact(first?.id ?? change.artifacts[0]?.id ?? "");
      startContent(change);
      queueMicrotask(() => appRoot.querySelector(".detail-back button")?.focus());
    }
    const createView = mountCreateDialog(client, {
      current: () => scope,
      created: (origin) => {
        if (scope?.directory === origin.directory && scope.root === origin.root)
          loadBoard(true, true);
      },
      inspect: (origin, name) => {
        if (scope?.directory !== origin.directory || scope.root !== origin.root) return;
        pendingInspection = { scope, epoch, name, minOperation: boardOperation + 1 };
        loadBoard(true, true);
      }
    });
    async function openHelp() {
      try {
        await host2.openUrl("https://openspec.dev/docs/quickstart");
      } catch (caught) {
        await host2.toast({
          kind: "error",
          message: caught instanceof HostRequestError ? caught.message : "Cannot open quickstart"
        });
      }
    }
    const boardView = mountBoardView(appRoot, {
      help: () => void openHelp(),
      create: () => {
        if (scope) createView.open();
      },
      retry: () => loadBoard(true),
      search: (value) => {
        search = value;
        render();
      }
    });
    const detailRoot = document.createElement("div");
    appRoot.append(detailRoot);
    const deleteView = mountDeleteDialog(appRoot, client, {
      current: () => selectedChange && scope ? { scope, epoch, selection: selection2, name: selectedChange.id } : null,
      removed: (attempt) => {
        if (scope !== attempt.scope || epoch !== attempt.epoch || selectedChange?.id !== attempt.name)
          return;
        boardOperation++;
        boardActive = false;
        reconcileQueued = false;
        pendingSummaries = 0;
        selection2++;
        detailOpening++;
        selectedChange = null;
        changes = changes.filter((change) => change.id !== attempt.name);
        unavailableIds.add(attempt.name);
        staleIds.delete(attempt.name);
        failures = failures.filter((item) => item.id !== attempt.name);
        if (pendingInspection?.name === attempt.name) pendingInspection = null;
        resources.invalidateChange(attempt.scope, attempt.name);
        render();
        loadBoard(true, true);
        queueMicrotask(
          () => appRoot.querySelector('input[aria-label="Search changes"]')?.focus()
        );
      }
    });
    const detailView = mountDetailView(detailRoot, {
      refresh: () => loadBoard(true),
      delete: () => {
        if (scope && selectedChange && !unavailableIds.has(selectedChange.id))
          deleteView.open({ scope, epoch, selection: selection2, name: selectedChange.id });
      },
      close: () => {
        const name = selectedChange?.id;
        selection2++;
        detailOpening++;
        selectedChange = null;
        render();
        requestAnimationFrame(() => window.scrollTo(0, boardScroll));
        queueMicrotask(() => {
          const opener = [...appRoot.querySelectorAll(".card-main")].find(
            (button2) => button2.textContent === name
          );
          (opener ?? appRoot.querySelector('input[aria-label="Search changes"]'))?.focus();
        });
      },
      selectArtifact,
      selectTasks: () => {
        selectedArtifact = taskArtifact(selectedChange) ?? "";
        selection2++;
        activeView = "tasks";
        render();
      },
      retryTasks: () => readTasks(true),
      retryDocument: (artifact, selector) => {
        void readFile(artifact, selector, true);
      },
      action: (intent) => {
        if (selectedChange) void preparePrompt(selectedChange, scope, epoch, intent);
      }
    });
    function render() {
      createView.update();
      deleteView.update();
      const captured = scope;
      const originatingEpoch = epoch;
      boardView.update({
        directory,
        canCreate: !!scope,
        search,
        listedCount,
        completedTasks,
        totalTasks,
        pendingSummaries,
        loading,
        settled,
        error: errorMessage,
        failures,
        cards: changes.map((change) => ({
          change,
          stale: staleIds.has(change.id),
          unavailable: unavailableIds.has(change.id),
          open: () => openDetail(
            changes.find((item) => item.id === change.id) ?? change,
            captured,
            originatingEpoch
          ),
          action: (intent) => void preparePrompt(
            changes.find((item) => item.id === change.id) ?? change,
            captured,
            originatingEpoch,
            intent
          )
        }))
      });
      boardView.setVisible(!selectedChange);
      detailView.update(
        selectedChange ? {
          change: selectedChange,
          selectedArtifact,
          activeView,
          files,
          tasks: taskState,
          unavailable: unavailableIds.has(selectedChange.id),
          loading,
          refreshError: errorMessage ?? failures.find((item) => item.id === selectedChange?.id)?.error ?? null
        } : null
      );
    }
    const offReady = host2.onReady((ready) => {
      const changed = directory !== ready.directory;
      directory = ready.directory;
      sessionId = ready.session?.id ?? null;
      if (changed) {
        invalidate();
        loadBoard();
      } else render();
    });
    const offDirectory = host2.onDirectory((nextDirectory) => {
      if (directory === nextDirectory) return;
      directory = nextDirectory;
      invalidate();
      loadBoard();
    });
    const offSession = host2.onSession((nextSession) => {
      sessionId = nextSession?.id ?? null;
    });
    return () => {
      epoch++;
      selection2++;
      detailOpening++;
      offReady();
      offDirectory();
      offSession();
      resources.dispose();
      boardView.dispose();
      detailView.dispose();
      deleteView.dispose();
      createView.dispose();
      detailRoot.remove();
    };
  }

  // src/panel.ts
  var root = document.querySelector("#root");
  if (!root) throw new Error("Panel root is missing");
  var host = connectHost();
  var offTheme = host.onReady((ready) => {
    applyHostReady(ready, document.documentElement);
    document.documentElement.classList.add("oc-themed");
    root.style.visibility = "visible";
  });
  var unmount = mountController(host, root);
  window.addEventListener(
    "pagehide",
    () => {
      offTheme();
      unmount();
      host.dispose();
    },
    { once: true }
  );
})();
