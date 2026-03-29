import { describe, expect, it } from "vitest";

import { isCanonicalId, parseCanonicalId } from "../src/index.js";

describe("canonical ID", () => {
  it("parses valid canonical ids", () => {
    const parsed = parseCanonicalId("entity:product:arbiter");
    expect(parsed.kind).toBe("entity");
    expect(parsed.namespace).toBe("product");
    expect(parsed.slug).toBe("arbiter");
  });

  it("rejects invalid canonical ids", () => {
    expect(isCanonicalId("entity:only-two-segments")).toBe(false);
    expect(isCanonicalId("invalid:kind:slug")).toBe(false);
  });
});
