import * as vscode from "vscode";
import { Context } from "./context";
import { ChildProcess, spawn } from "child_process";
import * as readline from "node:readline";
import { Readable } from "node:stream";

export function enableLaunchingDebugger(ctx: Context) {
  const debuggerLog = vscode.window.createOutputChannel("Cairo Debugger");
  ctx.extension.subscriptions.push(debuggerLog);

  const factory = new CairoDebugAdapterServerDescriptorFactory(debuggerLog);
  ctx.extension.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("cairo", factory),
  );
}

class CairoDebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  private debugAdapterProcesses: ChildProcess[] = [];

  constructor(private readonly debuggerLog: vscode.OutputChannel) {}

  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const program_arg = session.configuration["program"] as string;
    const args = program_arg.split(/\s+/g);
    const program = args.shift()!;

    const logLevel = session.configuration["logLevel"] || "warn";

    const adapterProcess = spawn(program, args, {
      stdio: "pipe",
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      env: { ...process.env, CAIRO_DEBUGGER_LOG: logLevel },
    });

    this.debugAdapterProcesses.push(adapterProcess);

    adapterProcess.stderr.on("data", (data: Buffer) => {
      this.debuggerLog.append(data.toString());
    });

    return this.waitForFreePort(adapterProcess.stdout).then(
      (port) => new vscode.DebugAdapterServer(port),
    );
  }

  async waitForFreePort(adapterStdout: Readable): Promise<number> {
    const lineReader = readline.createInterface({ input: adapterStdout });

    // Wait for the server to print the port number it is listening on.
    for await (let line of lineReader) {
      line = line.trim();
      const matches = line.match("DEBUGGER PORT: ([0-9]*)");
      if (matches !== null) {
        const port = parseInt(matches[1]!, 10);
        return Promise.resolve(port);
      }
    }

    throw Error("Have not received a port number from the adapter");
  }

  dispose(): void {
    for (const process of this.debugAdapterProcesses) {
      process.kill();
    }

    for (const process of this.debugAdapterProcesses) {
      // For good measure.
      if (process.exitCode === undefined) process.kill("SIGKILL");
    }
  }
}
