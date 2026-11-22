export type Stage = "planning" | "ready" | "progress" | "complete";

export type Artifact = {
  id: string;
  status: "done" | "skipped" | "ready" | "blocked";
  requires: string[];
  outputPath: string;
};

export type ChangeSummary = {
  id: string;
  goal: string | null;
  affectedAreas: string[];
  artifacts: Artifact[];
  applyRequires: string[];
  completedTasks: number;
  totalTasks: number;
  documents?: { artifactId: string; selector: string; label: string }[];
};

export type DerivedChange = ChangeSummary & {
  stage: Stage;
  completedArtifacts: number;
  totalArtifacts: number;
  pendingCondition: boolean;
};

export function requiredArtifactIds(change: ChangeSummary): Set<string> {
  const byId = new Map(change.artifacts.map((artifact) => [artifact.id, artifact]));
  const required = new Set<string>();
  const visit = (id: string): void => {
    if (required.has(id)) return;
    required.add(id);
    byId.get(id)?.requires.forEach(visit);
  };
  change.applyRequires.forEach(visit);
  return required;
}

export function deriveChange(change: ChangeSummary): DerivedChange {
  const required = requiredArtifactIds(change);
  const applicable = change.artifacts.filter((artifact) => required.has(artifact.id));
  const completedArtifacts = applicable.filter(
    (artifact) => artifact.status === "done" || artifact.status === "skipped",
  ).length;
  const pendingCondition = applicable.some(
    (artifact) => artifact.status !== "done" && artifact.status !== "skipped",
  );
  const stage: Stage = pendingCondition
    ? "planning"
    : change.totalTasks === 0 || change.completedTasks === 0
      ? "ready"
      : change.completedTasks === change.totalTasks
        ? "complete"
        : "progress";

  return {
    ...change,
    stage,
    completedArtifacts,
    totalArtifacts: applicable.length,
    pendingCondition,
  };
}

export function isChangeName(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export type TrackedSource = "saved" | "item" | "worktree" | "none";

export function resolveTrackedChanges({
  saved,
  items,
  worktreeName,
  active,
}: {
  saved: string[] | null;
  items: { id: string; data?: unknown }[];
  worktreeName: string | null;
  active: ReadonlySet<string>;
}): { changes: string[]; source: TrackedSource } {
  if (saved !== null) return { changes: saved.filter((name) => active.has(name)), source: "saved" };
  for (const { data } of items) {
    if (
      data &&
      typeof data === "object" &&
      "kind" in data &&
      data.kind === "change" &&
      "change" in data &&
      typeof data.change === "string" &&
      active.has(data.change)
    )
      return { changes: [data.change], source: "item" };
  }
  const legacy = items.find(({ id, data }) => data === undefined && active.has(id));
  if (legacy) return { changes: [legacy.id], source: "item" };
  if (worktreeName !== null && active.has(worktreeName))
    return { changes: [worktreeName], source: "worktree" };
  return { changes: [], source: "none" };
}

export function taskWindow<T extends { done: boolean }>(tasks: readonly T[], size = 5): T[] {
  const incomplete = tasks.findIndex((task) => !task.done);
  const current = incomplete === -1 ? tasks.length - 1 : incomplete;
  const start = Math.max(0, Math.min(current - Math.floor(size / 2), tasks.length - size));
  return tasks.slice(start, start + size);
}
