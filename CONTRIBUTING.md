# Contributing to the Cairo extension for Visual Studio Code

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

You might also want to check out
the [CairoLS contributing guidelines](../crates/cairo-lang-language-server/CONTRIBUTING.md).

## Development environment setup

There are three ways you can develop and run the extension.

1. ### Develop and debug from within VS Code

   Open this repository in VS Code and press `F5` to start debugging.
   Everything should be already set up in the `.vscode` directory.

2. ### Develop in your editor of choice and run in the VS Code Extension Host

   If you happen to make the most of your development in your editor of choice (like IntelliJ or
   Helix), you can run the VS Code Extension Host from the command line, like this:

   ```sh
   # Build the extension.
   $ npm run compile

   # Run the extension in the VS Code Extension Host.
   $ code "--extensionDevelopmentPath=$PWD" --wait --verbose
   ```

   The `--wait --verbose` arguments make the command wait until the Extension Host is closed.
   You can skip them if you do not want to block your terminal.

3. ### Package the extension manually and install it in VS Code

   This technique is useful if you are not interested in developing the extension itself,
   but you need some unreleased changes when working on the Cairo compiler overall.

   ```sh
   # Install vsce.
   $ npm install -g vsce
   # Or, if you're using macOS.
   $ brew install vsce

   # Package the extension.
   $ vsce package

   # Install the extension in your VS Code installation.
   # The `<version>` part will vary depending on the HEAD you are working on.
   $ code --install-extension cairo1-<version>.vsix
   ```
