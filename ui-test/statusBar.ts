import { EditorView, StatusBar, VSBrowser, WebElement, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { isScarbAvailable } from "../test-support/scarb";
import * as path from "path";

describe("Status bar", function () {
  this.timeout(50000);

  before(async function () {
    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "empty"));
  });

  afterEach(async function () {
    await new EditorView().closeAllEditors();
  });

  it("Displays Cairo toolchain version", async function () {
    const statusBar = await VSBrowser.instance.driver.wait(
      getStatusBarItem,
      5000,
      "failed to obtain Cairo status bar",
      // Check every 0.5 second.
      500,
    );

    expect(statusBar).not.undefined;

    // `new StatusBar().getItem("Cairo")` is broken and searches not only in title.
    const title = await statusBar!.getAttribute(StatusBar["locators"].StatusBar.itemTitle);

    if (isScarbAvailable) {
      expect(title).to.match(
        /Cairo, Cairo Language\nscarb .+ \(.+\)\ncairo: .+ \(.+\)\nsierra: .+/,
      );
    } else {
      expect(title).to.be.eq("Cairo, Cairo Language");
    }
  });

  it("checks if status bar is disabled", async function () {
    const settings = await new Workbench().openSettings();

    const setting = await settings.findSetting("Show In Status Bar", "Cairo1");
    setting.setValue(false);

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(async () => {
      const statusBar = await getStatusBarItem();

      return statusBar === undefined;
    }, 2000);

    expect(statusBarIsUndefined).to.be.true;
  });
});

async function getStatusBarItem(): Promise<WebElement | undefined> {
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
