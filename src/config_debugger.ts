import * as vscode from "vscode";

interface DebuggerConfigProps {
  program: string;
  processCwd: string;
  logLevel: "off" | "error" | "warn" | "info" | "debug" | "trace";
  programExtraEnv: Record<string, string | number>;
}

export class DebuggerSessionConfig {
  constructor(private readonly debugConfig: vscode.DebugConfiguration) {}

  get<K extends keyof DebuggerConfigProps>(prop: K): DebuggerConfigProps[K] | undefined;
  get<K extends keyof DebuggerConfigProps>(
    prop: K,
    defaultValue: DebuggerConfigProps[K],
  ): DebuggerConfigProps[K];
  public get(prop: keyof DebuggerConfigProps, defaultValue?: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.debugConfig[prop] || defaultValue;
  }
}
