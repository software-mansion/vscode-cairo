import { error, StatusBar, VSBrowser, WebElement } from "vscode-extension-tester";

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

/**
 * Waits until the Cairo status bar item exists and its title satisfies `isExpected`.
 *
 * The status bar item is created before the language server reports toolchain info,
 * so its title fills up asynchronously — reading it just once races with the server
 * startup (and with workspace reloads).
 *
 * On timeout, returns the last observed title even if it never satisfied `isExpected`,
 * so that callers can assert on it and produce a readable failure message. Returns
 * undefined if the status bar item never appeared. Any other failure is rethrown.
 */
export async function getStatusBarItemTitle(
  isExpected: (title: string) => boolean,
  timeout: number,
): Promise<string | undefined> {
  let lastTitle: string | undefined;

  try {
    await VSBrowser.instance.driver.wait(
      async () => {
        const item = await getStatusBarItem();

        if (!item) {
          return false;
        }

        try {
          // `new StatusBar().getItem("Cairo")` is broken and searches not only in title.
          lastTitle =
            (await item.getAttribute(StatusBar["locators"].StatusBar.itemTitle)) ?? undefined;
        } catch {
          // The item could have been re-rendered between finding it and reading
          // its title, try again.
          return false;
        }

        return lastTitle !== undefined && isExpected(lastTitle);
      },
      timeout,
      undefined,
      // Check every second.
      1000,
    );
  } catch (e) {
    if (!(e instanceof error.TimeoutError)) {
      // Something actually broke (e.g. the driver died) — do not disguise it as a
      // failed title assertion.
      throw e;
    }

    // Timed out — fall through and let the caller assert on the last observed title.
  }

  return lastTitle;
}
