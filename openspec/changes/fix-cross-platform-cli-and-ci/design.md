# Design

## Context

See `proposal.md` for motivation and scope. The current checkout is based on `dev`, not V2.
`src/service/cli.ts` uses Node's `spawn`; fixture setup uses promisified `execFile`, including a
second launcher in the registered-store test. V2 already uses `cross-spawn`, but also contains
unrelated SDK, settings and UI changes.

The upstream cause is Node's Windows process-launch behaviour for npm `.cmd` shims. Successful CMD
resolution does not make direct `spawn("openspec", ...)` work. `cross-spawn` handles command lookup,
shebangs and Windows quoting; it does not collect output or manage process trees.

The existing test suite is Node-based. Browser tests use Playwright and a fake SDK host; service and
integration tests also use disposable real OpenSpec projects. Canonical temporary paths on `dev`
already address macOS aliases. There is no current verification workflow.

## Goals / Non-Goals

**Goals:** Change the process-launch boundary while preserving the service contract and test
isolation. Use native Actions results as the Windows/macOS acceptance evidence.

**Non-Goals:** Import V2 wholesale, change the SDK or approval permissions, build a general process
framework, add test files or helper modules, certify every package manager, or extend Docker.

## Decisions

### 1. Reuse the dependency, not the V2 feature set

Declare `cross-spawn` 7.0.6-compatible as a runtime dependency, add development typings, and replace
the launcher import in `src/service/cli.ts`. Retain separate arguments, `cwd`, inherited
environment, pipes, JSON parsing, deadlines and byte limits; use `windowsHide: true`. Rebuild the
tracked service bundle so installed extensions receive the fix.

Prefer this to raw `shell: true`, which would leave quoting to us, or resolving
`%APPDATA%/npm/node_modules/...`, which would assume an installer layout and bypass normal command
selection. Do not import V2's text-command mode, maintenance options or SDK upgrade.

The installed SDK's `GUEST_SERVICES.md` describes `exec` permissions as declared intent, not a
binary sandbox. The extension continues to declare OpenSpec; using the compatible launcher does not
require adding a shell permission or a new manifest capability.

### 2. Keep one bounded fixture adapter

Keep `runFixtureCommand` in `test/helpers/openspec.mjs`. Replace its subprocess launch with
`cross-spawn` and a small asynchronous collector that preserves `{ stdout, stderr }`, rejects failed
launches/exits with useful diagnostics, bounds output and honours `timeoutMs`. Preserve the existing
30-second default and forced-termination intent.

Use that helper in the store test instead of its private `execFile` wrapper, retaining the test's
isolated environment and JSON adapter. Keep `withProjects`, `fixtureChange`, canonical paths and
all-settled cleanup: they own project lifetimes rather than command lookup.

Do not route fixture setup through the production runner. Its unconditional `--json`, service error
envelope and read-oriented limits do not fit general setup commands. Do not replace
`execFile(process.execPath, ...)` in the missing-browser harness: a known Node executable needs no
shim resolution. Synchronous spawning would block live service callbacks, so keep setup async.

### 3. Adapt existing test seams, preserving their guarantees

- In `test/service.test.mjs`, reuse the existing shebang fake CLI to check argument boundaries,
  working directories, output bounds and process cleanup. Its `#!/usr/bin/env node` form is
  supported by `cross-spawn` on Windows; separate batch-script fixtures are unnecessary.
- Add a focused installed-CLI launch regression in that same file, independent of the fixture
  command helper, so a helper failure cannot mask the service launch failure. Use it for npm and
  standalone evidence. Do not replace existing malformed-output or containment stubs with real CLI
  calls.
- In `test/harness.test.mjs`, retain fixture timeout/removal and missing-browser teardown tests.
  Assert the timeout outcome and PID disappearance on each platform; require Unix signal escalation
  only where the OS supports it.
- In service and integration fixtures, make directory/file link types explicit, including dangling
  and cyclic directory links. Use native link semantics and runner permissions that exercise the
  existing rejection cases. Missing privileges must be an actionable setup failure, not a blanket
  skip or a reason to replace links with copied directories.
