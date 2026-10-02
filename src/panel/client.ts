import type { HostClient } from "@openchamber/sdk";
import {
  decodeTaskResponse,
  decodeListing,
  decodeSummaries,
  type Task,
  type ListingEntry,
} from "../contracts.js";
import type { ChangeSummary } from "../model.js";

export class ServiceRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcome?: "unknown",
  ) {
    super(message);
  }
}

export type Listing = { directory: string; root: string; changes: ListingEntry[] };
export type Scope = { directory: string; root: string };

function invalid(): ServiceRequestError {
  return new ServiceRequestError(
    "BAD_SERVICE_DATA",
    "The local OpenSpec service returned invalid data.",
  );
}

export function createClient(host: HostClient) {
  async function request(path: string, body: Record<string, unknown>): Promise<unknown> {
    const result = await host.serviceRequest({ method: "POST", path, body: JSON.stringify(body) });
    let value: unknown;
    try {
      value = JSON.parse(result.body);
    } catch {
      throw invalid();
    }
    if (result.status >= 400) {
      const issue = value && typeof value === "object" && "error" in value ? value.error : null;
      if (
        !issue ||
        typeof issue !== "object" ||
        !("code" in issue) ||
        !("message" in issue) ||
        typeof issue.code !== "string" ||
        typeof issue.message !== "string"
      )
        throw invalid();
      throw new ServiceRequestError(
        issue.code,
        issue.message,
        "outcome" in issue && issue.outcome === "unknown" ? "unknown" : undefined,
      );
    }
    return value;
  }

  function decode<T>(value: unknown, decoder: (value: unknown) => T): T {
    try {
      return decoder(value);
    } catch {
      throw invalid();
    }
  }

  const record = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    return value as Record<string, unknown>;
  };

  return {
    list: async (directory: string, expectedRoot?: string): Promise<Listing> => {
      const value = await request("/changes", {
        directory,
        ...(expectedRoot ? { expectedRoot } : {}),
      });
      const listing = decode(value, decodeListing);
      if (listing.directory !== directory || (expectedRoot && listing.root !== expectedRoot))
        throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
      return listing;
    },
    summaries: async (
      scope: Scope,
      entries: ListingEntry[],
    ): Promise<
      ({ id: string; summary: ChangeSummary } | { id: string; error: ServiceRequestError })[]
    > => {
      const value = decode(
        await request("/summaries", { directory: scope.directory, expectedRoot: scope.root }),
        decodeSummaries,
      );
      if (value.root !== scope.root)
        throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
      const byId = new Map(value.changes.map((item) => [item.id, item]));
      return entries.map((entry) => {
        const item = byId.get(entry.id);
        if (!item)
          return {
            id: entry.id,
            error: new ServiceRequestError("CHANGE_UNAVAILABLE", "Change is no longer listed."),
          };
        if ("error" in item)
          return {
            id: entry.id,
            error: new ServiceRequestError(item.error.code, item.error.message),
          };
        return {
          id: entry.id,
          summary: {
            ...item.summary,
            completedTasks: entry.completedTasks,
            totalTasks: entry.totalTasks,
          },
        };
      });
    },
    tasks: async (scope: Scope, change: string): Promise<Task[]> => {
      return decode(
        await request("/tasks", { ...scope, expectedRoot: scope.root, change }),
        decodeTaskResponse,
      );
    },
    document: async (
      scope: Scope,
      change: string,
      artifactId: string,
      selector: string,
    ): Promise<string> => {
      const value = record(
        await request("/document", {
          ...scope,
          expectedRoot: scope.root,
          change,
          artifactId,
          selector,
        }),
      );
      if (
        value.artifactId !== artifactId ||
        value.selector !== selector ||
        typeof value.content !== "string"
      )
        throw invalid();
      return value.content;
    },
    create: async (scope: Scope, name: string, goal: string): Promise<void> => {
      let value: Record<string, unknown>;
      try {
        value = record(
          await request("/create", { ...scope, expectedRoot: scope.root, name, goal }),
        );
      } catch (caught) {
        if (
          caught instanceof ServiceRequestError &&
          caught.outcome !== "unknown" &&
          caught.code !== "BAD_SERVICE_DATA" &&
          caught.code !== "CLI_TIMEOUT"
        )
          throw caught;
        throw new ServiceRequestError(
          "CREATE_UNKNOWN",
          "Creation outcome is unknown; check the original project before retrying.",
          "unknown",
        );
      }
      if (value.root !== scope.root || value.change !== name)
        throw new ServiceRequestError(
          "BAD_SERVICE_DATA",
          "Creation outcome is unknown.",
          "unknown",
        );
    },
    delete: async (scope: Scope, change: string): Promise<void> => {
      let value: Record<string, unknown>;
      try {
        value = record(await request("/delete", { ...scope, expectedRoot: scope.root, change }));
      } catch (caught) {
        if (
          caught instanceof ServiceRequestError &&
          caught.outcome !== "unknown" &&
          caught.code !== "BAD_SERVICE_DATA"
        )
          throw caught;
        throw new ServiceRequestError(
          "DELETE_UNKNOWN",
          "Deletion outcome is unknown; check the original project before retrying.",
          "unknown",
        );
      }
      if (value.root !== scope.root || value.change !== change)
        throw new ServiceRequestError(
          "DELETE_UNKNOWN",
          "Deletion outcome is unknown; check the original project before retrying.",
          "unknown",
        );
    },
  };
}

export type Client = ReturnType<typeof createClient>;
