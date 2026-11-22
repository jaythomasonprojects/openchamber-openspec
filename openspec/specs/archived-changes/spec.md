# archived-changes Specification

## Purpose

Show the project's archived OpenSpec changes on the board, newest first, read-only.

## Requirements

### Requirement: List archived changes newest first

The `Archived` view SHALL list every archived change reported by the OpenSpec CLI for the board's
OpenSpec root. Each row SHALL show the change name without its date prefix, the archive date and
its task count as `<completed> of <total> tasks`. Rows SHALL be ordered by archive date, newest
first, then by name. A change without a date prefix SHALL sort after dated ones, by name. The view
SHALL offer no workflow, edit or delete actions.

#### Scenario: Two archived changes

- **WHEN** the CLI reports `2026-11-20-add-login` with 7 of 7 tasks and
  `2026-11-22-fix-cache` with 3 of 3 tasks
- **THEN** the view shows `fix-cache`, `2026-11-22`, `3 of 3 tasks` first, then `add-login`,
  `2026-11-20`, `7 of 7 tasks`

#### Scenario: Nothing archived

- **WHEN** the project has no archived changes
- **THEN** the view shows an empty state saying no changes are archived

### Requirement: Read archived changes only on demand

The board SHALL read archived changes when the `Archived` view first opens in a context and retain
the result until Refresh or a context change. After Refresh, the next showing SHALL read again; if
`Archived` is already shown, it SHALL read immediately. A failed read SHALL show the error and
`refresh` in the view and SHALL NOT show a partial list. Reads SHALL verify the OpenSpec root as
other board reads do.

#### Scenario: Older CLI

- **WHEN** the installed OpenSpec CLI cannot list archived changes
- **THEN** the view shows the CLI's error and the other views keep working

#### Scenario: Return to the view

- **WHEN** the user leaves `Archived` and opens it again in the same context without Refresh
- **THEN** the view shows its earlier list without a new read

#### Scenario: Refresh while Archived is hidden

- **WHEN** the user refreshes another view after reading `Archived`
- **THEN** the board does not read archived changes until the user returns to `Archived`
