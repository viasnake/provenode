import type { SourceAdapter } from "@akb/source-core";
import type { ObjectStore } from "@akb/storage-core";

export interface SourceSyncResult {
  sourceId: string;
  sourceType: string;
  discoveredChanges: number;
  storedObjects: number;
  objects: SourceObjectDigest[];
}

export interface SourceObjectDigest {
  objectId: string;
  storageKey: string;
  content: string;
}

export interface SourceSyncOptions {
  rawPrefix?: string;
}

export async function syncSource(
  source: {
    id: string;
    adapter: SourceAdapter;
  },
  objectStore: ObjectStore,
  options?: SourceSyncOptions,
): Promise<SourceSyncResult> {
  const rawPrefix = options?.rawPrefix ?? "raw";
  const changes = await source.adapter.discoverChanges();

  let storedObjects = 0;
  const objects: SourceObjectDigest[] = [];
  for (const change of changes) {
    const object = await source.adapter.fetchObject(change.objectRef);
    const objectPath = normalizeObjectPath(change.objectRef.objectId);
    const key = `${rawPrefix}/${source.id}/${objectPath}.txt`;
    await objectStore.put(key, object.content);
    storedObjects += 1;
    objects.push({
      objectId: change.objectRef.objectId,
      storageKey: key,
      content: object.content,
    });
  }

  return {
    sourceId: source.id,
    sourceType: source.adapter.type,
    discoveredChanges: changes.length,
    storedObjects,
    objects,
  };
}

function normalizeObjectPath(value: string): string {
  return value.replaceAll("..", "_parent_").replaceAll("/", "__");
}
