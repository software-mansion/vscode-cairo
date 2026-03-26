import { EditorView, SettingsEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { Key } from "selenium-webdriver";

export async function openSettings(): Promise<SettingsEditor> {
  const driver = VSBrowser.instance.driver;
  const editorView = new EditorView();

  // 1. Clear any existing UI noise (Escapes any open menus)
  await driver.actions().sendKeys(Key.ESCAPE).perform();

  // 2. Focus the main container
  const body = await driver.findElement({ css: "body" });
  await body.click();

  // 3. Use the more stable sendKeys chord for Linux
  // Key.chord ensures the Control key is held down during the comma
  await body.sendKeys(Key.chord(Workbench.ctlKey, ","));

  // 4. Custom Wait Loop
  // Sometimes openEditor() fails too fast. We'll wait manually.
  let settingsOpen = false;
  for (let i = 0; i < 5; i++) {
    const titles = await editorView.getOpenEditorTitles();
    if (titles.includes("Settings")) {
      settingsOpen = true;
      break;
    }
    // Small delay to allow the UI to catch up
    await driver.sleep(1000);

    // Retry the shortcut once more if it didn't work the first time
    if (i === 2) {
      await body.sendKeys(Key.chord(Workbench.ctlKey, ","));
    }
  }

  if (!settingsOpen) {
    throw new Error("Failed to find 'Settings' tab after shortcut and retries.");
  }

  return new SettingsEditor();
}
