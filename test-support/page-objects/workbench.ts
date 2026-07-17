import { VSBrowser, Workbench } from "vscode-extension-tester";

/**
 * Executes a command via the command palette, retrying on transient failures.
 *
 * `Workbench.executeCommand` opens the command prompt and immediately types into it.
 * If focus is trapped in another widget (e.g. a settings editor input), the prompt
 * may not be interactable yet and the call throws `ElementNotInteractableError`.
 * Retry the whole sequence until it succeeds.
 */
export async function executeCommand(command: string): Promise<void> {
  await VSBrowser.instance.driver.wait(
    async () => {
      try {
        await new Workbench().executeCommand(command);

        return true;
      } catch {
        return false;
      }
    },
    30000,
    `failed to execute command: ${command}`,
    // Check every second.
    1000,
  );
}
