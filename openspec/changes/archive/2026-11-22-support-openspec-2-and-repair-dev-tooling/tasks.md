# Tasks

## 1. Test environment

- [x] 1.1 Determine whether a project reached through a symlinked directory reproduces
      `ROOT_CHANGED` through the service, using a symlinked fixture at the service seam
      (`test/service.test.mjs`). If it does, add that failing test and fix the comparison in
      `src/service/openspec.ts`. If it does not, canonicalise fixture directories with `realpath`
      in `test/helpers/openspec.mjs`, `test/service.test.mjs` and `test/harness.test.mjs`. Record
      which case applied in the commit message. Verify with `npm run build && node --test
      test/service.test.mjs test/integration.test.mjs` without setting `TMPDIR` on macOS: only the
      task-description failures from 2.1 remain.

- [x] 1.2 Fix three test races in `test/panel.test.mjs` that already fail on `95aab6f`. In
      "whole batch failures retain stale cards and retry; changed roots reload", record the
      `/summaries` request count before Retry and wait for it to increase, replacing the wait on
      the always-present refresh button at `:1084`. In "create dialogue keeps concise actions and a
      width-stable busy button" and "delete confirmation stays visible and width-stable while the
      request is pending", wait for the `/create` or `/delete` request to reach the fake host
      before the second click, at `:2580` and `:3347`. Keep the exactly-one-request assertions.
      Verify each focused test passes 10 runs in a row after `npm run build`.

- [x] 1.3 Close the remaining fake-host races in `test/panel.test.mjs`: archive-all and Refresh
      spinner (both already flaky on `95aab6f`), plus 13 sites found by delaying every fake-host
      message except `hello` by 150 ms. Apply the reviewed inline waits from
      `/var/folders/h2/v24t58z935jbjh4phhvkhc3r0000gp/T/panel-race-fixes.diff` (it applies to
      `5bc37de`). Add no shared helper and change no assertions. Verify with the full panel suite
      passing three consecutive runs after `npm run build`.

- [x] 1.4 Fix the "CLI bounds stdout and stderr and force-kills a process ignoring termination"
      flake (`test/service.test.mjs:1068-1078`). Under full-suite load, Node can take longer than
      the 250 ms timeout to start, so the fake CLI is killed before it writes `child.pid`
      (`ENOENT`). Raise that call's timeout so startup fits, and scale the elapsed-time bound to
      match. Keep the `CLI_TIMEOUT` and `ESRCH` assertions. Verify with the focused test passing 10
      runs in a row while `node --test test/panel.test.mjs` runs at the same time.

## 2. OpenSpec 2.x task descriptions

- [x] 2.1 At the service seam, change `test/service.test.mjs:120` and `:184` to assert that
      descriptions start with their first line, keeping the containment and CLI-authority checks
      exact. At the integration seam, replace the continuation count in
      `test/integration.test.mjs:176` with a check that the task row renders. Verify that both files
      pass with OpenSpec 2.1.0 on PATH and with 1.13.1 (`npm i -g` is not required:
      `npx -y @fission-ai/openspec@1.13.1` in a scratch prefix put first on PATH).
- [x] 2.2 Update the README's tested versions to 1.13.1 and 2.1.0. Verify with
      `npm run format:check`.

## 3. Developer tooling and docs

- [x] 3.1 Remove `openspec` from `SHARED_PATHS` in `scripts/setup_worktree.py` and correct its
      docstring. Verify in a scratch `git worktree add` of this repo: the script links
      `node_modules` and exits 0. Remove the scratch worktree afterwards.
- [x] 3.2 Rewrite the worktree bullet in `AGENTS.md` to match `design.md`. Verify that no
      remaining line in AGENTS.md calls `openspec/` untracked.
- [x] 3.3 Replace the `tdd` and `simple` skill references in `openspec/config.yaml` with inline
      intent. Verify that `openspec instructions proposal --change
      support-openspec-2-and-repair-dev-tooling --json` still parses and shows the new context.

## 4. Integration check

- [x] 4.1 Run `npm run check` on macOS without `TMPDIR` overrides, with OpenSpec 2.1.0 on PATH, and
      report results, including any recurrence of the "CLI bounds stdout and stderr" flake.

## Workflow follow-up

- Draft a reply to upstream issue #2 explaining that the `root` object has always been handled, and
  asking for the extension version and panel error text if they still see failures. Post only after
  the user approves.
