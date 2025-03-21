import * as vscode from "vscode";
import * as lc from "vscode-languageclient/node";
import type { Context } from "./context";
import { toolchainInfo } from "./lspRequests";
import { Scarb } from "./scarb";
import { timeout } from "promise-timeout";
import { CairoExtensionManager } from "./extensionManager";

const CAIRO_STATUS_BAR_COMMAND = "cairo1.statusBar.clicked";

const CAIRO_STATUS_BAR_TXT = "Cairo";
const SPINNER = "$(loading~spin)";
const CAIRO_STATUS_BAR_SPINNING = `${CAIRO_STATUS_BAR_TXT} ${SPINNER}`;

export class StatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private client?: lc.LanguageClient | undefined;

  constructor(private readonly context: Context) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    this.context.extension.subscriptions.push(this.statusBarItem);
  }

  private startSpinning() {
    this.statusBarItem.text = CAIRO_STATUS_BAR_SPINNING;
  }

  private stopSpinning() {
    this.statusBarItem.text = CAIRO_STATUS_BAR_TXT;
  }

  private subscribeToStatusNotifications() {
    this.context.extension.subscriptions.push(
      this.client!.onNotification(
        "cairo/serverStatus",
        (serverStatusParams: { event: string; idle: boolean }) => {
          const { idle } = serverStatusParams;
          if (idle) {
            this.stopSpinning();
          } else {
            this.startSpinning();
          }
        },
      ),
    );
  }

  private handleClientChange(newClient?: lc.LanguageClient) {
    this.client = newClient;
    if (newClient) {
      this.subscribeToStatusNotifications();
    }
  }

  public async setup(extensionManager: CairoExtensionManager): Promise<void> {
    // Handle initial client value since it might be already initialized
    this.handleClientChange(extensionManager.getClient());

    extensionManager.onNewClient((newClient) => this.handleClientChange(newClient));

    this.context.extension.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async () => {
        await this.update();
      }),
    );

    this.context.extension.subscriptions.push(
      vscode.commands.registerCommand(CAIRO_STATUS_BAR_COMMAND, () => {
        const client = this.client;
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
    this.statusBarItem.text = CAIRO_STATUS_BAR_TXT;
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
