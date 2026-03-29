import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { SourceAdapter, SourceChange, SourceObject, SourceObjectRef } from "@akb/source-core";
import { FilesystemSourceAdapter } from "@akb/source-filesystem";

const execFileAsync = promisify(execFile);

export class GitSourceAdapter implements SourceAdapter {
  public readonly type = "git";
  private readonly filesystemAdapter: FilesystemSourceAdapter;

  public constructor(
    private readonly sourceId: string,
    private readonly repoPath: string,
  ) {
    this.filesystemAdapter = new FilesystemSourceAdapter(sourceId, repoPath);
  }

  public async discoverChanges(sinceRevision?: string): Promise<SourceChange[]> {
    const revision = await this.getSourceRevision();
    if (sinceRevision && sinceRevision === revision) {
      return [];
    }

    const refs = await this.listChildren();
    const changedAt = new Date().toISOString();

    return refs.map((ref) => ({
      objectRef: ref,
      revision,
      changedAt,
    }));
  }

  public async fetchObject(ref: SourceObjectRef): Promise<SourceObject> {
    if (!ref.path) {
      throw new Error("ref.path is required for git adapter");
    }

    const tracked = await this.getTrackedPaths();
    if (!tracked.has(ref.path)) {
      throw new Error("requested path is not tracked by git");
    }

    return this.filesystemAdapter.fetchObject(ref);
  }

  public async listChildren(_ref?: SourceObjectRef): Promise<SourceObjectRef[]> {
    const tracked = await this.getTrackedPaths();
    return [...tracked].map((path) => ({
      sourceId: this.sourceId,
      objectId: path,
      path,
    }));
  }

  public async getSourceRevision(): Promise<string> {
    const { stdout } = await execFileAsync("git", ["-C", this.repoPath, "rev-parse", "HEAD"]);
    return stdout.trim();
  }

  private async getTrackedPaths(): Promise<Set<string>> {
    const { stdout } = await execFileAsync("git", ["-C", this.repoPath, "ls-files", "-z"]);
    const paths = stdout.split("\u0000").filter((value) => value.length > 0);
    return new Set(paths);
  }
}
