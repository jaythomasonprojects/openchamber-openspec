# Design

## Context

See `proposal.md` for motivation and `specs/` for behaviour. The panel is one IIFE bundle
(`panel/main.js` from `src/panel.ts`); `src/panel/controller.ts` owns context, reads and workflow
actions and builds workflow prompts inline (`actionPrompt`). Reads go through `src/panel/client.ts`
to the host-runtime service (`src/service/http.ts` routes `/changes`, `/summaries`, `/tasks`,
`/document`, `/create`, `/delete`). `/summaries` reads every change; the adapter already has a
per-change `summaryFor` (`src/service/openspec.ts:301`).

Host facts this design relies on (OpenChamber 2.7.3; source references are to the OpenChamber
repository):

- A Work Status section frame receives the chat's open session and the session's directory, and
  stays mounted across session switches; `ready`, `onSession` and `onDirectory` are pushed again
  (`packages/ui/src/components/layout/PluginPane.tsx:218-223, 368, 1141-1143`). Phones show
  sections in the Status tab without opt-in (`packages/ui/src/hooks/useGuestSurfaces.ts:83-96`).
- Session records from `listSessions`/`onSessions` carry this extension's items with their `data`
  and the session's worktree (`packages/ui/src/lib/guests/workspace.ts:111-120`); `startSession`
  items persist in OpenCode session metadata on the server.
- `onSessionLifecycle` reports `completed` when a session goes idle.
- `ready.device` gives `formFactor`, `pointer`, `insets` and `keyboard`, re-sent on change
  (`packages/sdk/src/contract.ts:267-286`).
- `panel.mobile: true` shows the panel as a phone workspace tab, and `page: true` follows it
  (`packages/sdk/src/manifest.ts:1213-1217`, `packages/ui/src/lib/guests/phone.ts:19-23`). Service
  requests are plain `/api/*` calls, which the private relay forwards.
- SDK 1.24.2 (the current pin) defines none of `statusSection`, `panel.mobile` or `device`.

## Goals / Non-Goals

**Goals:**

- One shared implementation of prompts, stage derivation, client and decoders for board and
  section.
- Tracked-change resolution as a pure function, testable at the model seam.

**Non-Goals:**

- Sidebar marks, session events, transcript access or any capability that forces re-approval.
- Selecting the change on the board from `Open board`.
- A host-drawn (`source`) section.
- Upstream OpenChamber changes; the gaps below are reported, not worked around beyond what is
  stated.

## Decisions

### A separate status entry, not the panel page

Declare `contributes.statusSection: { entry: "panel/status.html", title: "OpenSpec",
height: 160, requiresProject: true }`, built from `src/status.ts` to `panel/status.js` by a new
`build:status` script included in `build` and `clean`. A separate entry keeps the section's frame
small and avoids branching the board controller on `ready.surface`. Reusing `panel.entry`
(`statusSection: true`) was rejected: every section frame would load the board's code and DOM.

The section reports height with `setHeight` from a `ResizeObserver`. Refresh is an icon button in
the section's footer (group 9). Through 1.4.x it was a header control published with
`setStatusControls`, with a body button as fallback. Group 9 removes both, and the
`onStatusControl` handler, because the user wants every section action in one place.

### Compact cards (redesign after first live use, 2026-11-21)

The first build (1.3.x) used a large progress bar, a current-task `<details>`, an artefact badge
list and `Open board` / stage / `Change…` buttons. The user found it too tall and asked for the
layout below. Each tracked change is a card:

- Line 1: name (a button opening the change flyout), then `completed/total`.
- A 3px bar. It's the section's own element, not `mountProgress`, which draws a caption and a
  checkmark.
- When tasks exist: a `<details>` whose `<summary>` is `▸ Tasks:` and the current
  task's title clamped to one line. The title is its own button opening the task flyout. Expanded,
  it lists the five-task window from `taskWindow` (below). Each row is a read-only checkbox and a
  title button opening that task's flyout.
