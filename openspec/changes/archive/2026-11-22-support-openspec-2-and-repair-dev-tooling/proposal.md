# Proposal

## Why

Upstream issue #2 reports that OpenSpec CLI 2.x breaks the board. On 2.1.0 the service's CLI calls
return the same JSON shapes as 1.13.1, so decoding is unaffected. The one 2.x difference, multi-line
task descriptions returned whole, fails three tests that pin 1.x truncation. Separately, the
developer environment misleads agents. Worktree setup aborts on the tracked `openspec/` directory,
AGENTS.md calls `openspec/` untracked, and on macOS most service and integration tests fail on the
symlinked temp directory.

## What Changes

- Make the three task-description tests pass on both OpenSpec 1.x and 2.x. The service passes
  through whatever description the CLI reports.
- Stop sharing `openspec/` from worktree setup, so the setup links `node_modules` again. Correct
  AGENTS.md and the script's docstring.
- Fix the macOS temp-directory root mismatch at its cause. If a user project reached through a
  symlinked path triggers it too, fix the service. Otherwise canonicalise the test fixtures.
- README: tested with OpenSpec 1.13.1 and 2.1.0.
- Replace config references to skills that do not exist in this environment (`tdd`, `simple`) with
  instructions that hold without them, or name where to get them.

No user-visible behaviour change, except that a symlinked-path service fix, if needed, makes such
projects load.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No spec pins task truncation or the developer tooling, so `skip_specs` is set.

## Impact

`test/service.test.mjs`, `test/integration.test.mjs`, `test/helpers/openspec.mjs` (or
`src/service/openspec.ts` if the root mismatch is a product bug), `scripts/setup_worktree.py`,
`AGENTS.md`, `README.md`, `openspec/config.yaml`. No CLI, SDK, manifest or permission changes.
