import assert from "assert/strict";
import test from "node:test";
import snippets from "../test-support/cairo-snippets.gen";
import { highlightCairoCode } from "../test-support/grammar";
import { snap } from "../test-support/snapshots";

void test("highlighting cairo-lang-parser tests", async (t) => {
  for (const code of snippets) {
    const testName = code.replace(/\s+/g, " ").slice(0, 20);

    await t.test(testName, async () => {
      const syntax = await highlightCairoCode(code);
      const actual = `\
//! > cairo_code
${code}

//! > syntax
${syntax}
`;
      const snapshot = await snap(code, actual);
      assert.equal(actual, snapshot);
    });
  }
});
