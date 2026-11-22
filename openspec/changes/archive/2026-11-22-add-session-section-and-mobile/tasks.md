# Tasks

## 1. SDK upgrade

- [x] 1.1 Pin `@openchamber/sdk` to `2.7.3` in `package.json`, run `npm ci`, and fix type or
      behaviour breaks in `src/` without feature changes. Read `node_modules/@openchamber/sdk/`
      docs for status sections, storage, `device` and `onSessionLifecycle` before task 3. Verify
      with `npm run check`.

## 2. Shared building blocks

- [x] 2.1 At the model seam (`test/model.test.mjs`), add failing cases for `resolveTrackedChange`:
      saved wins, inactive saved falls through and is reported stale, `data.kind: "change"` items,
      legacy id-only items, `archive-all` never resolves, worktree name, nothing resolves. Implement
      it in `src/model.ts`. Verify with `npm run build:model:test && node --test
      test/model.test.mjs`.
- [x] 2.2 Move `actionPrompt` from `src/panel/controller.ts` into `src/panel/prompts.ts` and
      `findProject` out of `src/panel/worktree.ts`, with no output change. Verify the existing
      prompt and worktree tests in `test/panel.test.mjs` pass unchanged after `npm run build`.
- [x] 2.3 At the service seam (`test/service.test.mjs`), add failing tests for a `/summary` route
      that returns one change's summary and refuses wrong root, planning identity or unknown change
      like `/summaries`. Implement it in `src/service/http.ts` and `src/service/openspec.ts`, add
      `client.summary()` with `decodeSummary`. Verify with `npm run build && node --test
      test/service.test.mjs`.

## 3. Board records tracked changes

- [x] 3.1 At the fake SDK host seam (`test/panel.test.mjs`), extend the fake host with `storage`
      and add failing tests: current-chat composition in a session saves the change; a fresh-chat
      draft, a rejected composition and a replaced context save nothing; a storage failure leaves
      composition successful. Implement the save helper and call it from `preparePrompt`. Verify
      with `npm run build && node --test --test-name-pattern='tracked change' test/panel.test.mjs`.
- [x] 3.2 At the same seam, extend the existing new-worktree Apply and archive-all assertions to
      require `data: { kind: "change", change }` and `data: { kind: "archive-all" }` on
      `startSession`, then add them in `controller.ts`. Verify the worktree and archive tests in
      `test/panel.test.mjs`.
- [x] 3.3 Add the 1,900-key pruning to the save helper with a fake-host test that seeds 1,900
      `session-change:` keys and asserts the 100 oldest are removed. Verify with the focused test.

## 4. Session section

- [x] 4.1 Add `panel/status.html`, `src/status.ts`, the `build:status` script (in `build` and
      `clean`) and the `statusSection` manifest entry. Extend the fake host to serve the status
      entry with `surface: "status"`, `listProjects`/`onSessions`, `setHeight` and
      `setStatusControls`. Add failing tests at the fake host seam for resolution display: saved
      choice, worktree Apply session, archive-all session showing the picker, stale saved change
      message, new chat with disabled picker. Implement. Verify with `npm run build && node --test
      --test-name-pattern='session section' test/panel.test.mjs`.
- [x] 4.2 At the same seam, add failing tests for progress: bar and `3/7` text, collapsed
      current-task disclosure with the first incomplete task's name and full description on
      expand, `0/0` without disclosure in Planning, full bar without disclosure when complete,
      artefact statuses, error with Refresh and no partial progress on read failure. Implement.
- [x] 4.3 At the same seam, add failing tests for the picker (task-count order, choice saved and
      shown), the stage action composing the board's prompt unsent and saving the change, no replay
      after a session switch, and `Open board` calling `openSurface("plugin:openspec-board")`.
      Implement.
- [x] 4.4 At the same seam, extend the fake host to push `onSessionLifecycle`, then add failing
      tests: `completed` for the shown session re-reads once; another session's completion does
      not read; session switch re-resolves and re-reads; stale responses are dropped; header
      Refresh control when `features.statusControls` is present, body button otherwise. Implement.
