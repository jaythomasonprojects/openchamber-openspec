# Proposal

## Why

When a chat session works on an OpenSpec change, nothing beside that session shows which change it
is or how far it has got; the user must open the board and find the card. OpenChamber's phone
clients show nothing from this extension at all, although its service and frames already work
there.

## What Changes

- Add an `OpenSpec` section to the chat's Work Status panel. It follows the session open in the
  chat and shows each change the session tracks as a compact card: name and `completed/total`, a
  thin bar, a `Tasks:` disclosure with the current task (expanding to a five-task window), and
  chips for the stage action (`propose` / `apply` / `archive`), `sync`, `validate` and `board`.
  Names and tasks open flyouts with detail. (Redesigned on 2026-11-21 after the 1.3.x layout proved
  too tall in live use.)
- 1.5.0 (after 1.4.2 live use): chips follow the change's stage and the OpenSpec workflows the
  user configured (`ff` / `continue` / `propose`, `explore`, `apply`, `archive`, `verify`), `sync`
  hides when specs are skipped, and a footer line holds `＋ Track a change`, `new`, `board` and
  Refresh in place of the header Refresh and each card's `board` chip. The name flyout gains
  `update` and `Open in board`. Coarse-pointer chips shrink to 28px, and the icon is cropped to its
  glyph.
- A session tracks the changes the user saved for it, or else one derived from the extension's item
  on the session or a worktree named after a change. Never infer changes from the transcript.
- Stage and `sync` chips prepare prompts unsent in the session's composer. `validate` runs
  OpenSpec validation on request. `board` opens the board on that change.
- Refresh the section when it loads, when the session or project changes, on explicit Refresh, and
  when the shown session finishes a turn. This is the first event-driven read trigger; it reads only
  the tracked changes, never the whole board.
- Current-chat workflow actions on the board also add the prepared change to the session's tracked
  changes when a session exists.
- Opt the panel and full-screen page into OpenChamber's phone clients, with touch-sized controls on
  coarse pointers, room for device insets and the on-screen keyboard, and no automatic focus moves
  that raise the keyboard on touch devices.
- Upgrade `@openchamber/sdk` from 1.24.2 to 2.7.3, which defines status sections, phone opt-in and
  device information.

No new permissions: a status section and the phone opt-in add no capability, so existing installs
are not asked to re-approve. Sidebar marks are deferred because they would.

## Capabilities

### New Capabilities

- `session-change-section`: the session-scoped Work Status section — tracked changes, what it
  shows, its actions and when it refreshes.

### Modified Capabilities

- `change-workflows`: current-chat composition adds the change to the session's tracked changes;
  new-worktree Apply records the change on the session it creates; `sync` prepares a spec-sync
  prompt; the board opens on a change the section requests.
- `change-presentation`: the board and detail are available on phones and sized for touch.

## Impact

New status entry and bundle beside `panel/`, `package.json` manifest and build scripts,
`src/panel/controller.ts` (prompt extraction and tracked-change saving), a single-change service
read in `src/service/`, `panel/index.html` styles, the fake SDK host and existing test files,
`openspec/config.yaml` scope, `README.md` and `AGENTS.md`.

Compatibility: hosts before OpenChamber 2.0.1 ignore the status section and hosts before 2.7.1
ignore the phone opt-in; `engines.openchamber` cannot express a floor above 1.22.0, so the README
states the minimum. The SDK upgrade crosses a major version and may change types the panel uses.
The extra reads after each turn add a few `openspec` CLI calls per finished turn in sessions that
show the section expanded. 1.5.0 adds one CLI call, `openspec config list --json`, at section
context loads; CLIs without it fall back to the core chips. It adds prompts for the
`openspec-ff-change`, `openspec-continue-change`, `openspec-update-change` and
`openspec-new-change` skills, offered only when the configured profile installs them (update is
core).
