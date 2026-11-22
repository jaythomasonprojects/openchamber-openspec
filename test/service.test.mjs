import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { request as httpRequest } from "node:http";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { parseManifestJson } from "@openchamber/sdk/schemas";
import { createOpenSpecService, runOpenSpec } from "../service/main.js";
import { fixtureChange, withProjects } from "./helpers/openspec.mjs";

const exec = promisify(execFile);
const tempDirectory = await realpath(tmpdir());

async function mockProject(prefix) {
  const root = await mkdtemp(join(tempDirectory, prefix));
  await mkdir(join(root, "openspec", "changes"), { recursive: true });
  return root;
}

test("shared planning scope rejects link retargets without changing the CLI root", async () => {
  await withProjects(async (main, replacement) => {
    const checkout = await mkdtemp(join(tempDirectory, "openspec-linked-"));
    try {
      await fixtureChange(main, "shared-change", "Shared goal");
      await symlink(join(main, "openspec"), join(checkout, "openspec"));
      await withService(async (url) => {
        const post = async (path, body = {}) => {
          const response = await fetch(`${url}${path}`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: checkout, ...body }),
          });
          return { status: response.status, value: await response.json() };
        };
        const listing = await post("/changes");
        assert.equal(listing.status, 200);
        assert.equal(listing.value.root, checkout);
        assert.equal(typeof listing.value.planning, "string");
        const scope = {
          expectedRoot: listing.value.root,
          expectedPlanning: listing.value.planning,
        };
        assert.equal(
          (await post("/summaries", scope)).value.changes[0].summary.goal,
          "Shared goal",
        );
        await rm(join(checkout, "openspec"));
        await symlink(join(replacement, "openspec"), join(checkout, "openspec"));
        for (const path of ["/summaries", "/tasks", "/document", "/create", "/delete"])
          assert.equal(
            (
              await post(path, {
                ...scope,
                change: "shared-change",
                artifactId: "proposal",
                name: "new-change",
                goal: "Goal",
              })
            ).value.error.code,
            "PLANNING_CHANGED",
          );
        assert.notEqual((await post("/changes")).value.planning, scope.expectedPlanning);
      });
    } finally {
      await rm(checkout, { recursive: true, force: true });
    }
  });
});

test("shared planning task containment rejects escaped custom inputs before instructions runs", async () => {
  await withProjects(async (main, checkout) => {
    const change = "shared-tasks";
    await fixtureChange(main, change, "Bounded tasks");
    await rm(join(checkout, "openspec"), { recursive: true });
    await symlink(join(main, "openspec"), join(checkout, "openspec"));
    const target = join(main, "openspec", "changes", change);
    const schema = join(main, "openspec", "schemas", "custom-input");
    await mkdir(join(schema, "templates"), { recursive: true });
    await writeFile(
      join(schema, "schema.yaml"),
      `name: custom-input
version: 1
artifacts:
  - id: checklist
    generates: custom-checklist.md
    description: Custom tasks
    template: checklist.md
    requires: []
apply:
  requires: [checklist]
  tracks: custom-checklist.md
`,
    );
    await writeFile(join(schema, "templates", "checklist.md"), "# Tasks\n");
    await writeFile(join(target, ".openspec.yaml"), "schema: custom-input\ngoal: Bounded tasks\n");
    await writeFile(join(main, "outside.md"), "- [ ] Must never be read\n");
    await writeFile(
      join(target, "custom-checklist.md"),
      "- [ ] First line only\n      Not part of the description\n",
    );
    const calls = [];
    await withService(
      async (url) => {
        const body = JSON.stringify({ directory: checkout, expectedRoot: checkout, change });
        const safe = await fetch(`${url}/tasks`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body,
        });
        const [{ description, ...task }, ...rest] = (await safe.json()).tasks;
        assert.deepEqual([task, ...rest], [{ id: "1", done: false }]);
        assert.match(description, /^First line only/);
        calls.length = 0;
        await rm(join(target, "custom-checklist.md"));
        await symlink(join(main, "outside.md"), join(target, "custom-checklist.md"));
        const response = await fetch(`${url}/tasks`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: checkout, expectedRoot: checkout, change }),
        });
        assert.equal((await response.json()).error.code, "BAD_DOCUMENT_PATH");
        assert.equal(calls.includes("instructions"), false);
      },
      (cwd, args, remaining) => {
        calls.push(args[0]);
        return runOpenSpec(cwd, args, remaining);
      },
    );
  });
});

test("shared planning reads preserve lexical selectors, goal, multiple specs and CLI task authority", async () => {
  await withProjects(async (main, checkout) => {
    await rm(join(checkout, "openspec"), { recursive: true });
    await symlink(join(main, "openspec"), join(checkout, "openspec"));
    await fixtureChange(main, "shared-documents", "Shared goal");
    const target = join(main, "openspec", "changes", "shared-documents");
    for (const [file, text] of [
      ["proposal.md", "Proposal"],
      ["design.md", "Design"],
      ["specs/one/spec.md", "First spec"],
      ["specs/two/spec.md", "Second spec"],
      ["tasks.md", "- [x] First task\n- [ ] Second task\n      Not in the CLI description\n"],
    ]) {
      await mkdir(join(target, file, ".."), { recursive: true });
      await writeFile(join(target, file), text);
    }
    await withService(async (url) => {
      const post = async (path, body = {}) =>
        (
          await fetch(`${url}${path}`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: checkout, ...body }),
          })
        ).json();
      const listing = await post("/changes");
      assert.deepEqual(listing.changes, [
        { id: "shared-documents", completedTasks: 1, totalTasks: 2 },
      ]);
      const scope = { expectedRoot: listing.root, expectedPlanning: listing.planning };
      const summary = (await post("/summaries", scope)).changes[0].summary;
      assert.equal(summary.goal, "Shared goal");
      assert.equal(summary.documents.filter((doc) => doc.artifactId === "specs").length, 2);
      for (const descriptor of summary.documents) {
        const content = await post("/document", {
          ...scope,
          change: "shared-documents",
          ...descriptor,
        });
        assert.equal(typeof content.content, "string");
        assert.ok(content.content.length);
      }
      const [first, { description, ...second }, ...rest] = (
        await post("/tasks", { ...scope, change: "shared-documents" })
      ).tasks;
      assert.deepEqual(
        [first, second, ...rest],
        [
          { id: "1", description: "First task", done: true },
          { id: "2", done: false },
        ],
      );
      assert.match(description, /^Second task/);
    });
  });
});

test("invalid planning links fail without dispatching mutations", async () => {
  const root = await mockProject("openspec-invalid-link-");
  try {
    await rm(join(root, "openspec"), { recursive: true });
    for (const target of [
      join(root, "missing"),
      join(root, "openspec"),
      join(root, "not-directory"),
    ]) {
      await writeFile(join(root, "not-directory"), "Not planning");
      await symlink(target, join(root, "openspec"));
      const calls = [];
      await withService(
        async (url) => {
          for (const path of ["/create", "/delete"]) {
            const response = await fetch(`${url}${path}`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({
                directory: root,
                expectedRoot: root,
                name: "safe-change",
                change: "safe-change",
                goal: "Goal",
              }),
            });
            assert.equal((await response.json()).error.code, "NO_OPENSPEC_ROOT");
          }
        },
        async (_cwd, args) => {
          calls.push(args[0]);
          return { ok: true, value: { root: { path: root } } };
        },
      );
      assert.deepEqual(calls, ["context", "context"]);
      await rm(join(root, "openspec"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("summary CLI never reads escaped goal metadata", async () => {
  await withProjects(async (root) => {
    await fixtureChange(root, "escaped-goal", "Initial");
    const target = join(root, "openspec", "changes", "escaped-goal", ".openspec.yaml");
    await writeFile(join(root, "outside.yaml"), "goal: Must not be read\n");
    await rm(target);
    await symlink(join(root, "outside.yaml"), target);
    let statusCalls = 0;
    await withService(
      async (url) => {
        const response = await fetch(`${url}/summaries`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, expectedRoot: root }),
        });
        assert.equal((await response.json()).error.code, "BAD_METADATA_PATH");
        assert.equal(statusCalls, 0);
      },
      (cwd, args, remaining) => {
        if (args[0] === "status") statusCalls++;
        return runOpenSpec(cwd, args, remaining);
      },
    );
  });
});

test("shared planning creation pins dispatch and reports retargeted outcomes as unknown", async () => {
  await withProjects(async (main, replacement) => {
    const checkout = await mkdtemp(join(tempDirectory, "openspec-create-link-"));
    try {
      await symlink(join(main, "openspec"), join(checkout, "openspec"));
      let writes = 0;
      await withService(
        async (url) => {
          const listing = await (
            await fetch(`${url}/changes`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({ directory: checkout }),
            })
          ).json();
          const response = await fetch(`${url}/create`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({
              directory: checkout,
              expectedRoot: listing.root,
              expectedPlanning: listing.planning,
              name: "pinned-change",
              goal: "Pinned goal",
            }),
          });
          const value = await response.json();
          assert.equal(value.error.outcome, "unknown");
          assert.equal(writes, 1);
          assert.match(
            await readFile(
              join(main, "openspec", "changes", "pinned-change", ".openspec.yaml"),
              "utf8",
            ),
            /Pinned goal/,
          );
          assert.deepEqual(await readdir(join(replacement, "openspec", "changes")), ["archive"]);
        },
        async (cwd, args, remaining) => {
          if (args[0] === "new") {
            writes++;
            assert.equal(cwd, main, "write must not traverse the mutable checkout link");
            await rm(join(checkout, "openspec"));
            await symlink(join(replacement, "openspec"), join(checkout, "openspec"));
          }
          return runOpenSpec(cwd, args, remaining);
        },
      );
    } finally {
      await rm(checkout, { recursive: true, force: true });
    }
  });
});

