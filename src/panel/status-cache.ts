import { GUEST_STORAGE_VALUE_BYTES, type HostClient } from "@openchamber/sdk";
import { decodeListingEntry, type ListingEntry } from "../contracts.js";
import type { Stage } from "../model.js";
import { stages } from "./workflow.js";

export type DisplayCard = ListingEntry & { stage: Stage; currentTaskTitle: string | null };
type Snapshot = { directory: string; cards: DisplayCard[] };
type SessionEntry = Snapshot & { sessionId: string };

const key = "work-status:cards";
const options = { scope: "device" } as const;
const sessionLimit = 50;

function decode(value: unknown): SessionEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: SessionEntry[] = [];
  for (const entry of value.slice(-sessionLimit)) {
    if (
      !entry ||
      typeof entry.sessionId !== "string" ||
      typeof entry.directory !== "string" ||
      !Array.isArray(entry.cards)
    )
      continue;
    try {
      const cards = entry.cards.map((card: unknown): DisplayCard => {
        const listing = decodeListingEntry(card);
        if (!card || typeof card !== "object" || !("stage" in card))
          throw new Error("Missing stage.");
        const stage = stages.find(({ id }) => id === card.stage)?.id;
        if (
          !stage ||
          !("currentTaskTitle" in card) ||
          (card.currentTaskTitle !== null && typeof card.currentTaskTitle !== "string")
        )
          throw new Error("Invalid status card.");
        return { ...listing, stage, currentTaskTitle: card.currentTaskTitle };
      });
      entries.push({ sessionId: entry.sessionId, directory: entry.directory, cards });
    } catch {
      // A cached snapshot is optional; the live read remains authoritative.
    }
  }
  return entries;
}

export function createStatusCache(host: HostClient) {
  const memory = new Map<string, Snapshot>();
  let stored: Promise<void> | undefined;

  function remember(sessionId: string, snapshot: Snapshot) {
    memory.delete(sessionId);
    memory.set(sessionId, snapshot);
    if (memory.size > sessionLimit) memory.delete(memory.keys().next().value!);
  }

  function load() {
    return (stored ??= host.storage
      .get(key, options)
      .then((value) => {
        const recent = [...memory];
        memory.clear();
        for (const { sessionId, ...snapshot } of decode(value)) {
          remember(sessionId, snapshot);
        }
        for (const [sessionId, snapshot] of recent) remember(sessionId, snapshot);
      })
      .catch((caught: unknown) =>
        console.warn("Could not read cached OpenSpec progress.", caught),
      ));
  }

  function get(sessionId: string, directory: string) {
    const snapshot = memory.get(sessionId);
    return snapshot?.directory === directory ? snapshot.cards : undefined;
  }

  return {
    get,
    async restore(sessionId: string, directory: string) {
      await load();
      return get(sessionId, directory);
    },
    set(sessionId: string, directory: string, cards: DisplayCard[], persist: boolean) {
      remember(sessionId, { directory, cards });
      if (!persist) return;
      stored = load()
        .then(async () => {
          const entries = Array.from(memory, ([sessionId, snapshot]) => ({
            sessionId,
            ...snapshot,
          }));
          const encoder = new TextEncoder();
          while (encoder.encode(JSON.stringify(entries)).length > GUEST_STORAGE_VALUE_BYTES)
            entries.shift();
          await host.storage.set(key, entries, options);
        })
        .catch((caught: unknown) => console.warn("Could not cache OpenSpec progress.", caught));
    },
  };
}
