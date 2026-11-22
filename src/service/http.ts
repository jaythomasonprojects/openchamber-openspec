import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { rm } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { createServiceHost } from "@openchamber/sdk";
import { isChangeName } from "../model.js";
import { createOpenSpecAdapter } from "./openspec.js";
import {
  MAX_RESPONSE_BYTES,
  runOpenSpec,
  ServiceFault,
  serviceError,
  type CommandRunner,
  type Json,
} from "./cli.js";

const MAX_BODY_BYTES = 64_000;
const REQUEST_TIMEOUT_MS = 15_000;
const FOCUS_TTL_MS = 30_000;

type Focus = { directory: string; change: string };

function send(response: ServerResponse, status: number, value: Json | null): void {
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, "utf8") > MAX_RESPONSE_BYTES) {
    const fault = serviceError("RESPONSE_TOO_LARGE", "Service response is too large.", 413);
    send(response, fault.status, { error: fault });
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(encoded);
}

async function requestBody(request: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > MAX_BODY_BYTES)
      throw serviceError("BODY_TOO_LARGE", "Request body is too large.", 413);
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value as Json;
  } catch {
    throw serviceError("BAD_REQUEST", "Request body must be a JSON object.");
  }
}

function requiredString(body: Json, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0)
    throw serviceError("BAD_REQUEST", `Missing ${key}.`);
  return value;
}

