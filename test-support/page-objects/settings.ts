import { SettingsEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { By, Key } from "selenium-webdriver";

export async function openSettings(): Promise<SettingsEditor> {
  const driver = VSBrowser.instance.driver;
  const wb = new Workbench();

  // Dismiss any open overlays before opening settings.
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.sleep(300);

  // Try opening settings via command palette.
  try {
    await wb.executeCommand("Preferences: Open User Settings");
  } catch (e) {
    console.log(`openSettings: executeCommand failed: ${e}`);
  }

  // Wait for the Settings editor DOM element to appear.
  await driver.wait(
    async () => {
      try {
        const els = await driver.findElements(By.className("settings-editor"));
        return els.length > 0;
      } catch {
        return false;
      }
    },
    15000,
    "Settings editor did not appear in DOM",
    500,
  );

  return new SettingsEditor();
}
