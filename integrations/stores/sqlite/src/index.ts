import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Claim, Entity, Evidence } from "@akb/domain-model";
import type {
  ClaimRepository,
  EntityRepository,
  EvidenceRepository,
  TransactionContext,
  TransactionManager,
} from "@akb/storage-core";

class SqliteEntityRepository implements EntityRepository {
  public constructor(private readonly db: DatabaseSync) {}

  public async getById(id: string): Promise<Entity | null> {
    const row = this.db.prepare("SELECT payload FROM entities WHERE id = ?").get(id) as
      | { payload: string }
      | undefined;
    return row ? (JSON.parse(row.payload) as Entity) : null;
  }

  public async upsert(value: Entity): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO entities(id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
      )
      .run(value.id, JSON.stringify(value));
  }

  public async deleteById(id: string): Promise<void> {
    this.db.prepare("DELETE FROM entities WHERE id = ?").run(id);
  }

  public async list(limit?: number): Promise<Entity[]> {
    const statement =
      typeof limit === "number"
        ? this.db.prepare("SELECT payload FROM entities ORDER BY id LIMIT ?")
        : this.db.prepare("SELECT payload FROM entities ORDER BY id");
    const rows = (typeof limit === "number" ? statement.all(limit) : statement.all()) as Array<{
      payload: string;
    }>;
    return rows.map((row) => JSON.parse(row.payload) as Entity);
  }
}

class SqliteClaimRepository implements ClaimRepository {
  public constructor(private readonly db: DatabaseSync) {}

  public async getById(id: string): Promise<Claim | null> {
    const row = this.db.prepare("SELECT payload FROM claims WHERE id = ?").get(id) as
      | { payload: string }
      | undefined;
    return row ? (JSON.parse(row.payload) as Claim) : null;
  }

  public async upsert(value: Claim): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO claims(id, subject_ref, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET subject_ref = excluded.subject_ref, payload = excluded.payload",
      )
      .run(value.id, value.subjectRef, JSON.stringify(value));
  }

  public async deleteById(id: string): Promise<void> {
    this.db.prepare("DELETE FROM claims WHERE id = ?").run(id);
  }

  public async list(limit?: number): Promise<Claim[]> {
    const statement =
      typeof limit === "number"
        ? this.db.prepare("SELECT payload FROM claims ORDER BY id LIMIT ?")
        : this.db.prepare("SELECT payload FROM claims ORDER BY id");
    const rows = (typeof limit === "number" ? statement.all(limit) : statement.all()) as Array<{
      payload: string;
    }>;
    return rows.map((row) => JSON.parse(row.payload) as Claim);
  }

  public async listBySubject(subjectRef: string): Promise<Claim[]> {
    const rows = this.db
      .prepare("SELECT payload FROM claims WHERE subject_ref = ? ORDER BY id")
      .all(subjectRef) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Claim);
  }
}

class SqliteEvidenceRepository implements EvidenceRepository {
  public constructor(private readonly db: DatabaseSync) {}

  public async getById(id: string): Promise<Evidence | null> {
    const row = this.db.prepare("SELECT payload FROM evidence WHERE id = ?").get(id) as
      | { payload: string }
      | undefined;
    return row ? (JSON.parse(row.payload) as Evidence) : null;
  }

  public async upsert(value: Evidence): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO evidence(id, source_ref, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET source_ref = excluded.source_ref, payload = excluded.payload",
      )
      .run(value.id, value.sourceRef, JSON.stringify(value));
  }

  public async deleteById(id: string): Promise<void> {
    this.db.prepare("DELETE FROM evidence WHERE id = ?").run(id);
  }

  public async list(limit?: number): Promise<Evidence[]> {
    const statement =
      typeof limit === "number"
        ? this.db.prepare("SELECT payload FROM evidence ORDER BY id LIMIT ?")
        : this.db.prepare("SELECT payload FROM evidence ORDER BY id");
    const rows = (typeof limit === "number" ? statement.all(limit) : statement.all()) as Array<{
      payload: string;
    }>;
    return rows.map((row) => JSON.parse(row.payload) as Evidence);
  }

  public async listBySource(sourceRef: string): Promise<Evidence[]> {
    const rows = this.db
      .prepare("SELECT payload FROM evidence WHERE source_ref = ? ORDER BY id")
      .all(sourceRef) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Evidence);
  }
}

export class SqliteTransactionManager implements TransactionManager {
  private readonly entitiesRepo: SqliteEntityRepository;
  private readonly claimsRepo: SqliteClaimRepository;
  private readonly evidenceRepo: SqliteEvidenceRepository;

  private constructor(private readonly db: DatabaseSync) {
    this.entitiesRepo = new SqliteEntityRepository(db);
    this.claimsRepo = new SqliteClaimRepository(db);
    this.evidenceRepo = new SqliteEvidenceRepository(db);
  }

  public static async open(databasePath: string): Promise<SqliteTransactionManager> {
    await mkdir(dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    initializeSchema(db);
    return new SqliteTransactionManager(db);
  }

  public async withTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    this.db.exec("BEGIN");

    try {
      const result = await fn({
        entities: this.entitiesRepo,
        claims: this.claimsRepo,
        evidence: this.evidenceRepo,
      });
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      subject_ref TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_claims_subject_ref ON claims(subject_ref);

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      source_ref TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_source_ref ON evidence(source_ref);
  `);
}
