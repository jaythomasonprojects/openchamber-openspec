import type { GuestRequest, HostClient } from "@openchamber/sdk";
import {
  decodeArchived,
  decodeTaskResponse,
  decodeListing,
  decodeSummary,
  decodeSummaries,
  decodeSpecs,
  decodeValidation,
  decodeWorkflows,
  type ChangeMetadata,
  type Task,
  type ListingEntry,
} from "../contracts.js";
import { isChangeName, type ChangeSummary } from "../model.js";

export class ServiceRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcome?: "unknown",
  ) {
    super(message);
  }
}

export type Listing = Scope & { changes: ListingEntry[] };
export type Scope = { directory: string; root: string; planning: string };

function invalid(): ServiceRequestError {
  return new ServiceRequestError(
    "BAD_SERVICE_DATA",
    "The local OpenSpec service returned invalid data.",
  );
}

export function createClient(host: HostClient) {
  async function request(path: string, body: Record<string, unknown>): Promise<unknown> {
    return send({ method: "POST", path, body: JSON.stringify(body) });
  }

  async function send(payload: GuestRequest): Promise<unknown> {
    const result = await host.serviceRequest(payload);
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
    archived: async ({ directory, root, planning }: Scope) =>
      decode(
        await request("/archived", { directory, expectedRoot: root, expectedPlanning: planning }),
        decodeArchived,
      ),
    specs: async ({ directory, root, planning }: Scope) =>
      decode(
        await request("/specs", { directory, expectedRoot: root, expectedPlanning: planning }),
        decodeSpecs,
      ),
    spec: async ({ directory, root, planning }: Scope, spec: string): Promise<string> => {
      const value = record(
        await request("/spec", { directory, expectedRoot: root, expectedPlanning: planning, spec }),
      );
      if (value.id !== spec || typeof value.content !== "string") throw invalid();
      return value.content;
    },
    workflows: async (directory: string) =>
      decode(await request("/workflows", { directory }), decodeWorkflows),
    list: async (
      directory: string,
      expectedRoot?: string,
      expectedPlanning?: string,
    ): Promise<Listing> => {
      const value = await request("/changes", {
        directory,
        ...(expectedRoot ? { expectedRoot } : {}),
        ...(expectedPlanning ? { expectedPlanning } : {}),
      });
      const listing = decode(value, decodeListing);
      if (listing.directory !== directory || (expectedRoot && listing.root !== expectedRoot))
        throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
      if (expectedPlanning && listing.planning !== expectedPlanning)
        throw new ServiceRequestError("PLANNING_CHANGED", "OpenSpec planning target changed.");
      return listing;
    },
    summary: async (scope: Scope, change: string): Promise<ChangeMetadata> => {
      const value = decode(
        await request("/summary", {
          directory: scope.directory,
          expectedRoot: scope.root,
          expectedPlanning: scope.planning,
          change,
        }),
        decodeSummary,
      );
      if (value.root !== scope.root)
        throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
      if (value.id !== change) throw invalid();
      return value;
    },
    validate: async (scope: Scope, change: string) =>
      decode(
        await request("/validate", {
          directory: scope.directory,
          expectedRoot: scope.root,
          planning: scope.planning,
          change,
        }),
        decodeValidation,
      ),
    setFocus: async (directory: string, change: string) => {
      if (record(await request("/focus", { directory, change })).ok !== true) throw invalid();
    },
    claimFocus: async (directory: string) => {
      const value = await send({ method: "GET", path: "/focus", query: { directory } });
      if (value === null) return null;
      const { directory: target, change } = record(value);
      if (target !== directory || typeof change !== "string" || !isChangeName(change))
        throw invalid();
      return change;
    },
    summaries: async (
      scope: Scope,
      entries: ListingEntry[],
    ): Promise<
      ({ id: string; summary: ChangeSummary } | { id: string; error: ServiceRequestError })[]
    > => {
      const value = decode(
        await request("/summaries", {
          directory: scope.directory,
          expectedRoot: scope.root,
          expectedPlanning: scope.planning,
        }),
        decodeSummaries,
      );
      if (value.root !== scope.root)
        throw new ServiceRequestError("ROOT_CHANGED", "OpenSpec root changed.");
      if (value.planning !== scope.planning)
        throw new ServiceRequestError("PLANNING_CHANGED", "OpenSpec planning target changed.");
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
        await request("/tasks", {
          ...scope,
          expectedRoot: scope.root,
          expectedPlanning: scope.planning,
          change,
        }),
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
          expectedPlanning: scope.planning,
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
          await request("/create", {
            ...scope,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning,
            name,
            goal,
          }),
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
        value = record(
          await request("/delete", {
            ...scope,
            expectedRoot: scope.root,
            expectedPlanning: scope.planning,
            change,
          }),
        );
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
