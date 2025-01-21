import * as vscode from "vscode";
import { SemanticTokensFeature } from "vscode-languageclient/lib/common/semanticTokens";

import * as lc from "vscode-languageclient/node";
import { Context } from "./context";
import { Scarb } from "./scarb";
import {
  registerMacroExpandProvider,
  registerViewSyntaxTreeProvider,
  registerVfsProvider,
  registerViewAnalyzedCratesProvider,
} from "./textDocumentProviders";

import { executablesEqual, getLSExecutables, LSExecutable } from "./lsExecutable";
import assert from "node:assert";
import { projectConfigParsingFailed } from "./lspRequests";

function notifyScarbMissing(ctx: Context) {
  const errorMessage =
    "This is a Scarb project, but could not find Scarb executable on this machine. " +
    "Please add Scarb to the PATH environmental variable or set the 'cairo1.scarbPath' configuration " +
    "parameter. Otherwise Cairo code analysis will not work.";
  void vscode.window.showWarningMessage(errorMessage);
  ctx.log.error(errorMessage);
}

export interface SetupResult {
  client: lc.LanguageClient;
  executable: LSExecutable;
}

export async function setupLanguageServer(ctx: Context): Promise<SetupResult | undefined> {
  const executables = await getLSExecutables(vscode.workspace.workspaceFolders || [], ctx);
  if (executables.length === 0) {
    return;
  }

  const sameCommand = await executablesEqual(executables);
  if (!sameCommand) {
    await vscode.window.showErrorMessage(
      "Using multiple Scarb versions in one workspace is not supported.",
    );
    return;
  }

  // First one is good as any of them since they should be all the same at this point
  assert(executables[0], "executable should be present at this point");
  const [{ preparedInvocation: run, scarb }] = executables;

  setupEnv(run, ctx);
  ctx.log.debug(`using CairoLS: ${quoteServerExecutable(run)}`);

  const serverOptions = { run, debug: run };
  // We pass client options to maintain compability with older LS binaries.
  // Any pre 2.9.0 LS doesn't register files it wants to be informed about, it was done on the client side instead.
  const clientOptions: lc.LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "cairo" },
      { scheme: "vfs", language: "cairo" },
    ],
  };

  const client = new lc.LanguageClient(
    "cairoLanguageServer",
    "Cairo Language Server",
    serverOptions,
    clientOptions,
  );

  client.registerFeature(new SemanticTokensFeature(client));

  registerVfsProvider(client, ctx);
  registerMacroExpandProvider(client, ctx);
  registerViewAnalyzedCratesProvider(client, ctx);
  registerViewSyntaxTreeProvider(client, ctx);

  client.onNotification("scarb/could-not-find-scarb-executable", () => notifyScarbMissing(ctx));

  client.onNotification("scarb/resolving-start", () => {
    vscode.window.withProgress(
      {
        title: "Scarb is resolving the project...",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async () => {
        return new Promise((resolve) => {
          client.onNotification("scarb/resolving-finish", () => {
            resolve(null);
          });
        });
      },
    );
  });

  client.onNotification(
    new lc.NotificationType<
      { reason: "noMoreRetries"; retries: number; inMinutes: number } | { reason: "spawnFail" }
    >("cairo/procMacroServerInitializationFailed"),
    async (errorMessage) => {
      const goToLogs = "Go to logs";

      switch (errorMessage.reason) {
        case "noMoreRetries": {
          const { inMinutes, retries } = errorMessage;

          const selectedValue = await vscode.window.showErrorMessage(
            `Starting proc-macro-server failed ${retries} times in ${inMinutes} minutes, the proc-macro-server will not be restarted. Procedural macros will not be analyzed. See the output for more information`,
            goToLogs,
          );

          if (selectedValue === goToLogs) {
            client.outputChannel.show(true);
          }
          break;
        }
        case "spawnFail": {
          const selectedValue = await vscode.window.showErrorMessage(
            "Starting proc-macro-server failed, the proc-macro-server will not be restarted. Procedural macros will not be analyzed. See the output for more information",
            goToLogs,
          );

          if (selectedValue === goToLogs) {
            client.outputChannel.show(true);
          }
          break;
        }
      }
    },
  );

  client.onNotification(
    new lc.NotificationType<string>("cairo/corelib-version-mismatch"),
    async (errorMessage) => {
      const restart = "Restart CairoLS";
      const cleanScarbCache = "Clean Scarb cache and reload";

      const selectedValue = await vscode.window.showErrorMessage(
        errorMessage,
        restart,
        cleanScarbCache,
      );

      const restartLS = async () => {
        await client.restart();
      };

      switch (selectedValue) {
        case restart:
          await restartLS();
          break;
        case cleanScarbCache:
          await scarb?.cacheClean(ctx);
          await restartLS();
          break;
      }
    },
  );

  client.onNotification(new lc.NotificationType("cairo/scarb-metadata-failed"), async () => {
    const goToLogs = "Go to logs";

    const selectedValue = await vscode.window.showErrorMessage(
      "`scarb metadata` failed. Check if your project builds correctly via `scarb build`.",
      goToLogs,
    );

    if (selectedValue === goToLogs) {
      client.outputChannel.show(true);
    }
  });

  client.onNotification(projectConfigParsingFailed, async (params) => {
    const goToLogs = "Go to logs";

    const selectedValue = await vscode.window.showErrorMessage(
      `Failed to parse: ${params.projectConfigPath}. Project analysis will not be available.`,
      goToLogs,
    );

    if (selectedValue === goToLogs) {
      client.outputChannel.show(true);
    }
  });

  await client.start();

  return { client, executable: executables[0] };
}

