import { StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { By, Key, WebElement } from "selenium-webdriver";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";
import { openFolder } from "../../test-support/page-objects/workspace";

describe("Status bar", function () {
  this.timeout(120000);

  before(async function () {
    await VSBrowser.instance.waitForWorkbench();
    await openFolder(path.join("ui-test", "fixtures", "empty"));
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
        60000,
        "failed to obtain Cairo status bar with version info",
        500,
      );
      expect(statusBar).not.to.be.false;
    } else {
      // LS may or may not have started; accept both "Cairo Language" (basic) and
      // "Cairo Language Server X.Y.Z (path)" (LS loaded).
      const noScarbPattern = /^Cairo, Cairo Language[^\n]*\n---\nServer&nbsp;status:&nbsp;OK$/;
      let lastTitle = "";
      const statusBar = await VSBrowser.instance.driver.wait(
        async () => {
          const item = await getStatusBarItem();
          if (!item) {
            console.log("No Cairo status bar item found yet (no scarb)");
            return false;
          }
          try {
            const title = await item.getAttribute(titleAttr);
            if (title !== lastTitle) {
              console.log(`Status bar title (no scarb, attr=${titleAttr}): ${JSON.stringify(title)}`);
              lastTitle = title;
            }
            return noScarbPattern.test(title) ? item : false;
          } catch (e) {
            console.log(`Error reading title: ${e}`);
            return false;
          }
        },
        60000,
        "failed to obtain Cairo status bar with expected title",
        500,
      );
      expect(statusBar).not.to.be.false;
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
    await (searchBox as WebElement).sendKeys(Key.chord(Key.CONTROL, "a"), "cairo1.showInStatusBar");

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
    await (checkbox as WebElement).click();

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(
      async () => {
        const statusBar = await getStatusBarItem();
        return statusBar === undefined;
      },
      10000,
      "Cairo status bar did not disappear after disabling showInStatusBar",
      500,
    );

    expect(statusBarIsUndefined).to.be.true;
  });
});
