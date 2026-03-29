import type { SourceAdapter, SourceChange, SourceObject, SourceObjectRef } from "@akb/source-core";
import { FilesystemSourceAdapter } from "@akb/source-filesystem";

export class MarkdownSourceAdapter implements SourceAdapter {
  public readonly type = "markdown";
  private readonly filesystemAdapter: FilesystemSourceAdapter;

  public constructor(sourceId: string, rootPath: string) {
    this.filesystemAdapter = new FilesystemSourceAdapter(sourceId, rootPath);
  }

  public async discoverChanges(sinceRevision?: string): Promise<SourceChange[]> {
    const changes = await this.filesystemAdapter.discoverChanges(sinceRevision);
    return changes.filter((change) => change.objectRef.path?.endsWith(".md"));
  }

  public async fetchObject(ref: SourceObjectRef): Promise<SourceObject> {
    if (!ref.path?.endsWith(".md")) {
      throw new Error("Markdown adapter only supports .md files");
    }
    return this.filesystemAdapter.fetchObject(ref);
  }

  public async listChildren(ref?: SourceObjectRef): Promise<SourceObjectRef[]> {
    const refs = await this.filesystemAdapter.listChildren(ref);
    return refs.filter((item) => item.path?.endsWith(".md"));
  }

  public async getSourceRevision(ref?: SourceObjectRef): Promise<string> {
    return this.filesystemAdapter.getSourceRevision(ref);
  }
}
