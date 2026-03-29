import type { SourceAdapter, SourceObjectRef } from "@akb/source-core";
import type { ObjectStore } from "@akb/storage-core";
import { describe, expect, it } from "vitest";

import { syncSource } from "../src/index.js";

class StubAdapter implements SourceAdapter {
  public readonly type = "stub";

  public async discoverChanges() {
    const objectRef: SourceObjectRef = {
      sourceId: "source:1",
      objectId: "doc.md",
      path: "doc.md",
    };

    return [
      {
        objectRef,
        revision: "r1",
        changedAt: new Date().toISOString(),
      },
    ];
  }

  public async fetchObject(ref: SourceObjectRef) {
    return {
      ref,
      content: "# title\n",
      revision: "r1",
      fetchedAt: new Date().toISOString(),
    };
  }

  public async listChildren() {
    return [];
  }

  public async getSourceRevision() {
    return "r1";
  }
}

class InMemoryObjectStore implements ObjectStore {
  private readonly items = new Map<string, string>();

  public async put(key: string, value: string): Promise<void> {
    this.items.set(key, value);
  }

  public async get(key: string): Promise<string | null> {
    return this.items.get(key) ?? null;
  }

  public async list(prefix = ""): Promise<string[]> {
    return [...this.items.keys()].filter((key) => key.startsWith(prefix));
  }
}

describe("syncSource", () => {
  it("stores discovered source objects to object store", async () => {
    const adapter = new StubAdapter();
    const objectStore = new InMemoryObjectStore();

    const result = await syncSource(
      {
        id: "source:1",
        adapter,
      },
      objectStore,
    );

    expect(result.discoveredChanges).toBe(1);
    expect(result.storedObjects).toBe(1);

    const keys = await objectStore.list("raw/source:1");
    expect(keys).toEqual(["raw/source:1/doc.md.txt"]);
  });
});
