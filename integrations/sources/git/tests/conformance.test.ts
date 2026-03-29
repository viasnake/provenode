import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { runSourceAdapterConformance } from "../../../../packages/source-core/src/index.js";
import { GitSourceAdapter } from "../src/index.js";

const execFileAsync = promisify(execFile);

describe("GitSourceAdapter", () => {
  it("passes source adapter conformance", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "akb-git-adapter-"));

    await execFileAsync("git", ["-C", repoPath, "init"]);
    await execFileAsync("git", ["-C", repoPath, "config", "user.name", "AKB Test"]);
    await execFileAsync("git", ["-C", repoPath, "config", "user.email", "akb-test@example.com"]);

    await writeFile(join(repoPath, "README.md"), "# hello\n", "utf-8");
    await execFileAsync("git", ["-C", repoPath, "add", "README.md"]);
    await execFileAsync("git", ["-C", repoPath, "commit", "-m", "test"]);

    const adapter = new GitSourceAdapter("git:test", repoPath);
    await expect(runSourceAdapterConformance(adapter)).resolves.toBeUndefined();
  });
});
