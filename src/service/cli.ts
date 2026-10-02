import { spawn } from "node:child_process";

const COMMAND_TIMEOUT_MS = 15_000;
const STDOUT_BYTES = 1024 * 1024;
const STDERR_BYTES = 64 * 1024;
const TERMINATION_GRACE_MS = 500;
export const MAX_RESPONSE_BYTES = 240_000;

export type Json = Record<string, unknown>;
export class ServiceFault extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly outcome?: "unknown",
  ) {
    super(message);
    Object.defineProperty(this, "message", { value: message, enumerable: true });
  }
}
export type ServiceError = ServiceFault;
export type CliResult =
  { ok: true; value: Json } | { ok: false; error: ServiceError; value?: Json };
export type CommandRunner = (
  directory: string,
  args: string[],
  remainingMs?: number,
) => Promise<CliResult>;

export function serviceError(
  code: string,
  message: string,
  status = 400,
  outcome?: "unknown",
): ServiceError {
  return new ServiceFault(code, message, status, outcome);
}

function cliMessage(value: unknown, stderr: Buffer[]): string {
  const status = value && typeof value === "object" ? (value as Json).status : undefined;
  if (Array.isArray(status) && status[0] && typeof status[0] === "object") {
    const message = (status[0] as Json).message;
    if (typeof message === "string") return message;
  }
  return (
    Buffer.concat(stderr).toString("utf8").trim() || "OpenSpec could not complete this operation."
  );
}

export async function runOpenSpec(
  directory: string,
  args: string[],
  remainingMs = COMMAND_TIMEOUT_MS,
  options: {
    binary?: string;
    stdoutBytes?: number;
    stderrBytes?: number;
    graceMs?: number;
  } = {},
): Promise<CliResult> {
  if (remainingMs <= 0)
    return { ok: false, error: serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504) };
  return await new Promise((complete) => {
    const child = spawn(options.binary ?? "openspec", [...args, "--json"], {
      cwd: directory,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutSize = 0;
    let stderrSize = 0;
    let fault: ServiceError | null = null;
    let settled = false;
    let grace: NodeJS.Timeout | undefined;
    const finish = (result: CliResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(grace);
      complete(result);
    };
    const terminate = (error: ServiceError): void => {
      if (fault) return;
      fault = error;
      child.kill("SIGTERM");
      grace = setTimeout(() => {
        child.kill("SIGKILL");
        // The close event normally follows SIGKILL; also bound unexpected stream shutdown delays.
        grace = setTimeout(
          () => finish({ ok: false, error }),
          options.graceMs ?? TERMINATION_GRACE_MS,
        );
      }, options.graceMs ?? TERMINATION_GRACE_MS);
    };
    const timer = setTimeout(
      () => terminate(serviceError("CLI_TIMEOUT", "OpenSpec request timed out.", 504)),
      Math.min(COMMAND_TIMEOUT_MS, remainingMs),
    );
    child.stdout.on("data", (value: Buffer) => {
      stdoutSize += value.length;
      if (stdoutSize > (options.stdoutBytes ?? STDOUT_BYTES))
        terminate(serviceError("CLI_OUTPUT_TOO_LARGE", "OpenSpec output is too large.", 413));
      else stdout.push(value);
    });
    child.stderr.on("data", (value: Buffer) => {
      stderrSize += value.length;
      if (stderrSize > (options.stderrBytes ?? STDERR_BYTES))
        terminate(serviceError("CLI_OUTPUT_TOO_LARGE", "OpenSpec output is too large.", 413));
      else stderr.push(value);
    });
    child.on("error", () => {
      finish({
        ok: false,
        error: serviceError("CLI_UNAVAILABLE", "OpenSpec CLI is unavailable.", 503),
      });
    });
    child.on("close", (code) => {
      if (fault) {
        finish({ ok: false, error: fault });
        return;
      }
      let value: unknown = null;
      try {
        value = JSON.parse(Buffer.concat(stdout).toString("utf8"));
      } catch {
        // The CLI can fail before emitting a diagnostic envelope.
      }
      if (code === 0 && value && typeof value === "object" && !Array.isArray(value)) {
        finish({ ok: true, value: value as Json });
      } else {
        finish({
          ok: false,
          ...(value && typeof value === "object" && !Array.isArray(value)
            ? { value: value as Json }
            : {}),
          error: serviceError(
            code === null ? "CLI_TIMEOUT" : "OPENSPEC_ERROR",
            cliMessage(value, stderr),
            code === null ? 504 : 422,
          ),
        });
      }
    });
  });
}
