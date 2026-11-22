import { isChangeName, type Artifact } from "./model.js";

export type Context = { directory: string; root: string; planning: string };
export function decodePlanning(value: unknown): string {
  if (typeof value !== "string" || !value.length || value.length > 4096 || value.includes("\0"))
    throw new Error("Invalid planning identity.");
  return value;
}
export type ListingEntry = { id: string; completedTasks: number; totalTasks: number };
export type ArchivedChange = { name: string; completedTasks: number; totalTasks: number };
export type SpecEntry = { id: string; requirementCount: number };
export type Task = {
  id: string;
  description: string;
  done: boolean;
};
export type ValidationResult = {
  valid: boolean;
  issues: { level: string; path: string; message: string }[];
};
export type DocumentDescriptor = { artifactId: string; selector: string; label: string };
export const documentKey = (artifactId: string, selector: string): string =>
  JSON.stringify([artifactId, selector]);
export type ChangeMetadata = {
  id: string;
  root: string;
  goal: string | null;
  affectedAreas: string[];
  artifacts: Artifact[];
  applyRequires: string[];
  documents: DocumentDescriptor[];
};
export type ServiceIssue = { code: string; message: string; status: number; outcome?: "unknown" };

const ALL_WORKFLOWS = [
  "propose",
  "explore",
  "new",
  "continue",
  "apply",
  "update",
  "ff",
  "sync",
  "archive",
  "bulk-archive",
  "verify",
  "onboard",
] as const;
export type Workflow = (typeof ALL_WORKFLOWS)[number];
export const CORE_WORKFLOWS = ["propose", "explore", "apply", "update", "sync", "archive"] as const;

export function isWorkflow(value: unknown): value is Workflow {
  return ALL_WORKFLOWS.some((name) => name === value);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data.");
  return value as Record<string, unknown>;
}

export function decodeWorkflows(value: unknown): Workflow[] {
  const { workflows } = record(value);
  if (!Array.isArray(workflows) || !workflows.every(isWorkflow))
    throw new Error("Invalid workflows.");
  return workflows;
}

function string(value: unknown): string {
  if (typeof value !== "string" || !value.length) throw new Error("Invalid string.");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid task count.");
  return value;
}

function names(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("Invalid dependency list.");
  return value.map(string);
}

export function decodeValidation(value: unknown): ValidationResult {
  const { valid, issues } = record(value);
  if (typeof valid !== "boolean" || !Array.isArray(issues))
    throw new Error("Invalid validation result.");
  return {
    valid,
    issues: issues.map((value) => {
      const { level, path, message } = record(value);
      return { level: string(level), path: string(path), message: string(message) };
    }),
  };
}

export function decodeListingEntry(value: unknown, key: "name" | "id" = "id"): ListingEntry {
  const item = record(value);
  const id = string(item[key]);
  if (!isChangeName(id)) throw new Error("Invalid change name.");
  const completedTasks = count(item.completedTasks);
  const totalTasks = count(item.totalTasks);
  if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
  return { id, completedTasks, totalTasks };
}

export function decodeArchived(value: unknown): ArchivedChange[] {
  const { changes } = record(value);
  if (!Array.isArray(changes)) throw new Error("Invalid archived listing.");
  const archived = changes.map((value) => {
    const item = record(value);
    const name = string(item.name);
    const completedTasks = count(item.completedTasks);
    const totalTasks = count(item.totalTasks);
    if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
    return { name, completedTasks, totalTasks };
  });
  if (new Set(archived.map(({ name }) => name)).size !== archived.length)
    throw new Error("Duplicate archived change.");
  return archived;
}

export function isSpecId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.exec(value)?.[0] === value
  );
}

export function decodeSpecs(value: unknown): SpecEntry[] {
  const { specs } = record(value);
  if (!Array.isArray(specs)) throw new Error("Invalid spec listing.");
  const entries = specs.map((value) => {
    const { id, requirementCount } = record(value);
    return { id: string(id), requirementCount: count(requirementCount) };
  });
  if (new Set(entries.map(({ id }) => id)).size !== entries.length)
    throw new Error("Duplicate spec.");
  return entries;
}

