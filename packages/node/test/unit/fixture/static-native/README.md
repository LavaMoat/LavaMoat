# This is a fixture for testing statically loaded, prebuilt native modules

## Create Snapshot

Run the following to create/update a snapshot in `../json-fixture`:

```bash
# you may be prompted to install `snapshot-fs`
npm run start
```

## Loading the Fixture

Since this fixture loads a native module statically, you'll need to use the entrypoint for the specific platform/arch. Currently supported entrypoints are:

- `linux-x64.js`
- `linux-arm64.js`
- `darwin-arm64.js`
- `win32.js`

The `index.js` entrypoint will throw an error redirecting you to the correct entrypoint.

## Update Prebuilt Native Modules

This will rebuild all native modules in `node_modules/hello_world/prebuilds`:

```bash
cd node_modules/hello_world
# you may be prompted to install `prebuildify`
npm run build
```

> [!IMPORTANT]
>
> Remember to [create a snapshot](#create-snapshot) after updating the prebuilt native modules!
