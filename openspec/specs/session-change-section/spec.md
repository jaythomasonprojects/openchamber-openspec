# session-change-section Specification

## Purpose

Shows, beside the chat session that is open, which OpenSpec changes that session works on, how far
each has got, and the next workflow step, on desktop, web and phone.

## Requirements

### Requirement: Contribute a session section to Work Status

The extension SHALL contribute a Work Status section titled `OpenSpec` that appears only when a
project is open. The section SHALL describe the session open in the chat and SHALL redraw for the
new session or project when the user switches, without requiring a remount. It SHALL add no
capability beyond those already declared.

#### Scenario: Switch sessions

- **WHEN** the section is expanded and the user opens another session in the same project
- **THEN** the section shows the tracked changes of the newly opened session
- **AND** no content from the previous session remains visible after the new state renders

#### Scenario: No project open

- **WHEN** the chat has no project directory
- **THEN** the section is not shown

### Requirement: Resolve the session's tracked changes

When the user has saved a tracked-change list for the session, that list SHALL be the session's
tracked changes, even when it is empty. Otherwise the section SHALL derive at most one change: the
extension's own item on the session naming a change, else the session's worktree when its name
equals a change name. Only changes in the active listing for the session's project SHALL show. The
section SHALL NOT infer changes from conversation content or tool activity.

#### Scenario: Saved list wins

- **WHEN** the user saved `add-login` and `fix-cache` for a session started for `add-search`
- **THEN** the section shows `add-login` and `fix-cache`, in saved order, and not `add-search`

#### Scenario: Worktree Apply session

- **WHEN** a session was started by new-worktree Apply for `add-login` and nothing is saved
- **THEN** the section shows `add-login`

#### Scenario: Bulk archive session

- **WHEN** the session was started by archive all and nothing is saved
- **THEN** the section shows no change and offers `＋ Track a change`

#### Scenario: Untracked everything

- **WHEN** the user untracks the last change of a worktree Apply session
- **THEN** the section shows no change, and the worktree name does not bring it back

#### Scenario: Tracked change no longer active

- **WHEN** a saved change has been archived or deleted
- **THEN** that change is not shown, and the other saved changes still are

### Requirement: Close the section with a footer line

Below the last card, or alone when nothing is tracked, the section SHALL show one footer line:
`＋ Track a change` on the left, and on the right `new`, `board`, and a refresh icon button whose
accessible name is `Refresh`. `new` SHALL show only when the `new` workflow is configured. `board`
SHALL open the extension's board. Refresh SHALL re-read the section. The section SHALL
contribute no Refresh control to the Work Status header.

#### Scenario: Core profile

- **WHEN** the configured workflows are the core set
- **THEN** the footer shows `＋ Track a change`, `board` and `Refresh`, and no `new`

#### Scenario: New workflow configured

- **WHEN** the configured workflows include `new`
- **THEN** the footer shows `new` before `board`

#### Scenario: Open the board from the footer

- **WHEN** the user activates the footer's `board`
- **THEN** the board opens without changing an existing list or detail view

#### Scenario: Footer on a phone

- **WHEN** the section renders at 320px width on a coarse pointer
- **THEN** the footer stays on one line, no taller than its line of text

### Requirement: Track and untrack changes

`＋ Track a change` SHALL list active changes that are not already tracked, in task-progress order,
and add the chosen one to the session's saved list. `Untrack`, in a change's name flyout, SHALL
remove it. Saved lists SHALL persist for that session across devices on the same server. A new
chat without a session SHALL disable tracking and explain that a session is required.

#### Scenario: Order choices by task progress

- **WHEN** `＋ Track a change` lists active changes
- **THEN** it shows these groups in order, preserving listing order within each group:

1. Some but not all tasks complete.
2. Tasks exist but none are complete.
3. No tasks.
4. At least one task exists and all tasks are complete.

#### Scenario: Track a second change

- **WHEN** session S tracks `add-login` and the user tracks `fix-cache`
- **THEN** the section shows both, and S shows both after reload or on another connected device

#### Scenario: Untrack a change

- **WHEN** the user activates `Untrack` for `fix-cache`
- **THEN** only `add-login` remains for S

### Requirement: Show each tracked change as a compact card

Each tracked change SHALL show as a card: its name followed by `completed/total` task counts on
one line, then a thin completion bar. The name SHALL truncate with an ellipsis before the count
wraps. When the change has tasks, a `Tasks:` disclosure SHALL follow, labelled with a disclosure
icon and no underline. On the same line, show the underlined title of the first incomplete task,
or the last task when all are complete.

#### Scenario: Change in progress

- **WHEN** a tracked change has 17 of 19 tasks complete and 6.2 is the first incomplete task
- **THEN** its card shows the name, `17/19`, a bar at 17/19, and a collapsed `Tasks:` disclosure
  followed by task 6.2's title

#### Scenario: No tasks yet

