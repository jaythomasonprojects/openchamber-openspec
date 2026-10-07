# change-workflows Specification

## Purpose

Connect the board, change cards and detail to OpenSpec's named workflows: create change scaffolds,
prepare goal-aware prompts unsent in the current chat, and launch sessions only when the user
explicitly chooses a new worktree or bulk archiving.

## Requirements

### Requirement: Use OpenSpec workflow vocabulary consistently

Cards and detail SHALL label the primary planning action `propose`, both ready and in-progress
implementation actions `apply`, and the completed primary action `archive`. The separate secondary
completed action SHALL be `verify`, available independently of archive. Board stage headings and
detail badges SHALL use Planning, Ready, In Progress and Complete. The board's manual reload action
SHALL be labelled `refresh`. These are presentations of existing CLI-derived progress, not new
persisted states. Standard artefact labels SHALL remain Proposal, Specs, Design and Tasks; custom
artefact identifiers SHALL remain supported.

#### Scenario: Match actions across board and detail

- **WHEN** a user views a change in each of the four stages and opens its detail
- **THEN** the primary labels match on both surfaces and call `openspec-propose`,
  `openspec-apply-change`, `openspec-apply-change` and `openspec-archive-change` respectively
- **AND** Complete exposes secondary `verify` calling `openspec-verify-change` independently of
  `archive`

### Requirement: Propose completes the existing scaffold

The `propose` prompt SHALL identify the existing change by name, include its recorded goal when
present and explicitly call `openspec-propose` to finish planning that already-scaffolded change. It
SHALL instruct the agent to inspect status, preserve existing decisions and complete missing
planning artefacts using OpenSpec's artefact instructions. It SHALL ask the agent to inspect current
metadata, preserve any existing goal and establish and record a concise goal only when none exists.
The goal SHALL come from existing change context, with user clarification if that context is
insufficient. The prompt SHALL prohibit creating another change or implementing code and ask the
agent to explain a conflict if the skill requires new-change creation.

#### Scenario: Propose an empty or partially planned change

- **WHEN** the user chooses `propose` for an empty scaffold or one with an existing proposal
- **THEN** the prepared prompt contains explicit existing-change guidance, preserves existing
  decisions and asks for missing artefacts rather than a new change
- **AND** the extension itself neither writes planning artefacts nor starts implementation

#### Scenario: Propose a change without a recorded goal

- **WHEN** the user chooses `propose` for a change without a recorded goal
- **THEN** the prompt asks the agent to establish a concise goal from existing context and record it
  if current metadata still has no goal
- **AND** the prompt asks for user clarification if the goal is unclear, without supplying a
  fabricated goal or a literal null value
- **AND** composing the prompt does not write metadata

#### Scenario: Preserve an existing or newly recorded goal

- **WHEN** a change already has a goal, or an agent finds one recorded after the viewer last
  refreshed
- **THEN** the prompt directs the agent to preserve that goal
- **AND** a goal included by the viewer retains its text, including line breaks

### Requirement: Explore the goal from a Planning change card

Every available Planning change card SHALL offer a compact secondary `explore` action alongside
`propose`. Other stages SHALL NOT offer `explore`. The prompt SHALL name the change, include the
recorded goal when present and explicitly call `openspec-explore` to investigate the goal, relevant
code, options and trade-offs. It SHALL request discussion without file changes or implementation.
Missing goals SHALL NOT be invented: the prompt SHALL direct the agent to inspect existing context
and clarify the goal if necessary.

#### Scenario: Explore a stated goal

- **WHEN** the user chooses `explore` on a Planning card
- **THEN** an exploration prompt for that change and its stated goal is prepared
- **AND** the stage, task counts and artefact counts remain unchanged

#### Scenario: State changes after rendering

- **WHEN** a Planning card becomes Ready, In Progress or Complete before its old action dispatches
- **THEN** the stale Explore action SHALL NOT compose a prompt

