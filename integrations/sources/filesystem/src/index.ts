import { readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { SourceAdapter, SourceChange, SourceObject, SourceObjectRef } from "@akb/source-core";

export class FilesystemSourceAdapter implements SourceAdapter {
  public readonly type = "filesystem";
  private readonly rootRealPathPromise: Promise<string>;

  public constructor(
    private readonly sourceId: string,
    private readonly rootPath: string,
  ) {
    this.rootRealPathPromise = realpath(rootPath);
  }

  public async discoverChanges(_sinceRevision?: string): Promise<SourceChange[]> {
    const refs = await this.listChildren();
    const now = new Date().toISOString();
    return refs.map((ref) => ({
      objectRef: ref,
      revision: now,
      changedAt: now,
    }));
  }

  public async fetchObject(ref: SourceObjectRef): Promise<SourceObject> {
    if (!ref.path) {
      throw new Error("ref.path is required for filesystem adapter");
    }

    if (isAbsolute(ref.path)) {
      throw new Error("absolute path is not allowed for filesystem adapter");
    }

    const rootRealPath = await this.rootRealPathPromise;
    const candidatePath = resolve(this.rootPath, ref.path);
    const candidateRealPath = await realpath(candidatePath);
    if (!isPathWithinRoot(rootRealPath, candidateRealPath)) {
      throw new Error("path is outside of source root");
    }

    const content = await readFile(candidateRealPath, "utf-8");
    const fetchedAt = new Date().toISOString();

    return {
      ref,
      content,
      revision: fetchedAt,
      fetchedAt,
    };
  }

  public async listChildren(_ref?: SourceObjectRef): Promise<SourceObjectRef[]> {
    const paths = await walkFiles(this.rootPath);
    return paths.map((path) => ({
      sourceId: this.sourceId,
      objectId: path,
      path,
    }));
  }

  public async getSourceRevision(_ref?: SourceObjectRef): Promise<string> {
    return new Date().toISOString();
  }
}

async function walkFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(rootPath, entryPath);
      files.push(...nested);
      continue;
    }

    files.push(relative(rootPath, entryPath));
  }

  return files;
}

function isPathWithinRoot(rootPath: string, candidatePath: string): boolean {
  return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${sep}`);
}