- Chips: stage chip, secondary chip, `sync`, `validate`, as small `mountButton`s with the stage
  chip in the primary style. Group 9 replaced the 1.4.x set (`propose` | `apply` | `archive`,
  `sync`, `validate`, `board`); see "Workflow-aware chips and footer".
- A footer line after the last card (group 9): `＋ Track a change`, which opens the inline list
  (kept from 1.3.1, excluding changes already tracked), then `new`, `board` and Refresh.

`taskWindow(tasks, size = 5)` is a pure function in `src/model.ts`. It centres on the first
incomplete task (or the last task when all are done) and clamps to the list's ends. The board's
verify action stays on the board only.

**Upstream cause, host-drawn section rejected:** a `source` section's request carries only
`directory` and `locale` (`packages/ui/src/lib/guests/status-view.ts:36`), so it cannot be
session-scoped, and it re-reads on an interval that would run the CLI continuously.

### Resolve the tracked changes with a pure function

Replace `resolveTrackedChange` in `src/model.ts` with:

```ts
type TrackedSource = "saved" | "item" | "worktree" | "none";
resolveTrackedChanges(input: {
  saved: string[] | null; // null = nothing saved for this session
  items: { id: string; data?: unknown }[];
  worktreeName: string | null;
  active: ReadonlySet<string>;
}): { changes: string[]; source: TrackedSource };
```

A non-null `saved` is authoritative. It returns its active members in saved order, with source
`saved`, even when the result is empty. Otherwise it derives at most one change: the first item
whose `data` is `{ kind: "change", change }` with an active `change`; then an item without `data`
whose `id` is an active change name (sessions started by the board before item data existed); then
`worktreeName` if active. Items with `data.kind === "archive-all"` never resolve. Keeping it in
`src/model.ts` uses the existing model test bundle.

### Session context from the host's session list

The section maps its directory to a registered project with the same lookup `inspectWorktreeDestination`
uses (extracted from `src/panel/worktree.ts` into an exported `findProject(host, directory)`), then
holds one `onSessions(projectId)` subscription and picks the record for `ready.session.id`. A
changed record (items or worktree) re-runs resolution and reads only if the resolved change
changed. Directory change releases and replaces the subscription.

### Saved choices in instance storage

Key `session-change:<sessionId>`, value `{ changes: string[], savedAt }`, in `host.storage`
default instance scope, so every device on the same server sees it. A stored value without a
`changes` array (the 1.3.x `{ change }` shape, used on one session) counts as nothing saved; there
is no migration. Track and Untrack write the whole list. The board's `preparePrompt` appends the
change, if absent, after a successful compose when `sessionId` is non-null and the context is still
current. When nothing is saved yet, the first write seeds the list with the session's derived
change, so tracking a second change keeps the first. Failures are swallowed after a console
warning. Before writing, if `keys()` holds 1,900 or more
`session-change:` keys, delete the 100 with the oldest `savedAt` to stay under the 2,000-key limit.

**Upstream cause, `sessionLink` rejected:** it attaches a visible linked item to the session, works
only on the current session, and the SDK has no way to remove it.

### Record items on created sessions

New-worktree Apply's `startSession` adds `data: { kind: "change", change: change.id }`; archive
all adds `data: { kind: "archive-all" }`. Item ids and titles are unchanged, so the existing
duplicate-worktree check (`session.items.some(item => item.id === name)`) keeps working.

### Single-change read route

Add `/summary` to the service: `{ directory, root, planning, change }` → the same summary shape as
one `/summaries` entry, using `summaryFor` with the existing scope and planning-identity checks,
and `client.summary()` with `decodeSummary`. A section read is one `list`, then `summary` and
`tasks` for each shown change, with the changes run in parallel. A failure marks only that card.
Stage comes from `deriveChange` with the listing's counts. The private protocol is internal, so no
compatibility shim.

