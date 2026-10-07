# change-deletion Specification

## Purpose

Allow users to deliberately remove an unwanted active change and reconcile the viewer with its
actual filesystem outcome.

## Requirements

### Requirement: Confirm deletion from change detail

Detail SHALL place a danger-coloured trash icon action with the accessible name and tooltip
`Delete change` to the right of the change title, using the existing header action scale. It SHALL
be available in every stage for a currently available change. Activation SHALL open a labelled
confirmation dialogue naming the change and stating that its planning folder will be permanently
removed, without undoing implementation or deleting main specs. The dialogue SHALL offer Cancel and
`delete`, support keyboard dismissal before submission and restore focus appropriately. No deletion
SHALL occur before confirmation. Pending confirmation SHALL become invalid when the selected
project, root or change is replaced.

#### Scenario: Cancel or confirm

- **WHEN** the user opens the deletion dialogue and cancels or dismisses it
- **THEN** the change and files remain intact and focus returns to the invoking control
- **WHEN** the user explicitly confirms the unchanged target
- **THEN** exactly one deletion attempt starts and repeated confirmation is disabled while pending

#### Scenario: Switch context before confirming

- **WHEN** the selected project, root or change changes while confirmation is open
- **THEN** the old confirmation cannot delete either the old target or the replacement target

### Requirement: Delete only the current active change folder

Deletion SHALL use an authenticated, scoped service request identifying the originating directory,
expected root, resolved planning target, and change name, never a client-supplied deletion path.
Before mutation the service SHALL freshly resolve the scope and verify active-list membership and
the target's location. It SHALL remove only that named change directory in the resolved active
changes directory. A user-managed top-level `openspec/` symlink SHALL be supported when its
canonical directory is the validated planning boundary. Invalid names, mismatched scopes, archive
targets, symlinked change directories or changes parents, and paths escaping the active changes
directory SHALL be rejected before mutation. The service SHALL recheck the planning link, active
parent, and target after its final CLI context check. Retargeted links and replaced parent or target
directories SHALL be rejected, including replacement at the same path. Nested links SHALL NOT cause
their external targets to be removed. Deletion SHALL NOT depend on successfully decoding planning
artefacts, and SHALL NOT delete main specs, sibling changes, implementation files outside the change
folder, or the user-managed planning link. Filesystem validation and removal are not atomic.

#### Scenario: Remove an active change

- **WHEN** a confirmed request targets a valid active change, including an empty or partly written
  scaffold
- **THEN** that folder and its contents are removed and a success response identifies the original
  root and change
- **AND** sibling changes, main specs, and external implementation files remain intact

#### Scenario: Refuse a changed or unsafe target

- **WHEN** the root or planning target changed, the change is not active, the name is invalid, or
  the target or parent is a symlink or outside the active changes directory
- **THEN** the service reports a scoped error without deleting another location

#### Scenario: Delete through shared planning

- **WHEN** a confirmed request from a worktree targets a stable active change beneath its linked
  planning directory
- **THEN** only that change is removed from shared planning
- **AND** the worktree's link, main specs, sibling changes, nested links' external targets, and
  implementation files remain intact

#### Scenario: Replace the target during final validation

- **WHEN** the planning link is retargeted or the active parent or target directory is replaced
  during the final context check
- **THEN** deletion fails before filesystem removal and neither the original nor replacement target
  is removed

### Requirement: Reconcile deletion outcomes without blind retries

Confirmed removal SHALL close the deleted detail, invalidate retained reads and refresh the
originating board while preserving the search text. Late reads SHALL NOT restore the deleted
change's content. If the user has moved to another context, completion SHALL NOT navigate, refresh
or overwrite that context. A transport failure, malformed success response, timeout or failure after
removal begins SHALL be treated as potentially unknown, not as proof that nothing changed. The
viewer SHALL use a fresh original-context listing to reconcile, never retained reads, and SHALL NOT
automatically retry deletion. Absence confirms the change is no longer active; continued presence
requires fresh user confirmation before another attempt. Failed reconciliation SHALL leave the
outcome unresolved with an explicit read-retry action.

#### Scenario: Successful removal returns to the board

- **WHEN** deletion succeeds in the still-selected context
- **THEN** detail closes, the listing and counts refresh, the deleted card disappears, the search is
  retained and focus returns to a usable board control
- **AND** a delayed document response does not resurrect its content

#### Scenario: Unknown outcome

- **WHEN** the response is lost after deletion starts
- **THEN** the viewer performs a fresh listing scoped to the original root without dispatching
  another delete
- **AND** absence resolves the change as unavailable, presence requires a new confirmation, and a
  failed listing remains explicitly unresolved

#### Scenario: Late completion in a different project

- **WHEN** the user changes project while a deletion or reconciliation is pending
- **THEN** that completion does not affect the replacement project's view or authorise deletion
  there
