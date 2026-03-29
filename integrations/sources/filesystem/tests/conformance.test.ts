import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runSourceAdapterConformance } from "../../../../packages/source-core/src/index.js";
import { FilesystemSourceAdapter } from "../src/index.js";

describe("FilesystemSourceAdapter", () => {
  it("passes source adapter conformance", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "akb-fs-adapter-"));
    await writeFile(join(rootPath, "README.md"), "# hello\n", "utf-8");

    const adapter = new FilesystemSourceAdapter("filesystem:test", rootPath);
    await expect(runSourceAdapterConformance(adapter)).resolves.toBeUndefined();
  });
});
