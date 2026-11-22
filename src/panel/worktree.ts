import type { HostClient } from "@openchamber/sdk";
import { findProject, ready } from "./project.js";

export async function inspectWorktreeDestination(
  host: HostClient,
  directory: string,
  name: string,
) {
  const project = await findProject(host, directory);
  if (!project)
    throw new Error(
      "Cannot identify the originating registered project. No worktree was requested.",
    );
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
