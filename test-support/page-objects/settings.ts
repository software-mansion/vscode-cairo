import { EditorView, SettingsEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { Key } from "selenium-webdriver";

export async function openSettings(): Promise<SettingsEditor> {
  const driver = VSBrowser.instance.driver;
  const editorView = new EditorView();
  const wb = new Workbench();

  // Dismiss any open overlays before opening settings.
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.sleep(300);

  // Try opening settings via command palette.
  try {
    await wb.executeCommand("Preferences: Open User Settings");
    console.log("openSettings: executeCommand completed");
  } catch (e) {
    console.log(`openSettings: executeCommand failed: ${e}`);
  }

  // Log open editor titles immediately after command.
  try {
    const titles = await editorView.getOpenEditorTitles();
    console.log(`openSettings: open editor titles = ${JSON.stringify(titles)}`);
  } catch (e) {
    console.log(`openSettings: getOpenEditorTitles failed: ${e}`);
  }

  // Wait for the Settings tab to become visible.
  await driver.wait(
    async () => {
      try {
        const titles = await editorView.getOpenEditorTitles();
        return titles.includes("Settings");
      } catch {
        return false;
      }
    },
    10000,
    "Settings tab did not appear",
    500,
  );

  return new SettingsEditor();
}
