import { StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";

describe("Status bar", function () {
  this.timeout(50000);

  before(async function () {
    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "empty"));
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
        /((Cairo Language Server .+ \(.+\)\n)|(Cairo Language\n))scarb .+ \(.+\)\ncairo: .+ \(.+\)\nsierra: .+/,
      );
    } else {
      expect(title).to.be.eq("Cairo, Cairo Language");
    }
  });

  it("checks if status bar is disabled", async function () {
    const settings = await new Workbench().openSettings();

    const setting = await settings.findSetting("Show In Status Bar", "Cairo1");
    await setting.setValue(false);

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(async () => {
      const statusBar = await getStatusBarItem();

      return statusBar === undefined;
    }, 2000);

    expect(statusBarIsUndefined).to.be.true;
  });
});
