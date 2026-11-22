# Tasks

Spec: `specs/change-workflows`, `specs/change-presentation`, `specs/archived-changes`,
`specs/spec-browsing`. Start after `add-session-section-and-mobile` is implemented and archived.
Each test fails first for the expected reason. No new test files or shared helpers. One commit per
task.

## 1. Workflow-aware board actions

- [x] 1.1 Board workflow read. Fake host seam (`test/panel.test.mjs`): add failing tests that the
      board requests `/workflows` once on initial load, on a context change and on `refresh`, but
      not on reloads after create, delete, reconcile or a focus claim. Cards render only after both
      `/workflows` and `/changes` answer, and a failed `/workflows` shows core actions without an
      error. Implement the `workflows` flag in `loadBoard` using `loadWorkflows`. Add `/workflows` to
      existing exact request-sequence assertions. Verify with `npm run build` and the focused tests.
- [x] 1.2 Planning primary and verify. Same seam: add failing tests that a Planning card and its
      detail label the primary action `ff`, `continue` or `propose` by the fake set. Activating it
      composes `openspec-ff-change`, `openspec-continue-change` or the existing propose prompt. A
      card rendered with `ff` still composes `ff` after a refresh changes the set. `verify` shows on
      Complete cards and detail only when the set has `verify`. Implement in `workflow.ts`,
      `primary-action.ts`, `board-view.ts`, `detail-view.ts` and `controller.ts`, and update the
      existing vocabulary and verify tests to the core-set expectations.
- [x] 1.3 Archive all. Same seam: add failing tests that confirming `archive all` submits the
      design's bulk prompt naming `openspec-bulk-archive-change` when the set has `bulk-archive`,
      and today's prompt otherwise, unchanged. Implement `archiveAllPrompt(workflows)`.

## 2. Board views

- [x] 2.1 Tabs. Same seam: add failing tests that `Changes`, `Archived` and `Specs` tabs render
      below the header with `Changes` selected, and that switching back to `Changes` keeps its
      cards, scroll and focus without a read. Search filters the shown view, and `new change` and
      `archive all` stay available. Tabs are arrow-key operable and at least 44px tall on a coarse
      pointer. Implement with `mountTabs` in `board-view.ts` and `panel/index.html`.
- [x] 2.2 Archived. Service seam (`test/service.test.mjs`): add failing tests for `/archived` with
      the real CLI on a disposable root holding two dated archive directories and one active change.
      With a fake runner, add malformed output, duplicate names and root change. Implement the route
      and `client.archived()`. Fake host seam: add failing tests that opening `Archived` reads once,
      shows rows newest first as name, date and `n of m tasks`, shows the empty state, and shows the
      error with `refresh` on failure. Reopening does not read; `refresh` while shown re-reads.
      Implement the view and its `resources.ts` entry.
- [x] 2.3 Specs. Service seam: add failing tests for `/specs` and `/spec` with the real CLI on a
      disposable root holding a top-level and a nested spec. Add a rejected `spec` id with a
      leading `-` or a `..` segment, a listing miss (`404 SPEC_UNAVAILABLE`, no `show` call or file
      read), and malformed output. Implement the routes and client calls. Fake host seam: add
      failing tests that `Specs` lists ids with requirement counts (`1 requirement`,
      `5 requirements`). Opening a spec renders its `spec.md` as written (including a non-standard
      section) through the document renderer, with raw HTML inert. Back restores the list's scroll,
      reopening reads nothing until Refresh, and a failed read shows a retry. Implement the
      listing-gated spec read with `realpath` containment, the spec pane and its `resources.ts`
      entries.

## 3. Release

- [x] 3.1 Update `README.md` (actions follow `openspec config profile`, `verify` needs the verify
      workflow, the Archived view needs OpenSpec 2.x) and `AGENTS.md` (the board reads configured
      workflows on initial/context loads and Refresh, and the Archived and Specs views read on first
      open and Refresh while shown). Run `npm version 1.6.0 --no-git-tag-version`, then
      `npm run check` and `npm run format:check`.

## Workflow follow-up

- Best effort after 1.6.0: a live desktop check per `AGENTS.md` under the core profile and with
  `ff`, `verify` and `bulk-archive` added: Planning labels, verify, the Archived and Specs views,
  and a spec's rendering. Ask before confirming `archive all`, which creates a session.
