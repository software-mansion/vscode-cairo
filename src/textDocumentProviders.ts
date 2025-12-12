import * as lc from "vscode-languageclient/node";
import * as vscode from "vscode";
import { Context } from "./context";
import {
  expandMacro,
  viewSyntaxTree,
  vfsProvide,
  viewAnalyzedCrates,
  showMemoryUsage,
} from "./lspRequests";
import { AnsiDecorationProvider } from "./ansi";

export const registerVfsProvider = (client: lc.LanguageClient, ctx: Context) => {
  const vfsProvider: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      const res = await client.sendRequest(vfsProvide, {
        uri: uri.toString(),
      });

      return res.content ?? "";
    },
  };

  ctx.extension.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("vfs", vfsProvider),
  );
};

export const registerMacroExpandProvider = (client: lc.LanguageClient, ctx: Context) => {
  const uri = vscode.Uri.parse("cairo-expand-macro://expandMacro/[EXPANSION].cairo");
  const eventEmitter = new vscode.EventEmitter<vscode.Uri>();

  const tdcp: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(): Promise<string> {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return "";

      const position = editor.selection.active;

      const expanded = await client.sendRequest(expandMacro, {
        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(editor.document),
        position,
      });

      return expanded ?? "Not available";
    },
    onDidChange: eventEmitter.event,
  };

  ctx.extension.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("cairo-expand-macro", tdcp),
  );

  ctx.extension.subscriptions.push(
    vscode.commands.registerCommand("cairo.expandMacro", async () => {
      const document = await vscode.workspace.openTextDocument(uri);

      eventEmitter.fire(uri);

      return vscode.window.showTextDocument(document, vscode.ViewColumn.Two, true);
    }),
  );
};

export const registeShowMemoryUsageProvider = (client: lc.LanguageClient, ctx: Context) => {
  const uri = vscode.Uri.parse("show-memory-usage://memory-usage");
  const eventEmitter = new vscode.EventEmitter<vscode.Uri>();

  const tdcp: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(): Promise<string> {
      const expanded = await client.sendRequest(showMemoryUsage);

      return (
        JSON.stringify(expanded, null, 4) ??
        "Fetching memory usage failed. This may be caused by LS version that does not support this"
      );
    },
    onDidChange: eventEmitter.event,
  };

  ctx.extension.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("show-memory-usage", tdcp),
  );

  ctx.extension.subscriptions.push(
    vscode.commands.registerCommand("cairo.showMemoryUsage", async () => {
      const document = await vscode.workspace.openTextDocument(uri);

      eventEmitter.fire(uri);

      return vscode.window.showTextDocument(document, vscode.ViewColumn.Two, true);
    }),
  );
};

export const registerViewAnalyzedCratesProvider = (client: lc.LanguageClient, ctx: Context) => {
  const uri = vscode.Uri.parse(
    "cairo-view-analyzed-crates://viewAnalyzedCrates/[ANALYZED_CRATES].md",
  );
  const eventEmitter = new vscode.EventEmitter<vscode.Uri>();

  const tdcp: vscode.TextDocumentContentProvider = {
    provideTextDocumentContent: () => client.sendRequest(viewAnalyzedCrates),
    onDidChange: eventEmitter.event,
  };

  ctx.extension.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("cairo-view-analyzed-crates", tdcp),
  );

  ctx.extension.subscriptions.push(
    vscode.commands.registerCommand("cairo.viewAnalyzedCrates", async () => {
      const document = await vscode.workspace.openTextDocument(uri);

      eventEmitter.fire(uri);

      return vscode.window.showTextDocument(document, vscode.ViewColumn.Two, true);
    }),
  );

  ctx.extension.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const path = e.document.uri.path;
      const relevantSuffixes = [".cairo", "Scarb.toml", "Scarb.lock", "cairo_project.toml"];

      for (const suffix of relevantSuffixes) {
        if (path.endsWith(suffix)) {
          eventEmitter.fire(uri);
          break;
        }
      }
    }),
  );
};

export const registerViewSyntaxTreeProvider = (client: lc.LanguageClient, ctx: Context) => {
  let uriPostfix = 0;

  const provider = new AnsiDecorationProvider();
  let decorations = new Map<string, vscode.Range[]>();

  const tdcp: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(): Promise<string> {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return "No file selected, please click on a file";

      const position = editor.selection.active;
      const syntaxTree = await client.sendRequest(viewSyntaxTree, {
        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(editor.document),
        position,
      });

      if (syntaxTree === null) {
        return "Not available, please click on a file with cairo code";
      }

      decorations = AnsiDecorationProvider.extractDecorationsRanges(syntaxTree);

      return AnsiDecorationProvider.getTextWithoutAnsi(syntaxTree);
    },
  };

  ctx.extension.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("cairo-view-syntax-tree", tdcp),
  );

  ctx.extension.subscriptions.push(
    vscode.commands.registerCommand("cairo.viewSyntaxTree", async () => {
      const uri = vscode.Uri.parse(
        `cairo-view-syntax-tree://viewSyntaxTree/[SYNTAX_TREE_${uriPostfix}].txt`,
      );
      uriPostfix += 1;
      const document = await vscode.workspace.openTextDocument(uri);

      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Two, true);

      provider.setDecorations(decorations, editor);
    }),
  );

  // TODO: re-request on file change
};
