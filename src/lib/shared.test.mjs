import test from "node:test";
import assert from "node:assert/strict";
import { TimeboxedSet } from "./shared.mjs";

test("TimeboxedSet expires keys after TTL", async () => {
  const store = new TimeboxedSet(20);
  store.add("a");
  assert.equal(store.has("a"), true);

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(store.has("a"), false);
});