test("shared creation rejects a planning link retarget before dispatch", async () => {
  await withProjects(async (main, replacement) => {
    const checkout = await mkdtemp(join(tempDirectory, "openspec-prewrite-link-"));
    try {
      await symlink(join(main, "openspec"), join(checkout, "openspec"));
      let checks = 0;
      let writes = 0;
      await withService(
        async (url) => {
          const response = await fetch(`${url}/create`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({
              directory: checkout,
              expectedRoot: checkout,
              name: "no-dispatch",
              goal: "Never create",
            }),
          });
          assert.equal((await response.json()).error.code, "PLANNING_CHANGED");
          assert.equal(writes, 0);
          for (const directory of [main, replacement])
            assert.deepEqual(await readdir(join(directory, "openspec", "changes")), ["archive"]);
        },
        async (cwd, args, remaining) => {
          if (args[0] === "new") writes++;
          if (args[0] === "context" && ++checks === 3) {
            await rm(join(checkout, "openspec"));
            await symlink(join(replacement, "openspec"), join(checkout, "openspec"));
          }
          return runOpenSpec(cwd, args, remaining);
        },
      );
    } finally {
      await rm(checkout, { recursive: true, force: true });
    }
  });
});

test("shared planning deletion preserves the link and rejects same-path directory replacement", async () => {
  await withProjects(async (main, checkout) => {
    await rm(join(checkout, "openspec"), { recursive: true });
    await symlink(join(main, "openspec"), join(checkout, "openspec"));
    await fixtureChange(main, "shared-delete", "Delete only this");
    const parent = join(main, "openspec", "changes");
    const target = join(parent, "shared-delete");
    await writeFile(join(main, "external.txt"), "Keep me");
    await symlink(join(main, "external.txt"), join(target, "external-link"));
    let contexts = 0;
    let dispatched = 0;
    let replace = true;
    await withService(
      async (url) => {
        const body = { directory: checkout, expectedRoot: checkout, change: "shared-delete" };
        const post = async () => {
          const response = await fetch(`${url}/delete`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify(body),
          });
          return { status: response.status, value: await response.json() };
        };
        const failed = await post();
        assert.equal(failed.value.error.code, "ROOT_CHANGED");
        assert.equal(dispatched, 0);
        assert.ok((await readdir(parent)).includes("saved-original"));
        replace = false;
        assert.equal((await post()).status, 200);
        assert.equal(dispatched, 1);
        assert.equal(await readFile(join(main, "external.txt"), "utf8"), "Keep me");
        assert.ok((await readdir(checkout)).includes("openspec"));
        assert.ok((await readdir(parent)).includes("saved-original"));
      },
      async (cwd, args, remaining) => {
        if (args[0] === "context" && ++contexts === 2 && replace) {
          await rename(target, join(parent, "saved-original"));
          await mkdir(target);
        }
        return runOpenSpec(cwd, args, remaining);
      },
      {
        remove: async (...args) => {
          dispatched++;
          return rm(...args);
        },
      },
    );
  });
});

test("shared deletion rejects replaced planning and active parent directories before removal", async () => {
  for (const component of ["planning", "parent"])
    await withProjects(async (main, checkout) => {
      await fixtureChange(main, "replace-parent", "Keep original and replacement");
      await rm(join(checkout, "openspec"), { recursive: true });
      await symlink(join(main, "openspec"), join(checkout, "openspec"));
      const planning = join(main, "openspec");
      const replaced = component === "planning" ? planning : join(planning, "changes");
      const saved = join(main, `saved-${component}`);
      let checks = 0;
      let removed = 0;
      await withService(
        async (url) => {
          const response = await fetch(`${url}/delete`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({
              directory: checkout,
              expectedRoot: checkout,
              change: "replace-parent",
            }),
          });
          assert.equal(
            (await response.json()).error.code,
            component === "planning" ? "PLANNING_CHANGED" : "ROOT_CHANGED",
          );
          assert.equal(removed, 0);
          assert.ok(
            (await readdir(component === "planning" ? join(saved, "changes") : saved)).includes(
              "replace-parent",
            ),
          );
          assert.ok((await readdir(join(planning, "changes"))).includes("replace-parent"));
        },
        async (cwd, args, remaining) => {
          if (args[0] === "context" && ++checks === 2) {
            await rename(replaced, saved);
            await mkdir(join(planning, "changes", "replace-parent"), { recursive: true });
          }
          return runOpenSpec(cwd, args, remaining);
        },
        {
          remove: async (...args) => {
            removed++;
            return rm(...args);
          },
        },
      );
    });
});

test("rootless failed change reads verify a fresh listing before reporting availability", async () => {
  const root = await mockProject("openspec-rootless-");
  const other = await mkdtemp(join(tempDirectory, "openspec-rootless-other-"));
  try {
    for (const path of ["/tasks", "/document"]) {
      for (const [listedRoot, listed, expected] of [
        [root, false, "CHANGE_UNAVAILABLE"],
        [root, true, "OPENSPEC_ERROR"],
        [other, false, "ROOT_CHANGED"],
        [null, false, "NO_OPENSPEC_ROOT"],
      ]) {
        const calls = [];
        await withService(
          async (url) => {
            const response = await fetch(`${url}${path}`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({
                directory: root,
                expectedRoot: root,
                change: "missing",
                artifactId: "proposal",
              }),
            });
            assert.equal((await response.json()).error.code, expected);
            assert.deepEqual(calls, [path === "/tasks" ? "instructions" : "status", "list"]);
          },
          async (_directory, args) => {
            calls.push(args[0]);
            if (args[0] !== "list")
              return {
                ok: false,
                value: { status: [{ message: "Change not found" }] },
                error: { code: "OPENSPEC_ERROR", message: "Change not found", status: 422 },
              };
            return {
              ok: true,
              value: {
                root: listedRoot ? { path: listedRoot } : null,
                changes: listed ? [{ name: "missing", completedTasks: 0, totalTasks: 0 }] : [],
              },
            };
          },
        );
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(other, { recursive: true, force: true });
  }
});

test("real CLI missing tasks and documents report change unavailable, not missing root", async () => {
  await withProjects(async (root) => {
    await withService(async (url) => {
      for (const path of ["/tasks", "/document"]) {
        const response = await fetch(`${url}${path}`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({
            directory: root,
            expectedRoot: root,
            change: "missing",
            artifactId: "proposal",
          }),
        });
        assert.equal((await response.json()).error.code, "CHANGE_UNAVAILABLE");
      }
    });
  });
});

// Adapt single-change CLI fixtures to the CLI's batch envelope, without extra calls.
const batchRunner = (runner, id) => async (directory, args, remaining) => {
  const result = await runner(directory, args, remaining);
  if (args.includes("--all") && result.ok && !Array.isArray(result.value.changes))
    return {
      ok: true,
      value: { root: result.value.root, changes: [{ ...result.value, changeName: id }] },
    };
  return result;
};
async function summaryResponse(url, options) {
  const response = await fetch(url, options);
  const value = await response.json();
  const entry = value.changes?.[0];
  return {
    status: response.status,
    json: async () => (entry ? (entry.summary ?? { error: entry.error }) : value),
  };
}

test("summaries batch isolates CLI diagnostics, paths and metadata with one invocation", async () => {
  const root = await mockProject("openspec-batch-");
  const other = await mkdtemp(join(tempDirectory, "openspec-escape-"));
  const calls = [];
  const status = (id, extra = {}) => ({
    changeName: id,
    changeRoot: join(root, "openspec", "changes", id),
    artifacts: [],
    applyRequires: [],
    artifactPaths: {},
    ...extra,
  });
  for (const id of ["good", "bad-path", "bad-areas"])
    await mkdir(join(root, "openspec", "changes", id));
  await writeFile(
    join(root, "openspec", "changes", "bad-areas", ".openspec.yaml"),
    "affected_areas: not-an-array\n",
  );
  await writeFile(join(other, "proposal.md"), "Outside");
  let value = {
    root: { path: root },
    changes: [
      status("good"),
      { changeName: "bad-schema", status: [{ message: "Unknown schema" }] },
      status("bad-root", { changeRoot: other }),
      status("bad-path", {
        artifacts: [{ id: "proposal", status: "done", requires: [], outputPath: "proposal.md" }],
        artifactPaths: { proposal: { existingOutputPaths: [join(other, "proposal.md")] } },
      }),
      status("bad-areas"),
    ],
  };
  try {
    await withService(
      async (url) => {
        const post = () =>
          fetch(`${url}/summaries`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: root, expectedRoot: root }),
          });
        const response = await post();
        assert.equal(response.status, 200);
        const batch = await response.json();
        assert.equal(batch.changes[0].summary.id, "good");
        assert.deepEqual(
          batch.changes.slice(1).map((entry) => entry.error.code),
          ["OPENSPEC_ERROR", "BAD_CHANGE_ROOT", "BAD_DOCUMENT_PATH", "BAD_CLI_OUTPUT"],
        );
        assert.equal(batch.changes[1].error.message, "Unknown schema");
        assert.deepEqual(calls, [["status", "--all"]]);
        value = { root: { path: root }, changes: [] };
        assert.deepEqual((await (await post()).json()).changes, []);
        value = { root: { path: other }, changes: [] };
        assert.equal((await (await post()).json()).error.code, "ROOT_CHANGED");
        value = { root: { path: root }, changes: "invalid" };
        assert.equal((await (await post()).json()).error.code, "BAD_CLI_OUTPUT");
        value = undefined;
        assert.equal((await (await post()).json()).error.code, "OPENSPEC_ERROR");
      },
      async (_directory, args) => {
        calls.push(args);
        return {
          ok: false,
          value,
          error: { code: "OPENSPEC_ERROR", message: "Batch contains errors", status: 422 },
        };
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(other, { recursive: true, force: true });
  }
});