### Validate route

Add `/validate`: `{ directory, expectedRoot, planning, change }` → runs `openspec validate <change>
--type change --json` inside the same scope and planning checks as `/summary`, and returns
`{ valid: boolean, issues: { level, path, message }[] }` decoded from the CLI's `items[0].valid`
and `items[0].issues`. The JSON was checked on 2.1.0 for a valid change; confirm the issue fields
against an invalid fixture before decoding them. A non-zero
exit with parseable JSON is a result (invalid), not an error. It runs only when `validate` is
activated, never on refresh, and needs no new permission (`exec: ["openspec"]` already covers it).
Decode only the fields shown. Unexpected output fails that request.

The picker orders by listing task counts because exact stage ordering would read every change's status.

### Refresh triggers

Reads happen on mount, session change, directory change, Refresh, and `onSessionLifecycle` with
`phase === "completed"` for the shown session id. One read at a time; a trigger during a read
queues a single follow-up. An epoch, as in the controller, drops responses for a replaced session
or directory. The AGENTS.md board rule stays as is; the section has its own rule in the spec.

### Shared prompts

Move `actionPrompt` and the stage-to-intent mapping from `controller.ts` into
`src/panel/prompts.ts`, unchanged in output. Add `syncPrompt(change)`: "Use your skill tool to load
and invoke the openspec-sync-specs skill for OpenSpec change "<name>"." plus one sentence asking it
to report what it synced, without archiving. The section composes with
`host.compose({ text, mode: "replace" })` and toasts like the board, then appends the change to the
session's tracked list through the same helper.

### Flyouts

