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
    const text2 = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text2) {
      next.text = text2;
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
          const text2 = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text2 || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
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
          const text2 = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text2 || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
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
      writeClipboard: (text2) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text: text2 }
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
  var setText = (node, text2) => {
    const next = text2 ?? "";
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
      const text2 = props.error ?? props.helper ?? "";
      setText(note, text2);
      note.hidden = text2 === "";
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
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg2.setAttribute("viewBox", "0 0 24 24");
    svg2.setAttribute("aria-hidden", "true");
    svg2.setAttribute("fill", "none");
    svg2.setAttribute("stroke", "currentColor");
    svg2.setAttribute("stroke-width", "1.8");
    svg2.setAttribute("stroke-linecap", "round");
    svg2.setAttribute("stroke-linejoin", "round");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[name]);
    svg2.append(path);
    root2.querySelector("button").prepend(svg2);
  }

  // src/panel/area-badges.ts
  function mountAreaBadges(parent) {
    const group = document.createElement("div");
    group.className = "affected-areas";
    group.hidden = true;
    parent.append(group);
    let signature = "[]";
    let handles = [];
    function clear() {
      handles.forEach((handle) => handle.dispose());
      handles = [];
      group.replaceChildren();
    }
    return {
      update(areas) {
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
      }
    };
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
        node.append(title);
        const areas = mountAreaBadges(node);
        node.append(progressLabel, progressRoot, actionRoot, status);
        entry = {
          node,
          title,
          areas,
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
      entry.areas.update(change.affectedAreas);
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
          entry.areas.dispose();
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
          entry.areas.dispose();
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

  // node_modules/marked/lib/marked.esm.js
  function I() {
    return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
  }
  var y = I();
  function W(l3) {
    y = l3;
  }
  var A = { exec: () => null };
  function C(l3) {
    let e = [];
    return (t) => {
      let n = Math.max(0, Math.min(3, t - 1)), s = e[n];
      return s || (s = l3(n), e[n] = s), s;
    };
  }
  function h(l3, e = "") {
    let t = typeof l3 == "string" ? l3 : l3.source, n = { replace: (s, r) => {
      let o = typeof r == "string" ? r : r.source;
      return o = o.replace(x.caret, "$1"), t = t.replace(s, o), n;
    }, getRegex: () => new RegExp(t, e) };
    return n;
  }
  var _e = ((l3 = "") => {
    try {
      return !!new RegExp("(?<=1)(?<!1)" + l3);
    } catch {
      return false;
    }
  })();
  var x = { codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, endingSpaceTabChar: /[ \t]$/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, leadingSpaceTab: /^[ \t]+/, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/g, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l3) => new RegExp(`^( {0,3}${l3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: C((l3) => new RegExp(`^ {0,${l3}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)), fencesBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:\`\`\`|~~~)`)), headingBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}#`)), htmlBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:</?(?:${N})(?: +|$|/?>)|<(?:script|pre|style|textarea|!--))`, "i")), blockquoteBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}>`)) };
  var $e = /^(?:[ \t]*(?:\n|$))+/;
  var Le = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
  var ze = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
  var G = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
  var Ae = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
  var J = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
  var ce = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
  var he = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
  var Ee = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
  var V = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
  var Me = /^[^\n]+/;
  var Y = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
  var Ie = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Y).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
  var Ce = h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, J).getRegex();
  var N = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
  var ee = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
  var Be = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", ee).replace("tag", N).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
  var de = (l3) => h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l3).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
  var De = de(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
  var qe = de(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
  var ve = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", qe).getRegex();
  var te = { blockquote: ve, code: Le, def: Ie, fences: ze, heading: Ae, hr: G, html: Be, lheading: he, list: Ce, newline: $e, paragraph: De, table: A, text: Me };
  var le = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
  var Ze = { ...te, lheading: Ee, table: le, paragraph: h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", le).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex() };
  var He = { ...te, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", ee).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: A, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(V).replace("hr", G).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", he).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
  var Ge = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
  var Ne = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
  var ke = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
  var Qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
  var $ = /[\p{P}\p{S}]/u;
  var B = /[\s\p{P}\p{S}]/u;
  var Q = /[^\s\p{P}\p{S}]/u;
  var je = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, B).getRegex();
  var Fe = /[\p{Pi}\p{Ps}"']/u;
  var ge = /(?!~)[\p{P}\p{S}]/u;
  var Ue = /(?!~)[\s\p{P}\p{S}]/u;
  var Ke = /(?:[^\s\p{P}\p{S}]|~)/u;
  var We = h(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", _e ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
  var fe = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
  var Xe = h(fe, "u").replace(/punct/g, $).getRegex();
  var Je = h(fe, "u").replace(/punct/g, ge).getRegex();
  var Ve = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
  var Ye = h(Ve, "u").replace(/openQuote/g, Fe).replace(/punct/g, $).getRegex();
  var me = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
  var et = h(me, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
  var tt = h(me, "gu").replace(/notPunctSpace/g, Ke).replace(/punctSpace/g, Ue).replace(/punct/g, ge).getRegex();
  var nt = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
  var rt = h(nt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
  var st = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
  var it = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
  var ot = h(it, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
  var at = h(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, $).getRegex();
  var lt = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
  var ut = h(lt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
  var pt = h(/\\(punct)/, "gu").replace(/punct/g, $).getRegex();
  var ct = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
  var ht = h(ee).replace("(?:-->|$)", "-->").getRegex();
  var dt = h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ht).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
  var xe = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
  var U = h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", xe).getRegex();
  var kt = h(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", U).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
  var gt = h(/^!?\[(label)\]\[(ref)\]/).replace("label", U).replace("ref", Y).getRegex();
  var ft = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", Y).getRegex();
  var ue = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
  var mt = h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", xe).getRegex();
  var xt = h("reflink|nolink(?!\\()", "g").replace("reflink", h(/^!?\[(label)\]\[(ref)\]/).replace("label", mt).replace("ref", ue).getRegex()).replace("nolink", h(/^!?\[(ref)\](?:\[\])?/).replace("ref", ue).getRegex()).getRegex();
  var pe = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
  var bt = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
  var Rt = h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, bt).getRegex();
  var ne = { _backpedal: A, anyPunctuation: pt, autolink: ct, blockSkip: We, br: ke, code: Ne, del: A, delLDelim: A, delRDelim: A, emStrongLDelim: Xe, emStrongRDelimAst: et, emStrongRDelimUnd: st, escape: Ge, link: kt, nolink: ft, punctuation: je, reflink: gt, reflinkSearch: xt, tag: dt, text: Qe, url: A };
  var Tt = { ...ne, emStrongLDelim: Ye, emStrongRDelimAst: rt, emStrongRDelimUnd: ot, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", U).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", U).getRegex() };
  var X = { ...ne, emStrongRDelimAst: tt, emStrongLDelim: Je, delLDelim: at, delRDelim: ut, url: h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", Rt).replace("protocol", pe).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", pe).replace(/emailProtocol/g, /(?:mailto|xmpp):/).getRegex() };
  var Ot = { ...X, br: h(ke).replace("{2,}", "*").getRegex(), text: h(X.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
  var j = { normal: te, gfm: Ze, pedantic: He };
  var D = { normal: ne, gfm: X, breaks: Ot, pedantic: Tt };
  var wt = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var be = (l3) => wt[l3];
  function O(l3, e) {
    if (e) {
      if (x.escapeTest.test(l3)) return l3.replace(x.escapeReplace, be);
    } else if (x.escapeTestNoEncode.test(l3)) return l3.replace(x.escapeReplaceNoEncode, be);
    return l3;
  }
  function Re(l3) {
    return l3.replace(x.numericCharacterReference, (e, t, n) => {
      let s = t === void 0 ? Number.parseInt(n, 16) : Number.parseInt(t, 10);
      return s === 0 || s > 1114111 || s >= 55296 && s <= 57343 ? "\uFFFD" : String.fromCodePoint(s);
    });
  }
  function re(l3) {
    try {
      l3 = encodeURI(l3).replace(x.percentDecode, "%");
    } catch {
      return null;
    }
    return l3;
  }
  function se(l3, e) {
    let t = l3.replace(x.findPipe, (r, o, i) => {
      let u = false, a = o;
      for (; --a >= 0 && i[a] === "\\"; ) u = !u;
      return u ? "|" : " |";
    }), n = t.split(x.splitPipe), s = 0;
    if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
    else for (; n.length < e; ) n.push("");
    for (; s < n.length; s++) n[s] = n[s].trim().replace(x.slashPipe, "|");
    return n;
  }
  function L(l3, e, t) {
    let n = l3.length;
    if (n === 0) return "";
    let s = 0;
    for (; s < n; ) {
      let r = l3.charAt(n - s - 1);
      if (r === e && !t) s++;
      else if (r !== e && t) s++;
      else break;
    }
    return l3.slice(0, n - s);
  }
  function ie(l3) {
    let e = l3.split(`
`), t = e.length - 1;
    for (; t >= 0 && x.blankLine.test(e[t]); ) t--;
    return e.length - t <= 2 ? l3 : e.slice(0, t + 1).join(`
`);
  }
  function q(l3) {
    return l3.trim().toLowerCase().toUpperCase().toLowerCase();
  }
  function Te(l3, e) {
    if (l3.indexOf(e[1]) === -1) return -1;
    let t = 0;
    for (let n = 0; n < l3.length; n++) if (l3[n] === "\\") n++;
    else if (l3[n] === e[0]) t++;
    else if (l3[n] === e[1] && (t--, t < 0)) return n;
    return t > 0 ? -2 : -1;
  }
  function oe(l3, e = 0) {
    let t = e, n = "";
    for (let s of l3) if (s === "	") {
      let r = 4 - t % 4;
      n += " ".repeat(r), t += r;
    } else n += s, t++;
    return n;
  }
  function Oe(l3, e, t, n, s) {
    let r = e.href, o = e.title || null, i = l3[1].replace(s.other.outputLinkReplace, "$1"), u = l3[0].charAt(0) === "!";
    n.state.inLink = true;
    let a = n.state.linkEmitted, p = n.state.inRawBlock;
    n.state.linkEmitted = false;
    let c = n.inlineTokens(i), d = n.state.linkEmitted;
    if (n.state.linkEmitted = a, n.state.inLink = false, !u) {
      if (d) {
        n.state.inRawBlock = p;
        return;
      }
      n.state.linkEmitted = true;
    }
    return { type: u ? "image" : "link", raw: t, href: r, title: o, text: i, tokens: c };
  }
  function yt(l3, e, t) {
    let n = l3.match(t.other.indentCodeCompensation);
    if (n === null) return e;
    let s = n[1];
    return e.split(`
`).map((r) => {
      let o = r.match(t.other.beginningSpace);
      if (o === null) return r;
      let [i] = o;
      return r.slice(Math.min(i.length, s.length));
    }).join(`
`);
  }
  function we(l3, e, t, n) {
    if (!e.includes("<")) return false;
    for (let s = 0; s < e.length; s++) {
      if (e[s] === "\\") {
        s++;
        continue;
      }
      if (e[s] === "`") {
        let i = n.inline.code.exec(e.slice(s));
        if (i) {
          s += i[0].length - 1;
          continue;
        }
      }
      if (e[s] !== "<") continue;
      let r = l3.slice(t + s), o = n.inline.tag.exec(r) || n.inline.autolink.exec(r);
      if (o) {
        if (o[0].length > e.length - s) return true;
        s += o[0].length - 1;
      }
    }
    return false;
  }
  var P = class {
    options;
    rules;
    lexer;
    constructor(e) {
      this.options = e || y;
    }
    space(e) {
      let t = this.rules.block.newline.exec(e);
      if (t && t[0].length > 0) return { type: "space", raw: t[0] };
    }
    code(e) {
      let t = this.rules.block.code.exec(e);
      if (t) {
        let n = this.options.pedantic ? t[0] : ie(t[0]), s = n.replace(this.rules.other.codeRemoveIndent, "");
        return { type: "code", raw: n, codeBlockStyle: "indented", text: s };
      }
    }
    fences(e) {
      let t = this.rules.block.fences.exec(e);
      if (t) {
        let n = t[0], s = yt(n, t[3] || "", this.rules);
        return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
      }
    }
    heading(e) {
      let t = this.rules.block.heading.exec(e);
      if (t) {
        let n = t[2].trim();
        if (this.rules.other.endingHash.test(n)) {
          let s = L(n, "#");
          (this.options.pedantic || !s || this.rules.other.endingSpaceTabChar.test(s)) && (n = s.trim());
        }
        return { type: "heading", raw: L(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
      }
    }
    hr(e) {
      let t = this.rules.block.hr.exec(e);
      if (t) return { type: "hr", raw: L(t[0], `
`) };
    }
    blockquote(e) {
      let t = this.rules.block.blockquote.exec(e);
      if (t) {
        let n = L(t[0], `
`).split(`
`), s = "", r = "", o = [];
        for (; n.length > 0; ) {
          let i = false, u = [], a;
          for (a = 0; a < n.length; a++) if (this.rules.other.blockquoteStart.test(n[a])) u.push(n[a]), i = true;
          else if (!i) u.push(n[a]);
          else break;
          n = n.slice(a);
          let p = u.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
          s = s ? `${s}
${p}` : p, r = r ? `${r}
${c}` : c;
          let d = this.lexer.state.top;
          if (this.lexer.state.top = true, this.lexer.blockTokens(c, o, true), this.lexer.state.top = d, n.length === 0) break;
          let m = o.at(-1);
          if (m?.type === "code") break;
          if (m?.type === "blockquote") {
            let b = m, g = n.join(`
`), w = b.raw + `
` + g.replace(this.rules.other.blockquoteSetextReplace2, ""), f = this.blockquote(w);
            o[o.length - 1] = f;
            let M = w.substring(f.raw.length).replace(/^\n/, ""), v2 = M ? M.split(`
`).length : 0, Z = v2 ? n.slice(0, -v2) : n;
            Z.length > 0 && (s = `${s}
${Z.join(`
`)}`), r = r.substring(0, r.length - b.text.length) + f.text;
            break;
          } else if (m?.type === "list") {
            let b = m, g = b.raw + `
` + n.join(`
`), w = this.list(g);
            o[o.length - 1] = w, s = s.substring(0, s.length - m.raw.length) + w.raw, r = r.substring(0, r.length - b.raw.length) + w.raw, n = g.substring(o.at(-1).raw.length).split(`
`);
            continue;
          }
        }
        return { type: "blockquote", raw: s, tokens: o, text: r };
      }
    }
    list(e) {
      let t = this.rules.block.list.exec(e);
      if (t) {
        let n = t[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
        n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
        let o = this.rules.other.listItemRegex(n), i = false;
        for (; e; ) {
          let a = false, p = "", c = "";
          if (!(t = o.exec(e)) || this.rules.block.hr.test(e)) break;
          p = t[0], e = e.substring(p.length);
          let d = t[2].split(`
`, 1)[0], m = t[1].length, b = this.options.pedantic ? oe(d, m) : d.replace(this.rules.other.leadingSpaceTab, (M) => oe(M, m)), g = e.split(`
`, 1)[0], w = !b.trim(), f = 0;
          if (this.options.pedantic ? (f = 2, c = b.trimStart()) : w ? f = m + 1 : (f = b.search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = b.slice(f), f += m), w && this.rules.other.blankLine.test(g) && (p += g + `
`, e = e.substring(g.length + 1), a = true), !a) {
            let M = this.rules.other.nextBulletRegex(f), v2 = this.rules.other.hrRegex(f), Z = this.rules.other.fencesBeginRegex(f), ae = this.rules.other.headingBeginRegex(f), ye = this.rules.other.htmlBeginRegex(f), Pe = this.rules.other.blockquoteBeginRegex(f);
            for (; e; ) {
              let K = e.split(`
`, 1)[0], H;
              if (g = K, this.options.pedantic ? (g = g.replace(this.rules.other.listReplaceNesting, "  "), H = g) : H = g.replace(this.rules.other.leadingSpaceTab, (Se) => Se.replace(this.rules.other.tabCharGlobal, "    ")), Z.test(g) || ae.test(g) || ye.test(g) || Pe.test(g) || M.test(g) || v2.test(g)) break;
              if (H.search(this.rules.other.nonSpaceChar) >= f || !g.trim()) c += `
` + H.slice(f);
              else {
                if (w || b.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Z.test(b) || ae.test(b) || v2.test(b)) break;
                c += `
` + g;
              }
              w = !g.trim(), p += K + `
`, e = e.substring(K.length + 1), b = H.slice(f);
            }
          }
          r.loose || (i ? r.loose = true : this.rules.other.doubleBlankLine.test(p) && (i = true)), r.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), r.raw += p;
        }
        let u = r.items.at(-1);
        if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
        else return;
        r.raw = r.raw.trimEnd();
        for (let a of r.items) if (this.lexer.state.top = false, a.tokens = this.lexer.blockTokens(a.text, []), !r.loose) {
          let p = a.tokens.filter((d) => d.type === "space"), c = p.length > 0 && p.some((d) => this.rules.other.anyLine.test(d.raw));
          r.loose = c;
        }
        for (let a of r.items) {
          let p = a.tokens[0];
          if (a.task && (p?.type === "text" || p?.type === "paragraph")) {
            a.text = a.text.replace(this.rules.other.listReplaceTask, ""), p.raw = p.raw.replace(this.rules.other.listReplaceTask, ""), p.text = p.text.replace(this.rules.other.listReplaceTask, "");
            for (let d = this.lexer.inlineQueue.length - 1; d >= 0; d--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[d].src)) {
              this.lexer.inlineQueue[d].src = this.lexer.inlineQueue[d].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
            let c = this.rules.other.listTaskCheckbox.exec(a.raw);
            if (c) {
              let d = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
              a.checked = d.checked, r.loose ? a.tokens[0] && ["paragraph", "text"].includes(a.tokens[0].type) && "tokens" in a.tokens[0] && a.tokens[0].tokens ? (a.tokens[0].raw = d.raw + a.tokens[0].raw, a.tokens[0].text = d.raw + a.tokens[0].text, a.tokens[0].tokens.unshift(d)) : a.tokens.unshift({ type: "paragraph", raw: d.raw, text: d.raw, tokens: [d] }) : a.tokens.unshift(d);
            }
          } else a.task && (a.task = false);
        }
        if (r.loose) for (let a of r.items) {
          a.loose = true;
          for (let p of a.tokens) p.type === "text" && (p.type = "paragraph");
        }
        return r;
      }
    }
    html(e) {
      let t = this.rules.block.html.exec(e);
      if (t) {
        let n = ie(t[0]);
        return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
      }
    }
    def(e) {
      let t = this.rules.block.def.exec(e);
      if (t) {
        let n = q(t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
        return { type: "def", tag: n, raw: L(t[0], `
`), href: s, title: r };
      }
    }
    table(e) {
      let t = this.rules.block.table.exec(e);
      if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
      let n = se(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: L(t[0], `
`), header: [], align: [], rows: [] };
      if (n.length === s.length) {
        for (let i of s) this.rules.other.tableAlignRight.test(i) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(i) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(i) ? o.align.push("left") : o.align.push(null);
        for (let i = 0; i < n.length; i++) o.header.push({ text: n[i], tokens: this.lexer.inline(n[i]), header: true, align: o.align[i] });
        for (let i of r) o.rows.push(se(i, o.header.length).map((u, a) => ({ text: u, tokens: this.lexer.inline(u), header: false, align: o.align[a] })));
        return o;
      }
    }
    lheading(e) {
      let t = this.rules.block.lheading.exec(e);
      if (t) {
        let n = t[1].trim();
        return { type: "heading", raw: L(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
      }
    }
    paragraph(e) {
      let t = this.rules.block.paragraph.exec(e);
      if (t) {
        let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
        return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
      }
    }
    text(e) {
      let t = this.rules.block.text.exec(e);
      if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
    }
    escape(e) {
      let t = this.rules.inline.escape.exec(e);
      if (t) return { type: "escape", raw: t[0], text: t[1] };
    }
    tag(e) {
      let t = this.rules.inline.tag.exec(e);
      if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
    }
    link(e) {
      let t = this.rules.inline.link.exec(e);
      if (t) {
        let n = t[0].charAt(0) === "!" ? 2 : 1;
        if (!this.options.pedantic && we(e, t[1], n, this.rules)) return;
        let s = t[2].trim();
        if (!this.options.pedantic && this.rules.other.startAngleBracket.test(s)) {
          if (!this.rules.other.endAngleBracket.test(s)) return;
          let i = L(s.slice(0, -1), "\\");
          if ((s.length - i.length) % 2 === 0) return;
        } else {
          let i = Te(t[2], "()");
          if (i === -2) return;
          if (i > -1) {
            let a = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
            t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, a).trim(), t[3] = "";
          }
        }
        let r = t[2], o = "";
        if (this.options.pedantic) {
          let i = this.rules.other.pedanticHrefTitle.exec(r);
          i && (r = i[1], o = i[3]);
        } else o = t[3] ? t[3].slice(1, -1) : "";
        return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(s) ? r = r.slice(1) : r = r.slice(1, -1)), Oe(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: o && o.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
      }
    }
    reflink(e, t) {
      let n;
      if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
        let s = n[0].charAt(0) === "!" ? 2 : 1;
        if (!this.options.pedantic && we(e, n[1], s, this.rules)) return;
        let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), o = t[q(r)];
        if (!o) {
          let i = n[0].charAt(0);
          return { type: "text", raw: i, text: i };
        }
        return Oe(n, o, n[0], this.lexer, this.rules);
      }
    }
    emStrong(e, t, n = "") {
      let s = this.rules.inline.emStrongLDelim.exec(e);
      if (!s || !s[1] && !s[2] && !s[3] && !s[4] || s[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
      if (!(s[1] || s[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
        let o = [...s[0]].length - 1, i, u, a = o, p = 0, c = s[0][0], d = n === c, m = c === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
        for (m.lastIndex = 0, t = t.slice(-1 * e.length + o); (s = m.exec(t)) !== null; ) {
          if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i) continue;
          if (u = [...i].length, s[3] || s[4]) {
            a += u;
            continue;
          } else if (s[5] || s[6]) {
            if (o % 3 && !((o + u) % 3)) {
              p += u;
              continue;
            }
            if (d) break;
          }
          if (a -= u, a > 0) continue;
          u = Math.min(u, u + a + p);
          let b = [...s[0]][0].length, g = e.slice(0, o + s.index + b + u);
          if (Math.min(o, u) % 2) {
            let f = g.slice(1, -1);
            return { type: "em", raw: g, text: f, tokens: this.lexer.inlineTokens(f) };
          }
          let w = g.slice(2, -2);
          return { type: "strong", raw: g, text: w, tokens: this.lexer.inlineTokens(w) };
        }
      }
    }
    codespan(e) {
      let t = this.rules.inline.code.exec(e);
      if (t) {
        let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
        return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
      }
    }
    br(e) {
      let t = this.rules.inline.br.exec(e);
      if (t) return { type: "br", raw: t[0] };
    }
    del(e, t, n = "") {
      let s = this.rules.inline.delLDelim.exec(e);
      if (!s) return;
      if (!(s[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
        let o = [...s[0]].length - 1, i, u, a = o, p = this.rules.inline.delRDelim;
        for (p.lastIndex = 0, t = t.slice(-1 * e.length + o); (s = p.exec(t)) !== null; ) {
          if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i || (u = [...i].length, u !== o)) continue;
          if (s[3] || s[4]) {
            a += u;
            continue;
          }
          if (a -= u, a > 0) continue;
          u = Math.min(u, u + a);
          let c = [...s[0]][0].length, d = e.slice(0, o + s.index + c + u), m = d.slice(o, -o);
          return { type: "del", raw: d, text: m, tokens: this.lexer.inlineTokens(m) };
        }
      }
    }
    autolink(e) {
      let t = this.rules.inline.autolink.exec(e);
      if (t) {
        let n, s;
        return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
      }
    }
    url(e) {
      let t;
      if (t = this.rules.inline.url.exec(e)) {
        let n, s;
        if (t[2] === "@") n = t[0], s = "mailto:" + n;
        else {
          let r;
          do
            r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
          while (r !== t[0]);
          n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
        }
        return { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
      }
    }
    inlineText(e) {
      let t = this.rules.inline.text.exec(e);
      if (t) {
        let n = this.lexer.state.inRawBlock;
        return { type: "text", raw: t[0], text: n ? t[0] : Re(t[0]), escaped: n };
      }
    }
  };
  var R = class l {
    tokens;
    options;
    state;
    inlineQueue;
    tokenizer;
    constructor(e) {
      this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || y, this.options.tokenizer = this.options.tokenizer || new P(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
      let t = { other: x, block: j.normal, inline: D.normal };
      this.options.pedantic ? (t.block = j.pedantic, t.inline = D.pedantic) : this.options.gfm && (t.block = j.gfm, this.options.breaks ? t.inline = D.breaks : t.inline = D.gfm), this.tokenizer.rules = t;
    }
    static get rules() {
      return { block: j, inline: D };
    }
    static lex(e, t) {
      return new l(t).lex(e);
    }
    static lexInline(e, t) {
      return new l(t).inlineTokens(e);
    }
    lex(e) {
      e = e.replace(x.carriageReturn, `
`), this.blockTokens(e, this.tokens);
      for (let t = 0; t < this.inlineQueue.length; t++) {
        let n = this.inlineQueue[t];
        this.inlineTokens(n.src, n.tokens);
      }
      return this.inlineQueue = [], this.tokens;
    }
    blockTokens(e, t = [], n = false) {
      this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(x.tabCharGlobal, "    ").replace(x.spaceLine, ""));
      let s = 1 / 0;
      for (; e; ) {
        if (e.length < s) s = e.length;
        else {
          this.infiniteLoopError(e.charCodeAt(0));
          break;
        }
        let r;
        if (this.options.extensions?.block?.some((i) => (r = i.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
        if (r = this.tokenizer.space(e)) {
          e = e.substring(r.raw.length);
          let i = t.at(-1);
          r.raw.length === 1 && i !== void 0 ? i.raw += `
` : t.push(r);
          continue;
        }
        if (r = this.tokenizer.code(e)) {
          e = e.substring(r.raw.length);
          let i = t.at(-1);
          i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.at(-1).src = i.text) : t.push(r);
          continue;
        }
        if (r = this.tokenizer.fences(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.heading(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.hr(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.blockquote(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.list(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.html(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.def(e)) {
          e = e.substring(r.raw.length);
          let i = t.at(-1);
          i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.raw, this.inlineQueue.at(-1).src = i.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
          continue;
        }
        if (r = this.tokenizer.table(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.lheading(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        let o = e;
        if (this.options.extensions?.startBlock) {
          let i = 1 / 0, u = e.slice(1), a;
          this.options.extensions.startBlock.forEach((p) => {
            a = p.call({ lexer: this }, u), typeof a == "number" && a >= 0 && (i = Math.min(i, a));
          }), i < 1 / 0 && i >= 0 && (o = e.substring(0, i + 1));
        }
        if (this.state.top && (r = this.tokenizer.paragraph(o))) {
          let i = t.at(-1);
          n && i?.type === "paragraph" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r), n = o.length !== e.length, e = e.substring(r.raw.length);
          continue;
        }
        if (r = this.tokenizer.text(e)) {
          e = e.substring(r.raw.length);
          let i = t.at(-1);
          i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r);
          continue;
        }
        if (e) {
          this.infiniteLoopError(e.charCodeAt(0));
          break;
        }
      }
      return this.state.top = true, t;
    }
    inline(e, t = []) {
      return this.inlineQueue.push({ src: e, tokens: t }), t;
    }
    linkInText(e) {
      if (!e.includes("[")) return false;
      let t = this.tokenizer.rules.inline.link;
      for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
      for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
        let s = n[0], r = s.lastIndexOf("[");
        if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, q(s.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(s.slice(1, r - 1)))) return true;
      }
      return false;
    }
    inlineTokens(e, t = []) {
      this.tokenizer.lexer = this;
      let n = e;
      if (this.tokens.links && e.includes("[")) {
        let i = this.tokenizer.rules.inline.reflinkSearch, u = (a) => {
          let p = a.lastIndexOf("[");
          if (!Object.hasOwn(this.tokens.links, q(a.slice(p + 1, -1)))) return a;
          if (p > 1 && a.charAt(0) !== "!") {
            let c = a.slice(1, p - 1);
            if (this.linkInText(c)) return "[" + c.replace(i, u) + "][" + "a".repeat(a.length - p - 2) + "]";
          }
          return "[" + "a".repeat(a.length - 2) + "]";
        };
        n = n.replace(i, u);
      }
      n = n.replace(this.tokenizer.rules.inline.anyPunctuation, (i) => "+".repeat(i.length)), n = n.replace(this.tokenizer.rules.inline.blockSkip, (i, u, a) => {
        let p = a ? a.length : 0;
        return i.slice(0, p) + "[" + "a".repeat(i.length - p - 2) + "]";
      }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
      let s = false, r = "", o = 1 / 0;
      for (; e; ) {
        if (e.length < o) o = e.length;
        else {
          this.infiniteLoopError(e.charCodeAt(0));
          break;
        }
        s || (r = ""), s = false;
        let i;
        if (this.options.extensions?.inline?.some((a) => (i = a.call({ lexer: this }, e, t)) ? (e = e.substring(i.raw.length), t.push(i), true) : false)) continue;
        if (i = this.tokenizer.escape(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.tag(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.link(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.reflink(e, this.tokens.links)) {
          e = e.substring(i.raw.length);
          let a = t.at(-1);
          i.type === "text" && a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
          continue;
        }
        if (i = this.tokenizer.emStrong(e, n, r)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.codespan(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.br(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.del(e, n, r)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (i = this.tokenizer.autolink(e)) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        if (!this.state.inLink && (i = this.tokenizer.url(e))) {
          e = e.substring(i.raw.length), t.push(i);
          continue;
        }
        let u = e;
        if (this.options.extensions?.startInline) {
          let a = 1 / 0, p = e.slice(1), c;
          this.options.extensions.startInline.forEach((d) => {
            c = d.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
          }), a < 1 / 0 && a >= 0 && (u = e.substring(0, a + 1));
        }
        if (i = this.tokenizer.inlineText(u)) {
          e = e.substring(i.raw.length), i.raw.slice(-1) !== "_" && (r = i.raw.slice(-1)), s = true;
          let a = t.at(-1);
          a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
          continue;
        }
        if (e) {
          this.infiniteLoopError(e.charCodeAt(0));
          break;
        }
      }
      return t;
    }
    infiniteLoopError(e) {
      let t = "Infinite loop on byte: " + e;
      if (this.options.silent) console.error(t);
      else throw new Error(t);
    }
  };
  var S = class {
    options;
    parser;
    constructor(e) {
      this.options = e || y;
    }
    space(e) {
      return "";
    }
    code({ text: e, lang: t, escaped: n }) {
      let s = (t || "").match(x.notSpaceStart)?.[0], r = e ? e.replace(x.endingNewline, "") + `
` : "";
      return s ? '<pre><code class="language-' + O(s) + '">' + (n ? r : O(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : O(r, true)) + `</code></pre>
`;
    }
    blockquote({ tokens: e }) {
      return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
    }
    html({ text: e }) {
      return e;
    }
    def(e) {
      return "";
    }
    heading({ tokens: e, depth: t }) {
      return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
    }
    hr(e) {
      return `<hr>
`;
    }
    list(e) {
      let t = e.ordered, n = e.start, s = "";
      for (let i = 0; i < e.items.length; i++) {
        let u = e.items[i];
        s += this.listitem(u);
      }
      let r = t ? "ol" : "ul", o = t && n !== 1 ? ' start="' + n + '"' : "";
      return "<" + r + o + `>
` + s + "</" + r + `>
`;
    }
    listitem(e) {
      return `<li>${this.parser.parse(e.tokens)}</li>
`;
    }
    checkbox({ checked: e }) {
      return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
    }
    paragraph({ tokens: e }) {
      return `<p>${this.parser.parseInline(e)}</p>
`;
    }
    table(e) {
      let t = "", n = "";
      for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
      t += this.tablerow({ text: n });
      let s = "";
      for (let r = 0; r < e.rows.length; r++) {
        let o = e.rows[r];
        n = "";
        for (let i = 0; i < o.length; i++) n += this.tablecell(o[i]);
        s += this.tablerow({ text: n });
      }
      return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
`;
    }
    tablerow({ text: e }) {
      return `<tr>
${e}</tr>
`;
    }
    tablecell(e) {
      let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
      return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
    }
    strong({ tokens: e }) {
      return `<strong>${this.parser.parseInline(e)}</strong>`;
    }
    em({ tokens: e }) {
      return `<em>${this.parser.parseInline(e)}</em>`;
    }
    codespan({ text: e }) {
      return `<code>${O(e, true)}</code>`;
    }
    br(e) {
      return "<br>";
    }
    del({ tokens: e }) {
      return `<del>${this.parser.parseInline(e)}</del>`;
    }
    link({ href: e, title: t, text: n, tokens: s, autolink: r }) {
      let o = r ? O(n, true) : this.parser.parseInline(s), i = re(e);
      if (i === null) return o;
      e = O(i, r);
      let u = '<a href="' + e + '"';
      return t && (u += ' title="' + O(t) + '"'), u += ">" + o + "</a>", u;
    }
    image({ href: e, title: t, text: n, tokens: s }) {
      s && (n = this.parser.parseInline(s, this.parser.textRenderer));
      let r = re(e);
      if (r === null) return O(n);
      e = r;
      let o = `<img src="${O(e)}" alt="${O(n)}"`;
      return t && (o += ` title="${O(t)}"`), o += ">", o;
    }
    text(e) {
      return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : O(e.text);
    }
  };
  var z = class {
    strong({ text: e }) {
      return e;
    }
    em({ text: e }) {
      return e;
    }
    codespan({ text: e }) {
      return e;
    }
    del({ text: e }) {
      return e;
    }
    html({ text: e }) {
      return e;
    }
    text({ text: e }) {
      return e;
    }
    link({ text: e }) {
      return "" + e;
    }
    image({ text: e }) {
      return "" + e;
    }
    br() {
      return "";
    }
    checkbox({ raw: e }) {
      return e;
    }
  };
  var T = class l2 {
    options;
    renderer;
    textRenderer;
    constructor(e) {
      this.options = e || y, this.options.renderer = this.options.renderer || new S(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new z();
    }
    static parse(e, t) {
      return new l2(t).parse(e);
    }
    static parseInline(e, t) {
      return new l2(t).parseInline(e);
    }
    parse(e) {
      this.renderer.parser = this;
      let t = "";
      for (let n = 0; n < e.length; n++) {
        let s = e[n];
        if (this.options.extensions?.renderers?.[s.type]) {
          let o = s, i = this.options.extensions.renderers[o.type].call({ parser: this }, o);
          if (i !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(o.type)) {
            t += i || "";
            continue;
          }
        }
        let r = s;
        switch (r.type) {
          case "space": {
            t += this.renderer.space(r);
            break;
          }
          case "hr": {
            t += this.renderer.hr(r);
            break;
          }
          case "heading": {
            t += this.renderer.heading(r);
            break;
          }
          case "code": {
            t += this.renderer.code(r);
            break;
          }
          case "table": {
            t += this.renderer.table(r);
            break;
          }
          case "blockquote": {
            t += this.renderer.blockquote(r);
            break;
          }
          case "list": {
            t += this.renderer.list(r);
            break;
          }
          case "checkbox": {
            t += this.renderer.checkbox(r);
            break;
          }
          case "html": {
            t += this.renderer.html(r);
            break;
          }
          case "def": {
            t += this.renderer.def(r);
            break;
          }
          case "paragraph": {
            t += this.renderer.paragraph(r);
            break;
          }
          case "text": {
            t += this.renderer.text(r);
            break;
          }
          default: {
            let o = 'Token with "' + r.type + '" type was not found.';
            if (this.options.silent) return console.error(o), "";
            throw new Error(o);
          }
        }
      }
      return t;
    }
    parseInline(e, t = this.renderer) {
      this.renderer.parser = this;
      let n = "";
      for (let s = 0; s < e.length; s++) {
        let r = e[s];
        if (this.options.extensions?.renderers?.[r.type]) {
          let i = this.options.extensions.renderers[r.type].call({ parser: this }, r);
          if (i !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
            n += i || "";
            continue;
          }
        }
        let o = r;
        switch (o.type) {
          case "escape": {
            n += t.text(o);
            break;
          }
          case "html": {
            n += t.html(o);
            break;
          }
          case "link": {
            n += t.link(o);
            break;
          }
          case "image": {
            n += t.image(o);
            break;
          }
          case "checkbox": {
            n += t.checkbox(o);
            break;
          }
          case "strong": {
            n += t.strong(o);
            break;
          }
          case "em": {
            n += t.em(o);
            break;
          }
          case "codespan": {
            n += t.codespan(o);
            break;
          }
          case "br": {
            n += t.br(o);
            break;
          }
          case "del": {
            n += t.del(o);
            break;
          }
          case "text": {
            n += t.text(o);
            break;
          }
          default: {
            let i = 'Token with "' + o.type + '" type was not found.';
            if (this.options.silent) return console.error(i), "";
            throw new Error(i);
          }
        }
      }
      return n;
    }
  };
  var _ = class {
    options;
    block;
    constructor(e) {
      this.options = e || y;
    }
    static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
    static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
    preprocess(e) {
      return e;
    }
    postprocess(e) {
      return e;
    }
    processAllTokens(e) {
      return e;
    }
    emStrongMask(e) {
      return e;
    }
    provideLexer(e = this.block) {
      return e ? R.lex : R.lexInline;
    }
    provideParser(e = this.block) {
      return e ? T.parse : T.parseInline;
    }
  };
  var F = class {
    defaults = I();
    options = this.setOptions;
    parse = this.parseMarkdown(true);
    parseInline = this.parseMarkdown(false);
    Parser = T;
    Renderer = S;
    TextRenderer = z;
    Lexer = R;
    Tokenizer = P;
    Hooks = _;
    constructor(...e) {
      this.use(...e);
    }
    walkTokens(e, t) {
      let n = [];
      for (let s of e) switch (n = n.concat(t.call(this, s)), s.type) {
        case "table": {
          let r = s;
          for (let o of r.header) n = n.concat(this.walkTokens(o.tokens, t));
          for (let o of r.rows) for (let i of o) n = n.concat(this.walkTokens(i.tokens, t));
          break;
        }
        case "list": {
          let r = s;
          n = n.concat(this.walkTokens(r.items, t));
          break;
        }
        default: {
          let r = s;
          this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
            let i = r[o].flat(1 / 0);
            n = n.concat(this.walkTokens(i, t));
          }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, t)));
        }
      }
      return n;
    }
    use(...e) {
      let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
      return e.forEach((n) => {
        let s = { ...n };
        if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((r) => {
          if (!r.name) throw new Error("extension name required");
          if ("renderer" in r) {
            let o = t.renderers[r.name];
            o ? t.renderers[r.name] = function(...i) {
              let u = r.renderer.apply(this, i);
              return u === false && (u = o.apply(this, i)), u;
            } : t.renderers[r.name] = r.renderer;
          }
          if ("tokenizer" in r) {
            if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
            let o = t[r.level];
            o ? o.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
          }
          "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
        }), s.extensions = t), n.renderer) {
          let r = this.defaults.renderer || new S(this.defaults);
          for (let o in n.renderer) {
            if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
            if (["options", "parser"].includes(o)) continue;
            let i = o, u = n.renderer[i], a = r[i];
            r[i] = (...p) => {
              let c = u.apply(r, p);
              return c === false && (c = a.apply(r, p)), c || "";
            };
          }
          s.renderer = r;
        }
        if (n.tokenizer) {
          let r = this.defaults.tokenizer || new P(this.defaults);
          for (let o in n.tokenizer) {
            if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
            if (["options", "rules", "lexer"].includes(o)) continue;
            let i = o, u = n.tokenizer[i], a = r[i];
            r[i] = (...p) => {
              let c = u.apply(r, p);
              return c === false && (c = a.apply(r, p)), c;
            };
          }
          s.tokenizer = r;
        }
        if (n.hooks) {
          let r = this.defaults.hooks || new _();
          for (let o in n.hooks) {
            if (!(o in r)) throw new Error(`hook '${o}' does not exist`);
            if (["options", "block"].includes(o)) continue;
            let i = o, u = n.hooks[i], a = r[i];
            _.passThroughHooks.has(o) ? r[i] = (p) => {
              if (this.defaults.async && _.passThroughHooksRespectAsync.has(o)) return (async () => {
                let d = await u.call(r, p);
                return a.call(r, d);
              })();
              let c = u.call(r, p);
              return a.call(r, c);
            } : r[i] = (...p) => {
              if (this.defaults.async) return (async () => {
                let d = await u.apply(r, p);
                return d === false && (d = await a.apply(r, p)), d;
              })();
              let c = u.apply(r, p);
              return c === false && (c = a.apply(r, p)), c;
            };
          }
          s.hooks = r;
        }
        if (n.walkTokens) {
          let r = this.defaults.walkTokens, o = n.walkTokens;
          s.walkTokens = function(i) {
            let u = [];
            return u.push(o.call(this, i)), r && (u = u.concat(r.call(this, i))), u;
          };
        }
        this.defaults = { ...this.defaults, ...s };
      }), this;
    }
    setOptions(e) {
      return this.defaults = { ...this.defaults, ...e }, this;
    }
    lexer(e, t) {
      return R.lex(e, t ?? this.defaults);
    }
    parser(e, t) {
      return T.parse(e, t ?? this.defaults);
    }
    parseMarkdown(e) {
      return (n, s) => {
        let r = { ...s }, o = { ...this.defaults, ...r }, i = this.onError(!!o.silent, !!o.async);
        if (this.defaults.async === true && r.async === false) return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
        if (typeof n > "u" || n === null) return i(new Error("marked(): input parameter is undefined or null"));
        if (typeof n != "string") return i(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
        if (o.hooks && (o.hooks.options = o, o.hooks.block = e), o.async) return (async () => {
          let u = o.hooks ? await o.hooks.preprocess(n) : n, p = await (o.hooks ? await o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(u, o), c = o.hooks ? await o.hooks.processAllTokens(p) : p;
          o.walkTokens && await Promise.all(this.walkTokens(c, o.walkTokens));
          let m = await (o.hooks ? await o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(c, o);
          return o.hooks ? await o.hooks.postprocess(m) : m;
        })().catch(i);
        try {
          o.hooks && (n = o.hooks.preprocess(n));
          let a = (o.hooks ? o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(n, o);
          o.hooks && (a = o.hooks.processAllTokens(a)), o.walkTokens && this.walkTokens(a, o.walkTokens);
          let c = (o.hooks ? o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(a, o);
          return o.hooks && (c = o.hooks.postprocess(c)), c;
        } catch (u) {
          return i(u);
        }
      };
    }
    onError(e, t) {
      return (n) => {
        if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
          let s = "<p>An error occurred:</p><pre>" + O(n.message + "", true) + "</pre>";
          return t ? Promise.resolve(s) : s;
        }
        if (t) return Promise.reject(n);
        throw n;
      };
    }
  };
  var E = new F();
  function k(l3, e) {
    return E.parse(l3, e);
  }
  k.options = k.setOptions = function(l3) {
    return E.setOptions(l3), k.defaults = E.defaults, W(k.defaults), k;
  };
  k.getDefaults = I;
  k.defaults = y;
  function Pt(...l3) {
    return E.use(...l3), k.defaults = E.defaults, W(k.defaults), k;
  }
  k.use = Pt;
  k.walkTokens = function(l3, e) {
    return E.walkTokens(l3, e);
  };
  k.parseInline = E.parseInline;
  k.Parser = T;
  k.parser = T.parse;
  k.Renderer = S;
  k.TextRenderer = z;
  k.Lexer = R;
  k.lexer = R.lex;
  k.Tokenizer = P;
  k.Hooks = _;
  k.parse = k;
  var gn = k.options;
  var fn = k.setOptions;
  var mn = k.walkTokens;
  var xn = k.parseInline;
  var Rn = T.parse;
  var Tn = R.lex;

  // node_modules/dompurify/dist/purify.es.mjs
  function _OverloadYield(e, d) {
    this.v = e, this.k = d;
  }
  function _arrayLikeToArray(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _arrayWithHoles(r) {
    if (Array.isArray(r)) return r;
  }
  function _iterableToArrayLimit(r, l3) {
    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (null != t) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, 0 === l3) {
          if (Object(t) !== t) return;
          f = false;
        } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l3); f = true) ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
        } finally {
          if (o) throw n;
        }
      }
      return a;
    }
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _slicedToArray(r, e) {
    return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
  }
  function _unsupportedIterableToArray(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
    }
  }
  function AsyncGenerator(e) {
    var t, n;
    function resume(t2, n2) {
      try {
        var r = e[t2](n2), o = r.value, u = o instanceof _OverloadYield;
        Promise.resolve(u ? o.v : o).then(function(n3) {
          if (u) {
            var i = "return" === t2 && o.k ? t2 : "next";
            if (!o.k || n3.done) return resume(i, n3);
            n3 = e[i](n3).value;
          }
          settle(!!r.done, n3);
        }, function(e2) {
          resume("throw", e2);
        });
      } catch (e2) {
        settle(2, e2);
      }
    }
    function settle(e2, r) {
      2 === e2 ? t.reject(r) : t.resolve({
        value: r,
        done: e2
      }), (t = t.next) ? resume(t.key, t.arg) : n = null;
    }
    this._invoke = function(e2, r) {
      return new Promise(function(o, u) {
        var i = {
          key: e2,
          arg: r,
          resolve: o,
          reject: u,
          next: null
        };
        n ? n = n.next = i : (t = n = i, resume(e2, r));
      });
    }, "function" != typeof e.return && (this.return = void 0);
  }
  AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
    return this;
  }, AsyncGenerator.prototype.next = function(e) {
    return this._invoke("next", e);
  }, AsyncGenerator.prototype.throw = function(e) {
    return this._invoke("throw", e);
  }, AsyncGenerator.prototype.return = function(e) {
    return this._invoke("return", e);
  };
  var entries = Object.entries;
  var setPrototypeOf = Object.setPrototypeOf;
  var isFrozen = Object.isFrozen;
  var getPrototypeOf = Object.getPrototypeOf;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var freeze = Object.freeze;
  var seal = Object.seal;
  var create = Object.create;
  var _ref = typeof Reflect !== "undefined" && Reflect;
  var apply = _ref.apply;
  var construct = _ref.construct;
  if (!freeze) freeze = function freeze2(x2) {
    return x2;
  };
  if (!seal) seal = function seal2(x2) {
    return x2;
  };
  if (!apply) apply = function apply2(func, thisArg) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
    return func.apply(thisArg, args);
  };
  if (!construct) construct = function construct2(Func) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
    return new Func(...args);
  };
  var arrayForEach = unapply(Array.prototype.forEach);
  Array.prototype.indexOf;
  var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
  var arrayPop = unapply(Array.prototype.pop);
  var arrayPush = unapply(Array.prototype.push);
  Array.prototype.slice;
  var arraySplice = unapply(Array.prototype.splice);
  var arrayIsArray = Array.isArray;
  var stringToLowerCase = unapply(String.prototype.toLowerCase);
  var stringToString = unapply(String.prototype.toString);
  var stringMatch = unapply(String.prototype.match);
  var stringReplace = unapply(String.prototype.replace);
  var stringIndexOf = unapply(String.prototype.indexOf);
  var stringTrim = unapply(String.prototype.trim);
  var numberToString = unapply(Number.prototype.toString);
  var booleanToString = unapply(Boolean.prototype.toString);
  var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
  var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
  var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
  var objectToString = unapply(Object.prototype.toString);
  var regExpTest = unapply(RegExp.prototype.test);
  var typeErrorCreate = unconstruct(TypeError);
  function unapply(func) {
    return function(thisArg) {
      if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
      return apply(func, thisArg, args);
    };
  }
  function unconstruct(Func) {
    return function() {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
      return construct(Func, args);
    };
  }
  function addToSet(set, array) {
    let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
    if (setPrototypeOf) setPrototypeOf(set, null);
    if (!arrayIsArray(array)) return set;
    let l3 = array.length;
    while (l3--) {
      let element = array[l3];
      if (typeof element === "string") {
        const lcElement = transformCaseFunc(element);
        if (lcElement !== element) {
          if (!isFrozen(array)) array[l3] = lcElement;
          element = lcElement;
        }
      }
      set[element] = true;
    }
    return set;
  }
  function cleanArray(array) {
    for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
    return array;
  }
  function clone(object) {
    const newObject = create(null);
    for (const _ref2 of entries(object)) {
      var _ref3 = _slicedToArray(_ref2, 2);
      const property = _ref3[0];
      const value = _ref3[1];
      if (objectHasOwnProperty(object, property)) {
        if (arrayIsArray(value)) newObject[property] = cleanArray(value);
        else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone(value);
        else newObject[property] = value;
      }
    }
    return newObject;
  }
  function stringifyValue(value) {
    switch (typeof value) {
      case "string":
        return value;
      case "number":
        return numberToString(value);
      case "boolean":
        return booleanToString(value);
      case "bigint":
        return bigintToString ? bigintToString(value) : "0";
      case "symbol":
        return symbolToString ? symbolToString(value) : "Symbol()";
      case "undefined":
        return objectToString(value);
      case "function":
      case "object": {
        if (value === null) return objectToString(value);
        const valueAsRecord = value;
        const valueToString = lookupGetter(valueAsRecord, "toString");
        if (typeof valueToString === "function") {
          const stringified = valueToString(valueAsRecord);
          return typeof stringified === "string" ? stringified : objectToString(stringified);
        }
        return objectToString(value);
      }
      default:
        return objectToString(value);
    }
  }
  function lookupGetter(object, prop) {
    while (object !== null) {
      const desc = getOwnPropertyDescriptor(object, prop);
      if (desc) {
        if (desc.get) return unapply(desc.get);
        if (typeof desc.value === "function") return unapply(desc.value);
      }
      object = getPrototypeOf(object);
    }
    function fallbackValue() {
      return null;
    }
    return fallbackValue;
  }
  function isRegex(value) {
    try {
      regExpTest(value, "");
      return true;
    } catch (_unused) {
      return false;
    }
  }
  var html$1 = freeze([
    "a",
    "abbr",
    "acronym",
    "address",
    "area",
    "article",
    "aside",
    "audio",
    "b",
    "bdi",
    "bdo",
    "big",
    "blink",
    "blockquote",
    "body",
    "br",
    "button",
    "canvas",
    "caption",
    "center",
    "cite",
    "code",
    "col",
    "colgroup",
    "content",
    "data",
    "datalist",
    "dd",
    "decorator",
    "del",
    "details",
    "dfn",
    "dialog",
    "dir",
    "div",
    "dl",
    "dt",
    "element",
    "em",
    "fieldset",
    "figcaption",
    "figure",
    "font",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "header",
    "hgroup",
    "hr",
    "html",
    "i",
    "img",
    "input",
    "ins",
    "kbd",
    "label",
    "legend",
    "li",
    "main",
    "map",
    "mark",
    "marquee",
    "menu",
    "menuitem",
    "meter",
    "nav",
    "nobr",
    "ol",
    "optgroup",
    "option",
    "output",
    "p",
    "picture",
    "pre",
    "progress",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "search",
    "section",
    "select",
    "shadow",
    "slot",
    "small",
    "source",
    "spacer",
    "span",
    "strike",
    "strong",
    "style",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "template",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "time",
    "tr",
    "track",
    "tt",
    "u",
    "ul",
    "var",
    "video",
    "wbr"
  ]);
  var svg$1 = freeze([
    "svg",
    "a",
    "altglyph",
    "altglyphdef",
    "altglyphitem",
    "animatecolor",
    "animatemotion",
    "animatetransform",
    "circle",
    "clippath",
    "defs",
    "desc",
    "ellipse",
    "enterkeyhint",
    "exportparts",
    "filter",
    "font",
    "g",
    "glyph",
    "glyphref",
    "hkern",
    "image",
    "inputmode",
    "line",
    "lineargradient",
    "marker",
    "mask",
    "metadata",
    "mpath",
    "part",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialgradient",
    "rect",
    "stop",
    "style",
    "switch",
    "symbol",
    "text",
    "textpath",
    "title",
    "tref",
    "tspan",
    "view",
    "vkern"
  ]);
  var svgFilters = freeze([
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence"
  ]);
  var svgDisallowed = freeze([
    "animate",
    "color-profile",
    "cursor",
    "discard",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "foreignobject",
    "hatch",
    "hatchpath",
    "mesh",
    "meshgradient",
    "meshpatch",
    "meshrow",
    "missing-glyph",
    "script",
    "set",
    "solidcolor",
    "unknown",
    "use"
  ]);
  var mathMl$1 = freeze([
    "math",
    "menclose",
    "merror",
    "mfenced",
    "mfrac",
    "mglyph",
    "mi",
    "mlabeledtr",
    "mmultiscripts",
    "mn",
    "mo",
    "mover",
    "mpadded",
    "mphantom",
    "mroot",
    "mrow",
    "ms",
    "mspace",
    "msqrt",
    "mstyle",
    "msub",
    "msup",
    "msubsup",
    "mtable",
    "mtd",
    "mtext",
    "mtr",
    "munder",
    "munderover",
    "mprescripts"
  ]);
  var mathMlDisallowed = freeze([
    "maction",
    "maligngroup",
    "malignmark",
    "mlongdiv",
    "mscarries",
    "mscarry",
    "msgroup",
    "mstack",
    "msline",
    "msrow",
    "semantics",
    "annotation",
    "annotation-xml",
    "mprescripts",
    "none"
  ]);
  var text = freeze(["#text"]);
  var html = freeze([
    "accept",
    "action",
    "align",
    "alt",
    "autocapitalize",
    "autocomplete",
    "autopictureinpicture",
    "autoplay",
    "background",
    "bgcolor",
    "border",
    "capture",
    "cellpadding",
    "cellspacing",
    "checked",
    "cite",
    "class",
    "clear",
    "color",
    "cols",
    "colspan",
    "command",
    "commandfor",
    "controls",
    "controlslist",
    "coords",
    "crossorigin",
    "datetime",
    "decoding",
    "default",
    "dir",
    "disabled",
    "disablepictureinpicture",
    "disableremoteplayback",
    "download",
    "draggable",
    "enctype",
    "enterkeyhint",
    "exportparts",
    "face",
    "for",
    "headers",
    "height",
    "hidden",
    "high",
    "href",
    "hreflang",
    "id",
    "inert",
    "inputmode",
    "integrity",
    "ismap",
    "kind",
    "label",
    "lang",
    "list",
    "loading",
    "loop",
    "low",
    "max",
    "maxlength",
    "media",
    "method",
    "min",
    "minlength",
    "multiple",
    "muted",
    "name",
    "nonce",
    "noshade",
    "novalidate",
    "nowrap",
    "open",
    "optimum",
    "part",
    "pattern",
    "placeholder",
    "playsinline",
    "popover",
    "popovertarget",
    "popovertargetaction",
    "poster",
    "preload",
    "pubdate",
    "radiogroup",
    "readonly",
    "rel",
    "required",
    "rev",
    "reversed",
    "role",
    "rows",
    "rowspan",
    "spellcheck",
    "scope",
    "selected",
    "shape",
    "size",
    "sizes",
    "slot",
    "span",
    "srclang",
    "start",
    "src",
    "srcset",
    "step",
    "style",
    "summary",
    "tabindex",
    "title",
    "translate",
    "type",
    "usemap",
    "valign",
    "value",
    "width",
    "wrap",
    "xmlns"
  ]);
  var svg = freeze([
    "accent-height",
    "accumulate",
    "additive",
    "alignment-baseline",
    "amplitude",
    "ascent",
    "attributename",
    "attributetype",
    "azimuth",
    "basefrequency",
    "baseline-shift",
    "begin",
    "bias",
    "by",
    "class",
    "clip",
    "clippathunits",
    "clip-path",
    "clip-rule",
    "color",
    "color-interpolation",
    "color-interpolation-filters",
    "color-profile",
    "color-rendering",
    "cx",
    "cy",
    "d",
    "dx",
    "dy",
    "diffuseconstant",
    "direction",
    "display",
    "divisor",
    "dominant-baseline",
    "dur",
    "edgemode",
    "elevation",
    "end",
    "exponent",
    "fill",
    "fill-opacity",
    "fill-rule",
    "filter",
    "filterunits",
    "flood-color",
    "flood-opacity",
    "font-family",
    "font-size",
    "font-size-adjust",
    "font-stretch",
    "font-style",
    "font-variant",
    "font-weight",
    "fx",
    "fy",
    "g1",
    "g2",
    "glyph-name",
    "glyphref",
    "gradientunits",
    "gradienttransform",
    "height",
    "href",
    "id",
    "image-rendering",
    "in",
    "in2",
    "intercept",
    "k",
    "k1",
    "k2",
    "k3",
    "k4",
    "kerning",
    "keypoints",
    "keysplines",
    "keytimes",
    "lang",
    "lengthadjust",
    "letter-spacing",
    "kernelmatrix",
    "kernelunitlength",
    "lighting-color",
    "local",
    "marker-end",
    "marker-mid",
    "marker-start",
    "markerheight",
    "markerunits",
    "markerwidth",
    "maskcontentunits",
    "maskunits",
    "max",
    "mask",
    "mask-type",
    "media",
    "method",
    "mode",
    "min",
    "name",
    "numoctaves",
    "offset",
    "operator",
    "opacity",
    "order",
    "orient",
    "orientation",
    "origin",
    "overflow",
    "paint-order",
    "path",
    "pathlength",
    "patterncontentunits",
    "patterntransform",
    "patternunits",
    "pointer-events",
    "points",
    "preservealpha",
    "preserveaspectratio",
    "primitiveunits",
    "r",
    "rx",
    "ry",
    "radius",
    "refx",
    "refy",
    "repeatcount",
    "repeatdur",
    "restart",
    "result",
    "rotate",
    "scale",
    "seed",
    "shape-rendering",
    "slope",
    "specularconstant",
    "specularexponent",
    "spreadmethod",
    "startoffset",
    "stddeviation",
    "stitchtiles",
    "stop-color",
    "stop-opacity",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke",
    "stroke-width",
    "style",
    "surfacescale",
    "systemlanguage",
    "tabindex",
    "tablevalues",
    "targetx",
    "targety",
    "transform",
    "transform-origin",
    "text-anchor",
    "text-decoration",
    "text-orientation",
    "text-rendering",
    "textlength",
    "type",
    "u1",
    "u2",
    "unicode",
    "values",
    "vector-effect",
    "viewbox",
    "visibility",
    "version",
    "vert-adv-y",
    "vert-origin-x",
    "vert-origin-y",
    "width",
    "word-spacing",
    "wrap",
    "writing-mode",
    "xchannelselector",
    "ychannelselector",
    "x",
    "x1",
    "x2",
    "xmlns",
    "y",
    "y1",
    "y2",
    "z",
    "zoomandpan"
  ]);
  var mathMl = freeze([
    "accent",
    "accentunder",
    "align",
    "bevelled",
    "close",
    "columnalign",
    "columnlines",
    "columnspacing",
    "columnspan",
    "denomalign",
    "depth",
    "dir",
    "display",
    "displaystyle",
    "encoding",
    "fence",
    "frame",
    "height",
    "href",
    "id",
    "largeop",
    "length",
    "linethickness",
    "lquote",
    "lspace",
    "mathbackground",
    "mathcolor",
    "mathsize",
    "mathvariant",
    "maxsize",
    "minsize",
    "movablelimits",
    "notation",
    "numalign",
    "open",
    "rowalign",
    "rowlines",
    "rowspacing",
    "rowspan",
    "rspace",
    "rquote",
    "scriptlevel",
    "scriptminsize",
    "scriptsizemultiplier",
    "selection",
    "separator",
    "separators",
    "stretchy",
    "subscriptshift",
    "supscriptshift",
    "symmetric",
    "voffset",
    "width",
    "xmlns"
  ]);
  var xml = freeze([
    "xlink:href",
    "xml:id",
    "xlink:title",
    "xml:space",
    "xmlns:xlink"
  ]);
  var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
  var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
  var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
  var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
  var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
  var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
  var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
  var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
  var DOCTYPE_NAME = seal(/^html$/i);
  var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
  var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
  var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
  var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
  var SELF_CLOSING_TAG = seal(/\/>/i);
  var NODE_TYPE = {
    element: 1,
    attribute: 2,
    text: 3,
    cdataSection: 4,
    entityReference: 5,
    entityNode: 6,
    processingInstruction: 7,
    comment: 8,
    document: 9,
    documentType: 10,
    documentFragment: 11,
    notation: 12
  };
  var LITERAL_TEXT_ELEMENT_NAMES = [
    "style",
    "script",
    "xmp",
    "iframe",
    "noembed",
    "noframes",
    "plaintext",
    "noscript"
  ];
  var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, LITERAL_TEXT_ELEMENT_NAMES));
  var LITERAL_TEXT_CLOSE = (function() {
    const map = {};
    arrayForEach(LITERAL_TEXT_ELEMENT_NAMES, (name) => {
      map[name] = seal(new RegExp("</" + name + "(?=[\\t\\n\\f\\r />])", "i"));
    });
    return freeze(map);
  })();
  var getGlobal = function getGlobal2() {
    return typeof window === "undefined" ? null : window;
  };
  var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
    if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
    let suffix = null;
    const ATTR_NAME = "data-tt-policy-suffix";
    if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
    const policyName = "dompurify" + (suffix ? "#" + suffix : "");
    try {
      return trustedTypes.createPolicy(policyName, {
        createHTML(html2) {
          return html2;
        },
        createScriptURL(scriptUrl) {
          return scriptUrl;
        }
      });
    } catch (_2) {
      console.warn("TrustedTypes policy " + policyName + " could not be created.");
      return null;
    }
  };
  var _createHooksMap = function _createHooksMap2() {
    return {
      afterSanitizeAttributes: [],
      afterSanitizeElements: [],
      afterSanitizeShadowDOM: [],
      beforeSanitizeAttributes: [],
      beforeSanitizeElements: [],
      beforeSanitizeShadowDOM: [],
      uponSanitizeAttribute: [],
      uponSanitizeElement: [],
      uponSanitizeShadowNode: []
    };
  };
  var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options) {
    return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
  };
  var _resolveObjectOption = function _resolveObjectOption2(cfg, key, makeFallback) {
    const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
    return value && typeof value === "object" ? clone(value) : makeFallback();
  };
  function createDOMPurify() {
    let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
    const DOMPurify = (root2) => createDOMPurify(root2);
    DOMPurify.version = "3.4.16";
    DOMPurify.removed = [];
    if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
      DOMPurify.isSupported = false;
      return DOMPurify;
    }
    let document2 = window2.document;
    const originalDocument = document2;
    const currentScript = originalDocument.currentScript;
    window2.DocumentFragment;
    const HTMLTemplateElement = window2.HTMLTemplateElement, Node2 = window2.Node, Element = window2.Element, NodeFilter = window2.NodeFilter;
    window2.NamedNodeMap === void 0 && (window2.NamedNodeMap || window2.MozNamedAttrMap);
    window2.HTMLFormElement;
    const DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
    const ElementPrototype = Element.prototype;
    const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
    const remove = lookupGetter(ElementPrototype, "remove");
    const removeAttributeNode = lookupGetter(ElementPrototype, "removeAttributeNode");
    const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
    const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
    const getParentNode = lookupGetter(ElementPrototype, "parentNode");
    const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
    const getAttributes = lookupGetter(ElementPrototype, "attributes");
    const getNodeType = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeType") : null;
    const getNodeName = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeName") : null;
    const getOwnerDocument = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "ownerDocument") : null;
    const _readNodeType = function _readNodeType2(node) {
      return getNodeType ? getNodeType(node) : node.nodeType;
    };
    const _readNodeName = function _readNodeName2(node) {
      return getNodeName ? getNodeName(node) : node.nodeName;
    };
    if (typeof HTMLTemplateElement === "function") {
      const template = document2.createElement("template");
      if (template.content && template.content.ownerDocument) document2 = template.content.ownerDocument;
    }
    let trustedTypesPolicy;
    let emptyHTML = "";
    let defaultTrustedTypesPolicy;
    let defaultTrustedTypesPolicyResolved = false;
    let IN_TRUSTED_TYPES_POLICY = 0;
    const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
      if (IN_TRUSTED_TYPES_POLICY > 0) throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
    };
    const _createTrustedHTML = function _createTrustedHTML2(html2) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createHTML(html2);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createScriptURL(scriptUrl);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
      if (!defaultTrustedTypesPolicyResolved) {
        defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
        defaultTrustedTypesPolicyResolved = true;
      }
      return defaultTrustedTypesPolicy;
    };
    const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
    const importNode = originalDocument.importNode;
    let hooks = _createHooksMap();
    DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
    const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
    let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
    let ALLOWED_TAGS = null;
    const DEFAULT_ALLOWED_TAGS = addToSet({}, [
      ...html$1,
      ...svg$1,
      ...svgFilters,
      ...mathMl$1,
      ...text
    ]);
    let ALLOWED_ATTR = null;
    const DEFAULT_ALLOWED_ATTR = addToSet({}, [
      ...html,
      ...svg,
      ...mathMl,
      ...xml
    ]);
    let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
      tagNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      allowCustomizedBuiltInElements: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: false
      }
    }));
    let FORBID_TAGS = null;
    let FORBID_ATTR = null;
    const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
      tagCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      }
    }));
    let ALLOW_ARIA_ATTR = true;
    let ALLOW_DATA_ATTR = true;
    let ALLOW_UNKNOWN_PROTOCOLS = false;
    let ALLOW_SELF_CLOSE_IN_ATTR = true;
    let SAFE_FOR_TEMPLATES = false;
    let SAFE_FOR_XML = true;
    let WHOLE_DOCUMENT = false;
    let SET_CONFIG = false;
    let SET_CONFIG_ALLOWED_TAGS = null;
    let SET_CONFIG_ALLOWED_ATTR = null;
    let FORCE_BODY = false;
    let RETURN_DOM = false;
    let RETURN_DOM_FRAGMENT = false;
    let RETURN_TRUSTED_TYPE = false;
    let SANITIZE_DOM = true;
    let SANITIZE_NAMED_PROPS = false;
    const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
    let KEEP_CONTENT = true;
    let IN_PLACE = false;
    let USE_PROFILES = {};
    let FORBID_CONTENTS = null;
    const DEFAULT_FORBID_CONTENTS = addToSet({}, [
      "annotation-xml",
      "audio",
      "colgroup",
      "desc",
      "foreignobject",
      "head",
      "iframe",
      "math",
      "mi",
      "mn",
      "mo",
      "ms",
      "mtext",
      "noembed",
      "noframes",
      "noscript",
      "plaintext",
      "script",
      "selectedcontent",
      "style",
      "svg",
      "template",
      "thead",
      "title",
      "video",
      "xmp"
    ]);
    let DATA_URI_TAGS = null;
    const DEFAULT_DATA_URI_TAGS = addToSet({}, [
      "audio",
      "video",
      "img",
      "source",
      "image",
      "track"
    ]);
    let URI_SAFE_ATTRIBUTES = null;
    const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
      "alt",
      "class",
      "for",
      "id",
      "label",
      "name",
      "pattern",
      "placeholder",
      "role",
      "summary",
      "title",
      "value",
      "style",
      "xmlns"
    ]);
    const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
    let NAMESPACE = HTML_NAMESPACE;
    let IS_EMPTY_INPUT = false;
    let ALLOWED_NAMESPACES = null;
    const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
      MATHML_NAMESPACE,
      SVG_NAMESPACE,
      HTML_NAMESPACE
    ], stringToString);
    const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
      "mi",
      "mo",
      "mn",
      "ms",
      "mtext"
    ]);
    let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
    const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
    let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
    const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
      "title",
      "style",
      "font",
      "a",
      "script"
    ]);
    let PARSER_MEDIA_TYPE = null;
    const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
    const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
    let transformCaseFunc = null;
    let CONFIG = null;
    const formElement = document2.createElement("form");
    const isRegexOrFunction = function isRegexOrFunction2(testValue) {
      return testValue instanceof RegExp || testValue instanceof Function;
    };
    const _parseConfig = function _parseConfig2() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (CONFIG && CONFIG === cfg) return;
      if (!cfg || typeof cfg !== "object") cfg = {};
      cfg = clone(cfg);
      PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
      transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
      ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
      ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
      ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
      URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
        transform: transformCaseFunc,
        base: DEFAULT_URI_SAFE_ATTRIBUTES
      });
      DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
        transform: transformCaseFunc,
        base: DEFAULT_DATA_URI_TAGS
      });
      FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
      FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
      FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
      USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
      ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
      ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
      ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
      ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
      SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
      SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
      WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
      RETURN_DOM = cfg.RETURN_DOM || false;
      RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
      RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
      FORCE_BODY = cfg.FORCE_BODY || false;
      SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
      SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
      KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
      IN_PLACE = cfg.IN_PLACE || false;
      IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
      NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
      MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
      HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
      const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
      CUSTOM_ELEMENT_HANDLING = create(null);
      if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
      if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
      if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
      seal(CUSTOM_ELEMENT_HANDLING);
      if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
      if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
      if (USE_PROFILES) {
        ALLOWED_TAGS = addToSet({}, text);
        ALLOWED_ATTR = create(null);
        if (USE_PROFILES.html === true) {
          addToSet(ALLOWED_TAGS, html$1);
          addToSet(ALLOWED_ATTR, html);
        }
        if (USE_PROFILES.svg === true) {
          addToSet(ALLOWED_TAGS, svg$1);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.svgFilters === true) {
          addToSet(ALLOWED_TAGS, svgFilters);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.mathMl === true) {
          addToSet(ALLOWED_TAGS, mathMl$1);
          addToSet(ALLOWED_ATTR, mathMl);
          addToSet(ALLOWED_ATTR, xml);
        }
      }
      EXTRA_ELEMENT_HANDLING.tagCheck = null;
      EXTRA_ELEMENT_HANDLING.attributeCheck = null;
      if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
        if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
        else if (arrayIsArray(cfg.ADD_TAGS)) {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone(ALLOWED_TAGS);
          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
        if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
        else if (arrayIsArray(cfg.ADD_ATTR)) {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone(ALLOWED_ATTR);
          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone(FORBID_CONTENTS);
        addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
      }
      if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
      if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
        "html",
        "head",
        "body"
      ]);
      if (ALLOWED_TAGS.table) {
        addToSet(ALLOWED_TAGS, ["tbody"]);
        delete FORBID_TAGS.tbody;
      }
      if (cfg.TRUSTED_TYPES_POLICY) {
        if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        const previousTrustedTypesPolicy = trustedTypesPolicy;
        trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
        try {
          emptyHTML = _createTrustedHTML("");
        } catch (error) {
          trustedTypesPolicy = previousTrustedTypesPolicy;
          throw error;
        }
      } else if (cfg.TRUSTED_TYPES_POLICY === null) {
        trustedTypesPolicy = void 0;
        emptyHTML = "";
      } else {
        if (trustedTypesPolicy === void 0) trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
        if (trustedTypesPolicy && typeof emptyHTML === "string") emptyHTML = _createTrustedHTML("");
      }
      if (freeze) freeze(cfg);
      CONFIG = cfg;
    };
    const ALL_SVG_TAGS = addToSet({}, [
      ...svg$1,
      ...svgFilters,
      ...svgDisallowed
    ]);
    const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
    const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
      if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      return Boolean(ALL_SVG_TAGS[tagName]);
    };
    const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
      if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
      return Boolean(ALL_MATHML_TAGS[tagName]);
    };
    const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    };
    const _checkValidNamespace = function _checkValidNamespace2(element) {
      let parent = getParentNode(element);
      if (!parent || !parent.tagName) parent = {
        namespaceURI: NAMESPACE,
        tagName: "template"
      };
      const tagName = stringToLowerCase(element.tagName);
      const parentTagName = stringToLowerCase(parent.tagName);
      if (!ALLOWED_NAMESPACES[element.namespaceURI]) return false;
      if (element.namespaceURI === SVG_NAMESPACE) return _checkSvgNamespace(tagName, parent, parentTagName);
      if (element.namespaceURI === MATHML_NAMESPACE) return _checkMathMlNamespace(tagName, parent, parentTagName);
      if (element.namespaceURI === HTML_NAMESPACE) return _checkHtmlNamespace(tagName, parent, parentTagName);
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) return true;
      return false;
    };
    const _forceRemove = function _forceRemove2(node) {
      arrayPush(DOMPurify.removed, { element: node });
      try {
        getParentNode(node).removeChild(node);
      } catch (_2) {
        remove(node);
        if (!getParentNode(node)) throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
      }
    };
    const _stripAttributeNode = function _stripAttributeNode2(element, attribute, name) {
      try {
        removeAttributeNode(element, attribute);
      } catch (_2) {
        try {
          element.removeAttribute(name);
        } catch (_3) {
        }
      }
    };
    const _neutralizeRoot = function _neutralizeRoot2(root2) {
      _neutralizeSubtree(root2);
      const childNodes = getChildNodes(root2);
      if (childNodes) {
        const snapshot = [];
        arrayForEach(childNodes, (child) => {
          arrayPush(snapshot, child);
        });
        arrayForEach(snapshot, (child) => {
          try {
            remove(child);
          } catch (_2) {
          }
        });
      }
      const attributes = getAttributes(root2);
      if (attributes) for (let i = attributes.length - 1; i >= 0; --i) {
        const attribute = attributes[i];
        const name = attribute && attribute.name;
        if (typeof name === "string") _stripAttributeNode(root2, attribute, name);
      }
    };
    const _removeAttribute = function _removeAttribute2(name, element, attr) {
      if (!attr) try {
        attr = element.getAttributeNode(name);
      } catch (_2) {
        attr = null;
      }
      arrayPush(DOMPurify.removed, {
        attribute: attr || null,
        from: element
      });
      try {
        if (attr) removeAttributeNode(element, attr);
        else element.removeAttribute(name);
      } catch (_2) {
        try {
          element.removeAttribute(name);
        } catch (_3) {
        }
      }
      if (name === "is") {
        if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
          _forceRemove(element);
        } catch (_2) {
        }
        else try {
          element.setAttribute(name, "");
        } catch (_2) {
        }
      }
    };
    const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
      const attributes = getAttributes(element);
      if (!attributes) return;
      for (let i = attributes.length - 1; i >= 0; --i) {
        const attribute = attributes[i];
        const name = attribute && attribute.name;
        if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) continue;
        _stripAttributeNode(element, attribute, name);
      }
    };
    const _neutralizeSubtree = function _neutralizeSubtree2(root2) {
      const stack = [root2];
      while (stack.length > 0) {
        const node = stack.pop();
        if (_readNodeType(node) === NODE_TYPE.element) _stripDisallowedAttributes(node);
        const childNodes = getChildNodes(node);
        if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
      }
    };
    const _isPatchLinkageAttribute = function _isPatchLinkageAttribute2(lcName, lcTag) {
      if (!SAFE_FOR_XML) return false;
      if (lcName === "patchsrc") return true;
      return lcName === "for" && lcTag !== "label" && lcTag !== "output";
    };
    const _neutralizePatchLinkage = function _neutralizePatchLinkage2(root2) {
      if (!SAFE_FOR_XML) return;
      const stack = [root2];
      while (stack.length > 0) {
        const node = stack.pop();
        const nodeType = _readNodeType(node);
        if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
          try {
            remove(node);
          } catch (_2) {
          }
          continue;
        }
        if (nodeType === NODE_TYPE.element) {
          const element = node;
          const lcTag = transformCaseFunc(_readNodeName(node));
          try {
            if (element.hasAttribute && element.hasAttribute("patchsrc")) element.removeAttribute("patchsrc");
            if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) element.removeAttribute("for");
          } catch (_2) {
          }
        }
        const childNodes = getChildNodes(node);
        if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
      }
    };
    const _initDocument = function _initDocument2(dirty) {
      let doc = null;
      let leadingWhitespace = null;
      if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
      else {
        const matches = stringMatch(dirty, /^[\r\n\t ]+/);
        leadingWhitespace = matches && matches[0];
      }
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
      const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
      if (NAMESPACE === HTML_NAMESPACE) try {
        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
      } catch (_2) {
      }
      if (!doc || !doc.documentElement) {
        doc = implementation.createDocument(NAMESPACE, "template", null);
        try {
          doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
        } catch (_2) {
        }
      }
      const body = doc.body || doc.documentElement;
      if (dirty && leadingWhitespace) body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
      if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
      return WHOLE_DOCUMENT ? doc.documentElement : body;
    };
    const _createNodeIterator = function _createNodeIterator2(root2) {
      const doc = getOwnerDocument ? getOwnerDocument(root2) : root2.ownerDocument;
      return createNodeIterator.call(doc || root2, root2, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
    };
    const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
      value = stringReplace(value, MUSTACHE_EXPR$1, " ");
      value = stringReplace(value, ERB_EXPR$1, " ");
      value = stringReplace(value, TMPLIT_EXPR$1, " ");
      return value;
    };
    const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
      var _node$querySelectorAl;
      node.normalize();
      const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
      const walker = createNodeIterator.call(doc || node, node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION, null);
      let currentNode = walker.nextNode();
      while (currentNode) {
        currentNode.data = _stripTemplateExpressions(currentNode.data);
        currentNode = walker.nextNode();
      }
      const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
      if (templates) arrayForEach(templates, (tmpl) => {
        if (_isDocumentFragment(tmpl.content)) _scrubTemplateExpressions2(tmpl.content);
      });
    };
    const _isClobbered = function _isClobbered2(element) {
      const realTagName = getNodeName ? getNodeName(element) : null;
      if (typeof realTagName !== "string") return false;
      if (transformCaseFunc(realTagName) !== "form") return false;
      return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.removeAttributeNode !== "function" || typeof element.getAttributeNode !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
    };
    const _isDocumentFragment = function _isDocumentFragment2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) return false;
      try {
        return getNodeType(value) === NODE_TYPE.documentFragment;
      } catch (_2) {
        return false;
      }
    };
    const _isNode = function _isNode2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) return false;
      try {
        return typeof getNodeType(value) === "number";
      } catch (_2) {
        return false;
      }
    };
    function _executeHooks(hooks2, currentNode, data) {
      if (hooks2.length === 0) return;
      arrayForEach(hooks2, (hook) => {
        hook.call(DOMPurify, currentNode, data, CONFIG);
      });
    }
    const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
      if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) return true;
      if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && LITERAL_TEXT_ELEMENTS[tagName] && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(LITERAL_TEXT_CLOSE[tagName], currentNode.textContent))) return true;
      if (currentNode.nodeType === NODE_TYPE.processingInstruction) return true;
      if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) return true;
      return false;
    };
    const _matchesNameCheck = function _matchesNameCheck2(check, name) {
      if (check instanceof RegExp) return regExpTest(check, name);
      if (check instanceof Function) {
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
        return Boolean(check(name, ...args));
      }
      return false;
    };
    const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName, root2) {
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode);
        const childNodes = getChildNodes(currentNode);
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i = childCount - 1; i >= 0; --i) {
            const hoisted = currentNode === root2 ? cloneNode(childNodes[i], true) : childNodes[i];
            parentNode.insertBefore(hoisted, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    };
    const _forkSharedAllowlist = function _forkSharedAllowlist2(hookList, set, defaultSet, setConfigSet) {
      if (hookList.length === 0) return set;
      return set === defaultSet || set === setConfigSet ? clone(set) : set;
    };
    const _handleHookDetachedNode = function _handleHookDetachedNode2(currentNode, root2) {
      if (currentNode === root2 || getParentNode(currentNode) !== null) return false;
      if (IN_PLACE) _neutralizeSubtree(currentNode);
      return true;
    };
    const _sanitizeElements = function _sanitizeElements2(currentNode, root2) {
      _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
      if (_handleHookDetachedNode(currentNode, root2)) return true;
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      const tagName = transformCaseFunc(_readNodeName(currentNode));
      ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
      _executeHooks(hooks.uponSanitizeElement, currentNode, {
        tagName,
        allowedTags: ALLOWED_TAGS
      });
      if (_handleHookDetachedNode(currentNode, root2)) return true;
      if (_isUnsafeNode(currentNode, tagName)) {
        _forceRemove(currentNode);
        return true;
      }
      if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
        const removed = _sanitizeDisallowedNode(currentNode, tagName, root2);
        if (removed === false) {
          _executeHooks(hooks.afterSanitizeElements, currentNode, null);
          if (_handleHookDetachedNode(currentNode, root2)) return true;
        }
        return removed;
      }
      if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
        _forceRemove(currentNode);
        return true;
      }
      if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
        const content = _stripTemplateExpressions(currentNode.textContent);
        if (currentNode.textContent !== content) {
          arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
          currentNode.textContent = content;
        }
      }
      _executeHooks(hooks.afterSanitizeElements, currentNode, null);
      return _handleHookDetachedNode(currentNode, root2);
    };
    const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
      if (FORBID_ATTR[lcName]) return false;
      if (_isPatchLinkageAttribute(lcName, lcTag)) return false;
      if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) return false;
      const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
      if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) return true;
      if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) return true;
      if (!nameIsPermitted) return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
      if (URI_SAFE_ATTRIBUTES[lcName]) return true;
      if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
      if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) return true;
      if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
      return !value;
    };
    const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
      "annotation-xml",
      "color-profile",
      "font-face",
      "font-face-format",
      "font-face-name",
      "font-face-src",
      "font-face-uri",
      "missing-glyph"
    ]);
    const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
      return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
    };
    const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
      if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) switch (trustedTypes.getAttributeType(lcTag, lcName)) {
        case "TrustedHTML":
          return _createTrustedHTML(value);
        case "TrustedScriptURL":
          return _createTrustedScriptURL(value);
      }
      return value;
    };
    const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
      try {
        if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
        else currentNode.setAttribute(name, value);
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
          return false;
        }
        return true;
      } catch (_2) {
        _removeAttribute(name, currentNode);
        return false;
      }
    };
    const _sanitizeAttributes = function _sanitizeAttributes2(currentNode, root2) {
      _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
      if (_handleHookDetachedNode(currentNode, root2)) return;
      const attributes = currentNode.attributes;
      if (!attributes || _isClobbered(currentNode)) return;
      ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
      const hookEvent = {
        attrName: "",
        attrValue: "",
        keepAttr: true,
        allowedAttributes: ALLOWED_ATTR,
        forceKeepAttr: void 0
      };
      let l3 = attributes.length;
      const lcTag = transformCaseFunc(currentNode.nodeName);
      while (l3--) {
        const attr = attributes[l3];
        const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
        const lcName = transformCaseFunc(name);
        const initValue = attrValue;
        let value = name === "value" ? initValue : stringTrim(initValue);
        let recreatedNamedProp = false;
        hookEvent.attrName = lcName;
        hookEvent.attrValue = value;
        hookEvent.keepAttr = true;
        hookEvent.forceKeepAttr = void 0;
        _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
        value = hookEvent.attrValue;
        if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
          _removeAttribute(name, currentNode, attr);
          value = SANITIZE_NAMED_PROPS_PREFIX + value;
          recreatedNamedProp = true;
        }
        if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (lcName === "attributename" && stringMatch(value, "href")) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (hookEvent.forceKeepAttr) continue;
        if (!hookEvent.keepAttr) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (SAFE_FOR_TEMPLATES) value = _stripTemplateExpressions(value);
        if (!_isValidAttribute(lcTag, lcName, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
        if (value !== initValue) {
          if (_setAttributeValue(currentNode, name, namespaceURI, value) && recreatedNamedProp) arrayPop(DOMPurify.removed);
        }
      }
      _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
      _handleHookDetachedNode(currentNode, root2);
    };
    const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
      let shadowNode = null;
      const shadowIterator = _createNodeIterator(fragment);
      _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
      while (shadowNode = shadowIterator.nextNode()) {
        _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
        _sanitizeElements(shadowNode, fragment);
        _sanitizeAttributes(shadowNode, fragment);
        if (_isDocumentFragment(shadowNode.content)) _sanitizeShadowDOM2(shadowNode.content);
        if (_readNodeType(shadowNode) === NODE_TYPE.element) {
          const innerSr = getShadowRoot(shadowNode);
          if (_isDocumentFragment(innerSr)) {
            _sanitizeAttachedShadowRoots(innerSr);
            _sanitizeShadowDOM2(innerSr);
          }
        }
      }
      _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
    };
    const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root2) {
      const stack = [{
        node: root2,
        shadow: null
      }];
      while (stack.length > 0) {
        const item = stack.pop();
        if (item.shadow) {
          _sanitizeShadowDOM2(item.shadow);
          continue;
        }
        const node = item.node;
        const isElement = _readNodeType(node) === NODE_TYPE.element;
        const childNodes = getChildNodes(node);
        if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push({
          node: childNodes[i],
          shadow: null
        });
        if (isElement) {
          const rootName = getNodeName ? getNodeName(node) : null;
          if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
            const content = node.content;
            if (_isDocumentFragment(content)) stack.push({
              node: content,
              shadow: null
            });
          }
        }
        if (isElement) {
          const sr = getShadowRoot(node);
          if (_isDocumentFragment(sr)) stack.push({
            node: null,
            shadow: sr
          }, {
            node: sr,
            shadow: null
          });
        }
      }
    };
    DOMPurify.sanitize = function(dirty) {
      let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let body = null;
      let importedNode = null;
      let currentNode = null;
      let returnNode = null;
      IS_EMPTY_INPUT = !dirty;
      if (IS_EMPTY_INPUT) dirty = "<!-->";
      if (typeof dirty !== "string" && !_isNode(dirty)) {
        dirty = stringifyValue(dirty);
        if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
      }
      if (!DOMPurify.isSupported) return dirty;
      if (SET_CONFIG) {
        ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
        ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
      } else _parseConfig(cfg);
      if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) ALLOWED_TAGS = clone(ALLOWED_TAGS);
      if (hooks.uponSanitizeAttribute.length > 0) ALLOWED_ATTR = clone(ALLOWED_ATTR);
      DOMPurify.removed = [];
      const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
      if (inPlace) {
        _neutralizePatchLinkage(dirty);
        const nn = _readNodeName(dirty);
        if (typeof nn === "string") {
          const tagName = transformCaseFunc(nn);
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            _neutralizeRoot(dirty);
            throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
          }
        }
        if (_isClobbered(dirty)) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
        }
        try {
          _sanitizeAttachedShadowRoots(dirty);
        } catch (error) {
          _neutralizeRoot(dirty);
          throw error;
        }
      } else if (_isNode(dirty)) {
        body = _initDocument("<!---->");
        importedNode = body.ownerDocument.importNode(dirty, true);
        if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
        else if (importedNode.nodeName === "HTML") body = importedNode;
        else body.appendChild(importedNode);
        _sanitizeAttachedShadowRoots(body);
      } else {
        if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
        body = _initDocument(dirty);
        if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
      }
      if (body && FORCE_BODY) _forceRemove(body.firstChild);
      const walkRoot = inPlace ? dirty : body;
      try {
        const nodeIterator = _createNodeIterator(walkRoot);
        while (currentNode = nodeIterator.nextNode()) {
          _sanitizeElements(currentNode, walkRoot);
          _sanitizeAttributes(currentNode, walkRoot);
          if (_isDocumentFragment(currentNode.content)) _sanitizeShadowDOM2(currentNode.content);
        }
      } catch (error) {
        if (inPlace) {
          _neutralizeRoot(dirty);
          arrayForEach(DOMPurify.removed, (entry) => {
            if (entry.element) _neutralizeSubtree(entry.element);
          });
        }
        throw error;
      }
      if (inPlace) {
        let rootWasRemoved = false;
        arrayForEach(DOMPurify.removed, (entry) => {
          if (entry.element) {
            if (entry.element === dirty) rootWasRemoved = true;
            _neutralizeSubtree(entry.element);
          }
        });
        if (rootWasRemoved) throw typeErrorCreate("a node selected for removal could not be safely returned; refusing to sanitize in place");
        if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(dirty);
        return dirty;
      }
      if (RETURN_DOM) {
        if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(body);
        if (RETURN_DOM_FRAGMENT) {
          returnNode = createDocumentFragment.call(body.ownerDocument);
          while (body.firstChild) returnNode.appendChild(body.firstChild);
        } else returnNode = body;
        if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
        return returnNode;
      }
      let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
      if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
      if (SAFE_FOR_TEMPLATES) serializedHTML = _stripTemplateExpressions(serializedHTML);
      return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
    };
    DOMPurify.setConfig = function() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _parseConfig(cfg);
      SET_CONFIG = true;
      SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
      SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
    };
    DOMPurify.clearConfig = function() {
      CONFIG = null;
      SET_CONFIG = false;
      SET_CONFIG_ALLOWED_TAGS = null;
      SET_CONFIG_ALLOWED_ATTR = null;
      trustedTypesPolicy = defaultTrustedTypesPolicy;
      emptyHTML = "";
    };
    DOMPurify.isValidAttribute = function(tag, attr, value) {
      if (!CONFIG) _parseConfig({});
      const lcTag = transformCaseFunc(tag);
      const lcName = transformCaseFunc(attr);
      return _isValidAttribute(lcTag, lcName, value);
    };
    DOMPurify.addHook = function(entryPoint, hookFunction) {
      if (typeof hookFunction !== "function") return;
      if (!objectHasOwnProperty(hooks, entryPoint)) return;
      arrayPush(hooks[entryPoint], hookFunction);
    };
    DOMPurify.removeHook = function(entryPoint, hookFunction) {
      if (!objectHasOwnProperty(hooks, entryPoint)) return;
      if (hookFunction !== void 0) {
        const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
        return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
      }
      return arrayPop(hooks[entryPoint]);
    };
    DOMPurify.removeHooks = function(entryPoint) {
      if (!objectHasOwnProperty(hooks, entryPoint)) return;
      hooks[entryPoint] = [];
    };
    DOMPurify.removeAllHooks = function() {
      hooks = _createHooksMap();
    };
    return DOMPurify;
  }
  var purify_default = createDOMPurify();

  // src/panel/document-renderer.ts
  var escape = (text2) => text2.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
  function documentFormat(selector) {
    return /\.(md|markdown)$/i.test(selector) ? "markdown" : "text";
  }
  function renderDocument(source) {
    const parser = new F({
      gfm: true,
      renderer: {
        code({ text: text2 }) {
          return `<pre><code>${escape(text2)}</code></pre>`;
        },
        html: ({ text: text2 }) => escape(text2),
        image: ({ text: text2 }) => escape(text2 || "Image"),
        link({ href, tokens }) {
          const label = this.parser.parseInline(tokens);
          if (!/^https?:\/\//i.test(href) && !href.startsWith("#")) return label;
          return `<a href="${escape(href)}">${label}</a>`;
        }
      }
    });
    const fragment = purify_default.sanitize(parser.parse(source, { async: false }), {
      RETURN_DOM_FRAGMENT: true,
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "hr",
        "strong",
        "em",
        "del",
        "blockquote",
        "ol",
        "ul",
        "li",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "pre",
        "code",
        "a",
        "input"
      ],
      ALLOWED_ATTR: ["href", "type", "disabled", "checked", "start"],
      ALLOW_DATA_ATTR: false
    });
    for (const link of fragment.querySelectorAll("a[href]")) {
      link.dataset.documentHref = link.getAttribute("href");
      link.setAttribute("href", "#");
    }
    const used = /* @__PURE__ */ new Set();
    for (const heading of fragment.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
      const base = heading.textContent.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "heading";
      let id = base;
      for (let i = 1; used.has(id); i++) id = `${base}-${i}`;
      used.add(id);
      heading.id = `document-${id}`;
    }
    for (const input of fragment.querySelectorAll("input")) {
      if (input.type !== "checkbox") input.remove();
      else {
        input.disabled = true;
        input.setAttribute("aria-label", input.parentElement?.textContent?.trim() || "Document task");
      }
    }
    for (const table of fragment.querySelectorAll("table")) {
      const wrapper = document.createElement("div");
      wrapper.className = "document-table";
      table.replaceWith(wrapper);
      wrapper.append(table);
    }
    return fragment;
  }

  // src/panel/document-view.ts
  function mountDocumentView(root2, callbacks = { openUrl: () => {
  } }) {
    const content = document.createElement("div");
    content.className = "document-content";
    const presentationIssue = document.createElement("p");
    presentationIssue.className = "document-issue";
    presentationIssue.hidden = true;
    const onLink = (event) => {
      const link = event.target.closest("a[href]");
      if (!link || !content.contains(link)) return;
      event.preventDefault();
      if (event.button > 1) return;
      const href = link.dataset.documentHref;
      if (href.startsWith("#")) {
        let id;
        try {
          id = decodeURIComponent(href.slice(1));
        } catch {
          return;
        }
        const heading = Array.from(content.querySelectorAll("[id]")).find(
          (node) => node.id === `document-${id}`
        );
        heading?.scrollIntoView({ block: "nearest" });
      } else if (/^https?:\/\//i.test(href)) callbacks.openUrl(href);
    };
    content.addEventListener("click", onLink);
    content.addEventListener("auxclick", onLink);
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
    root2.append(content, presentationIssue, status, issue, retryRoot);
    let displayed = null;
    let format = null;
    let renderingFailed = false;
    return {
      update(next) {
        if (next.hasContent && (displayed !== next.text || format !== (next.format ?? "text"))) {
          renderingFailed = false;
          try {
            if (next.format === "markdown") content.replaceChildren(renderDocument(next.text));
            else {
              const pre = document.createElement("pre");
              pre.textContent = next.text;
              content.replaceChildren(pre);
            }
          } catch {
            const pre = document.createElement("pre");
            pre.textContent = next.text;
            content.replaceChildren(pre);
            presentationIssue.textContent = "Document rendering failed. Original source is shown.";
            renderingFailed = true;
          }
          displayed = next.text;
          format = next.format ?? "text";
        }
        content.hidden = !next.hasContent;
        presentationIssue.hidden = !next.hasContent || !renderingFailed;
        status.textContent = next.status ?? "";
        status.hidden = !next.status;
        issue.textContent = next.error ?? "";
        issue.hidden = !next.error;
        retryRoot.hidden = !next.error;
        onRetry = next.retry;
        retry.update({ disabled: !next.canRetry });
      },
      dispose() {
        content.removeEventListener("click", onLink);
        content.removeEventListener("auxclick", onLink);
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
    const titleGroup = document.createElement("div");
    titleGroup.className = "detail-title-group";
    titleGroup.append(title);
    const areas = mountAreaBadges(titleGroup);
    titleRow.append(backRoot, titleGroup);
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
      areas.update([]);
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
        const view = mountDocumentView(body2, { openUrl: callbacks.openUrl });
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
        areas.update(state.change.affectedAreas);
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
            format: documentFormat(descriptor.selector),
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
        areas.dispose();
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
      openUrl: (url) => {
        void host2.openUrl(url).catch(async (caught) => {
          await host2.toast({
            kind: "error",
            message: caught instanceof HostRequestError ? caught.message : "Cannot open document link"
          });
        }).catch(() => {
        });
      },
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
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.16 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.16/LICENSE *)
  (*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE *)
*/
