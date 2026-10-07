# change-presentation Specification

## Purpose

Keep the viewer's progress counts, spacing, dialogue backdrops, board surface, and change-name
controls readable and consistent.

## Requirements

### Requirement: Completion counts use readable wording

The viewer SHALL display artefact and task completion counts as `X of Y`, not `X/Y`. This wording
SHALL apply to card artefact labels, card task progress, the board task tally, detail task progress,
and the progress summary in a prepared Apply prompt. Counts, percentages, and stage derivation SHALL
retain their existing meaning. Single-total tab counts and empty-state messages SHALL remain
unchanged.

#### Scenario: Show progress across the viewer

- **WHEN** a change has four applicable artefacts, four completed artefacts, thirteen tasks, and two
  completed tasks
- **THEN** its card shows `4 of 4 artefacts` and `2 of 13 tasks complete`
- **AND** the Tasks view, board tally, and prepared Apply progress summary use `of` between
  completed and total task counts
- **AND** formatting does not change the counts or stage

### Requirement: Detail toolbar retains space below navigation

The viewer SHALL reserve at least 8 CSS pixels beneath the detail toolbar outside the scrolling
content viewport. This space SHALL remain visible when content scrolls and when the toolbar wraps at
narrow widths. Tabs and action controls SHALL remain reachable without overlapping document or task
content.

#### Scenario: Scroll a long specification

- **WHEN** a user opens a long specification and scrolls the detail content
- **THEN** the scrolling content viewport starts at least 8 CSS pixels below the toolbar controls
- **AND** content does not render against or beneath the tabs

#### Scenario: Wrap controls at sidebar width

- **WHEN** the detail toolbar wraps at a 320px viewport width
- **THEN** the space below the last toolbar row remains at least 8 CSS pixels
- **AND** tabs, Refresh, and Delete remain reachable without horizontal page overflow

### Requirement: Detail heading supports copying the change name

The viewer SHALL display an always-visible copy icon button immediately beside the change name in
the detail view. The button SHALL have the accessible label and tooltip `Copy change name` and
support pointer and keyboard activation. Activation SHALL copy the exact displayed change ID at the
time of activation, without quotes, Markdown, paths, or workflow commands. Copying SHALL NOT alter
the chat composer, send a message, or request fresh change data.

#### Scenario: Copy the displayed name

- **WHEN** a user activates Copy change name while viewing `add-copy-to-change-name`
- **THEN** the viewer requests copying exactly `add-copy-to-change-name` to the clipboard
- **AND** the chat composer and sent messages remain unchanged
- **AND** the viewer makes no additional change-data requests

#### Scenario: Copy with the keyboard

- **WHEN** a user focuses Copy change name and activates it with Enter or Space
- **THEN** the viewer requests copying the displayed change ID

#### Scenario: Switch changes

- **WHEN** a user opens a different change and activates Copy change name
- **THEN** the viewer requests copying the newly displayed change ID rather than the previous ID

#### Scenario: Copy while change data is unavailable

- **WHEN** a detail view retains its heading during refresh or after the change becomes unavailable
- **THEN** Copy change name remains available for copying that displayed ID

### Requirement: Copy feedback reflects the clipboard result

The viewer SHALL show a success toast with the message `Change name copied` only after the clipboard
operation succeeds. A failed clipboard operation SHALL show an error toast, SHALL NOT show success
feedback, and SHALL allow the user to retry through the same button. The viewer SHALL NOT retry
clipboard writes automatically.

#### Scenario: Successful clipboard write

- **WHEN** a requested clipboard write succeeds
- **THEN** the viewer shows a success toast containing `Change name copied`

#### Scenario: Failed clipboard write and retry

- **WHEN** a requested clipboard write fails
- **THEN** the viewer shows an error toast without success feedback
- **AND** no further clipboard write occurs until the user activates the button again
- **AND** another activation can copy the displayed change name successfully

### Requirement: Copy control remains reachable at sidebar widths

The viewer SHALL keep the change name and copy button together, with affected-area badges outside
that group in a separate row below it and above the goal at all detail widths. Badges SHALL wrap
independently of the name and copy button. Long names SHALL wrap without hiding the button or
introducing horizontal page overflow at a 320px viewport width. Ordinary detail updates SHALL
preserve the copy button's DOM identity and keyboard focus.

#### Scenario: Position affected-area badges between the name and goal

- **WHEN** a user views a change with affected-area badges and a goal
- **THEN** the badges appear below the name and copy button, above the goal
- **AND** the badges do not share the name and copy button's row

#### Scenario: Show a long change name at sidebar width

- **WHEN** a user views a long change name with affected-area badges at a 320px viewport width
- **THEN** the name wraps and the copy button remains visible and reachable
- **AND** no affected-area badge appears between the name and copy button
- **AND** the badges appear below the name group and above the goal
- **AND** the page has no horizontal overflow

#### Scenario: Preserve focus during detail updates

- **WHEN** Copy change name is focused and document or task loading updates the detail view
- **THEN** the same button remains mounted and retains keyboard focus

### Requirement: Modal dialogs dim the background clearly

The viewer SHALL cover the viewport behind each open modal dialog with a 35% black backdrop without
blur. Dimming SHALL apply in light and dark themes. Existing keyboard focus and cancellation
behaviour SHALL remain unchanged.

#### Scenario: Open a modal dialog

- **WHEN** the user opens a create, delete, or archive dialog
- **THEN** the background across the viewport is dimmed by a black backdrop with 0.35 opacity
- **AND** the dialog remains undimmed and its controls remain reachable by keyboard

#### Scenario: Close the modal dialog

- **WHEN** the user closes a modal dialog through an existing supported cancellation action
- **THEN** the backdrop disappears and the underlying view regains its normal appearance

### Requirement: Detail footer controls have equal vertical spacing

The viewer SHALL leave 12 CSS pixels between the detail footer's top edge and the top of its control
row, and 12 CSS pixels between the bottom of its control row and the footer's bottom edge. The
one-pixel separator SHALL remain visible immediately above the footer without adding height to the
footer. Existing control sizes and actions SHALL remain unchanged.

#### Scenario: Show Apply in the detail footer

- **WHEN** the detail footer displays Apply in a single control row
- **THEN** the controls have equal 12px gaps to the footer's top and bottom edges
- **AND** the separator remains visible above the footer

#### Scenario: Wrap footer controls at narrow widths

- **WHEN** the footer controls wrap onto multiple rows at a narrow viewport width
- **THEN** the first row has a 12px gap above it and the last row has a 12px gap below it
- **AND** all controls remain reachable without horizontal page overflow

### Requirement: Board surface fills the viewport without limiting content

The viewer SHALL present a continuous themed page background over at least the viewport height when
the board is visible. Short boards SHALL have no horizontal colour seam beneath their content. Long
boards SHALL grow beyond the viewport and remain vertically scrollable without clipping changes or
controls.

#### Scenario: Show a short board

- **WHEN** the board content is shorter than the viewport in either light or dark theme
- **THEN** the themed page surface extends to the bottom of the viewport without a colour seam
- **AND** opening a modal dialog dims the full viewport consistently

#### Scenario: Show a long board

- **WHEN** the board content is taller than the viewport
- **THEN** the user can scroll to its final changes and controls
- **AND** the page background remains continuous throughout the board

#### Scenario: Resize or change theme

- **WHEN** the user resizes the viewport or changes the host theme with the board visible
- **THEN** the background continues to fill the viewport in the current theme without a colour seam
