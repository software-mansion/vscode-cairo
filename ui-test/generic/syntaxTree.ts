import { EditorView, TextEditor, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { isScarbAvailable } from "../../test-support/scarb";
import * as path from "path";
import { normalize } from "../../test-support/normalize";

describe("View syntax tree", function () {
  this.timeout(50000);

  let editorView: EditorView;

  before(async function () {
    const scarb = process.env["SCARB_VERSION"]!;
    if (!isScarbAvailable || ["2.8.5", "2.9.1"].includes(scarb)) {
      this.skip();
    }

    editorView = new EditorView();

    await VSBrowser.instance.openResources(path.join("ui-test", "fixtures", "expand_macro"));
  });

  // TODO(#136): Fix this test yielding different results depending on scarb version
  it.skip("checks if syntax tree is correctly printed", async function () {
    await assertSyntaxTree(
      editorView,
      1,
      1,
      `└── root (kind: SyntaxFile)
    ├── items (kind: ModuleItemList)
    │   └── child #0 (kind: ItemImpl)
    │       ├── attributes (kind: AttributeList)
    │       │   └── child #0 (kind: Attribute)
    │       │       ├── hash (kind: TokenHash): '#'
    │       │       ├── lbrack (kind: TokenLBrack): '['
    │       │       ├── attr (kind: ExprPath)
    │       │       │   └── item #0 (kind: PathSegmentSimple)
    │       │       │       └── ident (kind: TokenIdentifier): 'generate_trait'
    │       │       ├── arguments (kind: OptionArgListParenthesizedEmpty) []
    │       │       └── rbrack (kind: TokenRBrack): ']'
    │       ├── visibility (kind: VisibilityDefault) []
    │       ├── impl_kw (kind: TokenImpl): 'impl'
    │       ├── name (kind: TokenIdentifier): 'A'
    │       ├── generic_params (kind: OptionWrappedGenericParamListEmpty) []
    │       ├── of_kw (kind: TokenOf): 'of'
    │       ├── trait_path (kind: ExprPath)
    │       │   └── item #0 (kind: PathSegmentSimple)
    │       │       └── ident (kind: TokenIdentifier): 'ATrait'
    │       └── body (kind: ImplBody)
    │           ├── lbrace (kind: TokenLBrace): '{'
    │           ├── items (kind: ImplItemList)
    │           │   └── child #0 (kind: FunctionWithBody)
    │           │       ├── attributes (kind: AttributeList) []
    │           │       ├── visibility (kind: VisibilityDefault) []
    │           │       ├── declaration (kind: FunctionDeclaration)
    │           │       │   ├── optional_const (kind: OptionTerminalConstEmpty) []
    │           │       │   ├── function_kw (kind: TokenFunction): 'fn'
    │           │       │   ├── name (kind: TokenIdentifier): 'lol'
    │           │       │   ├── generic_params (kind: OptionWrappedGenericParamListEmpty) []
    │           │       │   └── signature (kind: FunctionSignature)
    │           │       │       ├── lparen (kind: TokenLParen): '('
    │           │       │       ├── parameters (kind: ParamList) []
    │           │       │       ├── rparen (kind: TokenRParen): ')'
    │           │       │       ├── ret_ty (kind: ReturnTypeClause)
    │           │       │       │   ├── arrow (kind: TokenArrow): '->'
    │           │       │       │   └── ty (kind: ExprPath)
    │           │       │       │       └── item #0 (kind: PathSegmentSimple)
    │           │       │       │           └── ident (kind: TokenIdentifier): 'u32'
    │           │       │       ├── implicits_clause (kind: OptionImplicitsClauseEmpty) []
    │           │       │       └── optional_no_panic (kind: OptionTerminalNoPanicEmpty) []
    │           │       └── body (kind: ExprBlock)
    │           │           ├── lbrace (kind: TokenLBrace): '{'
    │           │           ├── statements (kind: StatementList)
    │           │           │   └── child #0 (kind: StatementExpr)
    │           │           │       ├── attributes (kind: AttributeList) []
    │           │           │       ├── expr (kind: TokenLiteralNumber): '12'
    │           │           │       └── semicolon (kind: OptionTerminalSemicolonEmpty) []
    │           │           └── rbrace (kind: TokenRBrace): '}'
    │           └── rbrace (kind: TokenRBrace): '}'
    └── eof (kind: TokenEndOfFile).


root (kind: SyntaxFile)
items (kind: ModuleItemList)
child #0 (kind: ItemImpl)
attributes (kind: AttributeList)
child #0 (kind: Attribute)
hash (kind: TerminalHash)
token (kind: TokenHash): '#'

`,
    );
  });
});

async function assertSyntaxTree(
  editorView: EditorView,
  line: number,
  column: number,
  expectedSyntaxTreeText: string,
) {
  await VSBrowser.instance.openResources(
    path.join("ui-test", "fixtures", "expand_macro", "src", "lib.cairo"),
  );

  // This points to the current active editor.
  const editor = new TextEditor();

  await editor.moveCursor(line, column);

  const workbench = new Workbench();

  await workbench.executeCommand("Cairo: View syntax tree of the current file content");

  await VSBrowser.instance.driver.wait(async () => {
    const openEditorTitles = await editorView.getOpenEditorTitles();

    return openEditorTitles.includes("[SYNTAX_TREE_0].txt");
  }, 2000);

  const syntaxTree = await editorView.openEditor("[SYNTAX_TREE_0].txt", 1);

  const syntaxTreeText = normalize(await syntaxTree.getText());

  expect(syntaxTreeText).to.be.eq(expectedSyntaxTreeText);
}
