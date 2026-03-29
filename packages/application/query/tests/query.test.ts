import type { Entity } from "@akb/domain-model";
import type { EntityRepository } from "@akb/storage-core";
import { describe, expect, it } from "vitest";

import { getEntityById } from "../src/index.js";

class StubEntityRepository implements EntityRepository {
  public constructor(private readonly entity: Entity) {}

  public async getById(id: string): Promise<Entity | null> {
    return this.entity.id === id ? this.entity : null;
  }

  public async upsert(_value: Entity): Promise<void> {
    throw new Error("Not implemented in this test");
  }

  public async deleteById(_id: string): Promise<void> {
    throw new Error("Not implemented in this test");
  }

  public async list(_limit?: number): Promise<Entity[]> {
    return [this.entity];
  }
}

describe("getEntityById", () => {
  it("returns entity when repository has it", async () => {
    const entity: Entity = {
      id: "entity:product:arbiter",
      type: "product",
      name: "Arbiter",
      summary: "Example",
      aliases: ["arbiter"],
      sourceRefs: ["source:git:arbiter"],
      metadata: {
        visibility: "internal",
        reviewStatus: "unreviewed",
        freshnessClass: "unknown",
        conflictStatus: "none",
        trustLevel: "medium",
        version: "0.1.0",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const repository = new StubEntityRepository(entity);
    const result = await getEntityById(repository, entity.id);

    expect(result.status).toBe("ok");
    expect(result.entity?.id).toBe(entity.id);
  });
});