- **WHEN** a tracked change is in Planning and has no tasks
- **THEN** its card shows `0/0` with an empty bar and no `Tasks:` disclosure

### Requirement: Expand tasks around the current one

Expanding `Tasks:` SHALL show up to five tasks, each with a checkbox reflecting completion and its
title on one line. The window SHALL centre on the first incomplete task where tasks exist on both
sides, and otherwise shift to show five tasks. The checkboxes SHALL be read-only.

#### Scenario: Current task in the middle

- **WHEN** a change has 19 tasks, the 10th is the first incomplete one, and the user expands
  `Tasks:`
- **THEN** tasks 8 to 12 show, the 10th in the middle, with 8 and 9 checked

#### Scenario: Current task near the end

- **WHEN** the first incomplete task is the 18th of 19
- **THEN** tasks 15 to 19 show

#### Scenario: Few tasks

- **WHEN** a change has 3 tasks
- **THEN** all 3 show

#### Scenario: Current task near the start

- **WHEN** the first incomplete task is the first task of 10
- **THEN** tasks 1 to 5 show

### Requirement: Flyouts show detail on demand

Activating a change's name SHALL open a flyout with the name, stage label, goal and change actions.
Activating a task title, in the `Tasks:` line or the expanded list, SHALL open a flyout with that
task's full description. On a phone, flyouts open as the host's bottom sheet. Where the host offers
no flyouts, the same content SHALL expand inline below the activated element.

#### Scenario: Task flyout

- **WHEN** the user activates task 6.2's title
- **THEN** a flyout shows task 6.2's full multi-line description

#### Scenario: Host without flyouts

- **WHEN** the host does not support flyouts and the user activates a change's name
- **THEN** the name, stage, goal, actions and `Untrack` expand inline under the name

### Requirement: Offer change actions in the name flyout

The name flyout SHALL offer `update` and `Open in board`, preceded by `continue` when the change is
in Planning and both `ff` and `continue` are configured. `Untrack` SHALL follow as a small control
aligned right.

#### Scenario: Name flyout actions

- **WHEN** the user opens the name flyout of an In Progress change
- **THEN** it offers `update` and `Open in board`, and a smaller right-aligned `Untrack`
- **AND** it offers no `continue`

#### Scenario: Continue beside fast-forward

- **WHEN** `ff` and `continue` are both configured and the user opens a Planning change's name
  flyout
- **THEN** it offers `continue` before `update` and `Open in board`

#### Scenario: Update a change

- **WHEN** the user activates `update` in a change's name flyout
- **THEN** the composer holds an unsent prompt to revise that change's planning artefacts

### Requirement: Read the configured workflows at context loads

The section SHALL read which OpenSpec workflows are configured when it loads, when the project
changes and on Refresh, and SHALL reuse that result for finished-turn reads and session switches in
the same project. When the read fails, the section SHALL use the core set: `propose`, `explore`,
`apply`, `update`, `sync` and `archive`. A configured workflow SHALL count as expected to be
installed, not as proof that its skill exists.

#### Scenario: Turn finishes

- **WHEN** the shown session finishes a turn
- **THEN** the section re-reads its tracked changes without re-reading the configured workflows

#### Scenario: Older OpenSpec CLI

- **WHEN** the CLI cannot report its configured workflows
- **THEN** the section shows chips for the core set and no error

### Requirement: Offer workflow chips on each card

Each card SHALL show chips in this order: the stage chip, the stage's secondary chip when it has
one, `sync`, `validate`. `sync` SHALL be hidden when the change's specs artefact is skipped. Cards
SHALL have no `board` chip. Workflow chips SHALL replace the open composer's text with an unsent
prompt and SHALL NOT send, create sessions or worktrees, or change OpenSpec files.

#### Scenario: Specs skipped

- **WHEN** a tracked change's specs artefact is skipped
- **THEN** its card shows no `sync` chip

#### Scenario: Apply an in-progress change

- **WHEN** the user activates `apply` on an In Progress change
- **THEN** the composer holds the board's current-chat Apply prompt for that change, unsent

#### Scenario: Archive a complete change

- **WHEN** the user activates `archive` on a Complete change
- **THEN** the composer holds the board's Archive prompt for that change, which keeps the archive
  skill's spec-sync step

#### Scenario: Session replaced while preparing

- **WHEN** the user switches session before composition completes
- **THEN** no feedback or composition is replayed into the replacement session

### Requirement: Choose stage chips from the configured workflows

The stage and secondary chips SHALL follow the change's stage and the configured workflows:

| Stage | Stage chip | Secondary chip |
| --- | --- | --- |
| Planning | `ff` if configured, else `continue` if configured, else `propose` | `explore` |
| Ready, In Progress | `apply` | none |
| Complete | `archive` | `verify`, only when configured |

#### Scenario: Planning with the core profile

- **WHEN** the core set is configured and a tracked change is in Planning
- **THEN** its chips are `propose`, `explore`, `sync`, `validate`

