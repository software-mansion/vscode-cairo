import * as vscode from "vscode";
import * as lc from "vscode-languageclient/node";
import type { Context } from "./context";
import type { Scarb } from "./scarb";
import { checkTool } from "./toolchain";

export class StandaloneLS {
  public constructor(
    public readonly path: string,
    public readonly workspaceFolder?: vscode.WorkspaceFolder | undefined,
    public readonly scarb?: Scarb | undefined,
  ) {}

  public static async find(
    workspaceFolder: vscode.WorkspaceFolder | undefined,
    scarb: Scarb | undefined,
    ctx: Context,
  ): Promise<StandaloneLS> {
    // TODO(mkaput): Config should probably be scoped to workspace folder.
    const configPath = ctx.config.get("languageServerPath");

    if (!configPath) {
      throw new Error("could not find CairoLS on this machine");
    }

    const configPathChecked = await checkTool(configPath);

    if (!configPathChecked) {
      throw new Error(`configured CairoLS path does not exist: ${configPathChecked}`);
    }

    ctx.log.debug(`using CairoLS from config: ${configPathChecked}`);

    return new StandaloneLS(configPathChecked, workspaceFolder, scarb);
  }

  getExecutable(): lc.Executable {
    const exec: Required<Pick<lc.Executable, "options">> & lc.Executable = {
      command: this.path,
      options: {
        env: {},
      },
    };

    if (this.scarb?.path) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      exec.options.env["SCARB"] = this.scarb.path;
    }

    const cwd = this.workspaceFolder?.uri.fsPath;
    if (cwd != undefined) {
      exec.options.cwd = cwd;
    }

    return exec;
  }
}
