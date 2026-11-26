# Proposal

## Why

An npm-installed OpenSpec can work in Windows CMD while the extension reports it unavailable,
because Node's direct process launcher cannot execute the npm command shim. Native Windows and macOS
CI is needed to verify the fix and expose platform assumptions in the existing tests.

## What Changes

- Use `cross-spawn` for OpenSpec execution, borrowing the focused launcher change from local V2.
  Preserve argument boundaries, working directories and existing service safeguards.
- Make the existing fixture command helper portable and use it for the duplicate store-test
  launcher. Reuse existing fake CLI scripts and test files.
- Correct platform-specific filesystem and process assertions without dropping their safety
  coverage. Keep the canonical temporary paths already present on `dev`.
- Add native Windows and macOS GitHub Actions jobs for the existing test suite, with focused
  coverage for npm and standalone OpenSpec launches.
- Prove the workflow on a separate testing branch. Temporarily enable pushes to that branch, inspect
  results with GitHub CLI and iterate until both platforms pass. Restore the final `dev`/`main` push
  and pull-request rules before merging into `dev`.
- Defer Docker work. Linux testing remains local; there is no Linux Actions job or new test
  framework in this change.

## Capabilities

### New Capabilities

- `cli-execution`: Launch the installed OpenSpec command across supported operating systems while
  preserving arguments, bounded execution and meaningful failures.
- `native-ci`: Run repeatable Windows and macOS checks natively and validate workflow changes on a
  testing branch before development-branch integration.

### Modified Capabilities

None. Existing loading, shared-planning and deletion requirements remain unchanged.

## Impact

- Addresses [GitHub issue #1](https://github.com/jaythomasonprojects/openchamber-openspec/issues/1).
- Affects `src/service/cli.ts`, package dependencies and the generated service bundle; fixture
  execution in `test/helpers/openspec.mjs`; affected service, integration and harness tests; and a
  new GitHub Actions workflow.
- Adds `cross-spawn` as an explicit runtime dependency and its development typings. The lockfile
  already includes version 7.0.6 through ESLint.
- No panel redesign, SDK upgrade, manifest permission change, new OpenSpec command requirement,
  release or unrelated V2 feature import is planned.
- Windows command resolution and shell-backed termination need native evidence. GitHub-hosted runner
  success does not by itself certify the desktop app's inherited environment.
- Remote test pushes, reruns and the eventual merge are implementation activities, not authorised by
  creating these planning artifacts. Obtain scoped approval before remote writes.
