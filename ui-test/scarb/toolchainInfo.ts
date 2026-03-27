import { StatusBar, VSBrowser } from "vscode-extension-tester";
import { openFolder } from "../../test-support/page-objects/workspace";
import { expect } from "chai";
import * as path from "path";
import { getStatusBarItem } from "../../test-support/page-objects/cairoStatusBarItem";

describe("Toolchain info", function () {
  this.timeout(200000);

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

    // When CONFIG_SCARB_VERSION is set, the CI workflow pre-configures cairo1.scarbPath
    // in ui-test/settings.json before starting VS Code, so no UI interaction is needed here.

    await openFolder(path.join("ui-test", "fixtures", "empty"));

    await VSBrowser.instance.waitForWorkbench();

    const titleAttr = StatusBar["locators"].StatusBar.itemTitle;
    const versionPattern =
      /Cairo, (Cairo Language Server.+\(.+\))\n\n.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/;

    let title = "";
    let lastTitle = "";
    await VSBrowser.instance.driver.wait(
      async () => {
        const item = await getStatusBarItem();
        if (!item) {
          console.log("No Cairo status bar item found yet");
          return false;
        }
        try {
          title = await item.getAttribute(titleAttr);
          if (title !== lastTitle) {
            console.log(`Status bar title (attr=${titleAttr}): ${JSON.stringify(title)}`);
            lastTitle = title;
          }
          return versionPattern.test(title);
        } catch (e) {
          console.log(`Error reading title: ${e}`);
          return false;
        }
      },
      120000,
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
