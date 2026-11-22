import type { Workflow } from "../contracts.js";

const sequentialPrompt = `Archive all completed OpenSpec changes in this session's project/worktree.

Run openspec list --json for a fresh active-change listing and resolve its OpenSpec planning context, honouring declared stores and the selected CLI root. Inspect each change with openspec status --change "<name>" --json and current CLI-reported task counts. Only changes with every applicable planning artefact done or explicitly skipped, a positive task total, and all tasks complete qualify. Skip unfinished, zero-task, unavailable or unreadable changes. Never use an incomplete-work warning override or infer successful verification from a Complete card or task counts.

Use your skill tool to load and invoke the openspec-archive-change skill for each qualifying named change sequentially. Recheck completion before each archive and assess spec sync against the current main specs after any preceding archive. Preserve the skill's prerequisites, sync assessment, user choices and blockers; ask its required questions rather than treating this bulk request as permission to bypass them. Do not implement unfinished work or automatically resolve blockers.

Report archived, skipped and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that outcome.`;

export function archiveAllPrompt(workflows: ReadonlySet<Workflow>): string {
  if (!workflows.has("bulk-archive")) return sequentialPrompt;
  return `Archive all completed OpenSpec changes in this session's project/worktree.

Use your skill tool to load and invoke the openspec-bulk-archive-change skill. Before its selection step, run openspec list --json and openspec status --change "<name>" --json for each change. A change qualifies only when every applicable planning artefact is done or explicitly skipped and it has a positive task total with all tasks complete. When the skill asks which changes to archive, offer only qualifying changes and recommend all of them. Skip any selected change that does not qualify; never use an incomplete-work override or infer verification from task counts.

Preserve the skill's spec-sync assessment, user choices and blockers. Report archived, skipped and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that outcome.`;
}
