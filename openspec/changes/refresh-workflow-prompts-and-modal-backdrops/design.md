# Design

## Context

See `proposal.md` for motivation. `actionPrompt` in `src/panel/controller.ts` generates five
slash-prefixed workflows; Apply is reused for both composition and new-worktree submission.
`src/panel/archive-prompt.ts` already names the archive skill in prose but does not explicitly ask
the agent to load it through its tool. SDK composition stays unsent; session creation sends text
without going through the composer.

The upstream cause is OpenChamber 2.2.0's split between composer skill collection and SDK sends:
`packages/ui/src/components/chat/ChatInput.tsx` collects dollar mentions, while
`packages/ui/src/lib/guests/start-session.ts` sends without those collected skill attachments. The
user chose agent-directed invocation rather than depending on either host injection path.

The shared `dialog::backdrop` rule in `panel/index.html` overrides native tint with black at 0.35
opacity. The existing presentation spec prescribes that appearance and must change explicitly. The
native browser tint is ordinarily 10% black; it is not an SDK modal default. OpenChamber's
`packages/ui/src/styles/design-system.css` uses 4px modal blur.

## Goals / Non-Goals

**Goals:**

- Keep the existing prompt builders and dispatch boundaries, changing only generated guidance.
- Let the browser own modal tint and keyboard behaviour while the extension supplies blur.

**Non-Goals:**

- Host or SDK changes, dependency upgrades, new capabilities, generated skill edits, automatic skill
  attachment, font scaling or modal component replacement.
- Guaranteeing agent compliance or rewriting dollar/slash text supplied in a recorded goal.

## Decisions

### Ask the agent to invoke bare skill names

Replace each command prefix with prose such as
`Use your skill tool to load and invoke the openspec-apply-change skill for OpenSpec change "<name>".`
Keep the existing goal/progress text and workflow-specific guardrails after that instruction. Verify
and Archive receive the same explicit loading request, not just a skill name. Bulk archiving
explicitly loads the archive skill before processing qualifying changes and invokes its workflow
sequentially for each change.

Continue using `host.compose({ text, mode: "replace" })` and the existing `host.startSession` text
submission. No new host fields or methods are needed. Slash dispatch would preserve an obsolete host
dependency; dollar mentions would depend on composer processing. Plain prose works through both
existing destinations, with actual invocation delegated to the agent.

### Remove tint overrides, add only blur

Remove `background: black` and `opacity: 0.35` from the shared backdrop rule. Add
`backdrop-filter: blur(4px)` and its WebKit-prefixed equivalent. Leave all dialogue DOM, handlers
and SDK control handles mounted as before. Do not replace the removed overrides with a hard-coded
10% tint: browser defaults, not an extension-owned alpha, are the chosen behaviour.

### Keep verification at existing seams

Use the existing fake-SDK browser seam in `test/panel.test.mjs` to inspect composed and submitted
text for all five workflows, new-worktree Apply and archive all. Assert the explicit skill-tool
request and absence of generated command/mention prefixes, while preserving existing behavioural
assertions. Update existing slash-text expectations in `test/integration.test.mjs` as maintenance,
without adding new service or CLI behaviour tests.

Extend the existing modal browser test for create, delete and archive at narrow and expanded widths
in both themes. Compare tint and opacity to an unstyled native dialogue in the same browser rather
than prescribing an alpha; assert 4px blur, an undimmed dialogue, focus containment and both
existing cancellation paths. Use no new test files or shared helpers. These tests observe extension
output, not real agent skill invocation.

## Risks / Trade-offs

- Agent may not load the skill, or the skill may be unavailable: explicit instruction is the
  selected mitigation; do not add host injection or another compatibility mechanism.
- Native tint can differ across browsers: accept that variation and test against each browser's own
  native baseline rather than normalising it.
- Blur support or rendering can differ: use standard and prefixed declarations and verify in
  Chromium, Firefox and WebKit. No custom rendering fallback is planned.

## Migration Plan

Run the focused tests for each slice, then the repository's full checks and browser coverage. Build
both installable bundles, activate the extension by disabling and enabling it in the live host, and
inspect dialogue appearance and a prepared unsent draft. Live session/worktree launches require
separate user permission. Rollback is reinstalling the preceding extension version; there is no data
migration.