Use `host.openPopover` when `ready.features.popovers` is set. The popover loads `panel/status.html`
again with `surface: "popover"` and `ready.popover.data` set to `{ kind: "change", name, stage,
goal }`, `{ kind: "task", id, description }` or `{ kind: "validation", change, result }`. In that
mode `src/status.ts` renders only the flyout card and sizes it with `setHeight`. `Untrack` in a
change flyout writes storage itself (popover frames share the extension's grants), then closes. The
section re-resolves on its next read, or at once when the popover's `onPopoverClosed` fires with
reason `closed`. Anchors use `mountPopoverAnchor` so a tap on a phone opens the bottom sheet.
Without `features.popovers`, the same card renders inline under its anchor as a toggled element.
Data stays under the 16,000-character popover limit; a task description is cut at 4,000 characters
with an ellipsis.
Cut goals at 4,000 characters and validation to 20 issues with 300-character messages; show the total and `+N more issues: open the board or run openspec validate` for omissions. Fit serialized data within 15,000 characters before opening, and use the same cuts inline.

### `Open board`

`host.openSurface("plugin:openspec-board")` opens the rail panel on desktop and the workspace tab
on a phone once the panel opts in. The 2.7.3 host checks the surface ID in
`packages/ui/src/lib/guests/host-bridge.ts:299-304`; extension modes require the `plugin:` prefix
(`packages/ui/src/lib/surfaces/modes.ts:21-30`, tag `v2.7.3`). **Upstream cause:** `openSurface`
takes no target item, so the board would open at its root rather than on the change.

**Focus handoff:** `Open in board` (a card's `board` chip through 1.4.x) first posts `/focus`
`{ directory, change }` to the service, then calls `openSurface`. The service keeps one pending
focus in memory for 30 s and calls `createServiceHost({ env: process.env }).emit("focus")` without a target. `emit` needs no capability
(`packages/sdk/GUEST_SERVICES.md:204`). A mounted board claims on `host.onServiceEvent`; a board
mounting later claims once after its first listing. Both use `GET /focus?directory=…`. The first
request from the matching directory returns and clears the focus; other directories neither receive
nor clear it. If the claimed change is unlisted, the controller runs one explicit Refresh. It
calls `openDetail` if the change is listed; otherwise it shows a toast and leaves the list open.

### Workflow detection (group 9)

OpenSpec 2.x installs a profile's workflows as skills. Its `getProfileWorkflows`
(`src/core/profiles.ts`) resolves them: profile `custom` gives the config's `workflows`, with `sync`
inserted before the first `archive` or `bulk-archive` when missing; any other profile gives the
core set `propose`, `explore`, `apply`, `update`, `sync`, `archive`. Under profile `core` the
`workflows` key is ignored.

**Route.** Add `/workflows`: `{ directory }` (absolute) → `{ workflows: string[] }`. It runs
`openspec config list` once; the runner appends `--json`. It skips root and planning checks because
the config is global and the output carries no root. It applies the rule above, keeps only the 12
names in `ALL_WORKFLOWS` in OpenSpec's order, and drops unknown names so newer CLIs keep working. A
`profile` that is not a string, or `workflows` that is not an array of strings, is
`BAD_CLI_OUTPUT`. A failed command returns its CLI error.

`config list` rather than `config get workflows`: the runner always adds `--json`, which `config get`
rejects on 2.1.0. `config get workflows` also exits 1 when the key is unset, and it would report a
list that profile `core` ignores. `config list --json` returns `profile` and `workflows` in one call;
`workflows` is absent when never set. Checked on 2.1.0 with an isolated `XDG_CONFIG_HOME`.

**Separate route, not the listing.** `/changes` runs on every section read, including after each
finished turn, and on every board load. Adding the config read to it would cost a CLI call per
turn. A separate route lets callers read it only at context loads, as one call run in parallel with
the listing.

**Shared module.** `src/panel/workflows.ts` holds everything the board and section share:
`CORE_WORKFLOWS`, `loadWorkflows(client, directory)` → `ReadonlySet<Workflow>`, and the selection
helpers `planningWorkflow(set)` (`ff`, then `continue`, then `propose`) and `cardChips(change,
set)`. `decodeWorkflows` lives in `src/contracts.ts` with the other decoders. The section uses it
now; `align-board-with-openspec-2` adds the board's call.

**Fallback.** `loadWorkflows` returns the core set and logs a console warning on any failure:
transport, CLI or decoding. The service still fails fast; the panel chooses the fallback because
the user wants older CLIs to keep the core chips. Behaviour on OpenSpec 1.x is unverified here; the
fallback covers a missing `config list` or a missing `profile`.

**Gating.** Only optional workflows gate actions: `new`, `continue`, `ff`, `verify` and
`bulk-archive`. Core actions always show, as in 1.4.x, even under a custom profile that omits them.

**When the section reads it.** On the first read after mount, on a directory change and on footer
Refresh, awaited together with the listing so chips never render from an older set. The result is
kept in memory per directory and reused for session switches and finished turns. Cached stale cards
show no chips, so the device-storage card cache stores no workflows.

**Upstream cause:** the CLI reports no installed skills. The configured set is what `openspec
update` would install, not proof of what is installed: delivery `commands` installs no skills, and a
user may not have run `openspec update` since changing the profile. The panel does not inspect skill
directories.

### Workflow-aware chips and footer (group 9)

Chips per card, from `cardChips`:

| Stage | Stage chip (primary style) | Secondary chip |
| --- | --- | --- |
| `planning` | `planningWorkflow(set)` | `explore` |
| `ready`, `progress` | `apply` | none |
| `complete` | `archive` | `verify` when the set has it |

Then `sync` unless the summary's `specs` artefact has status `skipped`, then `validate`. The `board`
chip is removed. Chips keep their DOM identity across reads; a changed label updates in place.

The footer is one flex row below the cards, always rendered while the section shows. Left: the
`＋ Track a change` link control. Right, pushed with `margin-inline-start: auto`: `new` (only when
the set has `new`) and `board`, styled as link controls like Track, and an icon-only button drawn
with `addButtonIcon(root, "refresh")` and `aria-label="Refresh"`, sized to the text line and
loading while a read runs. The footer
`board` calls `host.openSurface("plugin:openspec-board")` without posting `/focus`. A listing
failure shows its error above the footer. Remove `setStatusControls`, `onStatusControl`, the
`features.statusControls` check and the body Refresh button.

The change flyout's data gains `directory` and `offerContinue` (true in Planning when the set has
both `ff` and `continue`). Its action row is `continue` (when offered), `update`, `Open in board`;
`Untrack` follows on its own line, small and right-aligned. In popover mode the popover frame runs
these itself, as `Untrack` already does: the child inherits host APIs
(`packages/sdk/API.md:361`). It composes or posts `/focus` and opens the board, then closes with
`closePopover(ready.popover.id)`. Composition from the flyout appends tracking through the same
helper as the chips.

### Shared prompts (group 9 additions)

In `src/panel/prompts.ts`, with `target` = `OpenSpec change "<name>"` and `goal` as in
`actionPrompt`:

- `ff`: "Use your skill tool to load and invoke the openspec-ff-change skill for <target> (existing
  change).<goal>" then "Create every remaining planning artefact for <target>, preserving existing
  decisions and any recorded goal. Do not create another change or implement code."
