# This is a fixture for testing the prebuilt native modules

## Create Snapshot

Run the following to create/update a snapshot in `../json-fixture`:

```bash
# you may be prompted to install `snapshot-fs`
npm run start
```

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
