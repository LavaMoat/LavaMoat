This fixture is not used directly; it's only here in order to create a snapshot:

```bash
npm run start
```

**When there are problems with tests consuming this fixture failing on certain architectures**, _in addition to the above_, try this:

- Navigate to `./node_modules/hello_world/`
- Execute `npm run build`. This will:
  - Install [prebuildify](https://npm.im/prebuildify) via `npx` (you may need to approve this step manually)
  - Create prebuild binaries for darwin, linux, and win32
  - Run `npm test` afterwards, assuming you're running on one of the targeted architectures

**Do not run `npm run build` from `./node_modules/hello_world/` in CI.**