#### Scenario: Legacy change without a goal

- **WHEN** the user explores or proposes a change with no recorded goal
- **THEN** the prompt names the change and requests clarification from existing context rather than
  supplying a fabricated goal or a literal null value
- **AND** only Propose asks the agent to record a missing goal once established
- **AND** Explore continues to request discussion without file changes

### Requirement: Workflow composition stays unsent and context-bound

Current-chat workflow actions SHALL prepare editable, unsent prompts and SHALL replace the open
composer's text, including a fresh-chat draft with no session ID. Prompts SHALL name the change and
relevant skill without directory or root paths. Apply SHALL direct completion of pending tasks and
reporting of verification and blockers; Verify SHALL compare implementation with planning artefacts
and report gaps without archiving; Archive SHALL check archival prerequisites without assuming prior
verification. The panel SHALL NOT mutate OpenSpec files through workflow actions. Among per-change
actions, only explicit new-worktree Apply SHALL create a worktree and session and send the Apply
prompt as its first message through the SDK; the board-level `archive all` launch follows its own
requirements. Unavailable changes SHALL have disabled workflow actions. Obsolete actions SHALL be
rejected before dispatch. Unrelated project, planning-target, or session replacement SHALL discard
late feedback without replaying composition. New-worktree prompt submission SHALL target only the
created session, even if the originating panel is closed. Keeping the panel open is optional.

#### Scenario: Compose without changing workflow state

- **WHEN** a current-chat workflow action replaces an existing composer draft or a fresh-chat draft
- **THEN** its named skill and relevant guidance are present, filesystem paths are absent, and no
  send or session-creation request occurs
- **AND** no card moves or tasks are marked complete merely from composition

#### Scenario: Context replacement or composition failure

- **WHEN** the host rejects composition or an unrelated context replaces its destination while
  composition is pending
- **THEN** a failure is shown only in the still-current relevant context and no action is replayed
  into the replacement context

#### Scenario: Run in the created worktree session

- **WHEN** the user explicitly selects new-worktree Apply and the host creates its session
- **THEN** the ordinary local Apply prompt is sent only in that session as its first message
- **AND** the prompt contains no planning-root path, copying instruction, or special
  external-planning workflow

### Requirement: Select an Apply destination through a native menu

Ready and In Progress changes SHALL offer an `apply` action menu on both board cards and detail. The
menu SHALL offer `Prepare in current chat` and `Run in new worktree`, using host-consistent controls
with keyboard operation and dismissal. Opening or dismissing the menu SHALL NOT compose, create, or
send anything. Planning and Complete actions SHALL retain their behaviour. Unavailable changes and
repeated worktree requests while pending SHALL be disabled. A stale Apply selection SHALL NOT
dispatch after the change ceases to be applicable.

#### Scenario: Choose the current chat

- **WHEN** the user chooses `Prepare in current chat` from an applicable card or detail
- **THEN** the Apply prompt replaces the current composer draft without creating a session or
  worktree

#### Scenario: Dismiss or use the keyboard

- **WHEN** the user opens the menu with the keyboard and dismisses it without selecting a
  destination
- **THEN** focus returns to a usable invoking control and no workflow request occurs

#### Scenario: Reject stale selection

- **WHEN** an open Apply menu belongs to a removed change or a context or stage that has since been
  replaced
- **THEN** choosing either destination does not dispatch the obsolete action

### Requirement: Delegate worktree creation to the host

New-worktree Apply SHALL request one new worktree and session through the host, naming the worktree
and branch after the change and using host defaults for the base and setup actions. The request
SHALL target the originating registered project, including when invoked from one of its worktrees.
The extension SHALL NOT run Git, create links, copy planning, or bypass setup hooks. It SHALL open
the resulting session after successful submission in a still-current originating context. The host
SHALL receive the ordinary Apply prompt with the session request, for automatic first-message
sending. If the originating project cannot be identified, the action SHALL fail without guessing
another project. Worktree and session creation SHALL require the declared sessions permission.

