import { StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { openSettings } from "../../test-support/page-objects/settings";
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
      const workbench = new Workbench();

      const settings = await openSettings();

      const setting = await settings.findSetting("Scarb Path", "Cairo1");

      await setting.setValue(path.join(homedir(), ".local", "bin", "scarb"));

      await workbench.executeCommand("Cairo: Reload workspace");
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
