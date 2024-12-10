import { EditorView, StatusBar, VSBrowser, WebElement, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { is_scarb_available } from "../test-support/scarb";
import * as path from "path";

describe("Status bar test", function () {
  this.timeout(50000);

  let is_scarb: boolean;

  before(async function () {
    is_scarb = await is_scarb_available();

    await VSBrowser.instance.openResources(path.join("ui-test-resources", "empty"));
  });

  afterEach(async function () {
    await new EditorView().closeAllEditors();
  });

  it("checks if status bar is displaying correct message", async function () {
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

    if (is_scarb) {
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

    // Wait so extension have time to refresh.
    await new Promise((done) => setTimeout(done, 2000));

    const statusBar = await getStatusBarItem();

    expect(statusBar).to.be.undefined;
  });
});

async function getStatusBarItem(): Promise<WebElement | undefined> {
  const items = await new StatusBar().getItems();

  for (const item of items) {
    const text = await item.getText();

    if (text.startsWith("Cairo")) {
      return item;
    }
  }

  return undefined;
}
