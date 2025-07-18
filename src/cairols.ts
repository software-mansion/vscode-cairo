import * as vscode from "vscode";
import { SemanticTokensFeature } from "vscode-languageclient/lib/common/semanticTokens";

import * as lc from "vscode-languageclient/node";
import { Context } from "./context";
import { Scarb } from "./scarb";
import {
  registerMacroExpandProvider,
  registerVfsProvider,
  registerViewAnalyzedCratesProvider,
} from "./textDocumentProviders";

import { executablesEqual, getLSExecutables, LSExecutable } from "./lsExecutable";
import assert from "node:assert";
import { ViewSyntaxTreeCapability } from "./capabilities";
import { MessageType, ShowMessageParams } from "vscode-languageclient/node";

function notifyScarbMissing(ctx: Context) {
  const message =
    "This is a Scarb project, but could not find Scarb executable on this machine. " +
    "Please add Scarb to the PATH environmental variable or set the 'cairo1.scarbPath' configuration " +
    "parameter. Otherwise Cairo code analysis will not work.";
  void ctx.statusBar.setStatus({ health: "warning", message });
  ctx.log.error(message);
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
    await ctx.statusBar.setStatus({
      health: "error",
      message: "Using multiple Scarb versions in one workspace is not supported.",
    });
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

  ctx.extension.subscriptions.push(
    client.onNotification("scarb/could-not-find-scarb-executable", () => notifyScarbMissing(ctx)),
  );

  ctx.extension.subscriptions.push(
    client.onNotification(
      new lc.NotificationType<{ command: string; cwd: string }>("cairo/executeInTerminal"),
      ({ command, cwd }) => {
        // Use task instead of vscode.window.crateTerminal() so it is easy to close after job is finished.
        const task = new vscode.Task(
          { type: "shell" },
          vscode.TaskScope.Workspace,
          // This task is unrepeatable and it is not registered so following are unused.
          "", // Name does not matter.
          "CairoLS", // Source does not matter but if empty VSC is ignoring this task.
          new vscode.ShellExecution(command, { cwd }),
        );

        vscode.tasks.executeTask(task);
      },
    ),
  );

  ctx.extension.subscriptions.push(
    client.onNotification(
      new lc.NotificationType<string>("cairo/corelib-version-mismatch"),
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (message) => {
        await ctx.statusBar.setStatus({ health: "error", message });

        const restart = "Restart CairoLS";
        const cleanScarbCache = "Clean Scarb cache and reload";

        const selectedValue = await vscode.window.showErrorMessage(
          message,
          restart,
          cleanScarbCache,
        );

        const restartLS = async () => {
          await client.restart();
          await ctx.statusBar.reset();
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
    ),
  );

  ctx.extension.subscriptions.push(
    client.onNotification(
      new lc.NotificationType<ShowMessageParams>("window/showMessage"),
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (message) => {
        switch (message.type) {
          case MessageType.Error:
            await ctx.statusBar.setStatus({ health: "error", message: message.message });
            break;
          case MessageType.Warning:
            await ctx.statusBar.setStatus({ health: "warning", message: message.message });
            break;
          default:
            break;
        }
      },
    ),
  );

  client.registerFeature(new ViewSyntaxTreeCapability(client, ctx));

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
