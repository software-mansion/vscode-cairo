import { EditorView, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";

describe("Example test", function () {
  this.timeout(50000);

  after(async function () {
    await new EditorView().closeAllEditors();
  });

  it("checks if notifications are empty if nothing happened", async function () {
    const notifications = await VSBrowser.instance.driver.wait(
      async () => {
        const notifications = await new Workbench().getNotifications();

        // We can check here for specific notification.

        return notifications;
      },
      2000,
      "failed to obtain notifications in 2 seconds",
      // Check every 0.5 second.
      500,
    );

    expect(notifications.length).to.be.eq(0, "Some notification was received");
  });
});
