import {
  EditorView,
  SettingsEditor,
  VSBrowser,
  Workbench,
} from "vscode-extension-tester";

export async function openSettings(): Promise<SettingsEditor> {
  // Open settings via keyboard shortcut (Ctrl+, on Linux/Windows,
  // Cmd+, on macOS) to avoid flaky command palette interactions.
  const driver = VSBrowser.instance.driver;
  await driver
    .actions()
    .keyDown(Workbench.ctlKey)
    .sendKeys(",")
    .keyUp(Workbench.ctlKey)
    .perform();

  // Wait for the Settings tab to appear.
  await driver.wait(
    async () => {
      try {
        const titles = await new EditorView().getOpenEditorTitles();
        return titles.includes("Settings");
      } catch {
        return false;
      }
    },
    5000,
    "failed to open Settings editor",
    500,
  );

  return new SettingsEditor();
}
