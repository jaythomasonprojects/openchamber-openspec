# OpenChamber – OpenSpec extension

## Setup and verification

- Use Node 22.13+, npm, and `openspec` on `PATH`. After `npm ci`, install test Chromium with
  `npx playwright install chromium`.
- `npm run check` runs lint → format:check → typecheck → test → build. Lint and typecheck exclude
  the JavaScript tests and Python worktree helper. `npm run format` does not include this file.
- Focused tests read generated bundles: run `npm run build:panel` before
  `node --test test/panel.test.mjs`, `npm run build:service` before
  `node --test test/service.test.mjs`, or `npm run build` before integration or harness tests.
- Contracts and document tests bundle their own source: `node --test test/contracts.test.mjs` or
  `node --test test/document.test.mjs`. Document tests still require Chromium.
- Filter with `node --test --test-name-pattern='pattern' test/panel.test.mjs`, after building the
  required bundle. Do not pass test flags through `npm test`, which chains builds and the test
  runner.
- Pure model test: `npm run build:model:test && node --test test/model.test.mjs`. Resource test:
  `npm run build:resources:test && node --test test/resources.test.mjs`.
- Browser tests use a fake SDK host for deterministic races. Service and integration tests also
  invoke the real CLI against disposable OpenSpec roots, not an installed extension or live project.
- **Setup: worktree** runs `uv run --no-project scripts/setup_worktree.py` (Python 3.12+) and links
  only `node_modules` from the main checkout. Installs affect every linked worktree; use separate
  dependencies when branches differ. Git supplies tracked `openspec/` files; optional sharing of
  uncommitted planning is described in
  [Planning across worktrees](README.md#planning-across-worktrees).

## Runtime boundaries

- `src/panel.ts` applies the SDK theme before showing the panel. `src/panel/client.ts` uses the SDK
  service bridge, never direct CLI execution or browser HTTP. `src/panel/controller.ts` owns
  context, selection, read scheduling, and workflow actions; `src/panel/resources.ts` retains reads
  scoped by directory/root/planning target/change.
- Current-chat workflow actions prepare unsent drafts. **Run in new worktree** and confirmed
  **archive all** create sessions and submit their prompts through the SDK.
- Views own mounted DOM and SDK UI handles. Dispose their handles; theme changes and ordinary
  refreshes must not replace the search or detail shells and lose focus, caret, or scroll position.
- `src/contracts.ts` validates the private protocol; `src/model.ts` derives stages. `src/service.ts`
  starts the host-managed service. `src/service/http.ts` owns authentication and request bounds;
  `src/service/openspec.ts` owns scoped CLI translation and safe paths; `src/service/cli.ts` runs
  processes.
- The extension manifest is `package.json`'s `openchamber` field. `service/package.json` only keeps
  the generated service CommonJS inside this ESM repository.
- `panel/main.js` and `service/main.js` are tracked, generated installable bundles. Rebuild both
  after private-protocol changes; installation does not build them. `npm run clean` removes these
  bundles, not the ignored `build/` test outputs.

## Behaviour constraints

- Load the board only on initial/context loads, explicit Refresh, and after the panel's own create
  or delete. Do not add polling, visibility revalidation, TTL, or board-wide document prefetch.
- Retained reads do not authorise writes or recovery. Reconcile uncertain writes with a fresh
  listing in the original context; do not retry the mutation automatically.
- Deletion checks the active parent and target after its final CLI context check. These checks and
  removal are not atomic; do not claim protection against every filesystem race.

## Live-host checks

- Update/reinstall the extension to pick up checkout changes, then **Disable** and **Enable** it in
  **Settings > Extensions**; confirm **Enabled**. Reloading the iframe does not restart the service.
- The OpenChamber browser tool cannot inspect the extension iframe. Use Playwright in its own
  browser against the running host, for example `uv run --with playwright python <script>`.
- Ask the user before a check creates real sessions or worktrees.

## Releasing

- Land changes on `dev` first. `main` only fast-forwards to `dev`, because users install the default
  branch and must get the latest release.
- Release from a clean, committed `dev` with locked dependencies and a CLI version tested in
  `README.md`. Release forward rather than backfilling tags or Releases.
- Ask before tagging, pushing, or creating a GitHub Release. After tag approval, use
  `npm version patch` (or `minor` / `major`; `prerelease --preid=alpha` for alphas). Keep lifecycle
  hooks enabled and avoid `--force`: they run the checks and stage rebuilt bundles into npm's
  version commit.
- Inspect `git show --stat HEAD` and `git status --short`; confirm `vX.Y.Z` points to the version
  commit.
- Label merged PRs using `.github/release.yml`. Write `highlights.md` outside the checkout with what
  is new, what comes next, and the roadmap issue link.
- After push approval: `git push --atomic origin dev dev:main vX.Y.Z`. `dev:main` fast-forwards
  `main` to the version commit, and the push fails as a whole if it cannot. After Release approval:
  `gh release create vX.Y.Z --verify-tag --generate-notes --notes-file /path/to/highlights.md`. Add
  `--prerelease` for alpha/beta builds and review the published notes.
