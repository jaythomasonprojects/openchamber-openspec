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
