import { SettingsEditor, VSBrowser, Workbench } from "vscode-extension-tester";

export async function openSettings(): Promise<SettingsEditor> {
  const settings = await VSBrowser.instance.driver.wait(
    async () => {
      try {
        return await new Workbench().openSettings();
      } catch {
        return undefined;
      }
    },
    5000,
    "failed to open Settings editor",
    500,
  );
  return settings!;
}
