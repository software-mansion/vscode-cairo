import { StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { By, Key, WebElement } from "selenium-webdriver";
import { openFolder } from "../../test-support/page-objects/workspace";
import { expect } from "chai";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";
import { homedir } from "os";

describe("Toolchain info", function () {
  this.timeout(90000);

  it("Checks correct scarb precedence", async function () {
    await VSBrowser.instance.waitForWorkbench();

    // asdf is in fact in PATH and in our tests it is the first scarb in PATH, special case this.
    // It is caused by `@actions/core addPath` implementation.
    // See: https://github.com/actions/toolkit/blob/01f21badd5a7522507f84558503b56c4deec5326/packages/core/src/core.ts#L107
    if (process.env.PATH_SCARB_VERSION && process.env.ASDF_SCARB_VERSION) {
      process.env.PATH_SCARB_VERSION = process.env.ASDF_SCARB_VERSION;
    }

    const scarbs = [
      // Order is important here.
      process.env.CONFIG_SCARB_VERSION,
      process.env.PATH_SCARB_VERSION,
      process.env.ASDF_SCARB_VERSION,
    ];

    const expectedScarbVersion = scarbs.find(Boolean); // Find first with value.

    // Ignore this test locally, it is strictly designed for our CI.
    if (!expectedScarbVersion) {
      this.skip();
    }

    if (process.env.CONFIG_SCARB_VERSION) {
      const driver = VSBrowser.instance.driver;
      const wb = new Workbench();

      // Dismiss any open overlays.
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

      // Search for the Scarb path setting by ID.
      await (searchBox as WebElement).sendKeys(Key.chord(Key.CONTROL, "a"), "cairo1.scarbPath");

      // Wait for the text input and set the value, pressing Enter to commit.
      const textInput = await driver.wait(
        () =>
          driver
            .findElements(By.css(".settings-editor .setting-item-control input"))
            .then((els) => (els.length > 0 ? els[0] : false)),
        10000,
        "Scarb path text input did not appear",
        500,
      );

      await (textInput as WebElement).clear();
      await (textInput as WebElement).sendKeys(
        path.join(homedir(), ".local", "bin", "scarb"),
        Key.ENTER,
      );

      await driver.sleep(500); // Wait for settings to save.
      await wb.executeCommand("Cairo: Reload workspace");
    }

    await openFolder(path.join("ui-test", "fixtures", "empty"));

    await VSBrowser.instance.waitForWorkbench();

    const titleAttr = StatusBar["locators"].StatusBar.itemTitle;
    const versionPattern =
      /Cairo, (Cairo Language Server.+\(.+\))\n\n.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/;

    let title = "";
    await VSBrowser.instance.driver.wait(
      async () => {
        const item = await getStatusBarItem();
        if (!item) return false;
        try {
          title = await item.getAttribute(titleAttr);
          return versionPattern.test(title);
        } catch {
          return false;
        }
      },
      30000,
      "failed to obtain Cairo status bar with toolchain version info",
      500,
    );

    expect(title).to.match(
      /Cairo, (Cairo Language Server.+\(.+\))\n\n.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/,
    );

    const matches =
      /Cairo, (?:Cairo Language Server.+\(.+\))\n\nscarb(.+)\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/.exec(
        title,
      );

    expect(matches).to.not.be.undefined;
    expect(matches).to.not.be.null;
    expect(matches![1]).to.not.be.undefined;
    expect(matches![1]).to.not.be.null;

    const scarbVersion = matches![1]!.replaceAll("&nbsp;", "").replaceAll("\\", "");

    expect(scarbVersion).to.be.eq(expectedScarbVersion);
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      ASDF_SCARB_VERSION?: string;
      CONFIG_SCARB_VERSION?: string;
      PATH_SCARB_VERSION?: string;
    }
  }
}
