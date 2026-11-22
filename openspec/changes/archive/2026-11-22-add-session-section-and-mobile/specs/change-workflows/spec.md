# Spec Delta

## ADDED Requirements

### Requirement: Current-chat composition tracks the change in the session

When a current-chat workflow action composes a prompt and the chat has a session, the extension
SHALL add that change to the session's saved tracked-change list, keeping changes already in it. It
SHALL save only after composition succeeds in a still-current context. A fresh-chat draft without
a session SHALL save nothing. Saving SHALL NOT send, link items visibly on the session, or change
OpenSpec files, and a save failure SHALL NOT undo or fail the composition.

#### Scenario: Prepare apply in an existing session

- **WHEN** session S tracks `fix-cache` and the user prepares apply for `add-login` in S
- **THEN** the composer holds the unsent Apply prompt and S tracks `fix-cache` and `add-login`

#### Scenario: Prepare in a fresh chat

- **WHEN** the user prepares a workflow while the chat has no session
- **THEN** the prompt is composed and no tracked change is saved

#### Scenario: Composition fails

- **WHEN** the host rejects composition
- **THEN** no tracked change is saved

### Requirement: New-worktree Apply records its change on the created session

New-worktree Apply SHALL record the change it applies on the session it creates, so that the
session shows that change as tracked without a saved list. Bulk archive sessions SHALL be recorded
so that they never resolve as a change.

#### Scenario: Apply in a new worktree

- **WHEN** new-worktree Apply creates session S for `add-login`
- **THEN** S shows `add-login` as tracked

#### Scenario: Archive all

- **WHEN** archive all creates session S
- **THEN** S does not resolve any change from its recorded item

### Requirement: Sync prepares a spec-sync prompt

The section's `sync` chip SHALL replace the open composer's text with an unsent prompt asking the
agent to load and invoke the `openspec-sync-specs` skill for that change, naming the change without
paths. It SHALL NOT send or change files.

#### Scenario: Prepare sync

- **WHEN** the user activates `sync` on `add-login`
- **THEN** the composer holds an unsent prompt requesting `openspec-sync-specs` for OpenSpec change
  `add-login`

### Requirement: Prepare fast-forward, continue and update prompts

The section's `ff`, `continue` and `update` actions SHALL replace the open composer's text with an
unsent prompt that asks the agent, in plain prose, to load and invoke `openspec-ff-change`,
`openspec-continue-change` or `openspec-update-change` through its skill tool. The prompt SHALL
name the change without paths and include its recorded goal when present. The actions SHALL NOT
send, create sessions or worktrees, or change files.

#### Scenario: Prepare fast-forward

- **WHEN** the user activates `ff` on Planning change `add-login` with goal `Sign in with SSO`
- **THEN** the composer holds an unsent prompt requesting `openspec-ff-change` for OpenSpec change
  `add-login`, including the goal, that asks for every remaining planning artefact

#### Scenario: Prepare continue

- **WHEN** the user activates `continue` for Planning change `add-login`
- **THEN** the composer holds an unsent prompt requesting `openspec-continue-change` that asks for
  `add-login`'s next planning artefact

#### Scenario: Prepare update

- **WHEN** the user activates `update` for `add-login`
- **THEN** the composer holds an unsent prompt requesting `openspec-update-change` that asks the
  agent to revise `add-login`'s existing planning artefacts without editing code

### Requirement: Prepare a new-change prompt

The section's `new` action SHALL replace the open composer's text with an unsent prompt that asks
the agent, in plain prose, to load and invoke `openspec-new-change` through its skill tool and to
ask the user what the change is for before creating it. It SHALL name no change, and SHALL NOT
send, create sessions or worktrees, change files or change tracking.

#### Scenario: Prepare a new change

- **WHEN** the user activates the footer's `new`
- **THEN** the composer holds an unsent prompt requesting `openspec-new-change` that asks the user
  what the change is for
- **AND** the session's tracked changes are unchanged

### Requirement: Board opens on a requested change

When the section requests a change for the board's current project, the board SHALL show that
change's detail, after its listing loads if it has not yet. If the change is not listed, the board
SHALL reload once before deciding whether to show its detail. A request for another project
SHALL leave the board at its list without reloading. A request SHALL take effect once.

#### Scenario: Requested change exists

- **WHEN** the section requests `add-login` and the board's listing contains it
- **THEN** the board shows `add-login`'s detail

#### Scenario: Requested change missing

- **WHEN** the requested change is not in the board's listing
- **THEN** the board reloads once and opens the detail if the change is now listed
- **AND** if the change is still missing, the board stays at its list and shows a toast that names
  the missing change
