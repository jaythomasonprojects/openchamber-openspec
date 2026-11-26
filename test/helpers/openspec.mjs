import spawn from "cross-spawn";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function runFixtureCommand(command, args, { cwd, env, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const timer = timeoutMs > 0 ? setTimeout(() => child.kill("SIGKILL"), timeoutMs) : undefined;
    const output = { stdout: [], stderr: [] };
    const size = { stdout: 0, stderr: 0 };
    let fault;
    for (const stream of ["stdout", "stderr"]) {
      child[stream].on("data", (chunk) => {
        if (fault) return;
        size[stream] += chunk.length;
        // Preserve execFile's default buffer bound without importing its platform launcher.
        if (size[stream] > 1024 * 1024) {
          fault = Object.assign(new Error(`${command}: ${stream} exceeded the fixture limit`), {
            code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
          });
          child.kill("SIGKILL");
        } else output[stream].push(chunk);
      });
    }
    child.on("error", (error) => {
      // A failed spawn has no exit event, but must not keep the fixture deadline alive.
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const captured = Object.fromEntries(
        Object.entries(output).map(([stream, chunks]) => [
          stream,
          Buffer.concat(chunks).toString("utf8"),
        ]),
      );
      if (!fault && code === 0) resolve(captured);
      else
        reject(
          Object.assign(fault ?? new Error(`${command} failed (${signal ?? code})`), {
            code: fault?.code ?? code,
            signal,
            killed: child.killed,
            ...captured,
          }),
        );
    });
  });
}

export async function withProjects(run) {
  const directories = [];
  try {
    const tempDirectory = await realpath(tmpdir());
    for (const label of ["first", "second"])
      directories.push(await mkdtemp(join(tempDirectory, `openspec-${label}-`)));
    const setup = await Promise.allSettled(
      directories.map((directory) =>
        runFixtureCommand("openspec", ["init", "--tools", "none", directory]),
      ),
    );
    const failed = setup.filter((result) => result.status === "rejected");
    if (failed.length) throw new AggregateError(failed.map((result) => result.reason));
    await run(...directories);
  } finally {
    const cleanup = await Promise.allSettled(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    const failed = cleanup.filter((result) => result.status === "rejected");
    if (failed.length) throw new AggregateError(failed.map((result) => result.reason));
  }
}

export async function fixtureChange(directory, name, goal) {
  await runFixtureCommand("openspec", ["new", "change", name, "--goal", goal], { cwd: directory });
  await writeFile(
    join(directory, "openspec", "changes", name, "proposal.md"),
    `# Proposal\n\n${goal}\n`,
  );
}