#### Scenario: Planning with fast-forward

- **WHEN** `ff` is configured and a tracked change is in Planning
- **THEN** its stage chip is `ff`, and activating it composes a prompt for `openspec-ff-change`

#### Scenario: Planning with continue only

- **WHEN** `continue` is configured, `ff` is not, and a tracked change is in Planning
- **THEN** its stage chip is `continue`, and activating it composes a prompt for
  `openspec-continue-change`

#### Scenario: Complete with verify

- **WHEN** `verify` is configured and a tracked change is Complete
- **THEN** its chips are `archive`, `verify`, `sync`, `validate`

### Requirement: Validate a change on request

`validate` SHALL run OpenSpec validation for that change and report whether it is valid. The result
SHALL list warnings and errors as issues and show informational results as muted `Note` lines.
The placeholder `file` SHALL NOT be shown as a location. Notes SHALL NOT count toward issue totals
or omitted-issue counts. Validation SHALL change no files and SHALL run only when activated.

#### Scenario: Valid change

- **WHEN** the user activates `validate` on a valid change
- **THEN** a flyout reports that the change is valid

#### Scenario: Invalid change

- **WHEN** validation reports issues
- **THEN** the flyout lists the warnings and errors with their messages and any real locations

#### Scenario: Validation reports an informational note

- **WHEN** validation passes and reports an informational result with the placeholder location `file`
- **THEN** the flyout reports that the change is valid and shows a muted `Note` without a location
- **AND** the note does not count as an issue

### Requirement: Open the board on the change

`Open in board`, in a change's name flyout, SHALL open the extension's board showing that change's
detail when the board's project is the session's project, whether the board was already open or
opens now. Otherwise the board SHALL open at its list.

#### Scenario: Board already open

- **WHEN** the board is open on the same project and the user activates `Open in board` for
  `add-login`
- **THEN** the board shows `add-login`'s detail

#### Scenario: Board not yet open

- **WHEN** the board is closed and the user activates `Open in board` for `add-login`
- **THEN** the board opens and shows `add-login`'s detail once its listing has loaded

### Requirement: Refresh on context, request and finished turns

The section SHALL read when it loads, when the session or project changes, when the user activates
the footer's Refresh, and when the shown session finishes a turn. Each read SHALL cover the listing
and, for each shown change, its planning status and tasks, never every change's summary. The
section SHALL NOT poll or refresh on visibility changes.

#### Scenario: Initial host signals arrive together

- **WHEN** mount-time context and lifecycle signals arrive together
- **THEN** the section runs one read

#### Scenario: Turn finishes

- **WHEN** the shown session's turn completes after the agent checked off a task
- **THEN** the section re-reads once and shows the new count without user action

#### Scenario: Another session's turn finishes

- **WHEN** a session other than the shown one finishes a turn
- **THEN** the section does not read

### Requirement: Show read failures without partial progress

A failed read SHALL show an error with Refresh on the affected card, or an error above the footer
when the listing fails, and SHALL NOT show partial progress.

#### Scenario: Read fails for one change

- **WHEN** the OpenSpec CLI fails while reading one of two tracked changes
- **THEN** that card shows the error and Refresh, and the other card shows its progress

### Requirement: Keep last known progress until fresh data arrives

While a read is pending, the section SHALL display available last known cards for the session and
mark them stale. On failure it SHALL retain that display with an error. The cache SHALL store only
the names, counts, current task titles, and stages, in memory across session switches and in device
storage where supported.

#### Scenario: Return to a session

- **WHEN** the section returns to a session with cached cards
- **THEN** it shows those cards as stale until a successful read replaces them

### Requirement: Keep interaction state across reads

Reads SHALL NOT close an open `Tasks:` disclosure, `＋ Track a change` list or flyout, or move
keyboard focus, while the change, its current task and the tracked list are unchanged.

#### Scenario: Turn finishes while tasks are expanded

- **WHEN** `Tasks:` is expanded and a finished turn re-reads with no change to the tasks
- **THEN** the disclosure stays expanded and focus stays where it was

### Requirement: Fit the section to touch devices

On a coarse pointer every chip SHALL be 28 CSS pixels tall, with at least 8 CSS pixels between
adjacent chips. On either pointer, `＋ Track a change`, the footer's other controls, the `Tasks:`
line, task titles and the name control SHALL take no padding beyond their line of text. The
section SHALL fit a 320 CSS pixel width without horizontal overflow. On a fine pointer the cards
SHALL keep their compact height.

#### Scenario: Phone Status tab

- **WHEN** the section renders two tracked changes on a phone at 320px width
- **THEN** names, counts, bars, `Tasks:` lines, chips and the footer fit without horizontal
  scrolling
- **AND** each chip is 28px tall with at least 8px to the next chip
- **AND** `＋ Track a change`, the footer controls, `Tasks:` lines, task titles and names are no
  taller than their line of text
