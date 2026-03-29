#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, join, resolve } from "node:path";

import { getEntityById } from "@akb/application-query";
import { syncSource } from "@akb/application-source-sync";
import type { Claim, Entity, Evidence } from "@akb/domain-model";
import { isCanonicalId } from "@akb/domain-model";
import { FilesystemSourceAdapter } from "@akb/source-filesystem";
import { GitSourceAdapter } from "@akb/source-git";
import { MarkdownSourceAdapter } from "@akb/source-markdown";
import { FilesystemObjectStore } from "@akb/store-filesystem-object";
import { SqliteTransactionManager } from "@akb/store-sqlite";

interface SourceConfig {
  id: string;
  type: "filesystem" | "markdown" | "git";
  location: string;
}

interface AkbConfig {
  workspacePath: string;
  sources: SourceConfig[];
}

const DEFAULT_CONFIG_DIR = ".akb";
const CONFIG_FILE_NAME = "config.json";
const DEFAULT_DB_NAME = "main.db";
const DEFAULT_PORT = 8080;

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "init":
      await initCommand(args);
      break;
    case "source":
      await sourceCommand(args);
      break;
    case "entity":
      await entityCommand(args);
      break;
    case "knowledge":
      await knowledgeCommand(args);
      break;
    case "search":
      await searchCommand(args);
      break;
    case "ask":
      await askCommand(args);
      break;
    case "artifact":
      await artifactCommand(args);
      break;
    case "review":
      await reviewCommand(args);
      break;
    case "publish":
      await publishCommand(args);
      break;
    case "serve":
      await serveCommand(args);
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function initCommand(args: string[]): Promise<void> {
  const pathIndex = args.findIndex((arg) => arg === "--path");
  const workspacePath =
    pathIndex >= 0 && args[pathIndex + 1] ? resolve(args[pathIndex + 1]) : process.cwd();

  const configDirPath = join(workspacePath, DEFAULT_CONFIG_DIR);
  const configPath = join(configDirPath, CONFIG_FILE_NAME);

  await mkdir(configDirPath, { recursive: true });
  const initialConfig: AkbConfig = {
    workspacePath,
    sources: [],
  };
  await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");
  process.stdout.write(`Initialized AKB workspace: ${workspacePath}\n`);
}

async function sourceCommand(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "add":
      await sourceAddCommand(rest);
      break;
    case "sync":
      await sourceSyncCommand();
      break;
    default:
      throw new Error(`Unknown source subcommand: ${subcommand ?? "<empty>"}`);
  }
}

async function sourceAddCommand(args: string[]): Promise<void> {
  const [type, location] = args as [SourceConfig["type"], string];
  if (!type || !location) {
    throw new Error("Usage: akb source add <filesystem|markdown|git> <path>");
  }

  const configPath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, CONFIG_FILE_NAME);
  const config = await loadConfig(configPath);

  const sourceId = `${type}:${config.sources.length + 1}`;
  if (!isSafeSourceId(sourceId)) {
    throw new Error("generated source id failed validation");
  }
  config.sources.push({
    id: sourceId,
    type,
    location: resolve(location),
  });

  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  process.stdout.write(`Added source ${sourceId}: ${type} ${location}\n`);
}

