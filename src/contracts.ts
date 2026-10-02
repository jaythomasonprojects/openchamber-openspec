import { isChangeName, type Artifact } from "./model.js";

export type Context = { directory: string; root: string };
export type ListingEntry = { id: string; completedTasks: number; totalTasks: number };
export type Task = {
  id: string;
  description: string;
  done: boolean;
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

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data.");
  return value as Record<string, unknown>;
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

export function decodeListingEntry(value: unknown, key: "name" | "id" = "id"): ListingEntry {
  const item = record(value);
  const id = string(item[key]);
  if (!isChangeName(id)) throw new Error("Invalid change name.");
  const completedTasks = count(item.completedTasks);
  const totalTasks = count(item.totalTasks);
  if (completedTasks > totalTasks) throw new Error("Invalid task count bounds.");
  return { id, completedTasks, totalTasks };
}

export function decodeListing(value: unknown): {
  directory: string;
  root: string;
  changes: ListingEntry[];
} {
  const input = record(value);
  const directory = string(input.directory);
  const root = string(input.root);
  if (!Array.isArray(input.changes)) throw new Error("Invalid listing.");
  const changes = input.changes.map((item) => decodeListingEntry(item));
  if (new Set(changes.map((item) => item.id)).size !== changes.length)
    throw new Error("Duplicate change.");
  return { directory, root, changes };
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

export function decodeSummaries(value: unknown): { root: string; changes: SummaryResult[] } {
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
  return { root, changes };
}

export function decodeTaskResponse(value: unknown): Task[] {
  const item = record(value);
  return decodeTasks(item.tasks);
}
