export const archiveAllPrompt = `Archive all completed OpenSpec changes in this session's project/worktree.

Run openspec list --json for a fresh active-change listing and resolve its OpenSpec planning context, honouring declared stores and the selected CLI root. Inspect each change with openspec status --change "<name>" --json and current CLI-reported task counts. Only changes with every applicable planning artefact done or explicitly skipped, a positive task total, and all tasks complete qualify. Skip unfinished, zero-task, unavailable or unreadable changes. Never use an incomplete-work warning override or infer successful verification from a Complete card or task counts.

Process qualifying changes sequentially using the openspec-archive-change skill for each named change. Recheck completion before each archive and assess spec sync against the current main specs after any preceding archive. Preserve the skill's prerequisites, sync assessment, user choices and blockers; ask its required questions rather than treating this bulk request as permission to bypass them. Do not implement unfinished work or automatically resolve blockers.

Report archived, skipped and blocked changes with reasons. If none qualify, make no OpenSpec mutations and report that outcome.`;
