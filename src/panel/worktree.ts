import type { HostClient } from "@openchamber/sdk";

async function ready<T extends { state: "loading" | "ready" | "error" }>(
  read: () => Promise<T>,
  subscribe: (listener: (value: T) => void) => Promise<() => void>,
): Promise<T> {
  const initial = await read();
  if (initial.state === "ready") return initial;
  if (initial.state === "error")
    throw new Error(
      "Host workspace inspection failed. Inspect worktrees and sessions before trying again.",
    );
  let off: (() => void) | undefined;
  let settled = false;
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        settled = true;
        reject(new Error("Host workspace inspection timed out. No creation was requested."));
      }, 20_000);
      void subscribe((value) => {
        if (value.state === "loading") return;
        settled = true;
        if (value.state === "ready") resolve(value);
        else reject(new Error("Host workspace inspection failed."));
      }).then((unsubscribe) => {
        off = unsubscribe;
        if (settled) off();
      }, reject);
    });
  } finally {
    settled = true;
    clearTimeout(timer!);
    off?.();
  }
}

export async function inspectWorktreeDestination(
  host: HostClient,
  directory: string,
  name: string,
) {
  const projects = await ready(
    () => host.listProjects(),
    (listener) => host.onProjects(listener),
  );
  const owners = projects.projects.filter((project) => project.directory === directory);
  if (!owners.length) {
    const mappings = await Promise.all(
      projects.projects.map(async (project) => ({
        project,
        trees: await ready(
          () => host.listWorktrees(project.id),
          (listener) => host.onWorktrees(project.id, listener),
        ),
      })),
    );
    owners.push(
      ...mappings
        .filter(({ trees }) => trees.worktrees.some((tree) => tree.directory === directory))
        .map(({ project }) => project),
    );
  }
  if (owners.length !== 1)
    throw new Error(
      "Cannot identify the originating registered project. No worktree was requested.",
    );
  const project = owners[0]!;
  const [trees, sessions] = await Promise.all([
    ready(
      () => host.listWorktrees(project.id),
      (listener) => host.onWorktrees(project.id, listener),
    ),
    ready(
      () => host.listSessions(project.id),
      (listener) => host.onSessions(project.id, listener),
    ),
  ]);
  if (sessions.coverage.some((item) => item.state !== "ready"))
    throw new Error("Session inspection is incomplete. Inspect the project before trying again.");
  const collision = trees.worktrees.find((tree) => tree.name === name || tree.branch === name);
  const session = sessions.sessions.find(
    (session) => session.worktree?.name === name || session.items.some((item) => item.id === name),
  );
  if (collision || session)
    throw new Error(
      `Worktree or session for ${name} already exists${collision ? ` at ${collision.directory}` : ` (session ${session!.id})`}. Inspect it instead of creating another worktree.`,
    );
  return project;
}
