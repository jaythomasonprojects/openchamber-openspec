import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: ["src/panel/client.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { createClient } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

test("summary decoding preserves area text, order and duplicates and rejects invalid fields", async () => {
  const scope = { directory: "/project", root: "/project" };
  const entry = { id: "change", completedTasks: 1, totalTasks: 2 };
  let affectedAreas = ["auth", " api ", "auth", "<b>literal</b>"];
  const client = createClient({
    serviceRequest: async () => ({
      status: 200,
      body: JSON.stringify({
        root: scope.root,
        changes: [
          {
            id: entry.id,
            summary: {
              id: entry.id,
              root: scope.root,
              goal: "Kept",
              affectedAreas,
              artifacts: [],
              applyRequires: [],
              documents: [],
            },
          },
        ],
      }),
    }),
  });
  const [{ summary }] = await client.summaries(scope, [entry]);
  assert.deepEqual(summary.affectedAreas, affectedAreas);
  assert.equal(summary.goal, "Kept");
  assert.equal(summary.completedTasks, 1);
  for (const invalid of [undefined, null, "auth", {}, [""], [1], ["auth", false]]) {
    affectedAreas = invalid;
    await assert.rejects(client.summaries(scope, [entry]), { code: "BAD_SERVICE_DATA" });
  }
});

test("batch decoding reconciles listing IDs and rejects malformed or mismatched entries", async () => {
  const scope = { directory: "/project", root: "/project" };
  const summary = {
    id: "good",
    root: scope.root,
    goal: null,
    affectedAreas: [],
    artifacts: [],
    applyRequires: [],
    documents: [],
  };
  let value = {
    root: scope.root,
    changes: [
      { id: "good", summary },
      { id: "bad", error: { code: "OPENSPEC_ERROR", message: "Bad schema" } },
      { id: "extra", summary: { ...summary, id: "extra" } },
    ],
  };
  const client = createClient({
    serviceRequest: async () => ({ status: 200, body: JSON.stringify(value) }),
  });
  const entries = ["good", "bad", "missing"].map((id) => ({
    id,
    completedTasks: 2,
    totalTasks: 3,
  }));
  const results = await client.summaries(scope, entries);
  assert.deepEqual(
    results.map((item) => item.id),
    ["good", "bad", "missing"],
  );
  assert.equal(results[0].summary.completedTasks, 2);
  assert.equal(results[1].error.message, "Bad schema");
  assert.equal(results[2].error.code, "CHANGE_UNAVAILABLE");
  for (const changes of [
    null,
    [
      { id: "good", summary },
      { id: "good", summary },
    ],
    [{ id: "good", summary: { ...summary, id: "wrong" } }],
    [{ id: "good", summary: { ...summary, root: "/other" } }],
    [{ id: "bad", error: { code: 1, message: "Bad" } }],
    [{ id: "bad" }],
    [{ id: "good", summary, error: { code: "BAD", message: "Bad" } }],
  ]) {
    value = { root: scope.root, changes };
    await assert.rejects(client.summaries(scope, entries), { code: "BAD_SERVICE_DATA" });
  }
  value = { root: "/other", changes: [] };
  await assert.rejects(client.summaries(scope, entries), { code: "ROOT_CHANGED" });
});
