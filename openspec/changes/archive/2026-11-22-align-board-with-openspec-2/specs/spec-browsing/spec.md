# spec-browsing Specification

## Purpose

List the project's main OpenSpec specs on the board and read one as a rendered document, read-only.

## ADDED Requirements

### Requirement: List main specs

The `Specs` view SHALL list every main spec reported by the OpenSpec CLI for the board's OpenSpec
root, in the CLI's order. Each row SHALL show the spec's id and its requirement count as
`<n> requirements`, or `1 requirement`. The view SHALL offer no edit or delete actions.

#### Scenario: List specs

- **WHEN** the CLI reports `change-loading` with 5 requirements
- **THEN** the view shows a row `change-loading`, `5 requirements`

#### Scenario: No specs

- **WHEN** the project has no main specs
- **THEN** the view shows an empty state saying no specs exist yet

### Requirement: Read a spec as a rendered document

Activating a spec row SHALL open that spec's document read-only, as written in its `spec.md`,
rendered by the existing document renderer and its safety rules. A
back control SHALL return to the list with its scroll position. A failed read SHALL show the error
and a retry in the spec view, without partial content.

#### Scenario: Open a spec

- **WHEN** the user activates `change-loading`
- **THEN** the view shows `change-loading`'s whole spec document, including its purpose and its five
  requirements with their scenarios, as formatted headings, text and lists

#### Scenario: Untrusted content

- **WHEN** a spec contains raw HTML or a non-HTTP link
- **THEN** it renders as the document renderer renders it in change documents, without activating
  it

### Requirement: Read specs only on demand

The board SHALL read the spec list when the `Specs` view first opens in a context and read a spec
when the user opens it. It SHALL retain each result until Refresh or a context change. After
Refresh, the next showing SHALL read again; if the list or a spec is already shown, the board
SHALL read what is shown immediately. Reads SHALL verify the OpenSpec root as other board reads do.

#### Scenario: Reopen a spec

- **WHEN** the user returns to the list and opens the same spec again in the same context without
  Refresh
- **THEN** the spec shows without a new read

#### Scenario: Refresh while Specs is hidden

- **WHEN** the user refreshes another view after reading `Specs` and opening a spec
- **THEN** the board reads the list again when the user returns to `Specs`, and does not read the
  spec until the user opens it again
