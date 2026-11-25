# OpenChamber – OpenSpec extension

## Setup and verification

- Use Node 22.13+, npm, and `openspec` on `PATH`. After `npm ci`, install test Chromium with
  `npx playwright install chromium`.
- `npm run check` runs lint → format:check → typecheck → test → build. Use `npm run format` to
  format. Lint and typecheck cover `src`, not the JavaScript tests or Python worktree helper.
- Focused browser or service test: `npm run build`, then `node --test test/panel.test.mjs`
  (substitute `document`, `service`, or `integration`). Filter with
  `node --test --test-name-pattern='pattern' test/panel.test.mjs`; do not pass flags through
  `npm test`.
- Pure model test: `npm run build:model:test && node --test test/model.test.mjs`. Resource test:
  `npm run build:resources:test && node --test test/resources.test.mjs`.
- Browser tests use a fake SDK host for deterministic races. Service and integration tests also
  invoke the real CLI against disposable OpenSpec roots, not an installed extension or live project.
- VS Code's **Setup: worktree** runs `uv run --no-project scripts/setup_worktree.py` (Python 3.12+).
  It links `node_modules` from the main checkout and refuses conflicting destinations or tracked
  paths. Git checks out the tracked `openspec/` files in each worktree. To share uncommitted
  planning through a project setup hook, see
  [Planning across worktrees](README.md#planning-across-worktrees). Installs affect every linked
  worktree; keep separate dependencies when branches differ.

## Releasing

- Start from a clean, committed release branch with locked dependencies and the CLI version tested
  in `README.md`. `package.json` owns the version; npm updates the lockfile. Releases start with the
  next version, without backfilling earlier tags or Releases.
- Ask before creating a tag, pushing, or creating a GitHub Release. After approval, run
  `npm version patch` (or `minor` / `major`). For v2 alphas, start from the v2 branch with
  `npm version prerelease --preid=alpha`. Keep the lifecycle hooks enabled and avoid `--force`. They
  check the project and stage rebuilt bundles into npm's version commit.
- Inspect `git show --stat HEAD` and `git status --short`. npm's default commit message is the
  version number, with an annotated `vX.Y.Z` tag. Confirm the tag points to that commit.
- Label merged PRs using the categories in `.github/release.yml`. Write a short `highlights.md`
  outside the checkout: what is new, what comes next, and a link to the roadmap issue.
- After push approval, push the release commit and its specific tag with
  `git push --atomic origin HEAD vX.Y.Z`. After Release approval, run
  `gh release create vX.Y.Z --verify-tag --generate-notes --notes-file /path/to/highlights.md`. The
  highlights precede the generated PR list. Add `--prerelease` for alpha or beta builds; for the
  first Release, add `--notes-start-tag v1.2.0` to bound the generated history. Review the published
  notes.

## Runtime boundaries

- `src/panel.ts` and `src/status.ts` apply the SDK theme before showing their content.
  `src/panel/client.ts` uses the SDK service bridge, never direct CLI execution or browser HTTP.
  `src/panel/controller.ts` owns the board's context, selection, read scheduling, and workflow
  actions. `src/panel/resources.ts` retains reads by directory, root, planning target, and change.
- Current-chat workflow actions prepare unsent drafts. **Run in new worktree** and confirmed
  **archive all** create sessions and submit their prompts through the SDK.
- Views own mounted DOM and SDK UI handles. Dispose their handles; theme changes and ordinary
  refreshes must not replace the search or detail shells and lose focus, caret, or scroll position.
- `src/contracts.ts` validates the private protocol; `src/model.ts` derives stages. `src/service.ts`
  starts the host-managed service. `src/service/http.ts` owns authentication and request bounds;
  `src/service/openspec.ts` owns scoped CLI translation and safe paths; `src/service/cli.ts` runs
  processes.
- `/validate` runs only for the Work Status **validate** chip. It uses the selected change's root
  and planning identity. The focus handoff stores one target for 30 seconds. The `focus` service
  event signals that a target is pending; only a matching directory can claim it with `GET /focus`.
- `/workflows` reads the global profile via `openspec config list --json`, without planning scope.
  The section falls back to core workflows if the read fails.
- The extension manifest is `package.json`'s `openchamber` field, not `service/package.json`. The
  latter keeps generated `service/main.js` CommonJS inside this ESM repository.
- `panel/main.js` and `panel/status.js` are generated ES2022 browser IIFEs. `service/main.js` is the
  generated Node 22 CJS bundle. Rebuild all three after private-protocol changes. Installation does
  not build them. To activate changes, reinstall or update the extension and restart its service as
  below. `npm run clean` removes only these three bundles, not `build/`.

## Behaviour constraints

- Load the board only on initial/context loads, explicit Refresh, after the panel's own create or
  delete, and once when a claimed focus names an unlisted change. Do not add polling, visibility
  revalidation, TTL, or board-wide document prefetch.
- Read configured workflows on the board's initial/context loads and explicit Refresh. Reuse the
  result for other board reloads.
- Read Archived, the Specs list, and each spec on first open in a context. Refresh invalidates all
  browse reads and reloads only the visible browse content. A hidden view reads on its next open.
- Load the Work Status section on mount, session or project changes, explicit Refresh, and after the
  shown session finishes a turn. Re-read after tracking changes. Read one listing and the summary
  and tasks for each tracked change only. Keep unchanged card controls mounted across reads. Do not
  poll, refresh on visibility changes, or read board-wide summaries.
- Read configured workflows on mount, project change, and footer Refresh. Reuse the result for
  session switches in the same directory and finished turns.
- Retained reads do not authorise writes or recovery. Reconcile uncertain writes with a fresh
  listing in the original context; do not retry the mutation automatically.
- Deletion checks the active parent and target after its final CLI context check. These checks and
  removal are not atomic; do not claim protection against every filesystem race.

## Live-host checks

- After `npm run build`, use the OpenChamber browser tool in **Settings > Extensions** to
  **Disable** then **Enable** the OpenSpec extension; confirm it is **Enabled**. Reloading the
  iframe does not restart the service.
- Check behaviour inside the extension with Playwright in its own browser:
  `uv run --with playwright python <script>` against the running OpenChamber web UI
  (`http://127.0.0.1:57123` on this machine). The OpenChamber browser tool cannot see inside the
  extension iframe.
- Ask the user before a check creates real sessions or worktrees.
- Git-URL installs update only when `package.json` `version` increases. OpenChamber compares semver,
  not commits, so bump the version (`npm version <x.y.z> --no-git-tag-version`) in any release users
  should receive.
