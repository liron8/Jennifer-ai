import test from "node:test";
import assert from "node:assert/strict";
import { updateExecutiveSchema } from "./executive";

test("religion accepts allowed dropdown values", () => {
  const parsed = updateExecutiveSchema.parse({ religion: "Christian" });
  assert.equal(parsed.religion, "Christian");
});

test("religion normalizes legacy spellings and none-like values", () => {
  const legacy = updateExecutiveSchema.parse({ religion: "christen" });
  assert.equal(legacy.religion, "Christian");

  const noneLike = updateExecutiveSchema.parse({ religion: "N/A" });
  assert.equal(noneLike.religion, null);
});

test("religion rejects unsupported free text values", () => {
  assert.throws(() => {
    updateExecutiveSchema.parse({ religion: "Buddhist" });
  });
});

