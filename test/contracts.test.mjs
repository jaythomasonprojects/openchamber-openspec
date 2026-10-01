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
        id: entry.id,
        root: scope.root,
        goal: "Kept",
        affectedAreas,
        artifacts: [],
        applyRequires: [],
        documents: [],
      }),
    }),
  });
  const summary = await client.summary(scope, entry);
  assert.deepEqual(summary.affectedAreas, affectedAreas);
  assert.equal(summary.goal, "Kept");
  assert.equal(summary.completedTasks, 1);
  for (const invalid of [undefined, null, "auth", {}, [""], [1], ["auth", false]]) {
    affectedAreas = invalid;
    await assert.rejects(client.summary(scope, entry), { code: "BAD_SERVICE_DATA" });
  }
});
