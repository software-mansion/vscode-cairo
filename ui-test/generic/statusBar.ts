import { StatusBar, VSBrowser } from "vscode-extension-tester";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";
import { openSettings } from "../../test-support/page-objects/settings";

describe("Status bar", function () {
  this.timeout(90000);

  before(async function () {
    const resourcePath = path.resolve(path.join("ui-test", "fixtures", "empty"));
    const driver = VSBrowser.instance.driver;
    const handlesBefore = await driver.getAllWindowHandles();
    console.log(`Window handles before: ${handlesBefore.length}`);
    console.log(`Opening resources: ${resourcePath}`);
    try {
      await VSBrowser.instance.openResources(resourcePath);
      console.log("openResources completed");
    } catch (e) {
      console.log(`openResources error: ${e}`);
    }
    const handlesAfter = await driver.getAllWindowHandles();
    console.log(`Window handles after: ${handlesAfter.length}`);
    if (handlesAfter.length > handlesBefore.length) {
      // Switch to the new window (which might have the workspace)
      const newHandle = handlesAfter.find((h: string) => !handlesBefore.includes(h))!;
      await driver.switchTo().window(newHandle);
      console.log("Switched to new window");
    }
  });

  it("Displays Cairo toolchain version", async function () {
    await VSBrowser.instance.waitForWorkbench();
    const titleAttr = StatusBar["locators"].StatusBar.itemTitle;

    if (isScarbAvailable) {
      const pattern =
        /Cairo, (Cairo Language Server.+\(.+\))\n\nscarb.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/;

      let lastTitle = "";
      const statusBar = await VSBrowser.instance.driver.wait(
        async () => {
          const item = await getStatusBarItem();
          if (!item) {
            console.log("No Cairo status bar item found yet");
            return false;
          }
          try {
            const title = await item.getAttribute(titleAttr);
            if (title !== lastTitle) {
              console.log(`Status bar title (attr=${titleAttr}): ${JSON.stringify(title)}`);
              lastTitle = title;
            }
            return pattern.test(title) ? item : false;
          } catch (e) {
            console.log(`Error reading title: ${e}`);
            return false;
          }
        },
        30000,
        "failed to obtain Cairo status bar with version info",
        500,
      );
      expect(statusBar).not.to.be.false;
    } else {
      const statusBar = await VSBrowser.instance.driver.wait(
        getStatusBarItem,
        30000,
        "failed to obtain Cairo status bar",
        500,
      );
      expect(statusBar).not.undefined;

      // `new StatusBar().getItem("Cairo")` is broken and searches not only in title.
      const title = await statusBar!.getAttribute(titleAttr);
      expect(title).to.be.eq("Cairo, Cairo Language\n---\nServer&nbsp;status:&nbsp;OK");
    }
  });

  it("checks if status bar is disabled", async function () {
    await VSBrowser.instance.waitForWorkbench();
    const settings = await openSettings();

    const setting = await settings.findSetting("Show In Status Bar", "Cairo1");
    await setting.setValue(false);

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(async () => {
      const statusBar = await getStatusBarItem();

      return statusBar === undefined;
    }, 2000);

    expect(statusBarIsUndefined).to.be.true;
  });
});
