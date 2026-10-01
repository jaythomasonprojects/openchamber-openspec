import assert from "node:assert/strict";
import test from "node:test";
import { deriveChange } from "../build/model.mjs";

test("stage derivation keeps empty task sets ready and includes skipped custom dependencies", () => {
  const base = {
    id: "example",
    goal: null,
    artifacts: [
      { id: "proposal", status: "skipped", requires: [], outputPath: "proposal.md" },
      { id: "tasks", status: "done", requires: ["proposal"], outputPath: "tasks.md" },
    ],
    applyRequires: ["tasks"],
  };
  assert.equal(deriveChange({ ...base, completedTasks: 0, totalTasks: 0 }).stage, "ready");
  assert.equal(deriveChange({ ...base, completedTasks: 1, totalTasks: 2 }).stage, "progress");
  assert.equal(deriveChange({ ...base, completedTasks: 2, totalTasks: 2 }).stage, "complete");
  assert.equal(deriveChange({ ...base, completedTasks: 2, totalTasks: 2 }).completedArtifacts, 2);
  assert.equal(
    deriveChange({
      ...base,
      artifacts: [{ ...base.artifacts[0], status: "ready" }, base.artifacts[1]],
      completedTasks: 2,
      totalTasks: 2,
    }).stage,
    "planning",
  );
});
