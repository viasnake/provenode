import type { Entity } from "@akb/domain-model";
import type { EntityRepository } from "@akb/storage-core";

export interface QueryEntityResult {
  status: "ok" | "not_found";
  entity?: Entity;
}

export async function getEntityById(
  repository: EntityRepository,
  id: string,
): Promise<QueryEntityResult> {
  const entity = await repository.getById(id);
  if (!entity) {
    return {
      status: "not_found",
    };
  }

  return {
    status: "ok",
    entity,
  };
}