test("summaries accepts real CLI exit one while keeping a good change", async () => {
  await withProjects(async (root) => {
    await fixtureChange(root, "good");
    const bad = join(root, "openspec", "changes", "bad");
    await mkdir(bad, { recursive: true });
    await writeFile(join(bad, ".openspec.yaml"), "schema: nonexistent-schema\n");
    await withService(async (url) => {
      const response = await fetch(`${url}/summaries`, {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ directory: root, expectedRoot: root }),
      });
      assert.equal(response.status, 200);
      const batch = await response.json();
      assert.ok(batch.changes.find((entry) => entry.id === "good").summary);
      assert.match(
        batch.changes.find((entry) => entry.id === "bad").error.message,
        /Unknown schema/,
      );
    });
  });
});

test("archived lists only archived changes and their task counts from the real CLI", async () => {
  await withProjects(async (root) => {
    await fixtureChange(root, "active-change", "Not archived");
    for (const [name, tasks] of [
      ["2026-11-20-add-login", "- [x] First\n- [ ] Second\n"],
      ["2026-11-22-fix-cache", "- [x] Done\n"],
    ]) {
      const change = join(root, "openspec", "changes", "archive", name);
      await mkdir(change, { recursive: true });
      await writeFile(join(change, "tasks.md"), tasks);
    }
    await withService(async (url) => {
      const listing = await fetch(`${url}/changes`, {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ directory: root }),
      });
      const { planning } = await listing.json();
      const response = await fetch(`${url}/archived`, {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ directory: root, expectedRoot: root, expectedPlanning: planning }),
      });
      const value = await response.json();
      assert.equal(response.status, 200, JSON.stringify(value));
      assert.deepEqual(
        value.changes.sort((a, b) => a.name.localeCompare(b.name)),
        [
          { name: "2026-11-20-add-login", completedTasks: 1, totalTasks: 2 },
          { name: "2026-11-22-fix-cache", completedTasks: 1, totalTasks: 1 },
        ],
      );
    });
  });
});

test("archived rejects malformed, duplicate and wrong-root CLI listings", async (t) => {
  await withProjects(async (root, other) => {
    const row = { name: "2026-11-22-fix-cache", completedTasks: 1, totalTasks: 1 };
    for (const [label, changes, reportedRoot, status, code] of [
      ["missing list", null, root, 502, "BAD_CLI_OUTPUT"],
      ["invalid counts", [{ ...row, completedTasks: 2 }], root, 502, "BAD_CLI_OUTPUT"],
      ["duplicate names", [row, row], root, 502, "BAD_CLI_OUTPUT"],
      ["wrong root", [row], other, 409, "ROOT_CHANGED"],
    ]) {
      await t.test(label, async () => {
        await withService(
          async (url) => {
            const response = await fetch(`${url}/archived`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({ directory: root, expectedRoot: root }),
            });
            assert.deepEqual(
              [response.status, (await response.json()).error?.code],
              [status, code],
            );
          },
          async (_directory, args) => {
            assert.deepEqual(args, ["list", "--archived"]);
            return {
              ok: true,
              value: { root: { path: reportedRoot, source: "nearest" }, changes },
            };
          },
        );
      });
    }
  });
});

