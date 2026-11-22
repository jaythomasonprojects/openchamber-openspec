import assert from "node:assert/strict";
import test from "node:test";
import { deriveChange, resolveTrackedChanges, taskWindow } from "../build/model.mjs";

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

test("tracked change resolution retains active saved changes in saved order", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: ["second-change", "archived-change", "first-change"],
      items: [{ id: "session-change", data: { kind: "change", change: "item-change" } }],
      worktreeName: "tree-change",
      active: new Set(["first-change", "item-change", "tree-change", "second-change"]),
    }),
    { changes: ["second-change", "first-change"], source: "saved" },
  );
});

test("tracked change resolution does not derive a change from an effectively empty saved list", () => {
  for (const saved of [[], ["archived-change"]]) {
    assert.deepEqual(
      resolveTrackedChanges({
        saved,
        items: [{ id: "tree-change" }],
        worktreeName: "tree-change",
        active: new Set(["tree-change"]),
      }),
      { changes: [], source: "saved" },
    );
  }
});

test("tracked change resolution takes the first active typed item before legacy items", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: null,
      items: [
        { id: "legacy-change" },
        { id: "other-change", data: { kind: "change", change: "inactive-change" } },
        { id: "session-change", data: { kind: "change", change: "item-change" } },
        { id: "another-session-change", data: { kind: "change", change: "other-change" } },
      ],
      worktreeName: null,
      active: new Set(["legacy-change", "item-change", "other-change"]),
    }),
    { changes: ["item-change"], source: "item" },
  );
});

test("tracked change resolution uses an active legacy item ID before the worktree name", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: null,
      items: [{ id: "inactive-item" }, { id: "legacy-change" }],
      worktreeName: "tree-change",
      active: new Set(["legacy-change", "tree-change"]),
    }),
    { changes: ["legacy-change"], source: "item" },
  );
});

test("tracked change resolution never uses an archive-all item even if its ID is active", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: null,
      items: [{ id: "archive-all", data: { kind: "archive-all" } }],
      worktreeName: null,
      active: new Set(["archive-all"]),
    }),
    { changes: [], source: "none" },
  );
});

test("tracked change resolution uses an active worktree name", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: null,
      items: [],
      worktreeName: "tree-change",
      active: new Set(["tree-change"]),
    }),
    { changes: ["tree-change"], source: "worktree" },
  );
});

test("tracked change resolution returns no change when no candidate matches the listing", () => {
  assert.deepEqual(
    resolveTrackedChanges({
      saved: null,
      items: [{ id: "inactive-item" }],
      worktreeName: "inactive-worktree",
      active: new Set(["unrelated-change"]),
    }),
    { changes: [], source: "none" },
  );
});

test("task window centres the first incomplete task and clamps at either end", () => {
  for (const [done, expected, short] of [
    [4, [3, 4, 5, 6, 7], [4, 5, 6]],
    [0, [1, 2, 3, 4, 5], [1, 2, 3]],
    [8, [6, 7, 8, 9, 10], [8, 9, 10]],
  ]) {
    const tasks = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, done: index < done }));
    assert.deepEqual(
      taskWindow(tasks).map(({ id }) => id),
      expected,
    );
    assert.deepEqual(
      taskWindow(tasks, 3).map(({ id }) => id),
      short,
    );
  }
});

test("task window shows all short lists and the last five tasks when complete", () => {
  const tasks = Array.from({ length: 10 }, (_, id) => ({ id, done: true }));
  assert.deepEqual(taskWindow(tasks), tasks.slice(-5));
  assert.deepEqual(taskWindow(tasks.slice(0, 3)), tasks.slice(0, 3));
  assert.deepEqual(taskWindow([]), []);
});
