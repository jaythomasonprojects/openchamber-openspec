import type { HostClient } from "@openchamber/sdk";

export async function ready<T extends { state: "loading" | "ready" | "error" }>(
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

export async function findProject(host: HostClient, directory: string) {
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
  return owners.length === 1 ? owners[0]! : null;
}
