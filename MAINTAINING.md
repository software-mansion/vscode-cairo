# Maintenance guideline

## Release procedure

We publish this extension to
both [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=starkware.cairo1)
and [Open VSX](https://open-vsx.org/extension/starkware/cairo1).
To cut a new release and publish it, follow the steps below.

### Login to marketplace accounts

#### Visual Studio Marketplace

1. Make sure you have an account on this marketplace, and you have at least _contributor_ role in
   `Starkware` publisher.
2. Authenticate with your Microsoft account:
   ```bash
   npx vsce login starkware
   ```

#### Open VSX

1. Make sure you have an account on Open VSX and Eclipse Foundation,
   and you've passed through all legal formalities.
   There is a step-by-step tutorial on
   this [here](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions#how-to-publish-an-extension).
2. Make sure you have access to the `StarkWare` namespace.
3. Authenticate with your Open VSX account (note: namespace name is case-sensitive here):
   ```bash
   npx ovsx login StarkWare
   ```

### Bump the version number

1. Set the version number in `package.json` to your liking.
2. Make sure changes are reflected in `package-lock.json`:
   ```bash
   npm i
   ```
3. Create a branch, commit changes, submit PR and merge it.
4. Create `vX.Y.Z` tag on `main` branch.

### Build and package extension

Run the following npm script to prepare the extension for publishing:

```bash
npm run package
```

This will generate the `cairo1.vsix` file required for publishing.

### Publish the extension

After packaging, you can publish the extension directly to both marketplaces using our npm script:

```bash
npm run publish
```

This script will handle publishing to both VS Marketplace and Open VSX.
Ensure you're authenticated to both marketplaces before running the `publish` script.
