import { Setting, VSBrowser, Workbench } from "vscode-extension-tester";

/**
 * Opens the settings editor and finds a setting, retrying until it shows up.
 *
 * `SettingsEditor.findSetting` is racy: it returns undefined (or throws) when
 * the settings editor is still opening, the search results have not settled yet,
 * or the virtualized settings list has not rendered the requested row.
 * Calling it once is the most common source of UI test flakiness in CI
 * (`TypeError: Cannot read properties of undefined (reading 'setValue')`).
 */
export async function findSetting(title: string, category: string): Promise<Setting> {
  const setting = await VSBrowser.instance.driver.wait(
    async () => {
      try {
        const settings = await new Workbench().openSettings();

        return await settings.findSetting(title, category);
      } catch {
        // Retry from scratch, including reopening the settings editor.
        return undefined;
      }
    },
    30000,
    `failed to find setting: ${category} > ${title}`,
    // Check every second.
    1000,
  );

  return setting as Setting;
}
