import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as oniguruma from "vscode-oniguruma";
import * as vsctm from "vscode-textmate";

const wasmPath = require.resolve("vscode-oniguruma").replace(/main\.js$/, "onig.wasm");
const vscodeOnigurumaLib = fs
  .readFile(wasmPath)
  .then((wasmBin) => oniguruma.loadWASM(wasmBin.buffer))
  .then(() => ({
    createOnigScanner(patterns: string[]) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s: string) {
      return new oniguruma.OnigString(s);
    },
  }));

const cairoGrammar = fs
  .readFile(path.join(__filename, "..", "..", "..", "syntaxes", "cairo.tmLanguage.json"), "utf-8")
  .then((grammar) => JSON.parse(grammar) as vsctm.IRawGrammar);

// Create a registry that can create a grammar from a scope name.
const registry = new vsctm.Registry({
  onigLib: vscodeOnigurumaLib,
  loadGrammar: (scopeName) => {
    if (scopeName === "source.cairo") {
      return cairoGrammar;
    }
    throw new Error(`Unknown scope name: ${scopeName}`);
  },
});

/**
 * Highlights Cairo code using the Cairo TextMate grammar.
 */
export async function highlightCairoCode(code: string) {
  const grammar = await registry.loadGrammar("source.cairo");
  if (!grammar) {
    throw new Error("Could not load scope: source.cairo");
  }

  const output = [];
  let ruleStack = null;
  for (const line of code.split(/\r\n|\n/)) {
    const { tokens, ruleStack: ruleStack1 } = grammar.tokenizeLine(line, ruleStack);
    ruleStack = ruleStack1;

    for (const token of tokens) {
      // Skip tokens for whitespace, if token scope is just `source.cairo`.
      const isWhitespace = line.slice(token.startIndex, token.endIndex).trim() === "";
      const isJustCairoScope = token.scopes.length === 1 && token.scopes[0] === "source.cairo";
      if (isWhitespace && isJustCairoScope) {
        continue;
      }

      // Highlight matched token and describe its scopes.
      const tokenText = escapeWhitespace(line.slice(token.startIndex, token.endIndex)).padEnd(20);
      const scopes = token.scopes.join(" ");
      output.push(`${tokenText} ${scopes}`);
    }
  }
  return output.join("\n");
}

function escapeWhitespace(str: string) {
  return str.replace(/\s/g, (char) => {
    switch (char) {
      case "\n":
        return "↩";
      case "\t":
        return "⇥";
      default:
        return "␣";
    }
  });
}
