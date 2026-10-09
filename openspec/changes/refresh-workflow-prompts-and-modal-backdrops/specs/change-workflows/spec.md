# Spec Delta

## ADDED Requirements

### Requirement: Workflow prompts explicitly request skill invocation

Every generated workflow prompt SHALL use ordinary prose to ask the agent to load and invoke the
appropriate named OpenSpec skill through its skill tool before performing that workflow. Generated
workflow instructions SHALL use bare skill names rather than slash commands or dollar-prefixed
mentions, without relying on host skill injection. User-supplied goal text SHALL remain unchanged.
Existing workflow guidance, change identity, destinations and approval boundaries SHALL remain
unchanged. The extension SHALL request skill invocation, not claim that a skill was loaded.

#### Scenario: Prepare a per-change workflow

- **WHEN** a user prepares Explore, Propose, Apply, Verify or Archive in the current chat
- **THEN** the editable, unsent prompt explicitly requests loading and invoking `openspec-explore`,
  `openspec-propose`, `openspec-apply-change`, `openspec-verify-change` or `openspec-archive-change`
  respectively through the agent's skill tool
- **AND** the generated workflow instruction uses neither a slash command nor a dollar mention
- **AND** the existing change-specific guidance and recorded goal or progress remain present

#### Scenario: Apply in a new worktree

- **WHEN** a user explicitly chooses new-worktree Apply
- **THEN** the submitted first message contains the same ordinary Apply prompt used for current-chat
  preparation, including the explicit request to invoke `openspec-apply-change`
- **AND** skill invocation does not depend on composer processing

#### Scenario: Archive completed changes in bulk

- **WHEN** a user confirms archive all
- **THEN** the submitted prompt explicitly requests loading and invoking `openspec-archive-change`
  through the agent's skill tool for qualifying changes sequentially
- **AND** fresh completion checks, skips, spec-sync assessment, user choices and reporting remain
  required
