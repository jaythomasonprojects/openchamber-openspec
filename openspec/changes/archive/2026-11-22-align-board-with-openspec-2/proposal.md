# Proposal

## Why

OpenSpec 2.x installs only the workflows of the user's profile as skills. The board still offers
`verify` to everyone and `propose` for every Planning change, and `archive all` loops the
single-change archive skill even when the bulk-archive skill is installed. Issue #2 made the board
work on CLI 2.x; this change makes it use what 2.x offers. 2.x can also list archived changes and
show main specs, which the board cannot browse today.

Depends on `add-session-section-and-mobile` group 9, which adds the configured-workflow read and the
`ff`, `continue` and `update` prompts. Archive that change first.

## What Changes

- The board reads the configured workflows on initial and context loads and on Refresh, through
  the shared detection from group 9, and falls back to the core set.
- The Planning primary action on cards and detail is `ff`, else `continue`, else `propose`, by the
  same rule as the section, and composes the matching prompt.
- `verify` shows on Complete cards and detail only when the verify workflow is configured. Under
  the default core profile it disappears.
- `archive all` asks for `openspec-bulk-archive-change` when bulk-archive is configured, and keeps
  the current sequential `openspec-archive-change` prompt otherwise. Both still skip unfinished
  changes.
- No sync-related board action exists, so nothing hides when specs are skipped.
- The board gains three views: `Changes` (today's board), `Archived` and `Specs`. `Archived` lists
  archived changes newest first, read-only. `Specs` lists the main specs and shows one as a
  rendered document, read-only.

No new manifest permissions.

## Capabilities

### New Capabilities

- `archived-changes`: list archived changes on the board, read-only, newest first.
- `spec-browsing`: list main specs and read one rendered, read-only.

### Modified Capabilities

- `change-workflows`: workflow vocabulary, Explore, bulk archive prompts and skill invocation follow
  the configured workflows; the board reads them at its loads.
- `change-presentation`: the board switches between Changes, Archived and Specs.

## Impact

`src/panel/controller.ts`, `board-view.ts`, `detail-view.ts`, `primary-action.ts`, `workflow.ts`,
`archive-prompt.ts`, `client.ts`, `resources.ts`, `src/contracts.ts`, `src/service/http.ts` and
`openspec.ts`, `panel/index.html`, the existing test files, `README.md`, `AGENTS.md`.

Compatibility for public users:

- `openspec list --archived` does not exist on 1.13.1 (checked); `list --specs`, `show --type spec`
  and `config list` do. On 1.x the Archived view shows the CLI's error. The plan documents the 2.x
  requirement in the README; the alternative is one small fallback that lists the archive
  directory directly.
- Core-profile users lose `verify` on the board. It returns once they add verify to their profile.
- Users whose configured skills are not installed (delivery `commands`, or no `openspec update`
  since a profile change) get prompts for a missing skill, as in group 9.