export function createOpenSpecService(
  token: string,
  runner: CommandRunner = runOpenSpec,
  options: {
    timeoutMs?: number;
    remove?: typeof rm;
    emit?: (topic: "focus") => Promise<unknown>;
  } = {},
) {
  const emit = options.emit ?? createServiceHost({ env: process.env }).emit;
  let pendingFocus: { target: Focus; expiresAt: number } | null = null;
  return createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      send(response, 401, {
        error: serviceError("UNAUTHORIZED", "Missing or invalid service token.", 401),
      });
      return;
    }
    if (request.method === "GET" && request.url === "/health")
      return send(response, 200, { ok: true });
    if (
      request.method === "GET" &&
      (request.url === "/focus" || request.url?.startsWith("/focus?"))
    ) {
      const directory = new URL(request.url, "http://localhost").searchParams.get("directory");
      if (!directory || !isAbsolute(directory))
        return send(response, 400, {
          error: serviceError("BAD_DIRECTORY", "Directory must be absolute."),
        });
      const pending = pendingFocus;
      if (pending && Date.now() >= pending.expiresAt) pendingFocus = null;
      const target = pendingFocus?.target.directory === directory ? pendingFocus.target : null;
      if (target) pendingFocus = null;
      return send(response, 200, target);
    }
    if (request.method !== "POST" || !request.url)
      return send(response, 404, { error: serviceError("NOT_FOUND", "Route not found.", 404) });
    let mutationDispatched = false;
    try {
      const deadline = Date.now() + (options.timeoutMs ?? REQUEST_TIMEOUT_MS);
      const checkedRunner: CommandRunner = async (directory, args) => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504);
        if (args[0] === "new" && args[1] === "change") mutationDispatched = true;
        const result = await runner(directory, args, remaining);
        if (Date.now() >= deadline)
          throw serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504);
        return result;
      };
      const adapter = createOpenSpecAdapter(checkedRunner, options.remove);
      let bodyTimer: NodeJS.Timeout | undefined;
      const body = await Promise.race([
        requestBody(request),
        new Promise<never>((_, reject) => {
          bodyTimer = setTimeout(
            () => {
              request.destroy();
              reject(serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504));
            },
            Math.max(0, deadline - Date.now()),
          );
        }),
      ]).finally(() => clearTimeout(bodyTimer));
      const directory = requiredString(body, "directory");
      const path = new URL(request.url, "http://localhost").pathname;
      if (path === "/focus") {
        if (!isAbsolute(directory))
          throw serviceError("BAD_DIRECTORY", "Directory must be absolute.");
        const change = requiredString(body, "change");
        if (!isChangeName(change)) throw serviceError("BAD_CHANGE", "Change name is invalid.");
        const target = { directory, change };
        pendingFocus = { target, expiresAt: Date.now() + FOCUS_TTL_MS };
        await emit("focus");
        return send(response, 200, { ok: true });
      }
      const expectedRoot =
        body.expectedRoot === undefined ? undefined : requiredString(body, "expectedRoot");
      const expectedPlanning =
        body.expectedPlanning === undefined ? undefined : requiredString(body, "expectedPlanning");
      if (expectedPlanning && (expectedPlanning.length > 4096 || expectedPlanning.includes("\0")))
        throw serviceError("BAD_REQUEST", "Invalid planning identity.");
      const validatePlanning = path === "/validate" ? requiredString(body, "planning") : undefined;
      if (validatePlanning && (validatePlanning.length > 4096 || validatePlanning.includes("\0")))
        throw serviceError("BAD_REQUEST", "Invalid planning identity.");
      const work = validatePlanning
        ? adapter.validate(
            directory,
            requiredString(body, "change"),
            requiredString(body, "expectedRoot"),
            validatePlanning,
          )
        : path === "/changes"
          ? adapter.changes(directory, expectedRoot, expectedPlanning)
          : path === "/summaries"
            ? adapter.summaries(directory, requiredString(body, "expectedRoot"), expectedPlanning)
            : path === "/tasks"
              ? adapter.tasks(
                  directory,
                  requiredString(body, "change"),
                  requiredString(body, "expectedRoot"),
                  expectedPlanning,
                )
              : path === "/document"
                ? adapter.documentFor(
                    directory,
                    requiredString(body, "change"),
                    requiredString(body, "artifactId"),
                    body.selector === undefined ? undefined : requiredString(body, "selector"),
                    requiredString(body, "expectedRoot"),
                    expectedPlanning,
                  )
                : path === "/create"
                  ? adapter.createChange(
                      directory,
                      requiredString(body, "name"),
                      requiredString(body, "goal"),
                      requiredString(body, "expectedRoot"),
                      expectedPlanning,
                    )
                  : path === "/delete"
                    ? adapter.deleteChange(
                        directory,
                        requiredString(body, "change"),
                        requiredString(body, "expectedRoot"),
                        () => {
                          if (Date.now() >= deadline)
                            throw serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504);
                          mutationDispatched = true;
                        },
                        expectedPlanning,
                      )
                    : path === "/summary"
                      ? adapter.summary(
                          directory,
                          requiredString(body, "change"),
                          requiredString(body, "expectedRoot"),
                          expectedPlanning,
                        )
                      : path === "/workflows"
                        ? adapter.workflows(directory)
                        : path === "/archived"
                          ? adapter.archived(
                              directory,
                              requiredString(body, "expectedRoot"),
                              expectedPlanning,
                            )
                          : path === "/specs"
                            ? adapter.specs(
                                directory,
                                requiredString(body, "expectedRoot"),
                                expectedPlanning,
                              )
                            : path === "/spec"
                              ? adapter.spec(
                                  directory,
                                  body.spec,
                                  requiredString(body, "expectedRoot"),
                                  expectedPlanning,
                                )
                              : Promise.resolve({
                                  ok: false as const,
                                  error: serviceError("NOT_FOUND", "Route not found.", 404),
                                });
      let timer: NodeJS.Timeout | undefined;
      const result = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504)),
            Math.max(0, deadline - Date.now()),
          );
        }),
      ]).finally(() => clearTimeout(timer));
      if (result.ok) send(response, 200, result.value);
      else {
        const issue = mutationDispatched
          ? serviceError(result.error.code, result.error.message, result.error.status, "unknown")
          : result.error;
        send(response, issue.status, { error: issue });
      }
    } catch (caught) {
      if (!(caught instanceof ServiceFault) && (caught as NodeJS.ErrnoException)?.code !== "ENOENT")
        console.error("OpenSpec service request failed", {
          op: "openspec.service.request",
          method: request.method,
          error: caught,
        });
      const value =
        caught instanceof ServiceFault
          ? caught
          : (caught as NodeJS.ErrnoException)?.code === "ENOENT"
            ? serviceError("DOCUMENT_UNAVAILABLE", "A reported file is no longer available.", 503)
            : serviceError("INTERNAL", "Service request failed.", 500);
      const issue = mutationDispatched
        ? serviceError(value.code, value.message, value.status, "unknown")
        : value;
      if (!response.headersSent && !response.destroyed) {
        try {
          send(response, issue.status, { error: issue });
        } catch {
          response.destroy();
        }
      }
    }
  });
}
