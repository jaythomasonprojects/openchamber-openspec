# Spec Delta

## ADDED Requirements

### Requirement: Board switches between Changes, Archived and Specs

The board SHALL offer three views as tabs below its header, labelled `Changes`, `Archived` and
`Specs`, with `Changes` selected on load. `Changes` SHALL be the existing board. Switching views
SHALL keep each view's last read and scroll position for the current context. Search SHALL filter
the shown view by name. Header actions that act on active changes (`new change`, `archive all`)
SHALL stay available in every view.

#### Scenario: Switch to Specs and back

- **WHEN** the user opens `Specs`, then returns to `Changes`
- **THEN** the changes board shows as before, without reloading

#### Scenario: Search in Archived

- **WHEN** the `Archived` view shows and the user types `login` in search
- **THEN** only archived changes whose names contain `login` show

#### Scenario: Keyboard and phone

- **WHEN** the user moves between tabs with the arrow keys, or taps them on a coarse pointer
- **THEN** each tab is reachable, and on a coarse pointer each is at least 44px tall
