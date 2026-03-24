import { StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";
import { homedir } from "os";

describe("Toolchain info", function () {
  this.timeout(50000);

  it("Checks correct scarb precedence", async function () {
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
      console.log("A");
      const workbench = new Workbench();
      console.log("B");
      const settings = await workbench.openSettings();
      console.log("C");
      const setting = await settings.findSetting("Scarb Path", "Cairo1");
      console.log("D");
      await setting.setValue(path.join(homedir(), ".local", "bin", "scarb"));
      console.log("E");
      await workbench.executeCommand("Cairo: Reload workspace");
      console.log("F");
    }
    console.log("G");
    await VSBrowser.instance.waitForWorkbench();
    await VSBrowser.instance.openResources(
      path.join("ui-test", "fixtures", "empty"),
    );
    console.log("H");
    await VSBrowser.instance.waitForWorkbench();
    const statusBar = await VSBrowser.instance.driver.wait(
      getStatusBarItem,
      5000,
    );
    console.log("I");
    expect(statusBar).to.not.be.undefined;
    console.log("J");
    const title = await statusBar!.getAttribute(
      StatusBar["locators"].StatusBar.itemTitle,
    );
    console.log("K");
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

    const scarbVersion = matches![1]!
      .replaceAll("&nbsp;", "")
      .replaceAll("\\", "");

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
