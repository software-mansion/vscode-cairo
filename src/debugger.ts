import * as vscode from "vscode";
import { Context } from "./context";
import { ChildProcess, spawn } from "child_process";
import * as readline from "node:readline";
import { Readable } from "node:stream";
import { DebuggerSessionConfig } from "./config_debugger";
import { checkTool, findToolInPath } from "./toolchain";
import * as fs from "fs";

export function enableLaunchingDebugger(ctx: Context) {
  const debuggerLog = vscode.window.createOutputChannel("Cairo Debugger Logs");
  const debuggerOutput = vscode.window.createOutputChannel("Cairo Debugger Output");
  ctx.extension.subscriptions.push(debuggerLog);

  const factory = new CairoDebugAdapterServerDescriptorFactory(debuggerLog, debuggerOutput);
  ctx.extension.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("cairo", factory),
  );
}

class CairoDebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  private debugAdapterProcesses: ChildProcess[] = [];

  constructor(
    private readonly debuggerLog: vscode.OutputChannel,
    private readonly debuggerOutput: vscode.OutputChannel,
  ) {}

  async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): Promise<vscode.DebugAdapterDescriptor | undefined | null> {
    const config = new DebuggerSessionConfig(session.configuration);

    let program_arg = config.get("program");
    if (program_arg === undefined) {
      throw Error("program property must be a set");
    }

    program_arg = program_arg.trim();
    if (program_arg === "") {
      throw Error("program property must be a non-empty string");
    }

    const args = program_arg.split(/\s+/g);

    const program = args.shift()!;
    // Find the program in PATH. In case of failure treat it as a path to the executable.
    const programAbsolutPathChecked = (await findToolInPath(program)) ?? (await checkTool(program));
    if (programAbsolutPathChecked === undefined) {
      throw Error(`configured program does not exist or is not an executable: ${program}`);
    }

    const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    const cwd = config.get("processCwd") ?? workspaceDir;
    if (!isDirectory(cwd)) {
      throw Error(`configured processCwd is not a directory: ${cwd}`);
    }

    const logLevel = config.get("logLevel", "warn");
    const envs = config.get("programExtraEnv", {});

    const adapterProcess = spawn(programAbsolutPathChecked, args, {
      stdio: "pipe",
      cwd,
      env: { ...process.env, SNFORGE_LOG: `off,cairo_debugger=${logLevel}`, ...envs },
    });

    this.debugAdapterProcesses.push(adapterProcess);

    // Show the debugger output and debug view to make the feedback loop better -
    // otherwise a user may think sth is broken, even though we are just
    // e.g. waiting for the compilation to finish.
    this.debuggerOutput.show(true);
    await vscode.commands.executeCommand("workbench.view.debug");

    adapterProcess.stderr.on("data", (data: Buffer) => {
      this.debuggerLog.append(data.toString());
    });
    adapterProcess.stdout.on("data", (data: Buffer) => {
      this.debuggerOutput.append(data.toString());
    });

    const port = await this.waitForFreePort(adapterProcess.stdout);

    return new vscode.DebugAdapterServer(port);
  }

  async waitForFreePort(adapterStdout: Readable): Promise<number> {
    const lineReader = readline.createInterface({ input: adapterStdout });

    // Wait for the server to print the port number it is listening on.
    for await (let line of lineReader) {
      line = line.trim();
      const matches = line.match("DEBUGGER PORT: ([0-9]+)");
      if (matches !== null) {
        const port = parseInt(matches[1]!, 10);
        return Promise.resolve(port);
      }
    }

    throw Error(
      "Have not received a port number from the program. Check `Cairo Debugger Output` output for details.",
    );
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

function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}
