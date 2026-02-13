import * as vscode from "vscode";
import { Context } from "./context";

const TOML_EXTENSION_ID = "tamasfe.even-better-toml";
const TOML_RECOMMENDATION_KEY = "cairo1.recommendedTomlShown";

export async function maybeRecommendTomlExtension(ctx: Context): Promise<void> {
  if (ctx.extension.globalState.get<boolean>(TOML_RECOMMENDATION_KEY)) {
    return;
  }

  if (vscode.extensions.getExtension(TOML_EXTENSION_ID)) {
    await ctx.extension.globalState.update(TOML_RECOMMENDATION_KEY, true);
    return;
  }

  const choice = await vscode.window.showInformationMessage(
    "For a better Scarb.toml editing experience, we recommend installing the Even Better TOML extension.",
    "Show Extension",
    "Don't Show Again",
  );

  await ctx.extension.globalState.update(TOML_RECOMMENDATION_KEY, true);

  if (choice === "Show Extension") {
    await vscode.commands.executeCommand("workbench.extensions.action.showExtensionsWithIds", [
      TOML_EXTENSION_ID,
    ]);
  }
}
