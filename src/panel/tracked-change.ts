import type { GuestSessionsSnapshot, HostClient } from "@openchamber/sdk";
import { isChangeName, resolveTrackedChanges } from "../model.js";

const prefix = "session-change:";
const readBatchSize = 32;

export async function readTrackedChanges(
  host: HostClient,
  sessionId: string,
): Promise<string[] | null> {
  const value = await host.storage.get(`${prefix}${sessionId}`);
  if (!value || typeof value !== "object" || !("changes" in value) || !Array.isArray(value.changes))
    return null;
  if (!value.changes.every((name) => typeof name === "string" && isChangeName(name)))
    throw new Error("Invalid tracked OpenSpec changes.");
  return [...new Set(value.changes as string[])];
}

export function resolveSessionChanges(
  sessionId: string | null,
  sessions: GuestSessionsSnapshot | null,
  saved: string[] | null,
  active: ReadonlySet<string>,
): string[] | null {
  const candidate = sessions?.sessions.find(({ id }) => id === sessionId);
  const coverage = sessions?.coverage.find(({ directory }) => directory === candidate?.directory);
  if (saved === null && candidate && coverage?.state !== "ready") return null;
  return resolveTrackedChanges({
    saved,
    items: candidate?.items ?? [],
    worktreeName: candidate?.worktree?.name ?? null,
    active,
  }).changes;
}

export async function updateTrackedChanges(
  host: HostClient,
  sessionId: string,
  current: () => boolean,
  seed: () => string[] | null | Promise<string[] | null>,
  update: (changes: string[]) => string[],
) {
  try {
    if (!current()) return false;
    const saved = await readTrackedChanges(host, sessionId);
    if (!current()) return false;
    const base = saved ?? (await seed());
    if (!current()) return false;
    if (base === null) throw new Error("The session's directory coverage is not ready.");
    const changes = update(base);
    if (saved && changes === saved) return true;
    const keys = (await host.storage.keys()).filter((key) => key.startsWith(prefix));
    if (keys.length >= 1900) {
      const choices: { key: string; savedAt: number }[] = [];
      // Instance storage uses one host request per key; bound the in-flight reads.
      for (let i = 0; i < keys.length; i += readBatchSize) {
        if (!current()) return false;
        const batch = keys.slice(i, i + readBatchSize);
        const values = await Promise.all(
          batch.map(async (key) => ({ key, value: await host.storage.get(key) })),
        );
        for (const { key, value } of values) {
          if (
            value &&
            typeof value === "object" &&
            "savedAt" in value &&
            typeof value.savedAt === "number" &&
            Number.isFinite(value.savedAt)
          )
            choices.push({ key, savedAt: value.savedAt });
        }
      }
      choices.sort((left, right) => left.savedAt - right.savedAt);
      for (const { key } of choices.slice(0, 100)) {
        if (!current()) return false;
        await host.storage.delete(key);
      }
    }
    if (!current()) return false;
    await host.storage.set(`${prefix}${sessionId}`, { changes, savedAt: Date.now() });
    return true;
  } catch (caught) {
    console.warn("Could not save the tracked OpenSpec change.", caught);
    return false;
  }
}

export function appendTrackedChange(
  host: HostClient,
  sessionId: string,
  change: string,
  current: () => boolean,
  seed: () => string[] | null | Promise<string[] | null>,
) {
  return updateTrackedChanges(host, sessionId, current, seed, (choices) =>
    choices.includes(change) ? choices : [...choices, change],
  );
}
