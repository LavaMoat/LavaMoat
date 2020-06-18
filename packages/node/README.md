# lavamoat-node

run your node app or build system with LavaMoat protections!

### generate the config

LavaMoat will walk your application and generate a config file at `lavamoat-config.json`.
Commit this config file and regenerate it when your dependencies change.
Any modifications and customizations to the config should be made in the `lavamoat-config-override.json` file.
This file should also be committed.

```bash
npx lavamoat index.js --writeAutoConfig
```

### run with the config

this will use the config files to run your app

```bash
npx lavamoat index.js
```


### pro tips

having trouble reading thrown Errors?
try running with the `--debugMode` flag.
not safe for production.

have a dependency that wont quite work under LavaMoat?
try [patch-package](https://github.com/ds300/patch-package)