test("specs list and read top-level and nested specs through the real CLI", async () => {
  await withProjects(async (root) => {
    const content = `# Example Specification

## Purpose

Describe behaviour for the disposable project without dropping extra sections.

## Requirements

### Requirement: Example works

The example SHALL work.

#### Scenario: Run the example

- **WHEN** the user starts it
- **THEN** it works

## Additional notes

Keep this section, including Unicode: café.
`;
    for (const id of ["public-api", "team/nested"]) {
      const folder = join(root, "openspec", "specs", id);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, "spec.md"), id === "team/nested" ? content : content + "\n");
    }
    await withService(async (url) => {
      const headers = { authorization: "Bearer test-token" };
      const listing = await fetch(`${url}/changes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ directory: root }),
      });
      const { planning } = await listing.json();
      const scope = { directory: root, expectedRoot: root, expectedPlanning: planning };
      const specs = await fetch(`${url}/specs`, {
        method: "POST",
        headers,
        body: JSON.stringify(scope),
      });
      assert.equal(specs.status, 200);
      assert.deepEqual((await specs.json()).specs, [
        { id: "public-api", requirementCount: 1 },
        { id: "team/nested", requirementCount: 1 },
      ]);
      for (const id of ["public-api", "team/nested"]) {
        const response = await fetch(`${url}/spec`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...scope, spec: id }),
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          id,
          content: id === "team/nested" ? content : content + "\n",
        });
      }
      const missing = await fetch(`${url}/spec`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...scope, spec: "missing" }),
      });
      assert.deepEqual(
        [missing.status, (await missing.json()).error?.code],
        [404, "SPEC_UNAVAILABLE"],
      );
    });
  });
});

test("spec lookup rejects invalid ids, unlisted files and escaped paths", async (t) => {
  const root = await mockProject("openspec-spec-paths-");
  try {
    const specs = join(root, "openspec", "specs");
    await mkdir(join(specs, "unlisted"), { recursive: true });
    await mkdir(join(specs, "escaped"));
    await writeFile(join(specs, "unlisted", "spec.md"), "Not in the listing");
    await writeFile(join(root, "outside.md"), "Not in the specs tree");
    await symlink(join(root, "outside.md"), join(specs, "escaped", "spec.md"));
    for (const [spec, status, code, calls] of [
      ["-flag", 400, "BAD_SPEC", []],
      ["team/../unlisted", 400, "BAD_SPEC", []],
      ["unlisted", 404, "SPEC_UNAVAILABLE", [["list", "--specs"]]],
      ["escaped", 502, "BAD_SPEC_PATH", [["list", "--specs"]]],
    ]) {
      await t.test(spec, async () => {
        const commands = [];
        await withService(
          async (url) => {
            const response = await fetch(`${url}/spec`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({ directory: root, expectedRoot: root, spec }),
            });
            assert.deepEqual(
              [response.status, (await response.json()).error?.code],
              [status, code],
            );
            assert.deepEqual(commands, calls);
          },
          async (_directory, args) => {
            commands.push(args);
            return {
              ok: true,
              value: {
                root: { path: root, source: "nearest" },
                specs: [{ id: "escaped", requirementCount: 1 }],
              },
            };
          },
        );
      });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("both spec routes reject malformed or wrong-root CLI listings", async (t) => {
  const root = await mockProject("openspec-bad-specs-");
  const other = await mockProject("openspec-bad-specs-other-");
  try {
    const row = { id: "top-level", requirementCount: 2 };
    for (const [label, specs, reportedRoot, status, code] of [
      ["missing specs", null, root, 502, "BAD_CLI_OUTPUT"],
      ["invalid count", [{ ...row, requirementCount: -1 }], root, 502, "BAD_CLI_OUTPUT"],
      ["duplicate id", [row, row], root, 502, "BAD_CLI_OUTPUT"],
      ["wrong root", [row], other, 409, "ROOT_CHANGED"],
    ]) {
      await t.test(label, async () => {
        await withService(
          async (url) => {
            for (const path of ["/specs", "/spec"]) {
              const response = await fetch(`${url}${path}`, {
                method: "POST",
                headers: { authorization: "Bearer test-token" },
                body: JSON.stringify({ directory: root, expectedRoot: root, spec: row.id }),
              });
              assert.deepEqual(
                [response.status, (await response.json()).error?.code],
                [status, code],
              );
            }
          },
          async (_directory, args) => {
            assert.deepEqual(args, ["list", "--specs"]);
            return { ok: true, value: { root: { path: reportedRoot, source: "nearest" }, specs } };
          },
        );
      });
    }
  } finally {
    await Promise.all([root, other].map((path) => rm(path, { recursive: true, force: true })));
  }
});

test("summary returns one scoped change from the real CLI", async (t) => {
  await withProjects(async (root, other) => {
    await fixtureChange(root, "first-change", "First goal");
    await fixtureChange(root, "second-change", "Second goal");
    await withService(async (url) => {
      const post = async (path, body = {}) => {
        const response = await fetch(`${url}${path}`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, ...body }),
        });
        return { status: response.status, value: await response.json() };
      };
      const { value: listing } = await post("/changes");
      const scope = {
        expectedRoot: listing.root,
        expectedPlanning: listing.planning,
        change: "second-change",
      };
      await t.test(
        "returns the requested change in the same shape as a batch summary",
        async () => {
          const batch = await post("/summaries", scope);
          const single = await post("/summary", scope);
          assert.equal(single.status, 200);
          assert.equal(single.value.id, "second-change");
          assert.equal(single.value.goal, "Second goal");
          assert.deepEqual(
            single.value,
            batch.value.changes.find((item) => item.id === "second-change").summary,
          );
        },
      );
      await t.test("rejects the wrong root", async () => {
        const result = await post("/summary", {
          ...scope,
          expectedRoot: other,
          expectedPlanning: undefined,
        });
        assert.deepEqual([result.status, result.value.error?.code], [409, "ROOT_CHANGED"]);
      });
      await t.test("rejects stale planning identity", async () => {
        const result = await post("/summary", { ...scope, expectedPlanning: "stale" });
        assert.deepEqual([result.status, result.value.error?.code], [409, "PLANNING_CHANGED"]);
      });
      await t.test("rejects an unknown change", async () => {
        const result = await post("/summary", { ...scope, change: "missing" });
        assert.deepEqual([result.status, result.value.error?.code], [404, "CHANGE_UNAVAILABLE"]);
      });
    });
  });
});

test("validate reports valid and invalid changes from the real CLI", async (t) => {
  await withProjects(async (root, other) => {
    const change = "check-example";
    await fixtureChange(root, change, "Validate the example");
    const directory = join(root, "openspec", "changes", change, "specs", "example");
    await mkdir(directory, { recursive: true });
    const spec = join(directory, "spec.md");
    await writeFile(
      spec,
      "## ADDED Requirements\n\n### Requirement: Example\nThe system SHALL work.\n\n#### Scenario: Example\n- **WHEN** it starts\n- **THEN** it works\n",
    );

    await withService(async (url) => {
      const post = async (path, body) => {
        const response = await fetch(`${url}${path}`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, ...body }),
        });
        return { status: response.status, value: await response.json() };
      };
      const { value: listing } = await post("/changes");
      const { value: otherListing } = await post("/changes", { directory: other });
      const scope = { change, expectedRoot: root, planning: listing.planning };
      await t.test("valid delta", async () => {
        assert.deepEqual(await post("/validate", scope), {
          status: 200,
          value: { valid: true, issues: [] },
        });
      });
      await t.test("nonzero exit with validation issues", async () => {
        await writeFile(spec, "# Malformed delta\n");
        const { status, value } = await post("/validate", scope);
        assert.equal(status, 200);
        assert.equal(value.valid, false);
        assert.ok(value.issues.length > 1);
        const issue = value.issues.find(({ path }) => path === "example/spec.md");
        assert.equal(issue?.level, "ERROR");
        assert.match(issue.message, /No delta sections found/);
      });
      await t.test("wrong root, stale planning identity, and missing change", async () => {
        for (const [overrides, status, code] of [
          [{ expectedRoot: other, planning: otherListing.planning }, 409, "ROOT_CHANGED"],
          [{ planning: "stale" }, 409, "PLANNING_CHANGED"],
          [{ change: "missing" }, 404, "CHANGE_UNAVAILABLE"],
        ]) {
          const result = await post("/validate", { ...scope, ...overrides });
          assert.deepEqual([result.status, result.value.error?.code], [status, code]);
        }
      });
    });
  });
});

test("validate does not report partial results from malformed CLI output", async () => {
  const root = await mockProject("openspec-validate-");
  await mkdir(join(root, "openspec", "changes", "check-example"));
  try {
    await withService(
      async (url) => {
        const headers = { authorization: "Bearer test-token" };
        const listing = await fetch(`${url}/changes`, {
          method: "POST",
          headers,
          body: JSON.stringify({ directory: root }),
        }).then((response) => response.json());
        const response = await fetch(`${url}/validate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            directory: root,
            change: "check-example",
            expectedRoot: root,
            planning: listing.planning,
          }),
        });
        const value = await response.json();
        assert.deepEqual([response.status, value.error?.code], [502, "BAD_CLI_OUTPUT"]);
      },
      async (_directory, [command]) => ({
        ok: true,
        value: {
          root: { path: root, source: "nearest" },
          ...(command === "list"
            ? { changes: [] }
            : command === "validate"
              ? { items: [{ valid: false, issues: [{ level: "ERROR", path: "file" }] }] }
              : {}),
        },
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("focus signals without sharing its target and only a matching directory claims it", async (t) => {
  const emitted = [];
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  await withService(
    async (url) => {
      const first = { directory: "/project", change: "first-change" };
      const second = { directory: "/other-project", change: "second-change" };
      const headers = { authorization: "Bearer test-token" };
      const readFocus = (directory) =>
        fetch(`${url}/focus?${new URLSearchParams({ directory })}`, { headers }).then((response) =>
          response.json(),
        );
      const setFocus = async (body) => {
        const response = await fetch(`${url}/focus`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        assert.equal(response.status, 200);
        await response.json();
      };
      assert.equal(await readFocus(first.directory), null);
      await setFocus(first);
      await setFocus(second);
      assert.deepEqual(emitted, [["focus"], ["focus"]]);
      now += 29_999;
      assert.equal(await readFocus(first.directory), null);
      assert.deepEqual(await readFocus(second.directory), second);
      assert.equal(await readFocus(second.directory), null);
      await setFocus(first);
      now += 30_000;
      assert.equal(await readFocus(first.directory), null);
    },
    undefined,
    { emit: async (...event) => emitted.push(event) },
  );
});

test("slimmer read routes use only their working command and reconcile missing tasks", async () => {
  const root = await mockProject("openspec-slim-");
  const changeRoot = join(root, "openspec", "changes", "slim");
  await mkdir(changeRoot);
  const calls = [];
  let missing = false;
  await writeFile(join(changeRoot, "proposal.md"), "Proposal");
  try {
    await withService(
      async (url) => {
        const post = (path) =>
          fetch(`${url}${path}`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({
              directory: root,
              expectedRoot: root,
              change: "slim",
              artifactId: "proposal",
            }),
          });
        assert.equal((await post("/changes")).status, 200);
        assert.equal((await post("/document")).status, 200);
        assert.equal((await post("/tasks")).status, 200);
        assert.deepEqual(calls, ["list", "status", "instructions"]);
        missing = true;
        const response = await post("/tasks");
        assert.equal((await response.json()).error.code, "CHANGE_UNAVAILABLE");
        assert.deepEqual(calls.slice(-2), ["instructions", "list"]);
      },
      async (_directory, args) => {
        calls.push(args[0]);
        if (missing && args[0] === "instructions")
          return {
            ok: false,
            error: { code: "OPENSPEC_ERROR", message: "Missing change", status: 422 },
            value: { root: { path: root } },
          };
        return {
          ok: true,
          value: {
            root: { path: root },
            changes: [],
            tasks: [],
            changeRoot,
            artifacts: [
              { id: "proposal", status: "done", requires: [], outputPath: "proposal.md" },
            ],
            applyRequires: [],
            artifactPaths: { proposal: { existingOutputPaths: [join(changeRoot, "proposal.md")] } },
          },
        };
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("read root verification rejects missing, null, implicit and changed roots", async () => {
  const root = await mockProject("openspec-read-root-");
  const other = await mkdtemp(join(tempDirectory, "openspec-other-root-"));
  try {
    for (const [reported, code, status] of [
      [undefined, "NO_OPENSPEC_ROOT", 404],
      [null, "NO_OPENSPEC_ROOT", 404],
      [{ path: root, source: "implicit" }, "NO_OPENSPEC_ROOT", 404],
      [{ path: other }, "ROOT_CHANGED", 409],
    ]) {
      await withService(
        async (url) => {
          const response = await fetch(`${url}/changes`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: root, expectedRoot: root }),
          });
          assert.equal(response.status, status);
          assert.equal((await response.json()).error.code, code);
        },
        async (_directory, args) => ({
          ok: true,
          value: { root: args[0] === "context" ? { path: root } : reported, changes: [] },
        }),
      );
    }
    await withService(
      async (url) => {
        const response = await fetch(`${url}/changes`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root }),
        });
        assert.equal(response.status, 404);
        assert.equal((await response.json()).error.code, "NO_OPENSPEC_ROOT");
      },
      async (_directory, args) =>
        args[0] === "context"
          ? { ok: true, value: { root: { path: root } } }
          : {
              ok: false,
              error: { code: "OPENSPEC_ERROR", message: "No root", status: 422 },
              value: { root: null, status: [{ code: "no_openspec_root" }] },
            },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(other, { recursive: true, force: true });
  }
});

async function withService(run, runner, options) {
  const server = createOpenSpecService("test-token", runner, options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("one request deadline stops a sequence of individually short commands", async () => {
  const root = await mockProject("openspec-budget-");
  const calls = [];
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/tasks`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, expectedRoot: root, change: "budget-change" }),
          signal: AbortSignal.timeout(2000),
        });
        assert.equal(response.status, 504);
        assert.equal((await response.json()).error.code, "CLI_TIMEOUT");
        assert.deepEqual(calls, ["instructions", "list"]);
      },
      async (_directory, args) => {
        calls.push(args[0]);
        await new Promise((resolve) => setTimeout(resolve, 45));
        if (args[0] === "instructions")
          return {
            ok: false,
            error: { code: "OPENSPEC_ERROR", message: "Retryable", status: 422 },
            value: { root: { path: root } },
          };
        return {
          ok: true,
          value:
            args[0] === "context"
              ? { root: { path: root } }
              : { root: { path: root }, changeRoot: root, artifacts: [], applyRequires: [] },
        };
      },
      { timeoutMs: 70 },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("request deadline stops an incomplete body before dispatch and keeps health live", async () => {
  let calls = 0;
  await withService(
    async (url) => {
      const started = Date.now();
      await new Promise((resolve, reject) => {
        const request = httpRequest(`${url}/changes`, {
          method: "POST",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        });
        const timeout = setTimeout(() => {
          request.destroy();
          reject(new Error("Incomplete request outlived its budget."));
        }, 1500);
        request.on("response", (response) => {
          response.resume();
          response.on("end", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        request.on("error", () => {
          clearTimeout(timeout);
          resolve();
        });
        request.write('{"directory":');
      });
      assert.ok(Date.now() - started < 1000);
      assert.equal(calls, 0);
      assert.equal(
        (await fetch(`${url}/health`, { headers: { authorization: "Bearer test-token" } })).status,
        200,
      );
      const oversized = await fetch(`${url}/changes`, {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ directory: "x".repeat(65_000) }),
      });
      assert.equal(oversized.status, 413);
      assert.equal((await oversized.json()).error.code, "BODY_TOO_LARGE");
    },
    async () => {
      calls++;
      throw new Error("Incomplete body started the CLI");
    },
    { timeoutMs: 80 },
  );
});

test("body receipt consumes the same budget as later CLI commands", async () => {
  const root = await mkdtemp(join(tempDirectory, "openspec-body-budget-"));
  const calls = [];
  try {
    await withService(
      async (url) => {
        const result = await new Promise((resolve, reject) => {
          const request = httpRequest(`${url}/changes`, {
            method: "POST",
            headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          });
          request.on("error", reject);
          request.on("response", (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () =>
              resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks)) }),
            );
          });
          request.write('{"directory":');
          setTimeout(() => request.end(JSON.stringify(root) + "}"), 50);
        });
        assert.equal(result.status, 504);
        assert.equal(result.body.error.code, "CLI_TIMEOUT");
        assert.deepEqual(calls, ["list"]);
      },
      async (_directory, args, remaining) => {
        calls.push(args[0]);
        assert.ok(remaining < 85, `remaining budget ${remaining} should include body receipt`);
        await new Promise((resolve) => setTimeout(resolve, 55));
        return { ok: true, value: { root: { path: root } } };
      },
      { timeoutMs: 90 },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("encoded JSON exceeding the response limit fails without truncation and keeps health live", async () => {
  const root = await mockProject("openspec-escape-");
  const changeRoot = join(root, "openspec", "changes", "escape-change");
  await mkdir(changeRoot);
  const file = join(changeRoot, "proposal.md");
  await writeFile(file, "\u0001".repeat(60_000));
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/document`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({
            directory: root,
            expectedRoot: root,
            change: "escape-change",
            artifactId: "proposal",
          }),
        });
        assert.equal(response.status, 413);
        assert.equal((await response.json()).error.code, "RESPONSE_TOO_LARGE");
        const health = await fetch(`${url}/health`, {
          headers: { authorization: "Bearer test-token" },
        });
        assert.equal(health.status, 200);
      },
      async (_directory, args) => ({
        ok: true,
        value:
          args[0] === "context"
            ? { root: { path: root } }
            : {
                root: { path: root },
                changeRoot,
                artifacts: [
                  { id: "proposal", status: "done", requires: [], outputPath: "proposal.md" },
                ],
                applyRequires: ["proposal"],
                artifactPaths: { proposal: { existingOutputPaths: [file] } },
              },
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("goal metadata is byte-bounded before YAML parsing while absent and boundary files work", async () => {
  const root = await mockProject("openspec-goal-bound-");
  const changeRoot = join(root, "openspec", "changes", "goal-change");
  const metadataPath = join(changeRoot, ".openspec.yaml");
  await mkdir(changeRoot, { recursive: true });
  const calls = [];
  const runner = async (_directory, args) => (
    calls.push(args[0]),
    {
      ok: true,
      value:
        args[0] === "context"
          ? { root: { path: root } }
          : {
              root: { path: root },
              changeRoot,
              artifacts: [],
              applyRequires: [],
              artifactPaths: {},
            },
    }
  );
  try {
    await withService(
      async (url) => {
        const summary = async (preflight = false) => {
          const before = calls.length;
          const response = await summaryResponse(`${url}/summaries`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: root, expectedRoot: root, change: "goal-change" }),
          });
          assert.deepEqual(calls.slice(before), preflight ? [] : ["status"]);
          return { status: response.status, value: await response.json() };
        };
        assert.deepEqual((await summary()).value.affectedAreas, []);
        assert.deepEqual((await summary()).value.goal, null);
        for (const [areas, expected] of [
          [undefined, []],
          [[], []],
          [
            ["auth", "api", "auth", " <b>literal</b> "],
            ["auth", "api", "auth", " <b>literal</b> "],
          ],
        ]) {
          await writeFile(
            metadataPath,
            JSON.stringify({
              goal: "Kept goal",
              ...(areas === undefined ? {} : { affected_areas: areas }),
            }),
          );
          const result = await summary();
          assert.equal(result.status, 200);
          assert.equal(result.value.goal, "Kept goal");
          assert.deepEqual(result.value.affectedAreas, expected);
        }
        for (const areas of [null, "auth", {}, [""], [1], ["auth", false]]) {
          await writeFile(metadataPath, JSON.stringify({ affected_areas: areas }));
          assert.equal((await summary()).value.error.code, "BAD_CLI_OUTPUT");
        }
        const header = "goal: boundary\n# ";
        await writeFile(metadataPath, header + "x".repeat(240_000 - Buffer.byteLength(header)));
        assert.equal((await summary()).value.goal, "boundary");
        await writeFile(metadataPath, header + "x".repeat(240_001 - Buffer.byteLength(header)));
        const oversized = await summary();
        assert.equal(oversized.status, 200);
        assert.equal(oversized.value.error.code, "METADATA_TOO_LARGE");
        await writeFile(
          metadataPath,
          `${header}é${"x".repeat(240_001 - Buffer.byteLength(header) - 2)}`,
        );
        assert.equal((await summary()).value.error.code, "METADATA_TOO_LARGE");
        await writeFile(metadataPath, "goal: café\n");
        assert.equal((await summary()).value.goal, "café");
        await rm(metadataPath);
        const outside = join(root, "outside.yaml");
        await writeFile(outside, "affected_areas: [unsafe]\n");
        await symlink(outside, metadataPath);
        assert.equal((await summary(true)).value.error.code, "BAD_METADATA_PATH");
        assert.equal(
          (await fetch(`${url}/health`, { headers: { authorization: "Bearer test-token" } }))
            .status,
          200,
        );
      },
      batchRunner(runner, "goal-change"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI bounds stdout and stderr and force-kills a process ignoring termination", async () => {
  const root = await mkdtemp(join(tempDirectory, "openspec-process-"));
  try {
    const script = join(root, "fake-cli");
    for (const [mode, output] of [
      ["stdout", "stdout"],
      ["stderr", "stderr"],
    ]) {
      await writeFile(
        script,
        `#!/usr/bin/env node\nprocess.${output}.write('x'.repeat(300));\nsetInterval(() => {}, 1000);\n`,
      );
      await chmod(script, 0o700);
      const result = await runOpenSpec(root, [], 500, {
        binary: script,
        stdoutBytes: 100,
        stderrBytes: 100,
        graceMs: 30,
      });
      assert.equal(result.ok, false, mode);
      assert.equal(result.error.code, "CLI_OUTPUT_TOO_LARGE", mode);
    }
    await writeFile(
      script,
      `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(join(root, "child.pid"))}, String(process.pid));\nprocess.on('SIGTERM', () => {});\nsetInterval(() => {}, 1000);\n`,
    );
    const timeoutMs = 1_000;
    const started = Date.now();
    const result = await runOpenSpec(root, [], timeoutMs, { binary: script, graceMs: 30 });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "CLI_TIMEOUT");
    assert.ok(Date.now() - started < 2_000);
    const pid = Number(await readFile(join(root, "child.pid"), "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    await writeFile(
      script,
      "#!/usr/bin/env node\nprocess.stdout.write('x'.repeat(300));\nsetInterval(() => {}, 1000);\n",
    );
    await withService(
      async (url) => {
        const response = await fetch(`${url}/changes`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root }),
        });
        assert.equal(response.status, 413);
        assert.equal((await response.json()).error.code, "CLI_OUTPUT_TOO_LARGE");
        const health = await fetch(`${url}/health`, {
          headers: { authorization: "Bearer test-token" },
        });
        assert.equal(health.status, 200);
      },
      (directory, args, remaining) =>
        runOpenSpec(directory, args, remaining, {
          binary: script,
          stdoutBytes: 100,
          graceMs: 30,
        }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scoped routes expose distinct current documents and reject root changes and escapes", async () => {
  const root = await mkdtemp(join(tempDirectory, "openspec-scoped-"));
  const changeRoot = join(root, "openspec", "changes", "two-docs");
  await mkdir(join(changeRoot, "specs"), { recursive: true });
  await writeFile(join(changeRoot, "specs", "first.md"), "First file");
  await writeFile(join(changeRoot, "specs", "second.md"), "Second file");
  await writeFile(join(root, "foreign.md"), "Foreign file");
  await symlink(join(root, "foreign.md"), join(changeRoot, "specs", "escape.md"));
  let paths = [join(changeRoot, "specs", "first.md"), join(changeRoot, "specs", "second.md")];
  const calls = [];
  const runner = async (_directory, args) => {
    calls.push(args[0]);
    return {
      ok: true,
      value:
        args[0] === "context"
          ? { root: { path: root } }
          : args[0] === "list"
            ? {
                root: { path: root },
                changes: [{ name: "two-docs", completedTasks: 0, totalTasks: 0 }],
              }
            : args[0] === "status"
              ? {
                  root: { path: root },
                  changeRoot,
                  artifacts: [
                    { id: "specs", status: "done", outputPath: "specs/**/*.md", requires: [] },
                  ],
                  applyRequires: ["specs"],
                  artifactPaths: { specs: { existingOutputPaths: paths } },
                }
              : args[0] === "instructions"
                ? { root: { path: root }, tasks: [] }
                : { change: "two-docs" },
    };
  };
  const post = (url, path, body) =>
    fetch(`${url}${path}`, {
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: JSON.stringify({ directory: root, expectedRoot: root, ...body }),
    });
  try {
    await withService(
      async (url) => {
        const mismatch = await post(url, "/create", {
          name: "not-written",
          goal: "No write",
          expectedRoot: "/different",
        });
        assert.equal(mismatch.status, 409);
        assert.equal((await mismatch.json()).error.code, "ROOT_CHANGED");
        assert.equal(calls.includes("new"), false);
        const listing = await post(url, "/changes", {});
        assert.equal(listing.status, 200);
        assert.deepEqual(
          (await listing.json()).changes.map((item) => item.id),
          ["two-docs"],
        );
        const summary = await post(url, "/summaries", {});
        assert.equal(summary.status, 200);
        const metadata = (await summary.json()).changes[0].summary;
        assert.equal(metadata.id, "two-docs");
        const documents = metadata.documents;
        assert.deepEqual(
          documents.map((item) => item.label),
          ["specs/first.md", "specs/second.md"],
        );
        for (const [index, expected] of ["First file", "Second file"].entries()) {
          const document = await post(url, "/document", {
            change: "two-docs",
            artifactId: "specs",
            selector: documents[index].selector,
          });
          assert.equal(document.status, 200);
          assert.equal((await document.json()).content, expected);
        }
        paths = paths.toReversed();
        const reordered = await post(url, "/document", {
          change: "two-docs",
          artifactId: "specs",
          selector: documents[0].selector,
        });
        assert.equal((await reordered.json()).content, "First file");
        paths = [paths[0]];
        const removed = await post(url, "/document", {
          change: "two-docs",
          artifactId: "specs",
          selector: documents[0].selector,
        });
        assert.equal(removed.status, 404);
        paths = [join(changeRoot, "specs", "escape.md")];
        const escaped = await post(url, "/document", {
          change: "two-docs",
          artifactId: "specs",
          selector: "specs/escape.md",
        });
        assert.notEqual(escaped.status, 200);
        assert.equal(calls.filter((arg) => arg === "instructions").length, 0);
      },
      batchRunner(runner, "two-docs"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("board metadata stays lightweight and Tasks returns only CLI records", async () => {
  const root = await mkdtemp(join(tempDirectory, "openspec-light-"));
  const changeRoot = join(root, "openspec", "changes", "light-change");
  await mkdir(changeRoot, { recursive: true });
  await writeFile(
    join(changeRoot, "tasks.md"),
    "# Local heading\n- [ ] CLI first line\n  More text",
  );
  const calls = [];
  const runner = async (_directory, args) => {
    calls.push(args[0]);
    return {
      ok: true,
      value:
        args[0] === "context"
          ? { root: { path: root } }
          : args[0] === "list"
            ? {
                root: { path: root },
                changes: [{ name: "light-change", completedTasks: 0, totalTasks: 1 }],
              }
            : args[0] === "status"
              ? {
                  root: { path: root },
                  changeRoot,
                  artifacts: [
                    { id: "tasks", status: "done", outputPath: "tasks.md", requires: [] },
                  ],
                  applyRequires: ["tasks"],
                  artifactPaths: { tasks: { existingOutputPaths: [join(changeRoot, "tasks.md")] } },
                }
              : {
                  root: { path: root },
                  tasks: [{ id: "1", description: "CLI first line", done: false }],
                },
    };
  };
  const post = (url, path, body = {}) =>
    fetch(`${url}${path}`, {
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: JSON.stringify({
        directory: root,
        expectedRoot: root,
        change: "light-change",
        ...body,
      }),
    });
  try {
    await withService(
      async (url) => {
        const listing = await post(url, "/changes");
        assert.equal(listing.status, 200);
        const summary = await post(url, "/summaries");
        assert.equal(summary.status, 200);
        assert.deepEqual(calls, ["list", "status"]);
        assert.equal((await summary.json()).changes[0].summary.documents[0].selector, "tasks.md");
        const tasks = await post(url, "/tasks");
        assert.equal(tasks.status, 200);
        assert.deepEqual((await tasks.json()).tasks, [
          { id: "1", description: "CLI first line", done: false },
        ]);
        assert.deepEqual(calls.slice(-1), ["instructions"]);
      },
      batchRunner(runner, "light-change"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a failed status confirms missing changes before reporting them unavailable", async () => {
  const root = await mockProject("openspec-missing-");
  const calls = [];
  const runner = async (_directory, args) => {
    calls.push(args[0]);
    if (args[0] === "context") return { ok: true, value: { root: { path: root } } };
    if (args[0] === "status")
      return {
        ok: false,
        error: { code: "OPENSPEC_ERROR", message: "Change could not be read.", status: 422 },
      };
    return { ok: true, value: { root: { path: root }, changes: [] } };
  };
  try {
    await withService(async (url) => {
      const response = await fetch(`${url}/document`, {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({
          directory: root,
          expectedRoot: root,
          change: "missing-change",
          artifactId: "proposal",
          selector: "proposal.md",
        }),
      });
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error.code, "CHANGE_UNAVAILABLE");
      assert.deepEqual(calls, ["status", "list"]);
    }, runner);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a failed status stays retryable for a listed change and propagates root replacement", async () => {
  const root = await mockProject("openspec-status-root-");
  const other = await mkdtemp(join(tempDirectory, "openspec-other-root-"));
  let listedRoot = root;
  const runner = async (_directory, args) => {
    if (args[0] === "context") return { ok: true, value: { root: { path: root } } };
    if (args[0] === "status")
      return {
        ok: false,
        error: { code: "OPENSPEC_ERROR", message: "Status temporarily unavailable.", status: 422 },
      };
    return {
      ok: true,
      value: {
        root: { path: listedRoot },
        changes: [{ name: "listed-change", completedTasks: 0, totalTasks: 0 }],
      },
    };
  };
  try {
    await withService(async (url) => {
      const request = () =>
        fetch(`${url}/document`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({
            directory: root,
            expectedRoot: root,
            change: "listed-change",
            artifactId: "proposal",
          }),
        });
      const transient = await request();
      assert.equal(transient.status, 422);
      assert.equal((await transient.json()).error.code, "OPENSPEC_ERROR");
      listedRoot = other;
      const replaced = await request();
      assert.equal(replaced.status, 409);
      assert.equal((await replaced.json()).error.code, "ROOT_CHANGED");
    }, runner);
  } finally {
    await Promise.all(
      [root, other].map((directory) => rm(directory, { recursive: true, force: true })),
    );
  }
});

test("scoped routes read and create changes in a disposable real OpenSpec project", async () => {
  await withProjects(async (directory) => {
    await fixtureChange(directory, "real-change", "Real fixture goal");
    await withService(async (url) => {
      const post = async (path, body) =>
        fetch(`${url}${path}`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, ...body }),
        });
      const listing = await post("/changes", {});
      assert.equal(listing.status, 200);
      const { root, changes } = await listing.json();
      assert.deepEqual(
        changes.map((item) => item.id),
        ["real-change"],
      );
      const summary = await post("/summaries", { expectedRoot: root });
      assert.equal(summary.status, 200);
      const metadata = (await summary.json()).changes.find(
        (entry) => entry.id === "real-change",
      ).summary;
      assert.equal(metadata.goal, "Real fixture goal");
      const documents = metadata.documents;
      const proposal = documents.find((item) => item.artifactId === "proposal");
      assert.ok(proposal);
      const document = await post("/document", {
        expectedRoot: root,
        change: "real-change",
        artifactId: "proposal",
        selector: proposal.selector,
      });
      assert.equal(document.status, 200);
      assert.match((await document.json()).content, /Real fixture goal/);
      const created = await post("/create", {
        expectedRoot: root,
        name: "another-change",
        goal: "Another goal",
      });
      assert.equal(created.status, 200);
      assert.equal((await created.json()).change, "another-change");
    });
  });
});

test("real CLI numeric-prefixed changes remain listed, readable and scoped for writes", async () => {
  await withProjects(async (directory) => {
    await fixtureChange(directory, "100-add-feature", "Numeric change");
    await fixtureChange(directory, "add-feature", "Ordinary change");
    await withService(async (url) => {
      const post = (path, body) =>
        fetch(`${url}${path}`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, ...body }),
        });
      const listing = await post("/changes", {});
      assert.equal(listing.status, 200);
      assert.deepEqual((await listing.json()).changes.map((entry) => entry.id).sort(), [
        "100-add-feature",
        "add-feature",
      ]);
      const summary = await post("/summaries", {});
      assert.equal(summary.status, 200);
      const observed = (await summary.json()).changes.find(
        (entry) => entry.id === "100-add-feature",
      ).summary;
      assert.equal(observed.goal, "Numeric change");
      const proposal = observed.documents.find((document) => document.artifactId === "proposal");
      assert.ok(proposal);
      assert.equal(
        (await post("/document", { change: "100-add-feature", ...proposal })).status,
        200,
      );
      assert.equal((await post("/tasks", { change: "100-add-feature" })).status, 200);
      const created = await post("/create", { name: "00001-next", goal: "Next goal" });
      assert.equal(created.status, 200);
      assert.equal((await created.json()).change, "00001-next");
      const deleted = await post("/delete", { change: "100-add-feature" });
      assert.equal(deleted.status, 200);
      assert.equal((await deleted.json()).change, "100-add-feature");
      for (const name of ["../other", "a/b", "a--b", "Upper", "a b"]) {
        assert.equal((await post("/create", { name, goal: "Invalid" })).status, 400, name);
        assert.equal((await post("/delete", { change: name })).status, 400, name);
      }
      assert.equal(
        (await readdir(join(directory, "openspec", "changes"))).includes("add-feature"),
        true,
      );
    });
  });
});

test("delete removes only a listed active change after checking its original root", async () => {
  await withProjects(async (directory) => {
    await fixtureChange(directory, "remove-me", "Remove this change");
    await fixtureChange(directory, "keep-me", "Keep this change");
    const root = directory;
    const target = join(root, "openspec", "changes", "remove-me");
    const external = join(directory, "external.txt");
    await writeFile(external, "outside");
    await symlink(external, join(target, "linked.txt"));
    await withService(async (url) => {
      const post = async (change, expectedRoot = root) =>
        fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot, change }),
        });
      assert.equal(
        (
          await fetch(`${url}/delete`, {
            method: "POST",
            body: JSON.stringify({ directory, expectedRoot: root, change: "remove-me" }),
          })
        ).status,
        401,
      );
      assert.equal(
        (await readFile(join(target, "proposal.md"), "utf8")).includes("Remove this change"),
        true,
      );
      assert.equal((await post("Invalid Name")).status, 400);
      assert.equal((await post("remove-me", "/not-the-root")).status, 409);
      assert.equal((await post("archive")).status, 404);
      const response = await post("remove-me");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { root, change: "remove-me" });
      assert.equal((await post("remove-me")).status, 404);
      assert.equal(await readFile(external, "utf8"), "outside");
      assert.equal(
        (
          await readFile(join(root, "openspec", "changes", "keep-me", "proposal.md"), "utf8")
        ).includes("Keep this change"),
        true,
      );
      assert.equal((await readdir(join(root, "openspec", "changes"))).includes("remove-me"), false);
    });
  });
});

test("delete rejects symlinked parent and target even when CLI lists the change", async () => {
  const directory = await mkdtemp(join(tempDirectory, "openspec-delete-links-"));
  const external = await mkdtemp(join(tempDirectory, "openspec-delete-external-"));
  const parent = join(directory, "openspec", "changes");
  const target = join(parent, "unsafe-change");
  const runner = async (_cwd, args) => ({
    ok: true,
    value:
      args[0] === "context"
        ? { root: { path: directory } }
        : args[0] === "list"
          ? {
              root: { path: directory },
              changes: [{ name: "unsafe-change", completedTasks: 0, totalTasks: 0 }],
            }
          : { root: { path: directory }, planningHome: { changesDir: parent }, changeRoot: target },
  });
  try {
    await mkdir(parent, { recursive: true });
    await writeFile(join(external, "sentinel"), "untouched");
    await symlink(external, target);
    await withService(async (url) => {
      const post = () =>
        fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, change: "unsafe-change" }),
        });
      assert.equal((await post()).status, 409);
      await rm(target);
      await rm(parent, { recursive: true });
      await symlink(external, parent);
      assert.equal((await post()).status, 409);
      assert.equal(await readFile(join(external, "sentinel"), "utf8"), "untouched");
    }, runner);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(external, { recursive: true, force: true });
  }
});