export function decodeListing(value: unknown): {
  directory: string;
  root: string;
  changes: ListingEntry[];
  planning: string;
} {
  const input = record(value);
  const directory = string(input.directory);
  const root = string(input.root);
  if (!Array.isArray(input.changes)) throw new Error("Invalid listing.");
  const changes = input.changes.map((item) => decodeListingEntry(item));
  if (new Set(changes.map((item) => item.id)).size !== changes.length)
    throw new Error("Duplicate change.");
  return { directory, root, planning: decodePlanning(input.planning), changes };
}

export function decodeArtifacts(value: unknown, requires: unknown): Artifact[] {
  if (!Array.isArray(value)) throw new Error("Invalid artefacts.");
  const artifacts = value.map((value): Artifact => {
    const item = record(value);
    const id = string(item.id);
    const status = item.status;
    if (status !== "done" && status !== "skipped" && status !== "ready" && status !== "blocked")
      throw new Error("Invalid artefact status.");
    return { id, status, outputPath: string(item.outputPath), requires: names(item.requires) };
  });
  const byId = new Map(artifacts.map((item) => [item.id, item]));
  if (byId.size !== artifacts.length) throw new Error("Duplicate artefact.");
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    const item = byId.get(id);
    if (!item || visiting.has(id)) throw new Error("Invalid artefact dependency.");
    if (visited.has(id)) return;
    visiting.add(id);
    item.requires.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  artifacts.forEach((item) => visit(item.id));
  names(requires).forEach((id) => {
    if (!byId.has(id)) throw new Error("Invalid apply requirement.");
  });
  return artifacts;
}

export function decodeSummary(value: unknown): ChangeMetadata {
  const item = record(value);
  const id = string(item.id);
  if (!isChangeName(id)) throw new Error("Invalid change name.");
  if (item.goal !== null && typeof item.goal !== "string") throw new Error("Invalid goal.");
  const artifacts = decodeArtifacts(item.artifacts, item.applyRequires);
  if (!Array.isArray(item.documents)) throw new Error("Invalid documents.");
  const documents = item.documents.map((value): DocumentDescriptor => {
    const document = record(value);
    const artifactId = string(document.artifactId);
    if (!artifacts.some((item) => item.id === artifactId))
      throw new Error("Unknown document artefact.");
    return { artifactId, selector: string(document.selector), label: string(document.label) };
  });
  if (
    new Set(documents.map((item) => documentKey(item.artifactId, item.selector))).size !==
    documents.length
  )
    throw new Error("Duplicate document.");
  return {
    id,
    root: string(item.root),
    goal: item.goal as string | null,
    affectedAreas: names(item.affectedAreas),
    artifacts,
    applyRequires: names(item.applyRequires),
    documents,
  };
}

export function decodeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) throw new Error("Invalid tasks.");
  const tasks = value.map((value) => {
    const task = record(value);
    if (typeof task.done !== "boolean") throw new Error("Invalid task state.");
    return {
      id: string(task.id),
      description: string(task.description),
      done: task.done,
    };
  });
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length)
    throw new Error("Duplicate task.");
  return tasks;
}

export type SummaryResult =
  | { id: string; summary: ChangeMetadata }
  | { id: string; error: { code: string; message: string } };

export function decodeSummaries(value: unknown): {
  root: string;
  planning: string;
  changes: SummaryResult[];
} {
  const input = record(value);
  const root = string(input.root);
  if (!Array.isArray(input.changes)) throw new Error("Invalid summaries.");
  const changes = input.changes.map((value): SummaryResult => {
    const item = record(value);
    const id = string(item.id);
    if (!isChangeName(id) || "summary" in item === "error" in item)
      throw new Error("Invalid summary entry.");
    if ("summary" in item) {
      const summary = decodeSummary(item.summary);
      if (summary.id !== id || summary.root !== root) throw new Error("Invalid summary scope.");
      return { id, summary };
    }
    const error = record(item.error);
    return { id, error: { code: string(error.code), message: string(error.message) } };
  });
  if (new Set(changes.map((entry) => entry.id)).size !== changes.length)
    throw new Error("Duplicate change.");
  return { root, planning: decodePlanning(input.planning), changes };
}

export function decodeTaskResponse(value: unknown): Task[] {
  const item = record(value);
  return decodeTasks(item.tasks);
}