- [x] 4.5 Update `AGENTS.md` (three generated bundles, the section's refresh rule beside the board
      rule) and `README.md` (the section, minimum OpenChamber 2.7.1 for section and phone support).
      Verify `npm run format:check` passes.

## 5. Phone and touch

- [x] 5.1 Extend the fake host's `ready` with `device`. At the fake host seam, add failing tests at
      320px with `pointer: "coarse"`: board, detail, dialogue and section controls are at least 44px
      tall; with `pointer: "fine"` existing sizes are unchanged. Implement `data-pointer` and the
      coarse styles in `panel/index.html` and `panel/status.html`. Verify with the focused tests.
- [x] 5.2 At the same seam, add failing tests that a reported bottom inset pads the detail footer
      and a reported keyboard height keeps the create dialogue's field and buttons visible.
      Implement the CSS variables.
- [x] 5.3 At the same seam, add failing tests that closing detail and deleting a change on a coarse
      pointer focus a non-text control, and fine-pointer focus is unchanged. Implement in
      `controller.ts`.
- [x] 5.4 Set `panel.mobile: true` in the manifest and widen the scope in `openspec/config.yaml`
      to include OpenChamber's phone clients (2.7.1+). Verify `npm run check`.

## 6. Integration checks

- [x] 6.1 Run `npm run check`; confirm all three bundles are rebuilt and no new capability appears
      in the manifest. Result on 2026-11-21: Chromium 218/218. The harness runs Chromium only. A
      temporary loader-hook run gave WebKit 214/218, with all 4 failures (dialog keyboard focus,
      theme colour) also failing on `23d2503`; Firefox would not launch on this machine. Proper
      cross-browser support is a follow-up change.
## 7. Compact multi-change redesign

Spec: `specs/session-change-section`, `specs/change-workflows`; design: "Compact cards", "Flyouts",
"Validate route", "Focus handoff". Tests fail first at the named seam. Inline waits for fake-host
delivery in both directions. No new test files or shared helpers. One commit per task.

