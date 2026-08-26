import { VSBrowser } from "vscode-extension-tester";
import { expect } from "chai";
import "../../test-support/chaiConfig";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import {
  getStatusBarItem,
  getStatusBarItemTitle,
} from "../../test-support/page-objects/cairoStatusBarItem";
import { findSetting } from "../../test-support/page-objects/settings";

describe("Status bar", function () {
  this.timeout(180000);

  before(async function () {
    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "empty"));
  });

  it("Displays Cairo toolchain version", async function () {
    await VSBrowser.instance.waitForWorkbench();

    if (isScarbAvailable) {
      const titlePattern =
        /Cairo, (Cairo Language Server.+\(.+\))\n\nscarb.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/;

      // The title shows toolchain info only after the language server starts,
      // so poll until it appears instead of reading it once.
      const title = await getStatusBarItemTitle((title) => titlePattern.test(title), 150000);

      expect(title).to.not.be.undefined;
      expect(title!).to.match(titlePattern);
    } else {
      const expectedTitle = "Cairo, Cairo Language\n---\nServer&nbsp;status:&nbsp;OK";

      const title = await getStatusBarItemTitle((title) => title === expectedTitle, 150000);

      expect(title).to.be.eq(expectedTitle);
    }
  });

  it("checks if status bar is disabled", async function () {
    await VSBrowser.instance.waitForWorkbench();

    const setting = await findSetting("Show In Status Bar", "Cairo1");

    await setting.setValue(false);

    const statusBarIsUndefined = await VSBrowser.instance.driver.wait(
      async () => {
        const statusBar = await getStatusBarItem();

        return statusBar === undefined;
      },
      10000,
      "Cairo status bar item is still visible after disabling it",
    );

    expect(statusBarIsUndefined).to.be.true;
  });
});
