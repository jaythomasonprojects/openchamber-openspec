# shared-planning Specification

## Purpose

Let selected worktrees use a user-managed link to shared OpenSpec planning without losing
containment, context isolation, or safe mutation checks.

## Requirements

### Requirement: Resolve the selected checkout and shared planning separately

The panel SHALL support a selected worktree whose top-level `openspec/` is a user-managed symbolic
link to the main checkout's planning directory. The resolved planning directory SHALL be the
authorised planning boundary, even outside the selected checkout. The selected worktree SHALL remain
the implementation and prompt context. The extension SHALL NOT create, replace, or repair the link.
A missing, dangling, cyclic, or non-directory planning target SHALL produce a scoped error without
mutation. Local roots and already-supported store-selected roots SHALL retain their behaviour. Link
targets SHALL NOT be accepted merely because the CLI returns an arbitrary path.

#### Scenario: Open shared planning from a worktree

- **WHEN** the selected worktree's `openspec/` links to a valid planning directory in the main
  checkout
- **THEN** the panel lists that planning directory's active changes without requiring a copied
  change in the worktree
- **AND** implementation prompts use the same local skill invocation as ordinary Apply

#### Scenario: Invalid planning link

- **WHEN** the planning link is dangling, cyclic, or resolves to a non-directory
- **THEN** the panel reports a scoped error and creates or deletes no files

### Requirement: Keep every operation inside the resolved planning scope

Listing, detail metadata, artefact discovery, document reads, CLI task reads, and change creation
SHALL work through valid shared planning. The service SHALL validate the active changes directory
and named change against the resolved planning boundary. CLI-returned paths SHALL be validated after
consistent lexical and canonical resolution. A change target SHALL be a real named child of the
authorised active changes directory, not a linked escape or another active or archived change.
Documents and goal metadata SHALL remain inside that selected change. Task input paths SHALL be
validated before the CLI reads them. Bounded reads, CLI-authoritative task counts and first-line
descriptions, and scaffold-only creation SHALL apply through shared planning as they do locally.

#### Scenario: Browse shared change content

- **WHEN** the user opens a shared change with proposal, multiple specs, design, goal metadata, and
  tasks
- **THEN** details, document selectors, content, and CLI task descriptions resolve correctly through
  the link
- **AND** no full-source task parser or unbounded document read is introduced

#### Scenario: Create in shared planning

- **WHEN** the user creates a valid named change through a stable shared-planning context
- **THEN** one scaffold with its recorded goal is created in the shared active changes directory
- **AND** the extension does not replace the link or create a second planning directory in the
  worktree

#### Scenario: Reject unsafe nested targets

- **WHEN** the changes parent or named change is an unsafe link, a CLI path names a different change
  or archive, or a document, metadata file, or task input escapes its selected change
- **THEN** the affected operation reports an error without reading the escaped content or mutating
  its target

### Requirement: Detect planning-target replacement

Request scope and retained-read identity SHALL distinguish the selected directory from its resolved
planning target. Subsequent operations bound to a prior listing SHALL reject a different planning
target, even when the checkout path and CLI root path have not changed. Mutation SHALL validate the
planning target before dispatch and preserve uncertain-outcome handling if a change occurs after
dispatch. Refresh SHALL establish a fresh scope and clear retained reads. Pending responses for a
replaced scope SHALL NOT update the replacement view. No polling or automatic link repair SHALL be
introduced.

#### Scenario: Retarget a link after listing

- **WHEN** a worktree's planning link changes from one planning directory to another after the board
  loads
- **THEN** requests carrying the old scope fail as changed-context operations rather than reading or
  mutating the new target
- **AND** an explicit Refresh can establish the new planning scope without reusing old retained
  content

#### Scenario: Retarget during creation

- **WHEN** the planning link changes after creation validation
- **THEN** the extension does not knowingly create in the replacement target
- **AND** if creation has already been dispatched and its outcome cannot be established, recovery
  requires a fresh original-scope listing rather than automatic retry