- [x] 7.1 Model seam: replace `resolveTrackedChange` with `resolveTrackedChanges` and add
      `taskWindow`, with failing cases first (see design's test seams). Update callers so
      `npm run typecheck` passes. Verify with `npm run build:model:test && node --test
      test/model.test.mjs`.
- [x] 7.2 Service seam: add `/validate` and `/focus` (set, read-once, 30 s expiry, `emit`). Check
      the CLI's issue JSON against an invalid fixture first. Verify with `npm run build && node
      --test test/service.test.mjs`.
- [x] 7.3 Fake host seam: model `openPopover` (loads the status entry with `surface: "popover"` and
      `ready.popover.data`), `onPopoverClosed`, a `features.popovers` toggle and `onServiceEvent`,
      and apply `setHeight` to the frame with the 24–480 clamp. Add a failing test that a flyout
      opens as a popover when supported and inline otherwise, then implement popover mode in
      `src/status.ts`.
- [x] 7.4 Same seam: saved tracked lists. Track adds (seeding the derived change first), Untrack
      removes, an empty saved list shows nothing even for a worktree session, a value without
      `changes` counts as unsaved, and the board's current-chat compose appends. Update the
      existing tracked-change tests to the list shape.
- [x] 7.5 Same seam: compact cards for two tracked changes. Name and `n/m`, the thin bar, the
      `▸ Tasks:` line with the current task, the five-task window on expand, task and name
      flyouts, chips in order with the stage chip per stage (`propose` / `apply` / `archive`), and
      `0/0` without the Tasks line. Remove the 1.3.x bar, disclosure, badges and buttons, and their
      tests.
- [x] 7.6 Same seam: chip behaviour. `apply` / `propose` / `archive` compose the board's prompts
      unsent and append tracking; `sync` composes the sync prompt; `validate` shows valid and
      invalid results in a flyout; `board` posts the focus, calls
      `openSurface("plugin:openspec-board")`, and a board on the same project (mounted, or mounted
      later) opens that change's detail while another project's board stays at its list.
- [x] 7.7 Same seam: read and interaction behaviour with two changes. One listing plus summary and
      tasks per change; a failure on one card leaves the other; an expanded `Tasks:` and focus
      survive an unchanged finished-turn read; no `/summaries`. Coarse pointer at 320px: 44px
      targets and no horizontal overflow; fine pointer stays compact.
- [x] 7.8 Update README and AGENTS.md for the multi-change section, `/validate` and the focus
      handoff. Bump the version to 1.4.0 with `npm version 1.4.0 --no-git-tag-version`. Verify
      with `npm run check` and `npm run format:check`.

## 8. Live-use polish (2026-11-22, from the user's phone screenshot of 1.4.1)

- [x] 8.1 Fake host seam: card line 1 never wraps the count. The name truncates with an ellipsis
      and `n/m` stays on one line (e.g. `6/6` with a long name at 320px). `Tasks:` is not
      underlined; the task title keeps its flyout affordance.
- [x] 8.2 Same seam: `＋ Track a change` renders as a compact link-style control, no taller than a
      chip on a fine pointer, with 44px only as the touch target on a coarse pointer. In the change
      flyout, `Untrack` is a smaller link aligned right. Chips get slightly less vertical padding
      while keeping 44px coarse-pointer targets.
- [x] 8.3 Same seam: the section's header Refresh works. Reproduce against the real host contract
      first (`setStatusControls` / `onStatusControl` in /Users/dre/src/openchamber v2.7.3), pin it
      with a fake host that sends the real control activation, then fix.
- [x] 8.4 Same seam: debounce the mount-time reads, so `ready`, the session push and lifecycle
      events coalesce into one read, and show the last known cards per session immediately instead
      of an empty section. Keep them in memory across session switches, and in device storage
      (`features.deviceStorage`) across frame remounts. Replace them when the read lands, and mark
      them stale while it runs. A failed read keeps the cached cards with an error note.
- [x] 8.5 Redraw `assets/openspec-logo.svg` as a crisp integer-grid pixel glyph matching OpenSpec's
      official icon (`website/public/docs/icon-512.png` in Fission-AI/OpenSpec), using
      `shape-rendering="crispEdges"` and no fractional transforms. Verify by rendering it at 16, 24
      and 32 px.
- [x] 8.6 Run the full panel suite twice and `npm run check`, then release 1.4.2 with
      `npm version 1.4.2 --no-git-tag-version`.

## 9. Workflow-aware chips, footer and compact sizing (2026-11-22, after 1.4.2)

Spec: `specs/session-change-section`, `specs/change-workflows`; design: "Workflow detection",
"Workflow-aware chips and footer", "Shared prompts (group 9 additions)", "Compact section sizing",
"Icon crop". Each test fails first for the expected reason. No new test files or shared helpers.
One commit per task.

- [x] 9.1 Detection. Service seam (`test/service.test.mjs`): add failing tests for `/workflows`
      against the real CLI with an isolated `XDG_CONFIG_HOME`: an empty config gives the core set,
      and `custom` with `ff`, `verify`, `archive` gives those plus `sync` before `archive`. With a
      fake runner, CLI failure returns its error and malformed `profile` or `workflows` returns
      `BAD_CLI_OUTPUT`. Implement the route, `decodeWorkflows`, `client.workflows()` and
      `src/panel/workflows.ts`. Fake host seam (`test/panel.test.mjs`): the fake service answers
      `/workflows`; add failing tests that the section requests it on mount, on directory change
      and on Refresh, but not on a finished turn or a session switch in the same project, and that
      a failed `/workflows` shows core chips without an error. Wire it into the section's reads.
      Add `/workflows` to existing exact request-sequence assertions. Verify with `npm run build &&
      node --test test/service.test.mjs` and the focused panel tests.
- [x] 9.2 Footer. Fake host seam: add failing tests that one footer line follows the cards, or
      stands alone with nothing tracked: `＋ Track a change` left; `new` (only when the fake set has
      `new`), `board` and an icon button named `Refresh` right. The footer `board` calls
      `openSurface("plugin:openspec-board")` without posting `/focus`; Refresh runs one read; cards
      have no `board` chip; the section never calls `setStatusControls`. Implement, and remove the
      header control, `onStatusControl` handler, body Refresh button and their tests (8.3, 4.4).
- [x] 9.3 Stage chips. Fake host seam: add failing tests for the chip table with stage fixtures and
      fake sets. Planning gives `propose` + `explore` (core), `continue` (continue only) and `ff`
      (ff, with or without continue). Ready and In Progress give `apply`. Complete gives `archive`,
      plus `verify` only when configured. `sync` is absent when the summary's `specs` artefact is
      `skipped`, and `validate` stays. Chip order follows the spec. A read that changes the set or
      stage updates chips in place without moving focus. Implement `cardChips` and
      `planningWorkflow` and use them in `src/status.ts`.
- [x] 9.4 Flyout additions. Fake host seam, popover and inline modes: add failing tests that the
      change flyout shows `update` and `Open in board`, plus `continue` first for a Planning change
      when the set has `ff` and `continue`, and `Untrack` small and right-aligned below.
      `Open in board` posts `/focus` and opens the board, so a same-project board opens the change's
      detail (reuse the 7.6 assertions). In popover mode each action closes the popover. Implement,
      extending the flyout data with `directory` and `offerContinue`.
- [x] 9.5 Prompts. Fake host seam: add failing tests that `ff`, `continue`, `update`, `explore`,
      `verify` and the footer's `new` each compose their prompt unsent with `mode: "replace"`,
      naming the design's skill, change and goal, with no paths. `verify` reuses the board's
      existing prompt verbatim, without a goal. `new` names no change and leaves tracking unchanged;
      the others append tracking. Implement the prompts in
      `src/panel/prompts.ts` and drop `stageChip`.
- [x] 9.6 Compact sizing. Fake host seam at 320px: add failing tests that on a coarse pointer chips
      are 28px tall with at least 8px between adjacent chips, and that `＋ Track a change`, the
      footer controls, `Tasks:` lines, task titles and names are no taller than their line of text
      on both pointers, with no horizontal overflow. Assert that the board's coarse-pointer 44px
      tests still pass unchanged. Implement in `panel/status.html` and replace the section's
      44px assertions from 5.1 and 7.7.
- [x] 9.7 Icon crop. Set `viewBox="125 124 262 262"` in `assets/openspec-logo.svg`, keeping the
      paths. Render it at 16 and 24px next to another rail icon and confirm the glyph fills the box
      without uneven cells; if cells are uneven, retrace on a grid that divides 16 and 24.
- [x] 9.8 Release. Update `README.md` (footer, chips follow `openspec config profile`, compact
      sizing) and `AGENTS.md` (the section reads configured workflows on mount, project change and
      Refresh; `/workflows`). Run `npm version 1.5.0 --no-git-tag-version`, then `npm run check`
      and `npm run format:check`.

## Workflow follow-up

- Best effort by the agent, with the user's approval rather than as tracked tasks: a live desktop
  check per `AGENTS.md` on the latest release (track two changes, expand Tasks, open flyouts,
  validate, open the board from a card, finish a turn to watch a count update), and a phone check
  with the user (Status tab, More-menu board page, touch sizes, bottom-sheet flyouts, insets,
  keyboard). Ask before any check that creates sessions or worktrees.

- Best effort after 1.5.0: on desktop, check the footer, chips under the core profile and after
  `openspec config profile` adds `ff`, `verify` and `new`, the flyout actions and `Open in board`.
  On the phone with the user, check chip height, footer fit and the icon in the rail and section
  header.

- Draft the upstream OpenChamber issues listed in `design.md` for the user to approve.
