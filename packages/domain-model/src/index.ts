export const VISIBILITY_VALUES = ["public", "internal", "restricted", "secret"] as const;
export type Visibility = (typeof VISIBILITY_VALUES)[number];

export const REVIEW_STATUS_VALUES = [
  "unreviewed",
  "machine_verified",
  "human_reviewed",
  "rejected",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS_VALUES)[number];

export const FRESHNESS_CLASS_VALUES = ["realtime", "fresh", "aging", "stale", "unknown"] as const;
export type FreshnessClass = (typeof FRESHNESS_CLASS_VALUES)[number];

export const CONFLICT_STATUS_VALUES = [
  "none",
  "possible_conflict",
  "confirmed_conflict",
  "superseded",
] as const;
export type ConflictStatus = (typeof CONFLICT_STATUS_VALUES)[number];

export const TRUST_LEVEL_VALUES = ["canonical", "strong", "medium", "weak", "speculative"] as const;
export type TrustLevel = (typeof TRUST_LEVEL_VALUES)[number];

export interface CommonMetadata {
  visibility: Visibility;
  reviewStatus: ReviewStatus;
  freshnessClass: FreshnessClass;
  conflictStatus: ConflictStatus;
  trustLevel: TrustLevel;
  version: string;
}

const CANONICAL_KINDS = [
  "entity",
  "document",
  "claim",
  "evidence",
  "relationship",
  "procedure",
  "command",
  "decision",
  "incident",
  "snapshot",
  "artifact",
] as const;

export type CanonicalKind = (typeof CANONICAL_KINDS)[number];

export interface CanonicalId {
  kind: CanonicalKind;
  namespace: string;
  slug: string;
}

export function parseCanonicalId(value: string): CanonicalId {
  const segments = value.split(":");
  if (segments.length !== 3) {
    throw new Error(`Invalid canonical ID format: ${value}`);
  }

  const [kindRaw, namespace, slug] = segments;
  if (!namespace || !slug) {
    throw new Error(`Invalid canonical ID namespace/slug: ${value}`);
  }

  if (!CANONICAL_KINDS.includes(kindRaw as CanonicalKind)) {
    throw new Error(`Invalid canonical ID kind: ${kindRaw}`);
  }

  return {
    kind: kindRaw as CanonicalKind,
    namespace,
    slug,
  };
}

export function isCanonicalId(value: string): boolean {
  try {
    parseCanonicalId(value);
    return true;
  } catch {
    return false;
  }
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  summary: string;
  aliases: string[];
  sourceRefs: string[];
  metadata: CommonMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  claimType: string;
  subjectRef: string;
  predicate: string;
  objectRef?: string;
  literalValue?: string;
  statement: string;
  evidenceRefs: string[];
  sourceRefs: string[];
  metadata: CommonMetadata;
  lastVerifiedAt: string;
}

export interface Evidence {
  id: string;
  evidenceType: string;
  sourceRef: string;
  locator: string;
  excerpt: string;
  capturedAt: string;
  integrityHash: string;
  metadata: CommonMetadata;
}

export interface Procedure {
  id: string;
  title: string;
  steps: string[];
  metadata: CommonMetadata;
}

export interface Command {
  id: string;
  tool: string;
  template: string;
  metadata: CommonMetadata;
}

export interface Artifact {
  id: string;
  artifactType: string;
  contentRef: string;
  metadata: CommonMetadata;
}

export interface JobRecord {
  id: string;
  jobType: string;
  status: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  actor: string;
  occurredAt: string;
}

export interface PolicyRecord {
  id: string;
  scope: string;
  content: Record<string, unknown>;
}
