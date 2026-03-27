import { InputBox, StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { By, Key } from "selenium-webdriver";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";

describe("Status bar", function () {
  this.timeout(90000);

  before(async function () {
    const resourcePath = path.resolve(path.join("ui-test", "fixtures", "empty"));
    const wb = new Workbench();

    // openResources() uses `code -r` which doesn't work when VS Code runs under ChromeDriver.
    // Instead, use VS Code's built-in "Add Root Folder" command which goes through the UI.
    await wb.executeCommand("workbench.action.addRootFolder");
    const inputBox = await InputBox.create();
    await inputBox.setText(resourcePath);
    await inputBox.confirm();
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
    const driver = VSBrowser.instance.driver;
    const wb = new Workbench();

    // Dismiss any open overlays before opening settings.
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.sleep(300);

    await wb.executeCommand("Preferences: Open User Settings");

    // Wait for the settings search box to appear.
    const searchBox = await driver.wait(
      () =>
        driver
          .findElements(By.css(".settings-editor .settings-header .native-edit-context"))
          .then((els) => (els.length > 0 ? els[0] : false)),
      15000,
      "Settings search box did not appear",
      500,
    );

    // Search for the setting by ID.
    await (searchBox as any).sendKeys(Key.chord(Key.CONTROL, "a"), "cairo1.showInStatusBar");

    // Wait for and click the checkbox to disable the setting.
    const checkbox = await driver.wait(
      () =>
        driver
          .findElements(By.css(".settings-editor .setting-value-checkbox"))
          .then((els) => (els.length > 0 ? els[0] : false)),
      10000,
      "showInStatusBar checkbox did not appear",
      500,
    );
    await (checkbox as any).click();

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(async () => {
      const statusBar = await getStatusBarItem();

      return statusBar === undefined;
    }, 2000);

    expect(statusBarIsUndefined).to.be.true;
  });
});