- Keep executable permissions for Unix fake scripts. The current checkout's `chmod` use is for those
  scripts, not V2's additional unreadable-settings tests.

These are the agreed seams. Add no platform simulation harness or dependency-internal tests. Capture
expected native failures before the fixes and passing results afterwards. If meeting an existing
cleanup guarantee needs new process-tree machinery, stop with the failing evidence and seek approval
for that additional scope.

### 4. Two native jobs, one suite, focused installation coverage

Add `.github/workflows/verify.yml` with `windows-latest` and `macos-latest`, `fail-fast: false`,
read-only contents permission and bounded job duration. Use Node 24, `npm ci`, a pinned npm OpenSpec
2.1.0 installation and Playwright Chromium. Run the existing `npm test` suite in each job. Node 24
satisfies the current CLI and development-tool requirements without changing the extension runtime
target.

After npm verification, install the same pinned standalone release using the matching official
release asset and checksum. Put it first on PATH for a focused installed-CLI regression. Verify the
selected path and reported installation type, so the npm copy cannot mask a broken standalone
launch. Select assets for the runner's actual architecture. This needs ordinary workflow steps, not
a new preparation script or a second complete suite per installer.

Use the existing tests and Chromium rather than adding a browser/version/package-manager matrix.
There is no Linux job. This is a test workflow, not the full release gate; `npm run check` and the
project's release-browser requirements still apply when a release is requested.

### 5. Validate the workflow on its own branch before merging

Use the current `fix/1-cross-platform-tests` work branch as the separate CI testing branch unless
the user chooses another. Do not develop the workflow directly on `dev`.

For the experiment, add that exact branch to `push.branches` alongside `dev` and `main`. Keep
`pull_request.branches` targeting `dev` and `main`. Ask for scoped permission to push and iterate on
the testing branch; planning approval alone does not grant remote-write permission.

Bootstrap the workflow and regression tests early enough to capture the expected Windows launcher
failure before applying the fix. Use `gh run list --branch <branch> --workflow verify.yml` to
identify runs, `gh run watch <id> --exit-status` to follow them and `gh run view <id> --log-failed`
to inspect failures. Record run URLs, head SHAs and both job conclusions. A source or execution
configuration fix needs a new tested commit; rerun unchanged jobs only for transient runner
failures. Repeat as many times as needed until both jobs pass. Do not accept an earlier green
revision after changing execution logic.

After that green candidate, remove only the temporary branch from the push filter and inspect the
diff against the tested configuration. If execution logic changes too, restore the temporary trigger
and retest it. Do not depend on `workflow_dispatch` being registered on the default branch for a
brand-new workflow.

Obtain approval for the merge and `dev` push, then integrate the tested change with final triggers.
Respect the existing `dev` worktree and any user changes rather than resetting or switching its
checkout. Inspect the resulting `dev` run with `gh`; both native jobs must pass before recording the
rollout complete. A real runner failure remains unfinished work, not evidence of success. Tags,
releases and merging to `main` are separate activities.

## Risks / Trade-offs

- Shell-backed npm execution adds a process boundary. Keep existing termination tests and inspect
  native failures; this plan does not claim general descendant-tree termination.
- Windows link privileges can differ from local machines. Exercise the real hosted runner and report
  unmet setup requirements instead of weakening containment coverage.
- Hosted runners cannot prove desktop environment inheritance. Follow the existing live-host
  procedure for local activation; report Windows desktop verification as unavailable unless actually
  performed. Local Linux checks are useful but do not replace native job results.
- Pinned OpenSpec 2.1.0 gives reproducible evidence, not certification of every newer version or
  package-manager wrapper. No OpenSpec flags or supported-version minimum change is required.
- Remote experiments cost runner time and need authenticated GitHub access. Use focused local checks
  between attempts; if access or approval is unavailable, report that blocker and leave remote
  acceptance tasks open.

## Migration Plan

Ship rebuilt bundles and the lockfile with the source change. Update/reinstall and restart the
extension service using the repository's live-host instructions; no project migration is needed. If
native evidence shows a regression, fix or revert only this change's launcher/workflow commits
through normal reviewed Git operations. Keep unrelated user work intact and repeat native
verification before retrying integration.
