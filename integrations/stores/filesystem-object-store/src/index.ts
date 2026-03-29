import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import type { ObjectStore } from "@akb/storage-core";

export class FilesystemObjectStore implements ObjectStore {
  public constructor(private readonly rootPath: string) {}

  public async put(key: string, value: string): Promise<void> {
    const targetPath = await this.resolvePath(key);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, value, "utf-8");
  }

  public async get(key: string): Promise<string | null> {
    const targetPath = await this.resolvePath(key);
    try {
      return await readFile(targetPath, "utf-8");
    } catch {
      return null;
    }
  }

  public async list(prefix = ""): Promise<string[]> {
    const dirPath = await this.resolvePath(prefix);
    try {
      return await listFilesRecursive(dirPath, this.rootPath);
    } catch {
      return [];
    }
  }

  private async resolvePath(key: string): Promise<string> {
    const resolvedRoot = resolve(this.rootPath);
    const resolvedTarget = resolve(this.rootPath, key);
    const diff = relative(resolvedRoot, resolvedTarget);
    if (diff.startsWith("..") || diff.startsWith("/")) {
      throw new Error("object store key escapes root path");
    }

    const segments = diff === "" ? [] : diff.split("/");
    let current = resolvedRoot;
    for (const segment of segments) {
      current = resolve(current, segment);
      try {
        const stats = await lstat(current);
        if (stats.isSymbolicLink()) {
          throw new Error("object store path includes symbolic link");
        }
      } catch (error) {
        const maybeCode = (error as { code?: string }).code;
        if (maybeCode && maybeCode !== "ENOENT") {
          throw error;
        }
      }
    }

    return resolvedTarget;
  }
}

async function listFilesRecursive(dirPath: string, rootPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(nextPath, rootPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(rootPath, nextPath));
    }
  }

  return files;
}