async function sourceSyncCommand(): Promise<void> {
  const configPath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, CONFIG_FILE_NAME);
  const config = await loadConfig(configPath);
  const objectStorePath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "object-store");
  const objectStore = new FilesystemObjectStore(objectStorePath);
  const databasePath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "data", DEFAULT_DB_NAME);
  const manager = await SqliteTransactionManager.open(databasePath);

  for (const source of config.sources) {
    if (!isSafeSourceId(source.id)) {
      throw new Error(`unsafe source id detected: ${source.id}`);
    }

    const adapter = createAdapter(source);
    const result = await syncSource(
      {
        id: source.id,
        adapter,
      },
      objectStore,
    );
    process.stdout.write(
      `source=${result.sourceId} type=${result.sourceType} changes=${result.discoveredChanges} stored=${result.storedObjects}\n`,
    );

    for (const object of result.objects) {
      const slug = toSlug(object.objectId);
      const now = new Date().toISOString();
      const metadata = {
        visibility: "internal",
        reviewStatus: "unreviewed",
        freshnessClass: "fresh",
        conflictStatus: "none",
        trustLevel: "medium",
        version: "0.1.0",
      } as const;

      const entity: Entity = {
        id: `entity:document:${slug}`,
        type: "document",
        name: basename(object.objectId),
        summary: firstNonEmptyLine(object.content) ?? "Imported source object",
        aliases: [object.objectId],
        sourceRefs: [source.id],
        metadata,
        createdAt: now,
        updatedAt: now,
      };

      const evidence: Evidence = {
        id: `evidence:source:${slug}`,
        evidenceType: "source_snippet",
        sourceRef: source.id,
        locator: object.objectId,
        excerpt: object.content.slice(0, 240),
        capturedAt: now,
        integrityHash: `len-${object.content.length}`,
        metadata,
      };

      const claim: Claim = {
        id: `claim:document:${slug}`,
        claimType: "attribute",
        subjectRef: entity.id,
        predicate: "has_content",
        literalValue: object.content.slice(0, 80),
        statement: `Document ${entity.name} has imported content.`,
        evidenceRefs: [evidence.id],
        sourceRefs: [source.id],
        metadata,
        lastVerifiedAt: now,
      };

      await manager.withTransaction(async (tx) => {
        await tx.entities.upsert(entity);
        await tx.evidence.upsert(evidence);
        await tx.claims.upsert(claim);
      });
    }
  }
}

async function entityCommand(args: string[]): Promise<void> {
  const [subcommand, id] = args;
  if (subcommand !== "show" || !id) {
    throw new Error("Usage: akb entity show <canonical-id>");
  }

  if (!isCanonicalId(id)) {
    throw new Error(`Invalid canonical ID: ${id}`);
  }

  const databasePath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "data", DEFAULT_DB_NAME);
  const manager = await SqliteTransactionManager.open(databasePath);
  const result = await manager.withTransaction((tx) => getEntityById(tx.entities, id));

  if (result.status === "not_found") {
    process.stdout.write(
      `${JSON.stringify(
        {
          id,
          status: "not-found",
          message: "Entity is not available in local store yet.",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ok",
        entity: result.entity,
      },
      null,
      2,
    )}\n`,
  );
}

function createAdapter(source: SourceConfig) {
  switch (source.type) {
    case "filesystem":
      return new FilesystemSourceAdapter(source.id, source.location);
    case "markdown":
      return new MarkdownSourceAdapter(source.id, source.location);
    case "git":
      return new GitSourceAdapter(source.id, source.location);
  }
}

async function knowledgeCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  if (subcommand !== "refresh") {
    throw new Error("Usage: akb knowledge refresh");
  }

  await sourceSyncCommand();
}

async function searchCommand(args: string[]): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    throw new Error("Usage: akb search <query>");
  }

  const objectStorePath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "object-store");
  const objectStore = new FilesystemObjectStore(objectStorePath);
  const keys = await objectStore.list("raw");

  const matched: Array<{ key: string; excerpt: string }> = [];
  for (const key of keys) {
    const value = await objectStore.get(key);
    if (!value) {
      continue;
    }
    if (value.toLowerCase().includes(query.toLowerCase())) {
      matched.push({
        key,
        excerpt: value.slice(0, 120),
      });
    }
  }

  process.stdout.write(
    `${JSON.stringify({ query, count: matched.length, items: matched }, null, 2)}\n`,
  );
}

async function askCommand(args: string[]): Promise<void> {
  const question = args.join(" ").trim();
  if (!question) {
    throw new Error("Usage: akb ask <question>");
  }

  const objectStorePath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "object-store");
  const objectStore = new FilesystemObjectStore(objectStorePath);
  const keys = await objectStore.list("raw");
  const related = keys.slice(0, 3);

  process.stdout.write(
    `${JSON.stringify(
      {
        question,
        answer: "Insufficient confidence for a deterministic answer in bootstrap mode.",
        confidence: "low",
        freshness: "fresh",
        related,
      },
      null,
      2,
    )}\n`,
  );
}

