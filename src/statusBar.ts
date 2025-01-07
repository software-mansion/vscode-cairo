import * as vscode from "vscode";
import * as lc from "vscode-languageclient/node";
import type { Context } from "./context";
import { toolchainInfo } from "./lspRequests";
import { Scarb } from "./scarb";
import { timeout } from "promise-timeout";

const CAIRO_STATUS_BAR_COMMAND = "cairo1.statusBar.clicked";

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private client?: lc.LanguageClient | undefined;

  constructor(private readonly context: Context) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    this.context.extension.subscriptions.push(this.statusBarItem);
  }

  public async setup(client?: lc.LanguageClient): Promise<void> {
    this.client = client;

    this.context.extension.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(() => {
        this.update();
      }),
    );

    this.context.extension.subscriptions.push(
      vscode.commands.registerCommand(CAIRO_STATUS_BAR_COMMAND, () => {
        if (client) {
          client.outputChannel.show();
        } else {
          vscode.window.showWarningMessage("Cairo Language Server is not active");
        }
      }),
    );

    await this.initializeStatusBarItem();
  }

  private async initializeStatusBarItem(): Promise<void> {
    this.statusBarItem.command = CAIRO_STATUS_BAR_COMMAND;
    this.statusBarItem.text = "Cairo";
    this.statusBarItem.tooltip = "Cairo Language";

    await this.updateScarbVersion();
  }

  private async updateScarbVersion(): Promise<void> {
    if (this.client) {
      try {
        const request = this.client.sendRequest(toolchainInfo);

        // TODO(#50) When there is no handler for method on server it never resolves instead of failing.
        const response = await timeout(request, 1000);

        this.statusBarItem.tooltip = `Cairo Language Server ${response.ls.version} (${response.ls.path})`;

        if (response.scarb) {
          this.statusBarItem.tooltip += `\n${response.scarb.version}`;
        }
      } catch {
        this.context.log.trace("Status bar: Falling back to old version resolution");
        // TODO(#50) Remove this later.
        try {
          const scarb = await Scarb.find(vscode.workspace.workspaceFolders?.[0], this.context);
          if (scarb) {
            const version = await scarb.getVersion(this.context);
            this.statusBarItem.tooltip = `Cairo Language\n${version}`;
          }
        } catch (error) {
          this.context.log.error(`Error getting Scarb version: ${error}`);
        }
      }
    }
  }

  /**
   * Updates the status bar item based on the current workspace configuration.
   */
  private async update(): Promise<void> {
    const config = vscode.workspace.getConfiguration("cairo1");
    const showInStatusBar = config.get<boolean>("showInStatusBar", true);

    if (showInStatusBar) {
      await this.updateScarbVersion();
      this.showStatusBarItem();
    } else {
      this.hideStatusBarItem();
    }
  }

  public showStatusBarItem(): void {
    this.statusBarItem.show();
  }

  public hideStatusBarItem(): void {
    this.statusBarItem.hide();
  }
}
