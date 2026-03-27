import { InputBox, Workbench } from "vscode-extension-tester";
import * as path from "path";

/**
 * Opens a folder in VS Code via the "Add Root Folder" command.
 *
 * VSBrowser.openResources() uses `code -r` which doesn't work when VS Code runs
 * under ChromeDriver. This function opens the folder through the UI instead.
 */
export async function openFolder(folderPath: string): Promise<void> {
  const wb = new Workbench();

  await wb.executeCommand("workbench.action.addRootFolder");
  const inputBox = await InputBox.create();
  await inputBox.setText(path.resolve(folderPath));
  await inputBox.confirm();
}
