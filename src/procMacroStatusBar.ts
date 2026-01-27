import * as vscode from "vscode";
import * as lc from "vscode-languageclient/node";
import { Context } from "./context";
import { PROC_MACRO_STATUS_BAR_PRIORITY, STATUS_BAR_SPINNER } from "./consts";
import { CairoExtensionManager } from "./extensionManager";

interface ProcMacroStatusParams {
  event: string;
  idle: boolean;
}

export class ProcMacroStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private client?: lc.LanguageClient | undefined;

  constructor(private readonly context: Context) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      PROC_MACRO_STATUS_BAR_PRIORITY,
    );
    // As for now, the message stays static, but with more detailed status updates in the future, it can be changed.
    this.statusBarItem.text = `Building procedural macros ${STATUS_BAR_SPINNER}`;
    this.statusBarItem.hide();
    this.context.extension.subscriptions.push(this.statusBarItem);
  }

  private subscribeToStatusNotifications() {
    this.context.extension.subscriptions.push(
      this.client!.onNotification(
        "cairo/procMacroServerStatus",
        (procMacroServerStatusParams: ProcMacroStatusParams) => {
          this.updateStatusBar(procMacroServerStatusParams);
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

  private updateStatusBar(procMacroServerStatusParams: ProcMacroStatusParams) {
    const { idle } = procMacroServerStatusParams;
    if (idle) {
      this.statusBarItem.hide();
    } else {
      this.statusBarItem.show();
    }
  }

  public setup(extensionManager: CairoExtensionManager) {
    this.handleClientChange(extensionManager.getClient());
    extensionManager.onNewClient((newClient) => this.handleClientChange(newClient));
  }
}
