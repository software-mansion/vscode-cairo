import * as lc from "vscode-languageclient/node";
import { Context } from "./context";
import { registerViewSyntaxTreeProvider } from "./textDocumentProviders";
import vscode from "vscode";

export class ViewSyntaxTreeCapability implements lc.DynamicFeature<"cairo/viewSyntaxTree"> {
  constructor(
    private readonly client: lc.LanguageClient,
    private readonly ctx: Context,
  ) {}

  registrationType = new lc.RegistrationType<"cairo/viewSyntaxTree">("cairo/viewSyntaxTree");

  getState(): lc.FeatureState {
    return { kind: "static" };
  }
  fillClientCapabilities(): void {
    return;
  }
  clear(): void {
    return;
  }
  initialize(): void {
    return;
  }

  async register(): Promise<void> {
    // We do it here to make sure the command is registered only when available.
    // We can do that since this registration happens only once per LS instance.
    registerViewSyntaxTreeProvider(this.client, this.ctx);
    await vscode.commands.executeCommand(
      "setContext",
      "cairo1.viewSyntaxTreeCommandAvailable",
      true,
    );
  }

  unregister(): void {
    return;
  }
}
