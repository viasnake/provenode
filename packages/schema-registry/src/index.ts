export interface VersionedSchema {
  id: string;
  version: string;
  description: string;
  schema: Record<string, unknown>;
}

export const SCHEMA_VERSION = "0.1.0";

export const canonicalIdSchema: VersionedSchema = {
  id: "schema:canonical-id",
  version: SCHEMA_VERSION,
  description: "Canonical ID format for first-class objects",
  schema: {
    type: "string",
    pattern:
      "^(entity|document|claim|evidence|relationship|procedure|command|decision|incident|snapshot|artifact):[a-z0-9-]+:[a-z0-9-]+$",
  },
};

export const metadataSchema: VersionedSchema = {
  id: "schema:common-metadata",
  version: SCHEMA_VERSION,
  description: "Cross-object metadata fields",
  schema: {
    type: "object",
    required: [
      "visibility",
      "reviewStatus",
      "trustLevel",
      "freshnessClass",
      "conflictStatus",
      "version",
    ],
    properties: {
      visibility: { enum: ["public", "internal", "restricted", "secret"] },
      reviewStatus: { enum: ["unreviewed", "machine_verified", "human_reviewed", "rejected"] },
      trustLevel: { enum: ["canonical", "strong", "medium", "weak", "speculative"] },
      freshnessClass: { enum: ["realtime", "fresh", "aging", "stale", "unknown"] },
      conflictStatus: {
        enum: ["none", "possible_conflict", "confirmed_conflict", "superseded"],
      },
      version: { type: "string" },
    },
  },
};
