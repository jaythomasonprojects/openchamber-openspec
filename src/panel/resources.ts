import type { Task } from "../contracts.js";
import type { Client, Scope } from "./client.js";

export type ReadState<T> = { value: T | null; pending: boolean; error: Error | null };
export type Read<T> = { state: ReadState<T>; completion: Promise<ReadState<T>> | null };
type Entry<T> = {
  value: T | null;
  error: Error | null;
  pending: Promise<ReadState<T>> | null;
  bytes: number;
};

export function createResources(
  client: Pick<Client, "tasks" | "document">,
  options: { maxBytes?: number } = {},
) {
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  const cache = new Map<string, Entry<unknown>>();
  let context: Scope | null = null;
  let generation = 0;
  let bytes = 0;
  let disposed = false;
  const scopeKey = (scope: Scope) => JSON.stringify([scope.directory, scope.root]);
  const keyFor = (scope: Scope, change: string, kind: string, artifact = "", selector = "") =>
    JSON.stringify([scope.directory, scope.root, change, kind, artifact, selector]);
  const active = (scope: Scope) => !disposed && !!context && scopeKey(context) === scopeKey(scope);
  const state = <T>(entry: Entry<T>): ReadState<T> => ({
    value: entry.value,
    pending: entry.pending !== null,
    error: entry.error,
  });
  function refresh() {
    generation++;
    cache.clear();
    bytes = 0;
  }
  function setContext(scope: Scope | null) {
    if (context && scope && scopeKey(context) === scopeKey(scope)) return;
    refresh();
    context = scope;
  }
  function read<T>(scope: Scope, key: string, load: () => Promise<T>, retry = false): Read<T> {
    if (!active(scope))
      return {
        state: { value: null, pending: false, error: new Error("OpenSpec context changed.") },
        completion: null,
      };
    let entry = cache.get(key) as Entry<T> | undefined;
    if (!entry) {
      entry = { value: null, error: null, pending: null, bytes: 0 };
      cache.set(key, entry);
    }
    if (entry.pending) return { state: state(entry), completion: entry.pending };
    if (entry.value !== null || (entry.error && !retry))
      return { state: state(entry), completion: null };
    const current = entry;
    const started = generation;
    current.error = null;
    const completion = Promise.resolve()
      .then(load)
      .then(
        (value) => {
          if (started !== generation || !active(scope) || cache.get(key) !== current) return;
          const size = new TextEncoder().encode(JSON.stringify(value)).length;
          if (bytes + size > maxBytes) {
            current.error = new Error(
              "Session read limit reached. Refresh to clear retained reads.",
            );
          } else {
            current.value = value;
            current.bytes = size;
            bytes += size;
          }
        },
        (caught: unknown) => {
          if (started === generation && active(scope) && cache.get(key) === current)
            current.error = caught instanceof Error ? caught : new Error("OpenSpec read failed.");
        },
      )
      .then(() => {
        if (current.pending === completion) current.pending = null;
        return state(current);
      });
    current.pending = completion;
    return { state: state(current), completion };
  }
  return {
    setContext,
    refresh,
    taskState(scope: Scope, change: string): ReadState<Task[]> | null {
      const entry = cache.get(keyFor(scope, change, "tasks")) as Entry<Task[]> | undefined;
      return active(scope) && entry ? state(entry) : null;
    },
    documentState(
      scope: Scope,
      change: string,
      artifact: string,
      selector: string,
    ): ReadState<string> | null {
      const entry = cache.get(keyFor(scope, change, "document", artifact, selector)) as
        Entry<string> | undefined;
      return active(scope) && entry ? state(entry) : null;
    },
    tasks(scope: Scope, change: string, retry = false): Read<Task[]> {
      return read(scope, keyFor(scope, change, "tasks"), () => client.tasks(scope, change), retry);
    },
    document(
      scope: Scope,
      change: string,
      artifact: string,
      selector: string,
      retry = false,
    ): Read<string> {
      return read(
        scope,
        keyFor(scope, change, "document", artifact, selector),
        () => client.document(scope, change, artifact, selector),
        retry,
      );
    },
    invalidateChange(scope: Scope, change: string) {
      const prefix = JSON.stringify([scope.directory, scope.root, change]).slice(0, -1) + ",";
      for (const [key, entry] of cache)
        if (key.startsWith(prefix)) {
          bytes -= entry.bytes;
          cache.delete(key);
        }
    },
    dispose() {
      disposed = true;
      setContext(null);
    },
  };
}
