# change-loading Specification

## Purpose

Load the board and change detail from the OpenSpec CLI, keeping failures per change, verifying the
OpenSpec root behind each read, and retaining successful reads until Refresh.

## Requirements

### Requirement: Board loads list changes and summarise them together

The change listing SHALL be authoritative for which changes appear and for their task counts.
Summaries SHALL arrive in one service response, so cards appear together once it completes. The
board SHALL show the listed count and task tally from the listing before the summaries arrive.

#### Scenario: Load a board with no changes

- **WHEN** a board load runs for a project with no active changes
- **THEN** the board shows the empty state

#### Scenario: Listing and summaries disagree

- **WHEN** a change appears in the listing but not in the summary result
- **THEN** that change is reported as no longer available, through the unavailable-change handling
- **AND** a change in the summary result but not in the listing is not shown

### Requirement: Batch summaries keep failures per change

A change that the CLI cannot read, or whose metadata, artefact data, or paths fail validation, SHALL
fail on its own while every other change still loads. A non-zero CLI exit that still returns a valid
batch result SHALL NOT fail the whole board. A batch result that is missing, malformed, or reports a
different root SHALL fail the board load through the board error handling. Retained-card,
stale-card, and affected-area rules SHALL apply to each change.

#### Scenario: One malformed change

- **WHEN** one listed change names an unknown schema and the CLI exits non-zero with diagnostics for
  that change
- **THEN** the other changes appear as cards
- **AND** the malformed change shows a per-change read failure with the CLI's diagnostic message

#### Scenario: Retained card survives a per-change failure

- **WHEN** Refresh fails for one change that already has a card
- **THEN** that card is kept and marked stale
- **AND** other cards update normally

#### Scenario: Batch result unusable

- **WHEN** the batch status read produces no parseable result, or a result for a different root
- **THEN** the board reports a load error
- **AND** no summaries are fabricated

### Requirement: Detail reads follow artefact order

Opening detail SHALL start the CLI Tasks read alongside the first document group. When every
non-task artefact is Proposal, Specs or Design, groups SHALL load in that order; otherwise groups
SHALL follow the schema's declared order. Each group's documents SHALL load concurrently, and the
next group SHALL start once they settle. Selecting a tab SHALL NOT start a request. Document reads
SHALL be authorised by the change's current CLI-reported artefact outputs and path containment.

#### Scenario: Open a standard change

- **WHEN** a change with a proposal, two specs and a design is opened
- **THEN** the Tasks and proposal reads start first
- **AND** both spec reads start together once the proposal read settles, followed by the design read

#### Scenario: Select a tab

- **WHEN** the user selects a tab whose document has not loaded
- **THEN** no additional request starts

#### Scenario: Tasks for a change that is no longer listed

- **WHEN** a tasks read fails because the change no longer exists
- **THEN** the viewer reports the change as no longer available

### Requirement: Successful reads are retained until Refresh

Successful task and document reads SHALL be retained per selected directory, OpenSpec root, planning
target and change, and reused when that change's detail opens again. Retained reads SHALL be
discarded on explicit Refresh, context replacement or disposal, and for a change that leaves the
listing or is deleted. A failed read SHALL stay failed until the user retries it. Retained reads
SHALL NOT exceed 4 MiB per session: a read that would exceed it SHALL fail with an error asking the
user to Refresh, and other retained reads SHALL NOT be evicted.

#### Scenario: Reopen a change

- **WHEN** the user reopens a change whose tasks and documents loaded successfully
- **THEN** they display without new requests

#### Scenario: Refresh clears retained reads

- **WHEN** the user chooses Refresh and reopens a change
- **THEN** its tasks and documents are read afresh

#### Scenario: Reach the session budget

- **WHEN** a successful read would take retained reads past 4 MiB
- **THEN** that read shows an error asking the user to Refresh
- **AND** previously retained reads remain available

### Requirement: Reads verify the OpenSpec root they use

Every read request SHALL verify that the OpenSpec root reported by the CLI invocation doing the work
matches the expected root, or establishes it when none is expected. A missing root, or one the CLI
reports as implicit, SHALL be treated as no OpenSpec root. A different root SHALL be treated as a
root change. A failed tasks or document read whose CLI error omits the root SHALL instead use a
fresh listing to verify the root and confirm change availability. Successful reads without a root,
and explicit null or implicit roots, SHALL still fail as having no OpenSpec root. Mutations SHALL
verify their context separately before writing.

#### Scenario: OpenSpec directory removed

- **WHEN** the selected project's `openspec` directory is removed and a read runs from the same
  directory
- **THEN** the request fails as having no OpenSpec root
- **AND** the CLI's implicit fallback root is not accepted

#### Scenario: Root changed between requests

- **WHEN** a read's invocation reports a root other than the expected root
- **THEN** the request fails with a root-changed error and the viewer reloads its context

#### Scenario: Missing change error omits the root

- **WHEN** a tasks or document read fails with a CLI error that omits the root
- **THEN** the service reads a fresh listing to verify the original root
- **AND** it reports the change as no longer available only when that listing omits the change
