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
  It shares only `node_modules` from the main checkout and refuses existing destinations or tracked
  paths. Installs affect every linked worktree; keep separate dependencies when branches differ.

## Runtime boundaries

- `src/panel.ts` applies the SDK theme before showing the panel. `src/panel/client.ts` uses the SDK
  service bridge, never direct CLI execution or browser HTTP. `src/panel/controller.ts` owns
  context, selection, read scheduling, and unsent workflow actions; `src/panel/resources.ts` retains
  scoped reads.
- Views own mounted DOM and SDK UI handles. Dispose their handles; theme changes and ordinary
  refreshes must not replace the search or detail shells and lose focus, caret, or scroll position.
- `src/contracts.ts` validates the private protocol; `src/model.ts` derives stages. `src/service.ts`
  starts the host-managed service. `src/service/http.ts` owns authentication and request bounds;
  `src/service/openspec.ts` owns scoped CLI translation and safe paths; `src/service/cli.ts` runs
  processes.
- The extension manifest is `package.json`'s `openchamber` field, not `service/package.json`. The
  latter keeps generated `service/main.js` CommonJS inside this ESM repository.
- `panel/main.js` and `service/main.js` are generated installable bundles (ES2022 browser IIFE and
  Node 22 CJS). Build both after private-protocol changes. Installation does not build them. To
  activate changes, reinstall/update the extension and disable/re-enable it; reloading the iframe
  does not restart its service. `npm run clean` removes only these two bundles, not `build/`.

## Behaviour constraints

- Load the board on initial/context loads and explicit Refresh. Do not add polling, visibility
  revalidation, TTL, or board-wide document prefetch.
- Opening detail starts CLI Tasks beside the first document group. Standard groups load Proposal,
  all Specs concurrently, then Design; custom groups follow declared order. Tab selection must not
  initiate requests.
- Retain successful reads by directory/root/change until Refresh, context replacement, or disposal.
  The session budget is 4 MiB; report capacity errors rather than evicting reads.
- CLI listing counts and CLI task descriptions/done flags are authoritative. Tasks displays only CLI
  first-line descriptions; do not parse task sources. Keep workflow prompts unsent.
- Retained reads do not authorise writes or recovery. Reconcile uncertain writes with a fresh
  listing in the original context; do not retry the mutation automatically.
- Deletion checks the active parent and target after its final CLI context check. These checks and
  removal are not atomic; do not claim protection against every filesystem race.