- `continue`: the same opening with `openspec-continue-change`, then "Write the next planning
  artefact for <target>, preserving existing decisions and any recorded goal. Do not implement
  code."
- `update`: "Use your skill tool to load and invoke the openspec-update-change skill for
  <target>.<goal>" then "Revise <target>'s existing planning artefacts as I describe and keep them
  consistent with each other. If I have not described a revision, ask me what to change. Do not
  edit code."
- `new`: "Use your skill tool to load and invoke the openspec-new-change skill." then "Ask me what
  the change is for before creating it."

`explore` and `verify` reuse `actionPrompt`'s existing text. `stageChip` is replaced by
`cardChips`.

### Compact section sizing (group 9)

After 1.4.2 on a phone, the user found the section's 44px coarse-pointer chips and Track control too
tall. The section now follows WCAG 2.2 AA success criterion 2.5.8 (Target Size, Minimum) instead of
the 44px rule: under `[data-pointer="coarse"]` in `panel/status.html`, chips are 28px tall with an
8px `gap` between them, so every target and its spacing cover at least 24px. `＋ Track a change`,
the footer's `new`, `board` and Refresh, the `Tasks:` summary, task titles and the name button take
`padding-block: 0` and the text's line height on both pointers. The board's 44px coarse-pointer
rule in `panel/index.html` is unchanged, as is the change-presentation requirement for it.

### Icon crop (group 9)

`assets/openspec-logo.svg` keeps the 512-unit canvas of OpenSpec's icon, so the glyph fills about
half the box at rail and header sizes. The glyph spans x 144–368 and y 124–386. Set
`viewBox="125 124 262 262"`: square, the glyph's full height, centred horizontally, paths
unchanged. 262 units do not divide evenly into 16 or 24 pixels, so `crispEdges` may render cell
edges one pixel uneven; check the render at 16 and 24px against another rail icon and, if the
unevenness shows, retrace the glyph on a grid that divides the target sizes.

### Phone and touch

Set `panel.mobile: true`. Both entries set `data-pointer` on `<html>` from `ready.device.pointer`
(falling back to `matchMedia("(pointer: coarse)")` when `device` is absent) and CSS variables
`--oc-inset-bottom` and `--oc-keyboard` from `device.insets.bottom` and `device.keyboard`. Styles
under `[data-pointer="coarse"]` raise buttons, menu triggers, tabs and search to `min-height:
44px`; the detail footer pads by the inset; open dialogues cap `max-height` at
`calc(100dvh - var(--oc-keyboard) - 32px)` and scroll inside. The controller's automatic focus
targets (`controller.ts:724, 775`) go to the Create button instead of the search field when the
pointer is coarse.

### Test seams

