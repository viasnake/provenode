export interface SourceRef {
  id: string;
  type: string;
  location: string;
}

export interface SourceObjectRef {
  sourceId: string;
  objectId: string;
  path?: string;
}

export interface SourceChange {
  objectRef: SourceObjectRef;
  revision: string;
  changedAt: string;
}

export interface SourceObject {
  ref: SourceObjectRef;
  content: string;
  revision: string;
  fetchedAt: string;
}

export interface SourceAdapter {
  readonly type: string;

  discoverChanges(sinceRevision?: string): Promise<SourceChange[]>;
  fetchObject(ref: SourceObjectRef): Promise<SourceObject>;
  listChildren(ref?: SourceObjectRef): Promise<SourceObjectRef[]>;
  getSourceRevision(ref?: SourceObjectRef): Promise<string>;
}

export async function runSourceAdapterConformance(
  adapter: SourceAdapter,
  options?: {
    allowEmptyChanges?: boolean;
  },
): Promise<void> {
  const changes = await adapter.discoverChanges();
  if (!options?.allowEmptyChanges && changes.length === 0) {
    throw new Error(`adapter=${adapter.type} returned no changes`);
  }

  if (changes.length > 0) {
    const object = await adapter.fetchObject(changes[0].objectRef);
    if (!object.content) {
      throw new Error(`adapter=${adapter.type} returned empty content`);
    }
  }

  const revision = await adapter.getSourceRevision();
  if (!revision) {
    throw new Error(`adapter=${adapter.type} returned empty revision`);
  }
}
