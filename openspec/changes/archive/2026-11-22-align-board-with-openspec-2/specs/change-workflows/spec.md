# Spec Delta

## ADDED Requirements

### Requirement: Board reads the configured workflows at its loads

The board SHALL read which OpenSpec workflows are configured on initial and context loads and on
explicit Refresh, and SHALL use the core set (`propose`, `explore`, `apply`, `update`, `sync`,
`archive`) when the read fails. Other board reads SHALL reuse the last result. A configured workflow
SHALL count as expected to be installed, not as proof that its skill exists.

#### Scenario: Refresh after a profile change

- **WHEN** the user adds `verify` to their OpenSpec profile and activates the board's `refresh`
- **THEN** Complete cards offer `verify`

#### Scenario: Create a change

- **WHEN** the board reloads after the panel creates a change
- **THEN** it does not re-read the configured workflows

#### Scenario: Older OpenSpec CLI

- **WHEN** the CLI cannot report its configured workflows
- **THEN** the board shows the core set's actions and no error

### Requirement: Board Planning action follows the configured workflows

The Planning primary action on cards and detail SHALL be `ff` when configured, else `continue` when
configured, else `propose`. `ff` and `continue` SHALL compose the same unsent prompts as the
section's `ff` and `continue` chips; `propose` SHALL keep its prompt.

#### Scenario: Fast-forward configured

- **WHEN** `ff` is configured and the user activates a Planning card's primary action
- **THEN** the action is labelled `ff` on the card and in detail, and the composer holds an unsent
  prompt requesting `openspec-ff-change` for that change

#### Scenario: Core profile

- **WHEN** the core set is configured
- **THEN** the Planning primary action is `propose`

## MODIFIED Requirements

### Requirement: Use OpenSpec workflow vocabulary consistently

Cards and detail SHALL label the Planning primary action by the configured workflows (`ff`,
`continue` or `propose`), both ready and in-progress implementation actions `apply`, and the
completed primary action `archive`. The separate secondary completed action SHALL be `verify`,
available independently of archive and shown only when the verify workflow is configured. Board
stage headings and detail badges SHALL use Planning, Ready, In Progress and Complete. The board's
manual reload action SHALL be labelled `refresh`. These are presentations of existing CLI-derived
progress, not new persisted states. Standard artefact labels SHALL remain Proposal, Specs, Design
and Tasks; custom artefact identifiers SHALL remain supported.

#### Scenario: Match actions across board and detail

- **WHEN** the core set is configured and a user views a change in each of the four stages and opens
  its detail
- **THEN** the primary labels match on both surfaces and call `openspec-propose`,
  `openspec-apply-change`, `openspec-apply-change` and `openspec-archive-change` respectively
- **AND** Complete offers no `verify`

#### Scenario: Verify configured

- **WHEN** the verify workflow is configured and a user views a Complete change
- **THEN** card and detail expose secondary `verify` calling `openspec-verify-change` independently
  of `archive`

### Requirement: Explore the goal from a Planning change card

Every available Planning change card SHALL offer a compact secondary `explore` action alongside its
Planning primary action. Other stages SHALL NOT offer `explore`. The prompt SHALL name the change,
include the recorded goal when present and explicitly call `openspec-explore` to investigate the
goal, relevant code, options and trade-offs. It SHALL request discussion without file changes or
implementation. Missing goals SHALL NOT be invented: the prompt SHALL direct the agent to inspect
existing context and clarify the goal if necessary.

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

### Requirement: Bulk archive prompts exclude unfinished changes

The submitted prompt SHALL request a fresh active-change listing in the session's OpenSpec context,
inspection of current status and CLI-reported task completion, and archiving of completed changes
only. When bulk-archive is configured it SHALL ask for `openspec-bulk-archive-change` and ask the
agent to offer only qualifying changes for the skill's selection; otherwise it SHALL ask for
sequential use of `openspec-archive-change`. Completion SHALL require every applicable planning
artefact to be done or explicitly skipped and a positive task total with all tasks complete. The
prompt SHALL NOT treat a Complete card as proof of verification. It SHALL exclude unfinished,
unavailable or unreadable changes rather than permit archiving them with an incomplete-work
override. It SHALL preserve the archive workflow's spec-sync assessment, user choices and blockers.
It SHALL request a final report of archived, skipped and blocked changes, and no mutation when none
qualify.

#### Scenario: Completion changed since board load

- **WHEN** a previously Complete change now has incomplete tasks or artefacts
- **THEN** the prompt requires it to be skipped rather than archived with a warning override

#### Scenario: Several completed changes affect the same capability

- **WHEN** multiple changes qualify for archival
- **THEN** the prompt requests fresh sync assessment for each change, sequentially when it uses
  `openspec-archive-change`
- **AND** it does not bypass required user choices or unresolved sync blockers

#### Scenario: Bulk-archive configured

- **WHEN** bulk-archive is configured and the user confirms archive all
- **THEN** the submitted prompt asks for `openspec-bulk-archive-change`, offering only qualifying
  changes for selection and skipping any selected change that does not qualify

### Requirement: Workflow prompts explicitly request skill invocation

Every generated workflow prompt SHALL use ordinary prose to ask the agent to load and invoke the
appropriate named OpenSpec skill through its skill tool before performing that workflow. Generated
workflow instructions SHALL use bare skill names rather than slash commands or dollar-prefixed
mentions, without relying on host skill injection. User-supplied goal text SHALL remain unchanged.
Existing workflow guidance, change identity, destinations and approval boundaries SHALL remain
unchanged. The extension SHALL request skill invocation, not claim that a skill was loaded.

#### Scenario: Prepare a per-change workflow

- **WHEN** a user prepares Explore, Propose, Fast-forward, Continue, Apply, Verify or Archive in the
  current chat
- **THEN** the editable, unsent prompt explicitly requests loading and invoking `openspec-explore`,
  `openspec-propose`, `openspec-ff-change`, `openspec-continue-change`, `openspec-apply-change`,
  `openspec-verify-change` or `openspec-archive-change` respectively through the agent's skill tool
- **AND** the generated workflow instruction uses neither a slash command nor a dollar mention
- **AND** the existing change-specific guidance and recorded goal or progress remain present

#### Scenario: Apply in a new worktree

- **WHEN** a user explicitly chooses new-worktree Apply
- **THEN** the submitted first message contains the same ordinary Apply prompt used for current-chat
  preparation, including the explicit request to invoke `openspec-apply-change`
- **AND** skill invocation does not depend on composer processing

#### Scenario: Archive completed changes in bulk

- **WHEN** a user confirms archive all
- **THEN** the submitted prompt explicitly requests loading and invoking
  `openspec-bulk-archive-change` when bulk-archive is configured, or otherwise
  `openspec-archive-change` for qualifying changes sequentially, through the agent's skill tool
- **AND** fresh completion checks, skips, spec-sync assessment, user choices and reporting remain
  required
