import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export function runFixtureCommand(command, args, { cwd, env, timeoutMs = 30_000 } = {}) {
  return exec(command, args, { cwd, env, timeout: timeoutMs, killSignal: "SIGKILL" });
}

export async function withProjects(run) {
  const directories = [];
  try {
    for (const label of ["first", "second"])
      directories.push(await mkdtemp(join(tmpdir(), `openspec-${label}-`)));
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