test("delete refuses a directory whose OpenSpec root changes after status", async () => {
  const directory = await mkdtemp(join(tempDirectory, "openspec-delete-root-race-"));
  const target = join(directory, "openspec", "changes", "unsafe-change");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "sentinel"), "still here");
  let contexts = 0;
  let removals = 0;
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, change: "unsafe-change" }),
        });
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error.outcome, undefined);
        assert.equal(removals, 0);
        assert.equal(await readFile(join(target, "sentinel"), "utf8"), "still here");
      },
      async (_cwd, args) => ({
        ok: true,
        value:
          args[0] === "context"
            ? { root: { path: ++contexts === 1 ? directory : "/tmp/opencode" } }
            : args[0] === "list"
              ? { changes: [{ name: "unsafe-change", completedTasks: 0, totalTasks: 0 }] }
              : {
                  planningHome: { changesDir: join(directory, "openspec", "changes") },
                  changeRoot: target,
                },
      }),
      {
        remove: async () => {
          removals++;
        },
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("delete refuses a changes parent replaced during the final context check", async () => {
  const directory = await mkdtemp(join(tempDirectory, "openspec-delete-parent-race-"));
  const outside = await mkdtemp(join(tempDirectory, "openspec-delete-parent-outside-"));
  const parent = join(directory, "openspec", "changes");
  const target = join(parent, "unsafe-change");
  const sentinel = join(outside, "unsafe-change", "sentinel");
  let contexts = 0;
  let removals = 0;
  try {
    await mkdir(target, { recursive: true });
    await mkdir(join(outside, "unsafe-change"));
    await writeFile(sentinel, "outside stays intact");
    await withService(
      async (url) => {
        const response = await fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, change: "unsafe-change" }),
        });
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error.outcome, undefined);
        assert.equal(removals, 0);
        assert.equal(await readFile(sentinel, "utf8"), "outside stays intact");
        assert.equal(contexts, 2);
      },
      async (_cwd, args) => {
        if (args[0] === "context" && ++contexts === 2) {
          await rename(parent, `${parent}-original`);
          await symlink(outside, parent);
        }
        return {
          ok: true,
          value:
            args[0] === "context"
              ? { root: { path: directory } }
              : args[0] === "list"
                ? { changes: [{ name: "unsafe-change", completedTasks: 0, totalTasks: 0 }] }
                : { planningHome: { changesDir: parent }, changeRoot: target },
        };
      },
      {
        remove: async (path, options) => {
          removals++;
          await rm(path, options);
        },
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("delete timeout after filesystem dispatch is unknown and does not retry", async () => {
  const directory = await mkdtemp(join(tempDirectory, "openspec-delete-timeout-"));
  const target = join(directory, "openspec", "changes", "slow-change");
  await mkdir(target, { recursive: true });
  let removals = 0;
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, change: "slow-change" }),
        });
        assert.equal(response.status, 504);
        assert.equal((await response.json()).error.outcome, "unknown");
        assert.equal(removals, 1);
      },
      async (_cwd, args) => ({
        ok: true,
        value:
          args[0] === "context"
            ? { root: { path: directory } }
            : args[0] === "list"
              ? { changes: [{ name: "slow-change", completedTasks: 0, totalTasks: 0 }] }
              : {
                  planningHome: { changesDir: join(directory, "openspec", "changes") },
                  changeRoot: target,
                },
      }),
      {
        timeoutMs: 80,
        remove: async (path, options) => {
          removals++;
          await new Promise((resolve) => setTimeout(resolve, 120));
          await rm(path, options);
        },
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("filesystem failure after deletion dispatch reports an unknown outcome", async () => {
  const directory = await mkdtemp(join(tempDirectory, "openspec-delete-failure-"));
  const target = join(directory, "openspec", "changes", "failed-change");
  await mkdir(target, { recursive: true });
  let removals = 0;
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/delete`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory, expectedRoot: directory, change: "failed-change" }),
        });
        assert.equal(response.status, 500);
        assert.equal((await response.json()).error.outcome, "unknown");
        assert.equal(removals, 1);
        assert.equal(
          (await readdir(join(directory, "openspec", "changes"))).includes("failed-change"),
          true,
        );
      },
      async (_cwd, args) => ({
        ok: true,
        value:
          args[0] === "context"
            ? { root: { path: directory } }
            : args[0] === "list"
              ? { changes: [{ name: "failed-change", completedTasks: 0, totalTasks: 0 }] }
              : {
                  planningHome: { changesDir: join(directory, "openspec", "changes") },
                  changeRoot: target,
                },
      }),
      {
        remove: async () => {
          removals++;
          throw Object.assign(new Error("permission denied"), { code: "EACCES" });
        },
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("creation stays in the validated root after a selected-directory alias moves", async () => {
  await withProjects(async (first, second) => {
    const alias = join(first, "selected-alias");
    await symlink(first, alias);
    let writes = 0;
    await withService(
      async (url) => {
        const post = (expectedRoot) =>
          fetch(`${url}/create`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({
              directory: alias,
              expectedRoot,
              name: "bound-change",
              goal: "Remain in the first root",
            }),
          });
        const rejected = await post(second);
        assert.equal(rejected.status, 409);
        assert.equal(writes, 0);
        const response = await post(first);
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error.outcome, "unknown");
        assert.equal(writes, 1);
        assert.equal(
          (
            await readFile(
              join(first, "openspec", "changes", "bound-change", ".openspec.yaml"),
              "utf8",
            )
          ).includes("Remain in the first root"),
          true,
        );
        assert.equal(
          (await readdir(join(second, "openspec", "changes"))).includes("bound-change"),
          false,
        );
      },
      async (cwd, args, remaining) => {
        if (args[0] === "new") {
          writes++;
          await rm(alias);
          await symlink(second, alias);
        }
        return runOpenSpec(cwd, args, remaining);
      },
    );
  });
});

test("workflow detection follows the global OpenSpec profile without a planning root", async () => {
  const base = await mkdtemp(join(tempDirectory, "openspec-workflows-"));
  const env = { ...process.env, XDG_CONFIG_HOME: join(base, "config") };
  try {
    await withService(
      async (url) => {
        for (const [args, workflows] of [
          [null, ["propose", "explore", "apply", "update", "sync", "archive"]],
          [
            ["set", "workflows", '["ff","verify","archive"]'],
            ["propose", "explore", "apply", "update", "sync", "archive"],
          ],
          [
            ["set", "profile", "custom"],
            ["ff", "verify", "sync", "archive"],
          ],
        ]) {
          if (args) await exec("openspec", ["config", ...args], { cwd: base, env });
          const response = await fetch(`${url}/workflows`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: base }),
          });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), { workflows });
        }
      },
      async (cwd, args) => {
        assert.equal(cwd, base);
        assert.deepEqual(args, ["config", "list"]);
        const { stdout } = await exec("openspec", [...args, "--json"], { cwd, env });
        return { ok: true, value: JSON.parse(stdout) };
      },
    );
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

for (const [label, cli, error] of [
  [
    "CLI failure",
    { ok: false, error: { code: "OPENSPEC_ERROR", message: "Unknown command", status: 422 } },
    "OPENSPEC_ERROR",
  ],
  ["missing profile", { ok: true, value: {} }, "BAD_CLI_OUTPUT"],
  ["malformed profile", { ok: true, value: { profile: 2 } }, "BAD_CLI_OUTPUT"],
  [
    "malformed workflow list",
    { ok: true, value: { profile: "custom", workflows: "archive" } },
    "BAD_CLI_OUTPUT",
  ],
  [
    "malformed workflow entry",
    { ok: true, value: { profile: "core", workflows: ["apply", 2] } },
    "BAD_CLI_OUTPUT",
  ],
  [
    "unknown workflow",
    { ok: true, value: { profile: "custom", workflows: ["future", "ff"] } },
    null,
  ],
]) {
  test(`workflow detection handles ${label}`, async () => {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/workflows`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: tempDirectory }),
        });
        const value = await response.json();
        if (error) {
          assert.equal(response.status, cli.ok ? 502 : 422);
          assert.equal(value.error.code, error);
          if (!cli.ok) assert.deepEqual(value.error, cli.error);
        } else {
          assert.equal(response.status, 200);
          assert.deepEqual(value, { workflows: ["ff"] });
        }
      },
      async () => cli,
    );
  });
}

