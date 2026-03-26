import { SettingsEditor, Workbench } from "vscode-extension-tester";

export async function openSettings(): Promise<SettingsEditor> {
  return await new Workbench().openSettings();
}
