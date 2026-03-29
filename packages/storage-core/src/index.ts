import type {
  Artifact,
  AuditRecord,
  Claim,
  Command,
  Entity,
  Evidence,
  JobRecord,
  PolicyRecord,
  Procedure,
} from "@akb/domain-model";

export interface Repository<T> {
  getById(id: string): Promise<T | null>;
  upsert(value: T): Promise<void>;
  deleteById(id: string): Promise<void>;
  list(limit?: number): Promise<T[]>;
}

export interface EntityRepository extends Repository<Entity> {}

export interface ClaimRepository extends Repository<Claim> {
  listBySubject(subjectRef: string): Promise<Claim[]>;
}

export interface EvidenceRepository extends Repository<Evidence> {
  listBySource(sourceRef: string): Promise<Evidence[]>;
}

export interface ProcedureRepository extends Repository<Procedure> {}

export interface CommandRepository extends Repository<Command> {}

export interface ArtifactRepository extends Repository<Artifact> {}

export interface JobRepository extends Repository<JobRecord> {}

export interface AuditRepository extends Repository<AuditRecord> {}

export interface PolicyRepository extends Repository<PolicyRecord> {}

export interface TransactionContext {
  entities: EntityRepository;
  claims: ClaimRepository;
  evidence: EvidenceRepository;
}

export interface TransactionManager {
  withTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface ObjectStore {
  put(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  list(prefix?: string): Promise<string[]>;
}
