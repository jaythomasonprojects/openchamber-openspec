import type { Stage } from "../model.js";

export const stages: { id: Stage; label: string; action: string }[] = [
  { id: "planning", label: "Planning", action: "propose" },
  { id: "ready", label: "Ready", action: "apply" },
  { id: "progress", label: "In Progress", action: "continue" },
  { id: "complete", label: "Complete", action: "archive" },
];

export const workflowLabel = (stage: Stage) => stages.find((item) => item.id === stage)!.action;
export const stageLabel = (stage: Stage) => stages.find((item) => item.id === stage)!.label;
