import { StatusBar, WebElement } from "vscode-extension-tester";

export async function getStatusBarItem(): Promise<WebElement | undefined> {
  const items = await new StatusBar().getItems();

  for (const item of items) {
    try {
      // This can throw StaleElementReferenceError because item was destroyed before reading its text.
      const text = await item.getText();

      if (text.startsWith("Cairo")) {
        return item;
      }
    } catch {
      // No need to do anything here.
      // If this was cairo status bar we will simply return after loop.
      // Else it is not interesting for us anyway.
    }
  }

  return undefined;
}
