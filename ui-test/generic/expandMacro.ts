import { EditorView, TextEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { normalize } from "../../test-support/normalize";

describe("Expand macro test", function () {
  this.timeout(50000);

  let editorView: EditorView;

  before(async function () {
    if (!isScarbAvailable) {
      this.skip();
    }

    editorView = new EditorView();

    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "expand_macro"));
  });

  // TODO(#136): Fix this test yielding different results depending on scarb version
  it.skip("checks if macro correctly expands", async function () {
    await assertExpandAt(
      editorView,
      1,
      1,
`#[generate_trait]
impl A of ATrait {
    fn lol() -> u32 {
        12
    }
}

//-----
trait ATrait {
    fn lol() -> u32;
}`,
    );
  });
});

async function assertExpandAt(
  editorView: EditorView,
  line: number,
  column: number,
  expansionCode: string,
) {
  await VSBrowser.instance.openResources(
    path.join("ui-test", "fixtures", "expand_macro", "src", "lib.cairo"),
  );

  // This points to current active editor.
  const editor = new TextEditor();

  await editor.moveCursor(line, column);

  const workbench = new Workbench();

  await workbench.executeCommand("Cairo: Recursively expand macros for item at caret");

  await VSBrowser.instance.driver.wait(async () => {
    const openEditorTitles = await editorView.getOpenEditorTitles();

    return openEditorTitles.includes("[EXPANSION].cairo");
  }, 5000);

  const expansion = await editorView.openEditor("[EXPANSION].cairo", 1);

  const expansionText = normalize(await expansion.getText());

  expect(expansionText).to.be.eq(expansionCode);
}
