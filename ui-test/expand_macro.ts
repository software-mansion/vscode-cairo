import { EditorView, TextEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { is_scarb_available } from "../test-support/scarb";
import * as path from "path";

describe("Expand macro test", function () {
  this.timeout(50000);

  let is_scarb: boolean;
  let editorView: EditorView;

  before(async function () {
    is_scarb = await is_scarb_available();
    editorView = new EditorView();

    await VSBrowser.instance.openResources(path.join("ui-test-resources", "expand_macro"));
  });

  afterEach(async function () {
    await editorView.closeAllEditors();
  });

  it("checks if macro correctly expands", async function () {
    if (!is_scarb) {
      this.skip();
    }

    expandAt(
      editorView,
      1,
      1,
      `// lib.cairo
// ---------

#[generate_trait]
impl A of ATrait {
    fn lol() -> u32 {
        12
    }
}

// generate_trait
// --------------

trait ATrait {
    fn lol() -> u32;
}`,
    );
  });
  it("checks if macro correctly expands 2", async function () {
    if (!is_scarb) {
      this.skip();
    }

    expandAt(
      editorView,
      9,
      8,
      `// lib.cairo
// ---------

{
    let mut __formatter_for_print_macros__: core::fmt::Formatter = core::traits::Default::default();
    core::result::ResultTrait::<
        (), core::fmt::Error,
    >::unwrap(
        {
            core::byte_array::ByteArrayTrait::append_word(
                ref __formatter_for_print_macros__.buffer, 0x617364660a, 5,
            );
            core::result::Result::<(), core::fmt::Error>::Ok(())
        },
    );
    core::debug::print_byte_array_as_string(@__formatter_for_print_macros__.buffer);
}`,
    );
  });
});

async function expandAt(
  editorView: EditorView,
  line: number,
  column: number,
  expansionCode: string,
) {
  await VSBrowser.instance.openResources(
    path.join("ui-test-resources", "expand_macro", "src", "lib.cairo"),
  );

  // This points to current active editor.
  const editor = new TextEditor();

  await editor.moveCursor(line, column);

  const workbench = new Workbench();

  await workbench.executeCommand("Cairo: Recursively expand macros for item at caret");

  const expansion = await editorView.openEditor("[EXPANSION].cairo", 1);

  const expansionText = await expansion.getText();

  expect(expansionText).to.be.eq(expansionCode);
}
