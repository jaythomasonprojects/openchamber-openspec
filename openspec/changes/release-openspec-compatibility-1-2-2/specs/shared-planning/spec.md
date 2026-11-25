# Spec Delta

## MODIFIED Requirements

### Requirement: Keep every operation inside the resolved planning scope

Listing, detail metadata, artefact discovery, document reads, CLI task reads, and change creation
SHALL work through valid shared planning. The service SHALL validate the active changes directory
and named change against the resolved planning boundary. CLI-returned paths SHALL be validated after
consistent lexical and canonical resolution. A change target SHALL be a real named child of the
authorised active changes directory, not a linked escape or another active or archived change.
Documents and goal metadata SHALL remain inside that selected change. Task input paths SHALL be
validated before the CLI reads them. Bounded reads, CLI-authoritative task counts and descriptions,
and scaffold-only creation SHALL apply through shared planning as they do locally. Task descriptions
SHALL retain continuation text when supplied by the CLI and SHALL NOT acquire continuation text that
the CLI omits.

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

#### Scenario: Display a task from a CLI that omits continuation text

- **WHEN** the CLI returns only the first line of a task description for local or shared planning
- **THEN** the Tasks view displays that returned description
- **AND** the extension does not append continuation text from the source document

#### Scenario: Display a task from a CLI that includes continuation text

- **WHEN** the CLI returns a task description that includes continuation text for local or shared
  planning
- **THEN** the Tasks view displays the full returned description once
- **AND** the extension does not truncate the description to the first source line

#### Scenario: Refresh task text after a source edit

- **WHEN** the task source changes and the user explicitly refreshes the view
- **THEN** the task text and completion state match the fresh CLI task record
- **AND** continuation text is included or omitted according to that record
