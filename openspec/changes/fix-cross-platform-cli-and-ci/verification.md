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

## Final trigger comparison

The final workflow removes only `fix/1-cross-platform-tests` from the push filter. A parsed-YAML
comparison against passing candidate `b7e39023ade06446283c3125f23f5e90e9baa111` confirmed every
execution setting is identical, with final push and pull-request targets exactly `[dev, main]`. The
main `dev` checkout was clean before integration.

## Passing native candidate

[Run 45712069075](https://github.com/jaythomasonprojects/openchamber-openspec/actions/runs/45712069075),
head `b7e39023ade06446283c3125f23f5e90e9baa111`, passed both native jobs. Windows and macOS each
passed all 175 npm-suite tests with zero skips and the standalone installed-CLI smoke test. Release
asset checksums, selected command paths and reported standalone install types all passed. This
covers the shared/local integration journeys and all original containment/cleanup cases. There were
four candidate runs in total and no transient reruns; each correction was committed and tested as a
new revision.

The same standalone regression also passed on Linux after downloading and checksum-verifying the
pinned Linux release into a temporary directory, without changing the global npm installation.

## Native fixture verification

[Run 45711148655](https://github.com/jaythomasonprojects/openchamber-openspec/actions/runs/45711148655),
head `ac163f7a18cf164fbcb5361349b18a66cbee9e21`:

- macOS passed all 175 npm-suite tests with no skips.
- Windows passed 173/175 with no skips. Only the two integration journeys failed: their document
  selectors assumed Unix separators. They use native path joins in the correction.
- Both platforms passed CLI bounds/PID cleanup, fixture timeout/removal and missing-browser
  teardown. Explicit SIGKILL already reports consistently in these tests, so no weakened assertions
  or new OS branches were needed.
- Standalone asset download, architecture selection and checksum passed on macOS. The path guard
  caught PowerShell returning multiple application matches, including the correct first executable.
  The correction checks the first match rather than comparing the entire result array with a single
  path.

## Artifact verification mapping

- CLI command resolution: `src/service/cli.ts:64` uses the explicit runtime dependency;
  `test/service.test.mjs:1042` exercises the installed command and its reported installation type.
- Argument and working-directory preservation: the installed-CLI test creates a goal containing
  quotes, Unicode and an ampersand in a path containing spaces; the fake CLI test at
  `test/service.test.mjs:1072` also asserts the complete argv array and cwd.
- Bounded execution and failure distinctions: the existing service bounds/PID test at
  `test/service.test.mjs:1097` and the missing-command/nonzero-exit cases remain active.
- Native platform, installer and reproducibility requirements map to `.github/workflows/verify.yml`:
  two native runners, locked project dependencies, pinned npm and standalone versions, verified
  asset checksums, and fail-fast disabled.
- Permanent event filters and testing-branch retirement need the final trigger-only edit and
  resulting `dev` run. The GitHub run history above supplies the failure/iteration evidence.
- Design coherence: one existing asynchronous fixture adapter, no new helper/test module, native
  symlinks, canonical temporary paths, unchanged SDK/permissions and no Docker or Linux CI job.
- Local `npm test` passed all 175 tests with zero skips after the native path corrections. Lint,
  format check, typecheck, strict OpenSpec validation, generated-bundle consistency and
  `git diff --check` also passed.

The remaining native installer, integration and rollout evidence is required before the final
verification verdict; this mapping alone is not a claim of task completion.

## Live host

Updated the existing ZIP-installed extension on the Linux host at `http://127.0.0.1:57123`,
re-approved the unchanged permissions, disabled and enabled it, and confirmed `enabled: true` with
revision 16. The installed service bundle hash matches the checkout
(`309f4988a6692661978e7edccf4302dfcf87a75fc15a9d58cfc6cfd0334e5b58`). Python Playwright opened this
existing session's board and the change's Proposal document. No session or worktree was created.
Screenshot: `/tmp/opencode/openspec-live-detail.png`. Windows desktop verification is unavailable;
native Actions evidence is recorded separately.

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
