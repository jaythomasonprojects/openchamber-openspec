import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { runFixtureCommand } from "./helpers/openspec.mjs";

const exec = promisify(execFile);

test("panel and integration setup release their servers when Chromium is missing", async () => {
  const browserPath = await mkdtemp(join(tmpdir(), "openspec-missing-browser-"));
  const { NODE_TEST_CONTEXT: _testContext, ...env } = process.env;
  try {
    for (const [file, name] of [
      ["test/panel.test.mjs", "a first-load summary failure names"],
      ["test/integration.test.mjs", "compiled panel reads and creates"],
    ]) {
      await assert.rejects(
        exec(process.execPath, ["--test", `--test-name-pattern=${name}`, file], {
          cwd: new URL("..", import.meta.url),
          env: { ...env, PLAYWRIGHT_BROWSERS_PATH: browserPath },
          timeout: 20_000,
          maxBuffer: 4 * 1024 * 1024,
        }),
        (error) => {
          assert.equal(error.code, 1, `${file} did not exit normally after launch failed`);
          assert.match(error.stdout, /Executable doesn't exist|browserType\.launch/);
          return true;
        },
      );
    }
  } finally {
    await rm(browserPath, { recursive: true, force: true });
  }
});

test("stalled fixture CLI is force-killed and its disposable root can be removed", async () => {
  const root = await mkdtemp(join(tmpdir(), "openspec-stalled-fixture-"));
  const pidFile = join(root, "pid");
  let pid;
  try {
    await assert.rejects(
      runFixtureCommand(
        process.execPath,
        [
          "-e",
          `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);`,
        ],
        { timeoutMs: 1_000 },
      ),
      (error) => error.signal === "SIGKILL",
    );
    pid = Number(await readFile(pidFile, "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
