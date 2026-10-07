# viewer-help Specification

## Purpose

Make the OpenSpec quickstart directly accessible from the viewer using a familiar, compact help
control.

## Requirements

### Requirement: Open quickstart from the board header

The board SHALL expose a circled question-mark help button in its content header, styled like
OpenChamber's Walkthrough help control; change detail SHALL NOT show help. It SHALL have the
accessible name and tooltip `OpenSpec quickstart`, support keyboard activation and open exactly
`https://openspec.dev/docs/quickstart` through the host's URL-opening facility. Help SHALL remain
available when no project is selected or the board has a load error. Activating help SHALL NOT
navigate the extension iframe away, compose a prompt or change OpenSpec data.

#### Scenario: Open help from the board

- **WHEN** the user activates help on the board, in the sidebar or expanded page
- **THEN** the host receives the quickstart URL and the board retains its content
- **AND** opening change detail exposes no redundant help control

#### Scenario: Accessible help in an empty or narrow viewer

- **WHEN** the viewer has no selected project, a load error or a narrow width
- **THEN** help remains reachable by keyboard, has its accessible name and tooltip, and does not
  cause whole-panel horizontal overflow

#### Scenario: Host cannot open help

- **WHEN** the host rejects opening the quickstart
- **THEN** the viewer reports the failure without changing the current view or reporting success
