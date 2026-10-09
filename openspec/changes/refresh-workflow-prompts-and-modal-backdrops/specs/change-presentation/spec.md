# Spec Delta

## MODIFIED Requirements

### Requirement: Modal dialogs dim the background clearly

The viewer SHALL retain the browser-default modal backdrop tint without an extension-defined colour
or opacity override and SHALL blur the background by 4 CSS pixels. This SHALL apply to create,
delete and archive dialogues in light and dark themes. Existing keyboard focus and cancellation
behaviour SHALL remain unchanged.

#### Scenario: Open a modal dialog

- **WHEN** the user opens a create, delete, or archive dialog
- **THEN** the backdrop uses the browser-default tint with 4px blur across the extension viewport
- **AND** the dialog remains undimmed and its controls remain reachable by keyboard

#### Scenario: Close the modal dialog

- **WHEN** the user closes a modal dialog through an existing supported cancellation action
- **THEN** the backdrop disappears and the underlying view regains its normal appearance
