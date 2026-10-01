import assert from "node:assert/strict";
import test from "node:test";
import { createResources } from "../build/resources.mjs";

const scope = { directory: "/workspace", root: "/workspace/openspec" };
const other = { directory: "/other", root: "/other/openspec" };
function deferred() {
  let resolve;
  const promise = new Promise((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

test("selected reads share pending work and remain loaded until explicit refresh", async () => {
  let calls = 0;
  const waiting = deferred();
  const resources = createResources({
    tasks: () => {
      calls++;
      return waiting.promise;
    },
    document: async () => "",
  });
  resources.setContext(scope);
  const first = resources.tasks(scope, "change");
  assert.equal(first.completion, resources.tasks(scope, "change").completion);
  waiting.resolve([{ id: "1", description: "First", done: false }]);
  await first.completion;
  assert.equal(resources.tasks(scope, "change").completion, null);
  assert.equal(calls, 1);
  resources.refresh();
  await resources.tasks(scope, "change").completion;
  assert.equal(calls, 2);
  resources.dispose();
});

test("old generations, removed changes and disposed reads never restore retained data", async () => {
  const waits = [deferred(), deferred(), deferred(), deferred()];
  let count = 0;
  const resources = createResources({
    tasks: async () => [],
    document: () => waits[count++].promise,
  });
  resources.setContext(scope);
  const first = resources.document(scope, "change", "specs", "first.md");
  resources.refresh();
  waits[0].resolve("Old");
  await first.completion;
  const removed = resources.document(scope, "change", "specs", "first.md");
  assert.equal(removed.state.value, null);
  resources.invalidateChange(scope, "change");
  waits[1].resolve("Removed");
  assert.equal((await removed.completion).value, null);
  const replaced = resources.document(scope, "change", "specs", "first.md");
  resources.setContext(other);
  waits[2].resolve("Replaced");
  assert.equal((await replaced.completion).value, null);
  assert.equal(
    resources.document(scope, "change", "specs", "first.md").state.error.message,
    "OpenSpec context changed.",
  );
  const disposed = resources.document(other, "change", "specs", "first.md");
  resources.dispose();
  waits[3].resolve("Disposed");
  assert.equal((await disposed.completion).value, null);
  assert.equal(resources.document(other, "change", "specs", "first.md").state.value, null);
});

test("capacity errors do not evict loaded observations or truncate results", async () => {
  const resources = createResources(
    { tasks: async () => [], document: async (_scope, _change, _artifact, selector) => selector },
    { maxBytes: 12 },
  );
  resources.setContext(scope);
  await resources.document(scope, "change", "specs", "one").completion;
  const tooBig = await resources.document(scope, "change", "specs", "very-long-name").completion;
  assert.match(tooBig.error.message, /Refresh/);
  assert.equal(tooBig.value, null);
  assert.equal(resources.document(scope, "change", "specs", "one").state.value, "one");
  resources.dispose();
});