#### Scenario: Create from a project or its worktree

- **WHEN** the user selects new-worktree Apply for `add-login` from a registered project or its
  worktree
- **THEN** the host is asked once for a new worktree named `add-login` in that project with its
  normal defaults and setup actions
- **AND** the resulting session opens with the sent Apply prompt for `add-login`

#### Scenario: Permission or project failure

- **WHEN** permission is denied or the originating registered project cannot be resolved
- **THEN** the extension reports the failure without dispatching creation against another directory
  or changing the current draft

### Requirement: Preserve partial worktree outcomes without blind retries

Creation failure, bootstrap failure, first-message failure, malformed results, and timeouts SHALL be
distinguished where the host provides evidence. A created worktree or session SHALL be retained and
identified to the user. The extension SHALL NOT automatically repeat creation, remove a partial
worktree, silently reuse a colliding name, or claim that timeout proves rollback. After partial or
uncertain creation, another creation attempt SHALL require fresh user intent and host-backed
inspection of known worktrees or sessions. Unrelated navigation during creation SHALL NOT be
overwritten by late navigation or composition.

#### Scenario: Bootstrap fails after worktree creation

- **WHEN** the host reports a retained worktree and bootstrap or session-creation failure
- **THEN** the extension identifies the partial outcome and does not dispatch a second creation
  request or delete that worktree

#### Scenario: Navigation changes during creation

- **WHEN** the user changes project or session before creation completes
- **THEN** the result does not replace that unrelated context or its draft, and any created resource
  remains available through the host

#### Scenario: Creation or submission outcome is uncertain

- **WHEN** creation times out or first-message submission fails after a session exists
- **THEN** the extension does not create another worktree as recovery and does not report successful
  submission without the host confirming the message was sent

### Requirement: Create a change scaffold from the board

The board SHALL offer `new change` when an OpenSpec context is resolved. It SHALL open a dialogue
asking for a change name and a goal. Names SHALL be lowercase letters or digits separated by single
hyphens, and the goal SHALL be required; invalid input SHALL be reported in the dialogue without a
request. Creation SHALL make only the named scaffold with its recorded goal in the originating
context. Success SHALL close the dialogue and reload the originating board. A draft or attempt from
one context SHALL NOT be submitted in a different context.

#### Scenario: Create a valid change

- **WHEN** the user submits a valid name and goal in the unchanged originating context
- **THEN** one scaffold with that goal is created, the dialogue closes and the board reloads

#### Scenario: Reject invalid input

- **WHEN** the name is not hyphen-separated lowercase letters or digits, or the goal is empty
- **THEN** the dialogue shows the error and no creation request occurs

### Requirement: Reconcile uncertain creation without blind retries

A creation error the service reports before writing SHALL return the dialogue to editing with that
error. A timeout, transport failure, or outcome the service reports as unknown SHALL be treated as
uncertain: the viewer SHALL read a fresh listing in the original context and SHALL NOT retry
creation automatically. A matching change SHALL be offered for inspection, and its absence SHALL
return the dialogue to editing. A failed listing SHALL leave the outcome unresolved with a
`Retry read` action, and creation SHALL stay unavailable until it resolves.

#### Scenario: Creation outcome is unknown

- **WHEN** the creation response is lost after dispatch
- **THEN** the viewer reads a fresh original-context listing without dispatching another creation
- **AND** a listed change can be inspected, an absent change returns the dialogue to editing, and a
  failed listing offers `Retry read`

### Requirement: Confirm bulk archiving from the board

The board SHALL offer `archive all` beside `new change`, using a native secondary button, an archive
icon and the same small control size. It SHALL target completed changes across the board,
independently of search filtering. The action SHALL be disabled without a resolved OpenSpec context,
while the board is loading, when no available Complete change is known, or while a launch is
pending. Activation SHALL open an accessible confirmation dialogue explaining that it creates a new
session and submits a prompt, skips unfinished changes and leaves the board open. Controls SHALL be
labelled `cancel` and `start archiving`. Cancellation, including Escape, SHALL create no session and
submit no prompt.