export async function findScarbForWorkspaceFolder(
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  ctx: Context,
): Promise<Scarb | undefined> {
  const isScarbEnabled = ctx.config.get("enableScarb", false);
  if (!isScarbEnabled) {
    ctx.log.warn("Scarb integration is disabled");
    ctx.log.warn("note: set `cairo1.enableScarb` to `true` to enable it");
    return undefined;
  } else {
    try {
      return await Scarb.find(workspaceFolder, ctx);
    } catch (e) {
      ctx.log.error(`${e}`);
      ctx.log.error("note: Scarb integration is disabled due to this error");
      return undefined;
    }
  }
}

function setupEnv(serverExecutable: lc.Executable, ctx: Context) {
  const logEnv = {
    CAIRO_LS_LOG: buildEnvFilter(ctx),
    RUST_BACKTRACE: "1",
  };

  const extraEnv = ctx.config.get("languageServerExtraEnv");

  serverExecutable.options ??= {};
  serverExecutable.options.env = {
    // Inherit env from parent process.
    ...process.env,
    ...(serverExecutable.options.env ?? {}),
    ...logEnv,
    ...extraEnv,
  };
}

function buildEnvFilter(ctx: Context): string {
  const level = convertVscodeLogLevelToRust(ctx.log.logLevel);
  return level
    ? // CairoLS >= 2.9.1 is written in `cairo_language_server` crate,
      // while earlier versions are `cairo_lang_language_server`.
      // We want to support both for a while.
      `cairo_language_server=${level},cairo_lang_language_server=${level}`
    : "";
}

function convertVscodeLogLevelToRust(logLevel: vscode.LogLevel): string | null {
  switch (logLevel) {
    case vscode.LogLevel.Trace:
      return "trace";
    case vscode.LogLevel.Debug:
      return "debug";
    case vscode.LogLevel.Info:
      return "info";
    case vscode.LogLevel.Warning:
      return "warn";
    case vscode.LogLevel.Error:
      return "error";
    case vscode.LogLevel.Off:
      return null;
  }
}

function quoteServerExecutable(serverExecutable: lc.Executable): string {
  const parts: string[] = [];

  if (serverExecutable.options?.env) {
    for (const [key, value] of Object.entries(serverExecutable.options.env)) {
      parts.push(`${key}=${value}`);
    }
  }

  parts.push(serverExecutable.command);

  if (serverExecutable.args) {
    for (const arg of serverExecutable.args) {
      parts.push(arg);
    }
  }

  return parts.filter((s) => s.trim()).join(" ");
}
