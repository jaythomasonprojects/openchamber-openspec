# Spec Delta

## ADDED Requirements

### Requirement: Board is available on phones

The board panel and its full-screen page SHALL be offered in OpenChamber's phone clients: the panel
as a workspace tab and the page in the sessions list's More menu. Every board feature available on
desktop SHALL remain available on the phone.

#### Scenario: Open the board on a phone

- **WHEN** the user opens the OpenSpec page from the More menu on a phone
- **THEN** the board loads the open project's changes and its card, detail, create, delete, archive
  and workflow actions work by touch

### Requirement: Controls are touch-sized on coarse pointers

On a coarse pointer every interactive board, detail and dialogue control SHALL be at least 44 CSS
pixels tall. Fine-pointer sizing SHALL remain unchanged.

#### Scenario: Touch device

- **WHEN** the host reports a coarse pointer
- **THEN** buttons, menu triggers, tabs and the search field are each at least 44px tall

#### Scenario: Mouse device

- **WHEN** the host reports a fine pointer
- **THEN** controls keep their existing sizes

### Requirement: Layout respects device insets and the on-screen keyboard

When the host reports safe-area insets or an on-screen keyboard height, the detail footer and open
dialogues SHALL stay clear of them, so no control is hidden behind a notch, home indicator or the
keyboard.

#### Scenario: Keyboard open in the create dialogue

- **WHEN** the user types a change name on a phone and the keyboard covers the lower part of the
  screen
- **THEN** the name field and the dialogue's buttons remain visible above the keyboard

#### Scenario: Home indicator inset

- **WHEN** the host reports a bottom inset
- **THEN** the detail footer's controls sit above that inset

### Requirement: Focus moves do not raise the keyboard on touch devices

On a coarse pointer the board SHALL NOT move focus into a text field on its own, such as after
closing detail or deleting a change; focus SHALL go to a non-text control instead. Explicit user
taps on a text field are unaffected, as is fine-pointer focus behaviour.

#### Scenario: Close detail on a phone

- **WHEN** the user closes change detail on a coarse pointer
- **THEN** focus returns to the change's card control and the on-screen keyboard does not open