test("creation stays in the validated registered store when its pointer changes", async () => {
  const base = await mkdtemp(join(tempDirectory, "openspec-create-store-race-"));
  const env = {
    ...process.env,
    XDG_DATA_HOME: join(base, "data"),
    XDG_CONFIG_HOME: join(base, "config"),
  };
  const first = join(base, "first-store");
  const second = join(base, "second-store");
  const project = join(base, "checkout");
  const config = join(project, "openspec", "config.yaml");
  const cli = (cwd, args) => exec("openspec", args, { cwd, env, timeout: 30_000 });
  try {
    await mkdir(join(project, "openspec"), { recursive: true });
    await cli(base, ["store", "setup", "first-store", "--path", first, "--no-init-git", "--json"]);
    await cli(base, [
      "store",
      "setup",
      "second-store",
      "--path",
      second,
      "--no-init-git",
      "--json",
    ]);
    await writeFile(config, "store: first-store\n");
    let writes = 0;
    await withService(
      async (url) => {
        const response = await fetch(`${url}/create`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({
            directory: project,
            expectedRoot: first,
            name: "bound-change",
            goal: "Stay in the first store",
          }),
        });
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error.outcome, "unknown");
        assert.equal(writes, 1);
        assert.equal(
          (await readdir(join(first, "openspec", "changes"))).includes("bound-change"),
          true,
        );
        assert.equal(
          (await readdir(join(second, "openspec", "changes"))).includes("bound-change"),
          false,
        );
      },
      async (cwd, args) => {
        if (args[0] === "new") {
          writes++;
          await writeFile(config, "store: second-store\n");
        }
        const { stdout } = await cli(cwd, [...args, "--json"]);
        return { ok: true, value: JSON.parse(stdout) };
      },
    );
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("creation distinguishes local rejection from outcomes after dispatch", async () => {
  const root = await mockProject("openspec-outcome-");
  try {
    for (const outcome of ["transport", "malformed", "unexpected"]) {
      const calls = [];
      await withService(
        async (url) => {
          const post = async (name) =>
            fetch(`${url}/create`, {
              method: "POST",
              headers: { authorization: "Bearer test-token" },
              body: JSON.stringify({
                directory: root,
                expectedRoot: root,
                name,
                goal: "Keep this goal",
              }),
            });
          const rejected = await post("Invalid Name");
          assert.equal(rejected.status, 400);
          assert.equal((await rejected.json()).error.outcome, undefined);
          const response = await post("valid-name");
          assert.notEqual(response.status, 200, outcome);
          assert.equal((await response.json()).error.outcome, "unknown", outcome);
          assert.deepEqual(calls, ["context", "context", "context", "new"], outcome);
        },
        async (_directory, args) => {
          calls.push(args[0]);
          if (args[0] === "context") return { ok: true, value: { root: { path: root } } };
          if (outcome === "transport")
            return {
              ok: false,
              error: { code: "CLI_UNAVAILABLE", message: "Disconnected", status: 503 },
            };
          if (outcome === "unexpected") throw new Error("Lost response");
          return { ok: true, value: { change: { id: "wrong-name" }, root: { path: root } } };
        },
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("creation timeout after dispatch has an unknown outcome and never retries", async () => {
  const root = await mockProject("openspec-slow-write-");
  let writes = 0;
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/create`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({
            directory: root,
            expectedRoot: root,
            name: "slow-change",
            goal: "Slow goal",
          }),
        });
        assert.equal(response.status, 504);
        assert.equal((await response.json()).error.outcome, "unknown");
        assert.equal(writes, 1);
      },
      async (_directory, args) => {
        if (args[0] === "context") return { ok: true, value: { root: { path: root } } };
        writes++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { ok: true, value: { change: { id: "slow-change" } } };
      },
      { timeoutMs: 30 },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a disappeared document returns a structured error and leaves health available", async () => {
  const root = await mockProject("openspec-race-");
  const changeRoot = join(root, "openspec", "changes", "race-change");
  await mkdir(changeRoot);
  const runner = async (_directory, args) => {
    if (args[0] === "context") return { ok: true, value: { root: { path: root } } };
    if (args[0] === "status")
      return {
        ok: true,
        value: {
          root: { path: root },
          changeRoot,
          artifacts: [{ id: "proposal", status: "done", requires: [], outputPath: "proposal.md" }],
          applyRequires: ["proposal"],
          artifactPaths: { proposal: { existingOutputPaths: [join(root, "gone.md")] } },
        },
      };
    return { ok: true, value: {} };
  };
  try {
    await withService(async (url) => {
      const response = await fetch(`${url}/document`, {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({
          directory: root,
          expectedRoot: root,
          change: "race-change",
          artifactId: "proposal",
        }),
        signal: AbortSignal.timeout(2000),
      });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, "DOCUMENT_UNAVAILABLE");
      const health = await fetch(`${url}/health`, {
        headers: { authorization: "Bearer test-token" },
      });
      assert.equal(health.status, 200);
    }, runner);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("malformed listing entries and count bounds fail explicitly", async () => {
  const root = await mkdtemp(join(tempDirectory, "openspec-invalid-"));
  try {
    for (const changes of [
      [{ name: 123, completedTasks: 0, totalTasks: 0 }],
      [{ name: "invalid-count", completedTasks: 2, totalTasks: 1 }],
    ]) {
      await withService(
        async (url) => {
          const response = await fetch(`${url}/changes`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: root }),
          });
          assert.equal(response.status, 502);
          assert.equal((await response.json()).error.code, "BAD_CLI_OUTPUT");
        },
        async (_directory, args) => ({
          ok: true,
          value: { root: { path: root }, changes },
        }),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid status dependencies fail a change read, while skipped custom artifacts retain closure", async () => {
  const root = await mockProject("openspec-status-");
  const changeRoot = join(root, "openspec", "changes", "custom-change");
  await mkdir(changeRoot);
  const base = {
    root: { path: root },
    changeRoot,
    applyRequires: ["custom"],
    artifacts: [
      { id: "proposal", status: "skipped", outputPath: "proposal.md", requires: [] },
      { id: "custom", status: "done", outputPath: "custom.md", requires: ["proposal"] },
    ],
    artifactPaths: {},
  };
  try {
    for (const status of [
      { ...base, applyRequires: ["missing"] },
      { ...base, artifacts: [{ ...base.artifacts[1], requires: ["missing"] }] },
      { ...base, artifacts: [{ ...base.artifacts[0], status: "unsupported" }, base.artifacts[1]] },
    ]) {
      await withService(
        async (url) => {
          const response = await summaryResponse(`${url}/summaries`, {
            method: "POST",
            headers: { authorization: "Bearer test-token" },
            body: JSON.stringify({ directory: root, expectedRoot: root, change: "custom-change" }),
          });
          assert.equal(response.status, 200);
          assert.equal((await response.json()).error.code, "BAD_CLI_OUTPUT");
        },
        batchRunner(
          async (_directory, args) => ({
            ok: true,
            value: args[0] === "context" ? { root: { path: root } } : status,
          }),
          "custom-change",
        ),
      );
    }
    await withService(
      async (url) => {
        const response = await summaryResponse(`${url}/summaries`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, expectedRoot: root, change: "custom-change" }),
        });
        assert.equal(response.status, 200);
        const summary = await response.json();
        assert.equal(summary.goal, null);
        assert.deepEqual(summary.applyRequires, ["custom"]);
      },
      batchRunner(
        async (_directory, args) => ({
          ok: true,
          value:
            args[0] === "context"
              ? { root: { path: root } }
              : args[0] === "list"
                ? { changes: [{ name: "custom-change", completedTasks: 0, totalTasks: 0 }] }
                : base,
        }),
        "custom-change",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("malformed detail tasks fail instead of fabricating partial detail", async () => {
  const root = await mockProject("openspec-detail-");
  try {
    await withService(
      async (url) => {
        const response = await fetch(`${url}/tasks`, {
          method: "POST",
          headers: { authorization: "Bearer test-token" },
          body: JSON.stringify({ directory: root, expectedRoot: root, change: "detail-change" }),
        });
        assert.equal(response.status, 502);
        assert.equal((await response.json()).error.code, "BAD_CLI_OUTPUT");
      },
      async (_directory, args) => ({
        ok: true,
        value:
          args[0] === "context"
            ? { root: { path: root } }
            : args[0] === "status"
              ? {
                  root: { path: root },
                  changeRoot: root,
                  artifacts: [],
                  applyRequires: [],
                  artifactPaths: {},
                }
              : {
                  root: { path: root },
                  tasks: [{ id: "1", description: "Invalid done", done: "yes" }],
                },
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("service rejects unauthenticated requests", async () => {
  await withService(async (url) => {
    const response = await fetch(`${url}/health`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHORIZED");
  });
});

test("service refuses invalid change creation without writing", async () => {
  await withProjects(async (directory) => {
    const changesPath = join(directory, "openspec", "changes");
    const before = await readdir(changesPath);
    await withService(async (url) => {
      const response = await fetch(`${url}/create`, {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({
          directory,
          expectedRoot: join(directory, "openspec"),
          name: "Bad Name",
          goal: "No write",
        }),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, "BAD_CHANGE");
    });
    assert.deepEqual(await readdir(changesPath), before);
  });
});

test("service reads only the selected OpenSpec project", async () => {
  await withProjects(async (first, second) => {
    await fixtureChange(first, "first-change", "First project goal");
    await fixtureChange(second, "second-change", "Second project goal");
    await withService(async (url) => {
      for (const [directory, expected, excluded] of [
        [first, "first-change", "second-change"],
        [second, "second-change", "first-change"],
      ]) {
        const response = await fetch(`${url}/changes`, {
          method: "POST",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          body: JSON.stringify({ directory }),
        });
        assert.equal(response.status, 200);
        const board = await response.json();
        assert.equal(board.directory, directory);
        assert.deepEqual(
          board.changes.map((change) => change.id),
          [expected],
        );
        assert.equal(
          board.changes.some((change) => change.id === excluded),
          false,
        );
      }
    });
  });
});

test("service rejects a relative project directory", async () => {
  await withService(async (url) => {
    const response = await fetch(`${url}/changes`, {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json" },
      body: JSON.stringify({ directory: "." }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "BAD_DIRECTORY");
  });
});

test("service reads a document only from the selected change", async () => {
  await withProjects(async (first, second) => {
    await fixtureChange(first, "first-document", "First document goal");
    await fixtureChange(second, "other-document", "Other document goal");
    await withService(async (url) => {
      const response = await fetch(`${url}/document`, {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({
          directory: first,
          expectedRoot: first,
          change: "first-document",
          artifactId: "proposal",
        }),
      });
      assert.equal(response.status, 200);
      assert.match((await response.json()).content, /^# Proposal/m);
      const foreign = await fetch(`${url}/document`, {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({
          directory: second,
          expectedRoot: second,
          change: "first-document",
          artifactId: "proposal",
        }),
      });
      assert.notEqual(foreign.status, 200);
    });
  });
});

test("manifest declares the host-managed OpenSpec service", async () => {
  const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const parsed = parseManifestJson(manifest);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.manifest.engines?.openchamber, ">=2.7.1");
});
