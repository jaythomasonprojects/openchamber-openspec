import type { Workflow } from "../contracts.js";
import type { Stage } from "../model.js";
import { planningWorkflow } from "./workflows.js";

export const stages: { id: Stage; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "ready", label: "Ready" },
  { id: "progress", label: "In Progress" },
  { id: "complete", label: "Complete" },
];

export const workflowLabel = (stage: Stage, workflows: ReadonlySet<Workflow>) =>
  stage === "planning" ? planningWorkflow(workflows) : stage === "complete" ? "archive" : "apply";
export const stageLabel = (stage: Stage) => stages.find((item) => item.id === stage)!.label;
