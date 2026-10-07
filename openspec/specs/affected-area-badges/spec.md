# affected-area-badges Specification

## Purpose

Make each change's recorded affected areas visible on its board card and detail view without opening
planning documents.

## Requirements

### Requirement: Summaries carry recorded affected areas

Each successful change summary SHALL carry the change's affected areas as non-empty strings. Values
SHALL come from `affected_areas` in that change's metadata, preserving their text and order. An
absent field, absent metadata file, or empty list SHALL produce no areas. Invalid affected-area
types SHALL produce a read error rather than coerced or inferred labels. Context, path-containment,
and metadata byte bounds SHALL apply to the metadata read.

#### Scenario: Read areas from metadata

- **WHEN** a listed change records `affected_areas` as `auth` followed by `api`
- **THEN** its summary carries the areas `auth` and `api` in that order
- **AND** the summary retains its goal and CLI-derived artefact information

#### Scenario: Read a legacy change

- **WHEN** metadata or `affected_areas` is absent, or the list is empty
- **THEN** the summary carries no areas
- **AND** the change remains viewable without a missing-area error

#### Scenario: Reject invalid or unsafe metadata

- **WHEN** affected areas are not a string list, contain an empty or non-string entry, or the
  metadata read fails its path or byte checks
- **THEN** the summary fails through the existing read-error handling
- **AND** the viewer does not invent badges or replace a retained successful summary with fabricated
  data

### Requirement: Cards and detail show the same read-only badges

Each card SHALL show neutral affected-area badges beneath its title. Detail SHALL show the same
badges in a row below the change name and above the goal, wrapping when needed. Badges SHALL
preserve labels and metadata order, render labels as text, and have no action. The viewer SHALL hide
the group when the list is empty. The existing stage badge SHALL retain its meaning and appearance.

#### Scenario: Show areas on both surfaces

- **WHEN** the user views a card and opens its detail
- **THEN** both surfaces show the recorded areas in the same order
- **AND** the card places them beneath the title and detail places them below the change name
- **AND** badges do not change workflow stage, task counts, or search behaviour

#### Scenario: Fit long labels and narrow layouts

- **WHEN** labels are long or the viewport is 320px wide
- **THEN** labels and badge groups wrap without horizontal page overflow or hiding title and action
  controls
- **AND** complete labels remain readable

#### Scenario: Display markup-like labels literally

- **WHEN** an affected-area label contains markup-like text
- **THEN** the badge displays that text without creating elements, loading resources, or executing
  code

### Requirement: Badge updates follow existing refresh behaviour

Affected areas SHALL update through existing initial, context, and explicit Refresh summary loads.
Reading and showing badges SHALL NOT introduce new service requests, CLI invocations, polling,
document prefetch, or metadata writes. Retained or stale cards SHALL retain the areas from their
last successful summary until replaced by a successful read or discarded with that context.

#### Scenario: Refresh changed metadata

- **WHEN** metadata areas change and the user chooses Refresh
- **THEN** a successful summary updates both card and open-detail badges, including removing areas
  no longer present
- **AND** the refresh uses the existing summary request sequence without extra reads for badges

#### Scenario: Replace project context or fail a refresh

- **WHEN** a context changes or an area summary refresh fails
- **THEN** badges obey the existing context replacement and stale-summary behaviour
- **AND** a late response from the former context does not update the current view
