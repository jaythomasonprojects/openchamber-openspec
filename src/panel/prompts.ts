import type { DerivedChange } from "../model.js";

export function actionPrompt(
  change: DerivedChange,
  intent: "primary" | "verify" | "explore",
): string {
  const target = `OpenSpec change "${change.id}"`;
  const goal = change.goal?.trim() ? `\nGoal: ${change.goal}` : "";
  if (intent === "explore")
    return `Use your skill tool to load and invoke the openspec-explore skill for ${target}.${goal}\n\nInvestigate the goal, relevant code, options and trade-offs for ${target}. Discuss findings without file changes or implementation. If no goal is recorded, inspect existing context and ask the user to clarify it if necessary; do not invent a goal.`;
  if (change.stage === "planning")
    return `Use your skill tool to load and invoke the openspec-propose skill for ${target} (existing change).${goal}\n\nInspect ${target}'s status and current metadata. Preserve existing decisions and any recorded goal; only if current metadata has no goal, establish and record a concise goal from existing change context. Ask the user for clarification if the goal is unclear. Finish planning this existing scaffold and complete missing planning artefacts using OpenSpec's artefact instructions. Do not create another change or implement code. If the skill requires new-change creation, explain the conflict rather than creating another change.`;
  if (change.stage === "ready" || change.stage === "progress") {
    const progress =
      change.stage === "progress"
        ? `\n${change.completedTasks} of ${change.totalTasks} tasks complete. Pick up where implementation left off and complete the remaining tasks.`
        : "";
    return `Use your skill tool to load and invoke the openspec-apply-change skill for ${target}.${progress}\n\nComplete all remaining tasks in ${target}, then verify the implementation against its change artefacts. Resolve any issues found and verify again until all tasks are complete and verification passes. If blocked, report the blocker rather than marking unfinished work complete.`;
  }
  if (intent === "verify")
    return `Use your skill tool to load and invoke the openspec-verify-change skill for ${target}.`;
  return `Use your skill tool to load and invoke the openspec-archive-change skill for ${target}.`;
}

export function syncPrompt(change: Pick<DerivedChange, "id">): string {
  return `Use your skill tool to load and invoke the openspec-sync-specs skill for OpenSpec change "${change.id}".\n\nReport what you synced without archiving the change.`;
}

export function planningPrompt(
  change: Pick<DerivedChange, "id" | "goal">,
  intent: "ff" | "continue" | "update",
): string {
  const target = `OpenSpec change "${change.id}"`;
  const goal = change.goal?.trim() ? `\nGoal: ${change.goal}` : "";
  if (intent === "ff")
    return `Use your skill tool to load and invoke the openspec-ff-change skill for ${target} (existing change).${goal}\n\nCreate every remaining planning artefact for ${target}, preserving existing decisions and any recorded goal. Do not create another change or implement code.`;
  if (intent === "continue")
    return `Use your skill tool to load and invoke the openspec-continue-change skill for ${target} (existing change).${goal}\n\nWrite the next planning artefact for ${target}, preserving existing decisions and any recorded goal. Do not implement code.`;
  return `Use your skill tool to load and invoke the openspec-update-change skill for ${target}.${goal}\n\nRevise ${target}'s existing planning artefacts as I describe and keep them consistent with each other. If I have not described a revision, ask me what to change. Do not edit code.`;
}

export function newChangePrompt(): string {
  return "Use your skill tool to load and invoke the openspec-new-change skill.\n\nAsk me what the change is for before creating it.";
}
