# Verification

## Scope and permission

The implementation request is to complete all remaining tasks, including scoped testing-branch
pushes, repeated GitHub Actions runs and the final `dev` integration. Remote work is limited to
those tasks; `main`, tags and releases are excluded.

## Baseline

- Workflow structure checked with the installed YAML parser: Windows/macOS only, temporary
  testing-branch push trigger, permanent `dev`/`main` targets, read-only contents permission and
  fail-fast disabled.
- Prettier passed for the initial workflow, README and service tests.
- `npm run build:service` and the two new focused service launcher tests passed on Linux before
  changing the production launcher.
- Native baseline:
  [run 45708990036](https://github.com/jaythomasonprojects/openchamber-openspec/actions/runs/45708990036),
  head `0319fd8970b8fff7a2bcaafa6b966cd45d5eb535`. Windows failed the independent installed-CLI
  regression with `CLI_UNAVAILABLE`, reproducing issue #1. macOS passed that regression and 171/172
  suite tests; its deletion-root-race fixture assumed `/tmp/opencode` existed and returned 404
  instead of the intended root-changed 409. Both failures were inspected with
  `gh run view --log-failed`.

## Affected Linux checks

After the adapter consolidation and filesystem fixture changes, `npm run build` followed by
`node --test test/service.test.mjs test/integration.test.mjs test/harness.test.mjs` passed all 56
affected tests, including the registered-store environment and missing-browser teardown.

## Launcher fix and fixture baseline

- [Run 45709844327](https://github.com/jaythomasonprojects/openchamber-openspec/actions/runs/45709844327),
  head `a24b78e3d9fdcdc067a4263ac79f8f99b200d781`: both native platforms passed installed npm
  execution, special-character arguments, launch/operation error distinction and process/output
  bounds after the launcher change.
- Windows exposed the independent fixture launch failure (`spawn openspec ENOENT`) and a native
  path-separator assertion. The fixture launcher still used raw `execFile` in this revision.
- macOS passed the corrected root-change fixture but exposed a theme test reading styles before the
  asynchronous SDK theme message arrived. The fix waits for the existing SDK-applied theme attribute
  before asserting colours, retaining the same panel seam and expectations.
- Before replacing the fixture adapter, its capture, failed-exit, missing-command, output-bound and
  timeout tests passed on Linux. After replacement, the same tests passed in 1.8 seconds. An
  intermediate native `spawn` timeout left a deadline alive after a failed launch; clearing the
  adapter's deadline on both error and close removed that 30-second exit delay.
