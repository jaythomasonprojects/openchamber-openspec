# Tasks

## 1. Agent-directed workflow prompts

- [x] 1.1 At the existing fake-SDK prompt-dispatch browser seam in `test/panel.test.mjs`, make one
      per-change prompt assertion fail for explicit skill-tool invocation, then update
      `src/panel/controller.ts` to use ordinary prose and bare skill names for Explore, Propose,
      Apply, Verify and Archive. Complete each workflow assertion/implementation as a vertical
      red-green slice; preserve goals, progress, existing-scaffold guidance, unsent composition and
      context guards. Update existing slash-prefix expectations in `test/integration.test.mjs`
      without adding a new seam. Verify with `npm run build`, `node --test test/panel.test.mjs` and
      `node --test test/integration.test.mjs`.
- [x] 1.2 At the same fake-SDK browser seam, extend the existing new-worktree Apply assertion to pin
      the explicit skill-loading request and its equality with the ordinary current-chat Apply
      prompt. Keep creation and submission unchanged; adjust only prompt wiring if the assertion
      exposes a mismatch. Verify the relevant worktree tests in `test/panel.test.mjs` after
      `npm run build`.
- [x] 1.3 At the existing archive-all fake-SDK browser seam in `test/panel.test.mjs`, add a failing
      assertion for loading and invoking the archive skill through the agent's skill tool, then
      update `src/panel/archive-prompt.ts`. Preserve sequential qualification checks, skips, sync
      questions, reporting and launch safeguards. Verify the archive-all tests after
      `npm run build`.

## 2. Browser-default modal tint and blur

- [x] 2.1 At the existing modal browser seam in `test/panel.test.mjs`, change the backdrop test to
      fail unless create, delete and archive dialogues retain an unstyled native dialogue's tint and
      opacity and apply 4px blur at narrow and expanded widths in both themes. Remove the custom
      backdrop background and opacity from `panel/index.html` and add standard and WebKit-prefixed
      blur declarations. Preserve focus containment, undimmed controls and Escape/button
      cancellation checks; use no new helper or test file. Verify with `npm run build` and
      `node --test --test-name-pattern='presentation modal backdrops' test/panel.test.mjs`.

## 3. Whole-extension verification

- [x] 3.1 Run `npm run check` and exercise the existing browser suites in Chromium, Firefox and
      WebKit without adding test infrastructure. Confirm both installable bundles are rebuilt and
      report results or unavailable browser coverage; verify no SDK, CLI, permission or font-sizing
      changes entered the implementation.
- [x] 3.2 Perform the live-host activation and check described in `AGENTS.md`: disable then enable
      the extension, confirm Enabled, inspect browser-default tint with 4px blur in its iframe, and
      prepare an unsent workflow draft containing an explicit skill-tool request. Ask before any
      live check creates a session or worktree; otherwise verify those destinations only through the
      fake host and report that live launch was not exercised.