async function artifactCommand(args: string[]): Promise<void> {
  const [subcommand, artifactIdRaw] = args;
  if (subcommand !== "build") {
    throw new Error("Usage: akb artifact build <artifact-id>");
  }

  const artifactId = artifactIdRaw ?? "artifact:article:bootstrap";
  const artifactSlug = toSlug(artifactId);
  const artifactDir = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "artifacts");
  await mkdir(artifactDir, { recursive: true });

  const artifactPath = join(artifactDir, `${artifactSlug}.md`);
  const content = `# Artifact\n\n- id: ${artifactId}\n- generated_at: ${new Date().toISOString()}\n`; // bootstrap artifact
  await writeFile(artifactPath, content, "utf-8");

  process.stdout.write(`Built artifact: ${artifactPath}\n`);
}

async function reviewCommand(args: string[]): Promise<void> {
  const [subcommand, reviewId] = args;
  const reviewPath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "review.json");
  const state = await loadJsonFile<{ pending: string[]; approved: string[] }>(reviewPath, {
    pending: [],
    approved: [],
  });

  if (subcommand === "list") {
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    return;
  }

  if (subcommand === "approve") {
    if (!reviewId) {
      throw new Error("Usage: akb review approve <id>");
    }
    state.pending = state.pending.filter((v) => v !== reviewId);
    if (!state.approved.includes(reviewId)) {
      state.approved.push(reviewId);
    }
    await writeFile(reviewPath, JSON.stringify(state, null, 2), "utf-8");
    process.stdout.write(`Approved review item: ${reviewId}\n`);
    return;
  }

  throw new Error("Usage: akb review <list|approve>");
}

async function publishCommand(args: string[]): Promise<void> {
  const [artifactId] = args;
  if (!artifactId) {
    throw new Error("Usage: akb publish <artifact-id>");
  }

  const reviewPath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "review.json");
  const reviewState = await loadJsonFile<{ pending: string[]; approved: string[] }>(reviewPath, {
    pending: [],
    approved: [],
  });
  if (!reviewState.approved.includes(artifactId)) {
    throw new Error("artifact is not approved in review state");
  }

  const publishPath = resolve(process.cwd(), DEFAULT_CONFIG_DIR, "publish.json");
  const state = await loadJsonFile<{ published: string[] }>(publishPath, { published: [] });
  if (!state.published.includes(artifactId)) {
    state.published.push(artifactId);
  }
  await writeFile(publishPath, JSON.stringify(state, null, 2), "utf-8");
  process.stdout.write(`Published artifact: ${artifactId}\n`);
}

async function serveCommand(args: string[]): Promise<void> {
  const portIndex = args.findIndex((arg) => arg === "--port");
  const port =
    portIndex >= 0 && args[portIndex + 1] ? Number.parseInt(args[portIndex + 1], 10) : DEFAULT_PORT;

  const server = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        service: "akb-local-server",
        status: "ok",
        mode: "single-process",
      }),
    );
  });

  await new Promise<void>((resolvePromise) => {
    server.listen(port, "127.0.0.1", () => {
      process.stdout.write(`AKB server listening on http://127.0.0.1:${port}\n`);
      resolvePromise();
    });
  });
}

async function loadConfig(configPath: string): Promise<AkbConfig> {
  const content = await readFile(configPath, "utf-8");
  return JSON.parse(content) as AkbConfig;
}

async function loadJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 64);
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function isSafeSourceId(value: string): boolean {
  return /^[a-z0-9:-]+$/.test(value);
}

function printHelp(): void {
  const message = [
    "AKB CLI (bootstrap)",
    "",
    "Commands:",
    "  akb init [--path <workspace>]",
    "  akb source add <filesystem|markdown|git> <path>",
    "  akb source sync",
    "  akb knowledge refresh",
    "  akb entity show <canonical-id>",
    "  akb search <query>",
    "  akb ask <question>",
    "  akb artifact build <artifact-id>",
    "  akb review list",
    "  akb review approve <id>",
    "  akb publish <artifact-id>",
    "  akb serve [--port <number>]",
  ].join("\n");

  process.stdout.write(`${message}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
