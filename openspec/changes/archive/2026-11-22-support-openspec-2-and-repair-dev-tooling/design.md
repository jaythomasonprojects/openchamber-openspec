# Design

## Context

Evidence gathered 2026-11-21 by running every service CLI call (`context`, `list`, `status
--change`, `status --all`, `instructions apply --change`, `new change`) on OpenSpec 1.13.1, 1.17.0
and 2.1.0. The calls are `src/service/openspec.ts:56, 125, 244, 352, 488, 568, 616`.

- Shapes are identical across versions. `instructions apply` only adds fields (`sourcePath`,
  `line`, `taskTrackingConfigured`), which the service ignores.
- `root` has been an object since 1.13.1, and the service has read `root.path` since its first
  commit. The issue's "string root" reading confuses the service's own reply to the panel
  (`src/contracts.ts:60, 156`) with CLI output.
- OpenSpec 2.0.0 stopped truncating multi-line tasks. A task followed by an indented continuation
  line now has the joined text as its `description`.
- Failing on 2.1.0 only: `test/service.test.mjs:120` and `:184`, and `test/integration.test.mjs:176`
  (local and shared variants).
- On macOS, `tmpdir()` is under `/var`, a symlink to `/private/var`. Without a canonical `TMPDIR`,
  32–35 of 49 service and integration tests fail with 409 `ROOT_CHANGED`
  (`src/service/openspec.ts:67, 99, 111`).
- `scripts/setup_worktree.py` lists `openspec` in `SHARED_PATHS` and also refuses tracked paths.
  `openspec/` is tracked, so `main()` raises before creating any link.

## Goals / Non-Goals

**Goals:** a green suite on macOS with either CLI major version, and documentation that matches the
repository.

**Non-Goals:** trimming 2.x descriptions back to 1.x, supporting a string `root`, Windows CLI
detection (issue #1), or worktree-shared planning (the README leaves that to project setup hooks).

## Decisions

### Version-agnostic task assertions

Each test asserts that the description starts with its first line and that the containment and
authority properties it exists for still hold. The integration test drops its "continuation not
shown" count and instead asserts the task row renders. Requiring 2.x was rejected: it would drop
1.x users for no behavioural gain.

### Root mismatch: find the cause before choosing a fix

First establish whether a project opened through a symlinked directory reproduces `ROOT_CHANGED`
end to end through the service: the panel-provided directory, the CLI `root.path`, and the service's
`realpath` comparisons. If it does, fix the comparison in `src/service/openspec.ts` and pin it at the
service seam with a symlinked fixture. If it does not, canonicalise fixture directories with
`realpath` in `test/helpers/openspec.mjs` and in the `mkdtemp` call sites in `test/service.test.mjs`
and `test/harness.test.mjs`.

### Worktree setup shares only `node_modules`

Remove `openspec` from `SHARED_PATHS` and correct the docstring: tracked OpenSpec files belong to
each worktree's checkout. AGENTS.md says the script links `node_modules` from the main checkout and
refuses conflicting destinations or tracked paths; `openspec/` is tracked and arrives through Git
like any other file; shared uncommitted planning is a project hook choice, as the README describes.

### Config skill references

`openspec/config.yaml` points planners at `tdd` and `simple` skills that are not installed here.
State the intent inline instead (agree test seams with the user, and check the approach for the
simplest workable design), keeping the rest of the config unchanged.

## Risks / Trade-offs

- [Looser task assertions miss a regression] → keep the containment checks (escaped inputs
  rejected, CLI authority) exact; only the description text is loosened.
- [A 1.x-only timing flake ("CLI bounds stdout and stderr…")] → report it if it recurs; out of scope.

## Migration Plan

No data migration. The upstream issue reply is drafted for the user to approve before posting.
