import { EditorView, SettingsEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { Key } from "selenium-webdriver";

export async function openSettings(): Promise<SettingsEditor> {
  const driver = VSBrowser.instance.driver;
  const editorView = new EditorView();

  // Dismiss any open overlays before opening settings.
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.sleep(300);

  // Focus the workbench body so keyboard shortcuts are received.
  const body = await driver.findElement({ css: "body" });
  await body.click();

  // Open settings with Ctrl+, (Cmd+, on macOS).
  await body.sendKeys(Key.chord(Workbench.ctlKey, ","));

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
