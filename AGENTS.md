# OpenChamber – OpenSpec extension

## Project and commands

OpenChamber panel/page extension. Requires Node 22.13+, npm, an `openspec` CLI on `PATH`, and
Playwright Chromium for browser tests (`npx playwright install chromium` after `npm ci`).
`npm run check` runs lint → format:check → typecheck → test → build. Single steps: `npm run lint`,
`npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`; formatter:
`npm run format`. `npm run clean` removes both generated bundles.

## Ownership

- `src/panel.ts`: theme-first SDK bootstrap. `src/panel/client.ts`: private service bridge and
  decoders. `src/panel/resources.ts`: context-scoped, bounded session-local reads.
  `src/panel/controller.ts`: context, board/selection state, change-open reads and unsent workflow
  actions.
- `src/panel/{board-view,detail-view,document-view,tasks-view,create-dialog}.ts`: mounted native DOM
  and SDK UI controls. Views dispose their handles; theme and ordinary refreshes must not replace
  search or detail shells.
- `src/contracts.ts`: validated DTOs; `src/model.ts`: pure stage derivation.
- `src/service.ts`: startup. `src/service/{http,openspec,cli}.ts`: authentication and request
  bounds, scoped CLI translation and safe paths, process execution.
- `panel/index.html`, `panel/main.js`, `service/main.js`: installable HTML and generated IIFE/CJS
  assets. Rebuild **both** bundles and reinstall/update the installed folder extension together
  after changing the private protocol; disable/re-enable it to restart its host-managed service.
  Reloading the iframe alone does not restart the service. Manifest lives in `package.json` under
  `openchamber`.

## Constraints and checks

The panel reads through the SDK service bridge, not direct CLI or browser HTTP. Initial/context
loads and explicit Refresh update the board; there is no polling, visibility revalidation, TTL or
board-wide prefetch. Opening detail starts CLI Tasks alongside the first available document group;
standard documents load Proposal, all Specs concurrently, then Design. Custom groups use declared
order. Tabs display retained/queued reads without initiating new requests. Opened changes retain
successful reads in memory by directory/root/change until Refresh, context replacement or disposal,
with a 4 MiB budget and explicit capacity errors rather than eviction. Retained reads do not
authorise creation or recovery, and uncertain writes require a fresh original-context listing. CLI
listing counts and CLI task descriptions/done flags are authoritative. Tasks shows only CLI
first-line descriptions, without parsing task sources. Keep prompts unsent. Deletion checks the
active parent and target after its final CLI context check; filesystem changes between individual
checks and removal are not atomic.

The tests use disposable OpenSpec roots, a fake SDK host for deterministic races and a compiled
panel → real HTTP service → real CLI browser contract. Target is ES2022 browser and Node 22 CJS
service. The host version floor is intentionally unset.
