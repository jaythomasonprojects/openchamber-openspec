# Design

## Context

See `proposal.md` for motivation and `specs/` for behaviour. This change builds on
`add-session-section-and-mobile` group 9, which adds:

- `/workflows` and `client.workflows()`: one `openspec config list --json` call, resolved by
  OpenSpec's profile rule (see that change's design, "Workflow detection").
- `src/panel/workflows.ts`: `CORE_WORKFLOWS`, `loadWorkflows(client, directory)` with the core
  fallback, and `planningWorkflow(set)`.
- `ffPrompt`, `continuePrompt` and `updatePrompt` in `src/panel/prompts.ts`.

Archive that change before this one. This change reuses them unchanged and adds board callers.

CLI facts, checked on 2.1.0 and, where noted, on 1.13.1 through `npx`:

- `list --archived --json` → `{ changes: [{ name, completedTasks, totalTasks, lastModified,
  status, archived }], root }`. `name` is the archive directory name, e.g.
  `2026-11-22-refresh-workflow-prompts-and-modal-backdrops`. 1.13.1 rejects `--archived`.
- `list --specs --json` → `{ specs: [{ id, requirementCount }], root }`. Same on 1.13.1.
- (Not used for rendering: `show <id> --type spec --json` → `{ id, title, overview, requirementCount, requirements: [{ name,
  text, scenarios: [{ name, rawText }] }], metadata, root }`. Same on 1.13.1. An unknown id exits 1
  with `status[0].message`.)
- The bulk-archive skill asks the user to choose changes and must not auto-select
  (`getBulkArchiveChangeSkillTemplate`, step 2).

## Goals / Non-Goals

**Goals:**

- One workflow rule for board and section, from the shared module.
- Archived and spec views that cost no CLI calls until the user opens them.

**Non-Goals:**

- Actions on archived changes or specs, including opening an archived change's documents.
- Offering `continue` beside `ff` on the board; the section's flyout covers it.
- A 1.x fallback for the Archived view (see Risks).

## Decisions

### Board reads the configured workflows

`loadBoard` gains a `workflows` flag, passed only from the initial/context load and the explicit
`refresh` call sites. When set, it runs `loadWorkflows` in parallel with `client.list` and awaits
both before rendering cards, so primary labels never switch from `propose` to `ff` after the cards
appear. Create, delete, reconcile and focus reloads reuse the controller's last set. A context
change clears the set. This adds one CLI call per board load and none to other reads.

### Planning primary action and verify

`workflow.ts` drops the static `action` column: `workflowLabel(stage, workflows)` returns
`planningWorkflow(workflows)` for `planning`, `apply` for `ready` and `progress`, and `archive` for
`complete`. The old `continue` label for `progress` was never shown, because Apply stages render the
menu, and it would now collide with the `continue` workflow. `primary-action.ts`, card and detail
take the set from controller state.

The card's action captures the workflow it rendered with. `preparePrompt` composes `ffPrompt`,
`continuePrompt` or the existing `propose` text for that captured workflow, and rejects the action
as stale if the stage changed, as today. `verify` is hidden on cards and in detail unless the set
has `verify`, and the controller rejects a `verify` intent without it.

The board has no sync action (no `sync` in `board-view.ts`, `detail-view.ts` or `controller.ts`), so
the specs-skipped rule has nothing to hide here.

### Archive all

`archive-prompt.ts` exports `archiveAllPrompt(workflows)`. Without `bulk-archive` it returns the
current text unchanged. With it:

> Archive all completed OpenSpec changes in this session's project/worktree.
>
> Use your skill tool to load and invoke the openspec-bulk-archive-change skill. Before its
> selection step, run openspec list --json and openspec status --change "<name>" --json for each
> change. A change qualifies only when every applicable planning artefact is done or explicitly
> skipped and it has a positive task total with all tasks complete. When the skill asks which
> changes to archive, offer only qualifying changes and recommend all of them. Skip any selected
> change that does not qualify; never use an incomplete-work override or infer verification from
> task counts.
>
> Preserve the skill's spec-sync assessment, user choices and blockers. Report archived, skipped
> and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that
> outcome.

