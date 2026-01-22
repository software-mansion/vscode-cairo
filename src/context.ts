import * as vscode from "vscode";
import { Config } from "./config";
import { RootLogOutputChannel } from "./logging";
import { StatusBar } from "./statusBar";
import { ProcMacroStatusBar } from "./procMacroStatusBar";

export class Context {
  public static create(extensionContext: vscode.ExtensionContext): Context {
    const log = new RootLogOutputChannel(
      vscode.window.createOutputChannel("Cairo", {
        log: true,
      }),
    );

    extensionContext.subscriptions.push(log);

    return new Context(extensionContext, log);
  }

  public readonly config: Config = new Config();
  public readonly statusBar: StatusBar;
  public readonly procMacroStatusBar: ProcMacroStatusBar;

  private constructor(
    public readonly extension: vscode.ExtensionContext,
    public readonly log: RootLogOutputChannel,
  ) {
    this.statusBar = new StatusBar(this);
    this.procMacroStatusBar = new ProcMacroStatusBar(this);
  }
}
