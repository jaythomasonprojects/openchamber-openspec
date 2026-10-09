# Proposal

## Why

OpenChamber now separates skill mentions from slash commands, and its composer skill injection is
not shared by SDK-created sessions. The extension should ask the agent to invoke skills explicitly
and use a lighter, subtly blurred modal backdrop.

## What Changes

- Replace generated slash-prefixed workflow commands with ordinary prose asking the agent to load
  and invoke the named OpenSpec skill. Do not generate dollar-prefixed skill mentions either.
- Apply the same explicit skill-loading guidance to bulk archiving, preserving its sequential
  completion checks and approval boundaries.
- Remove custom modal backdrop colour and opacity, leaving the browser's default tint, and add 4px
  blur to create, delete and archive dialogues.
- Preserve workflow destinations, unsent current-chat drafts, session-launch safeguards and modal
  keyboard behaviour. Font scaling remains deferred.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-workflows`: request skill invocation explicitly without host command or mention injection.
- `change-presentation`: replace the prescribed 35% black, unblurred backdrop with browser-default
  tint and 4px blur.

## Impact

Prompt generation in `src/panel/controller.ts` and `src/panel/archive-prompt.ts`, backdrop styling
in `panel/index.html`, and existing prompt-dispatch and modal browser tests. Existing integration
assertions that expect slash-prefixed prompts must be updated to match the new wording.

No new SDK calls, permissions, dependencies, CLI flags or skill names. This deliberately stops
relying on slash-command dispatch, including on older hosts; agents must have the existing named
skills and a skill-loading tool. Explicit prose requests invocation but does not guarantee agent
compliance. Browser-default tint can vary between browsers; the extension will not normalise it.