- Model seam (`test/model.test.mjs`): `resolveTrackedChanges` (saved list authoritative incl.
  empty, inactive members dropped, derived fallback, archive-all) and `taskWindow` (centre, both
  ends, fewer than five, all done).
- Redesign additions at the fake host seam: `openPopover` loading the status entry with
  `surface: "popover"` and `ready.popover.data`, `onPopoverClosed`, the `features.popovers` toggle
  for the inline fallback, `onServiceEvent` delivery for focus, and `setHeight` applied to the frame
  with the real 24–480 clamp. Service seam: `/validate` (valid, invalid, bad output) and `/focus`
  (set, read-once, 30 s expiry).
- Fake SDK host seam (`test/panel.test.mjs`): extend the fake host to serve `panel/status.html`,
  push `onSessionLifecycle`, answer `storage`, `setStatusControls`, `setHeight`, `openSurface`,
  `listProjects`/`onSessions`, and include `device` in `ready`. Section and board-saving behaviour
  and coarse-pointer sizing and focus are pinned here.
- Service seam (`test/service.test.mjs`): `/summary` scope checks and output against the real CLI
  on a disposable root.

- Group 9: service seam `/workflows` against the real CLI with `XDG_CONFIG_HOME` pointed at a
  disposable directory, as the existing isolated-environment tests do (`test/service.test.mjs`
  around line 1979): default config gives the core set; `custom` with `ff`, `verify`, `archive`
  gives those plus `sync` before `archive`; a fake runner covers CLI failure and malformed output.
  Fake host seam: the fake service answers `/workflows` with a per-test set. Existing assertions on
  exact request sequences gain the `/workflows` request.

No new test files or helpers.

## Risks / Trade-offs

- SDK 1.24.2 → 2.7.3 crosses a major version → the upgrade is its own first task, verified by
  `npm run check` before any feature work.
- Insets may already be applied by the host around the frame, doubling padding → verify on a phone
  during the live check and drop the inset padding if the host already applies it.
- Reads after every finished turn cost a few CLI calls → only while the section is expanded and
  only for the shown session; the README's telemetry-off advice reduces CLI latency. With N tracked
  changes a read is 1 + 2N calls; tracking is deliberate, so N stays small.
- Popover frames load the status bundle again per opening → the status bundle stays small (no board
  code), and the inline fallback covers hosts without popovers.
- Storage is per server; a saved choice does not follow a session to another server → acceptable,
  sessions are per server too.
- Configured workflows may not be installed (delivery `commands`, or no `openspec update` since a
  profile change) → a chip prepares a prompt for a missing skill, which the agent reports; the
  README states that chips follow `openspec config profile`.
- On a machine with no global config, `openspec config list` writes a default config file (seen on
  2.1.0 with an empty `XDG_CONFIG_HOME`) → harmless, and any other `openspec` command does the
  same.
- The service reads the global config of the OpenChamber server's user, which can differ from a
  terminal with another `XDG_CONFIG_HOME` → accepted; the service already runs the CLI as that user.
- Older hosts ignore the section and phone opt-in, and `engines.openchamber` cannot express 2.7.1 →
  README states the minimum version for these features.

## Migration Plan

Upgrade the SDK, then land section, board saving and phone support. Build all bundles, reinstall or
update the extension, and disable/enable it to restart the service. No data migration: sessions
created earlier resolve through their legacy items or worktree names. Rollback is reinstalling the
previous version; stored choices are ignored by it and removed on uninstall.

## Upstream gaps to report

Draft for the OpenChamber maintainers after implementation, with the user's approval:
`source` status requests should carry the session id; `openSurface` should accept a target item;
an extension should be able to remove its own item from a session; `engines.openchamber` should
accept current versions; `packages/sdk/API.md:299`, `packages/sdk/DOCUMENTATION.md:91` and
`useWorkStatusExtensionSections.ts:14-15` still say status sections or `startSession` are not on the
phone.
