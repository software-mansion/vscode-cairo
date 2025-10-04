import * as vscode from "vscode";
import { Context } from "./context";
import { ChildProcess, spawn } from "child_process";
import { RootLogOutputChannel } from "./logging";

export function setupDebugger(ctx: Context) {
  const factory = new CairoDebugAdapterServerDescriptorFactory();
  ctx.extension.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("cairo", factory),
  );
}

class CairoDebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  private debugAdapterProcess?: ChildProcess;

  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    // const server = Net.createServer().listen();
    // const free_port = (Net.createServer().listen().address() as AddressInfo).port;
    // server.close();
    //
    // executable.args.push(...["--port", free_port.toString()]);

    const program = session.configuration["program"] as string;
    const log = new RootLogOutputChannel(
      vscode.window.createOutputChannel("DEBUGGER", {
        log: true,
      }),
    );

    this.debugAdapterProcess = spawn(program, { stdio: "pipe", env: process.env });
    const stdout = this.debugAdapterProcess.stdout!;

    return new vscode.DebugAdapterServer(48042);
  }

  dispose(): void {
    if (this.debugAdapterProcess) {
      this.debugAdapterProcess.kill();
    }
  }
}