The skill still asks the user to choose; the prompt shapes the choice rather than overriding the
skill's "do not auto-select" rule. The confirmation dialogue text is unchanged: it stays true for
both prompts.

### Views

Mount `mountTabs` from `@openchamber/sdk/ui` below the header with `Changes`, `Archived`, `Specs`.
Each view owns a container; switching hides the others, so DOM, focus and scroll survive. Search
keeps one value and filters the shown view by name: cards by change id, archived rows by stripped
name, spec rows by id. The detail pane and the spec pane open over their view as detail does today.

### Archived route and view

Add `/archived`: `{ directory, expectedRoot, expectedPlanning? }` → `{ changes: [{ name,
completedTasks, totalTasks }] }`. It runs `list --archived` through `checked` with strict root
checks, like `list`. It decodes only `name` and the counts, rejecting duplicates and invalid counts
as `BAD_CLI_OUTPUT`. The panel splits `^(\d{4}-\d{2}-\d{2})-(.+)$` into date and name, and sorts by
date descending, then name. Names without the prefix sort last by full name. Rows reuse the count
wording `<completed> of <total> tasks`.

### Specs routes and view

Add `/specs`: `{ directory, expectedRoot, expectedPlanning? }` → `{ specs: [{ id, requirementCount
}] }` from `list --specs`. Add `/spec`: the same plus `spec` → `{ id, content }`, the raw text of
`<planning root>/specs/<spec>/spec.md`. `spec` must match
`^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$` and contain no `..` segment, or the
route returns `BAD_SPEC`. The route requires `spec` to appear in a fresh `list --specs` for the same
scope. A listing miss returns `404 SPEC_UNAVAILABLE` without calling `show` or reading the
requested file. The file read reuses the document reader's
safeguards: `realpath` must stay inside `<planning root>/specs`, the same size bound and UTF-8
decoding apply, and a symlink out of the tree is `BAD_SPEC_PATH`. Both routes use `checked` with
strict root checks.

The panel renders `content` with `renderDocument`, so the renderer's sanitising and link rules
apply unchanged. Reading the file rather than rebuilding Markdown from `show --json` (decided
2026-11-22 with the user) shows the whole spec as written, including sections other than Purpose
and Requirements. It costs a file-read path scoped to the specs tree, which mirrors the existing
change-document reads.

### Retained reads

`resources.ts` gains `archived`, `specs` and `spec(id)` entries in its existing context-keyed cache.
They are read on a view's first open, or a spec's first open, in a context. Refresh invalidates all
retained browse data and reads only what the shown view needs. A hidden view reads again the next
time it is shown. A context change clears browse data with the rest.

### Test seams

- Service seam (`test/service.test.mjs`), real CLI on disposable roots: `/archived` with two dated
  archive directories and one active change; `/specs` and `/spec` with two main specs, one nested
  one level. Fake runner: malformed output, duplicate archived names, a bad `spec` id, a listing
  miss, and root change.
- Fake host seam (`test/panel.test.mjs`): the fake service answers `/workflows`, `/archived`,
  `/specs` and `/spec`. It pins workflow reads per load reason, Planning labels and prompts, verify
  gating, both archive-all prompts, the tabs, search per view, the archived order, spec rendering
  and retention.

No new test files or helpers.

## Risks / Trade-offs

- `list --archived` fails on 1.x → the Archived view shows the CLI's error; the README states that
  the view needs OpenSpec 2.x. One small fallback is possible on request: list
  `openspec/changes/archive/` in the service.
- Core-profile users lose the board's `verify` → stated in the README with the
  `openspec config profile` step that restores it.
- The bulk-archive skill's interactive selection makes the launched session wait for the user,
  where the archive-change loop ran without a selection step → accepted; the board leaves the
  session open, and the prompt recommends all qualifying changes.
- A very large spec can exceed the 240,000-byte response limit → the spec view shows
  `RESPONSE_TOO_LARGE`, the same as an oversized document.
- The spec read adds a second file-read path → limited to `spec.md` under the specs tree, gated on
  the CLI's spec listing and the same `realpath` and size checks as change documents.

## Migration Plan

Archive `add-session-section-and-mobile` and land this change on top. No data migration. Rebuild,
reinstall or update the extension, and restart its service.
