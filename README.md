# Cairo for Visual Studio Code

This extension provides support for the [Cairo programming language][cairo].
Cairo is the first Turing-complete language for creating provable programs for general computation.

**Cairo Language Server is alpha-grade software.
Things are moving rapidly.
Expect bugs and crashes from time to time.**

## Features

- code completion with imports insertion
- automatic, incremental analysis
- diagnostic reporting of build warnings and errors
- go to definition
- semantic syntax highlighting
- documentation lookup on hover
- function signature provider
- code formatter
- supports [Scarb], the Cairo package manager
- can be configured to use [Dojo Engine]-specific tooling

## Quick start

Gm! 👋

Whether you are new to Cairo or an experienced Cairo Pharaoh,
we hope you will find this extension fitting your needs and making your Cairo development experience more enjoyable.

1. Install latest [Scarb][scarb-dl], preferably via [asdf][scarb-asdf].
2. Install the [VS Code Cairo extension][vscode-marketplace].
3. Open a workspace containing Scarb.toml or just open any Cairo file to automatically activate the extension.
4. The extension depends on the Cairo Language Server, which comes bundled with Scarb.
   The version of Scarb used in the workspace determines the version of Cairo and Cairo Language Server used by the
   extension.

Happy coding!

## Configuration

This extension can be configured through VS Code's configuration settings.
All settings all under the `cairo1.*` section.
Consult the settings UI in VS Code for more documentation.

## Support

For questions or inquiries about Cairo, Cairo Language Server and this extension, reach out to us on [Discord].

## Troubleshooting

If you run into issues with the extension, try these debugging steps:

1. Make sure you have the latest version of the extension installed.
2. Make sure you have the latest version of Scarb installed.
3. Make sure the problem is also not appearing while running `scarb build`.
4. Try the latest nightly release of Scarb, to verify the bug is not fixed yet.
   This is simple to do with asdf:
   ```sh
   asdf install scarb latest:nightly
   asdf local scarb latest:nightly
   ```
   And restart VS Code.
5. Check out debug logs for hints on what could go wrong.

In normal operation mode, both this extension and Cairo Language Server are pretty silent in their logs.
Logs are emitted to the _Output_ panel in VS Code.

You can enable debug logging to learn more about what's going on.
By default, the extension is trying to start the language server with the same logging level as the extension is running
itself.
To change the logging level, do the following:

1. Open the Command Palette (`F1` or `Ctrl+Shift+P`).
2. Run the `>Developer: Set Log Level...` command
3. Find the `Cairo` extension on the list.
4. Choose the `Debug` level.
5. Restart VS Code, by running the `>Developer: Reload Window` command.

When sending logs to developers to debug,
please include full logs from both the extension and the language server.

You can also enable more [granular][env-filter-directives] logging by configuring environment variables for the language
server.
To do so, paste the following into your `.vscode/settings.json`:

```json
{
  "cairo1.languageServerExtraEnv": {
    "CAIRO_LS_LOG": "cairo_lang_language_server=debug",
    "RUST_BACKTRACE": "1"
  }
}
```

[cairo]: https://www.cairo-lang.org/
[discord]: https://discord.gg/QypNMzkHbc
[dojo engine]: https://book.dojoengine.org/
[env-filter-directives]: https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html#directives
[scarb]: https://docs.swmansion.com/scarb
[scarb-asdf]: https://docs.swmansion.com/scarb/download.html#install-via-asdf
[scarb-dl]: https://docs.swmansion.com/scarb/download.html
[vscode-marketplace]: https://marketplace.visualstudio.com/items?itemName=starkware.cairo1
