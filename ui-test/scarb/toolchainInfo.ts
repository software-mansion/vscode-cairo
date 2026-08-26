import { VSBrowser } from "vscode-extension-tester";
import { expect } from "chai";
import "../../test-support/chaiConfig";
import * as path from "path";
import { getStatusBarItemTitle } from "../../test-support/page-objects/cairoStatusBarItem";
import { findSetting } from "../../test-support/page-objects/settings";
import { executeCommand } from "../../test-support/page-objects/workbench";
import { homedir } from "os";

const TITLE_PATTERN =
  /Cairo, (Cairo Language Server.+\(.+\))\n\n.+\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/;

describe("Toolchain info", function () {
  this.timeout(180000);

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
      const setting = await findSetting("Scarb Path", "Cairo1");

      await setting.setValue(path.join(homedir(), ".local", "bin", "scarb"));

      await executeCommand("Cairo: Reload workspace");
    }

    await VSBrowser.instance.waitForWorkbench();
    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "empty"));

    await VSBrowser.instance.waitForWorkbench();

    // The title shows toolchain info only after the language server starts (and after
    // the workspace reload takes effect), so poll until the expected version appears.
    const title = await getStatusBarItemTitle(
      (title) => extractScarbVersion(title) === expectedScarbVersion,
      150000,
    );

    expect(title).to.not.be.undefined;
    expect(title!).to.match(TITLE_PATTERN);
    expect(extractScarbVersion(title!)).to.be.eq(expectedScarbVersion);
  });
});

function extractScarbVersion(title: string): string | undefined {
  const matches =
    /Cairo, (?:Cairo Language Server.+\(.+\))\n\nscarb(.+)\(.+\)\n\ncairo:.+\(.+\)\n\nsierra:.+\n/.exec(
      title,
    );

  return matches?.[1]?.replaceAll("&nbsp;", "").replaceAll("\\", "");
}

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
