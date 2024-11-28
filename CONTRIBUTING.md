# Contributing to the Cairo extension for Visual Studio Code

Cairo extension for Visual Studio Code is actively developed and open for contributions!

_Want to get started?_
Grab any unassigned issue labelled with [
`help wanted`](https://github.com/software-mansion/vscode-cairo/labels/help%20wanted)!

_Looking for some easy warmup tasks?_
Check out issues labelled with [
`good first issue`](https://github.com/software-mansion/vscode-cairo/labels/good%20first%20issue)!

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

You might also want to check out the
[CairoLS contributing guidelines](https://github.com/software-mansion/cairols/blob/main/CONTRIBUTING.md).

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

## Git

Try to make small PRs that could be squashed into a single commit.
For larger work, try to make your commits small, self-contained, and well-described.
Each commit should pass lints and tests.
Then, set up a stack of pull requests, separate PR for each commit, and pointing to the previous
one.

While your PR is being reviewed on, you can push merge commits and use [
`git commit --fixup`](https://git-scm.com/docs/git-commit/2.32.0#Documentation/git-commit.txt---fixupamendrewordltcommitgt)
to push further changes to your commits.

## Typos

Our policy is to not accept PRs that only fix typos in the documentation and code.
We appreciate your effort, but we encourage you to focus on bugs and features instead.

---

Thanks! ❤️ ❤️ ❤️

CairoLS Team
