import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runSourceAdapterConformance } from "../../../../packages/source-core/src/index.js";
import { MarkdownSourceAdapter } from "../src/index.js";

describe("MarkdownSourceAdapter", () => {
  it("passes source adapter conformance", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "akb-md-adapter-"));
    await writeFile(join(rootPath, "README.md"), "# hello\n", "utf-8");
    await writeFile(join(rootPath, "notes.txt"), "ignored\n", "utf-8");

    const adapter = new MarkdownSourceAdapter("markdown:test", rootPath);
    await expect(runSourceAdapterConformance(adapter)).resolves.toBeUndefined();
  });
});