#### Scenario: Confirm or cancel

- **WHEN** the user activates `archive all`
- **THEN** the dialogue opens without creating a session or submitting a prompt
- **AND** only `start archiving` authorises the launch; `cancel` or Escape dismisses it without
  effects

#### Scenario: Filtered or empty board

- **WHEN** search hides a completed change
- **THEN** search does not narrow the bulk operation
- **AND** a board without any available Complete change has a disabled `archive all` action

### Requirement: Launch one context-bound archive session

Confirmation SHALL create one new session in the originating selected project/worktree without
creating a worktree, submit the bulk prompt as its first message and preserve the current
board/page, session selection and composer draft. The extension SHALL reject an obsolete
confirmation if its directory or OpenSpec context changed before dispatch. Repeated activation
during a pending launch SHALL NOT create another session. Late responses SHALL NOT cause navigation,
redispatch or feedback in a replacement context. Successful launch feedback SHALL describe a
submitted request, not claim that any changes have already been archived. Board content SHALL
continue to update only through existing initial/context loads and explicit Refresh, not polling or
agent completion events.

#### Scenario: Submit while preserving the board

- **WHEN** the user confirms in the unchanged originating context
- **THEN** one session is created there with the submitted bulk archive prompt
- **AND** the board stays open and the current draft and selected session remain unchanged

#### Scenario: Context changes or repeated clicks

- **WHEN** the context changes before confirmation, or the user repeats a pending launch
- **THEN** no additional session is created from that confirmation or repeated activation
- **AND** a response after unrelated navigation does not navigate back or replay the launch

### Requirement: Bulk archive prompts exclude unfinished changes

The submitted prompt SHALL request a fresh active-change listing in the session's OpenSpec context,
inspection of current status and CLI-reported task completion, and sequential use of
`openspec-archive-change` for completed changes only. Completion SHALL require every applicable
planning artefact to be done or explicitly skipped and a positive task total with all tasks
complete. The prompt SHALL NOT treat a Complete card as proof of verification. It SHALL exclude
unfinished, unavailable or unreadable changes rather than permit archiving them with an
incomplete-work override. It SHALL preserve the archive workflow's spec-sync assessment, user
choices and blockers. It SHALL request a final report of archived, skipped and blocked changes, and
no mutation when none qualify.

#### Scenario: Completion changed since board load

- **WHEN** a previously Complete change now has incomplete tasks or artefacts
- **THEN** the prompt requires it to be skipped rather than archived with a warning override

#### Scenario: Several completed changes affect the same capability

- **WHEN** multiple changes qualify for archival
- **THEN** the prompt requests sequential processing and fresh sync assessment for each change
- **AND** it does not bypass required user choices or unresolved sync blockers

### Requirement: Report partial or uncertain session launch outcomes

The extension SHALL distinguish a submitted first message from a created session whose send was
skipped, failed or lacked a model. Known session identifiers SHALL be included in failure feedback
so users can find an existing session. Failure to save the session's linked item SHALL be reported
without incorrectly describing a sent prompt as unsent. A timeout or lost response SHALL be
described as an uncertain outcome, not rollback. The extension SHALL NOT automatically retry
creation or submission, and SHALL direct the user to inspect sessions before intentionally starting
another launch.

#### Scenario: Session exists but sending failed

- **WHEN** creation returns a session identifier with a first-message failure
- **THEN** feedback identifies the existing session and states that submission did not succeed
- **AND** no automatic creation or send retry occurs

#### Scenario: Launch response is lost

- **WHEN** launch times out or its outcome cannot be established
- **THEN** feedback warns that a session or submitted prompt may already exist and asks the user to
  inspect sessions before another launch
- **AND** the extension does not automatically retry
