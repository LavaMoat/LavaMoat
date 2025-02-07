This fixture provides an app with a dependency providing an executable (`bin`) which has an extension (`.js`). We use this to test using a script in `node_modules/.bin` as an entrypoint.

The `bin` script is defined using the shorthand "string" syntax in `package.json`:

```json
{
  "bin": "bin.js"
}
```

This causes the symlink in `node_modules/.bin` to have the same name as the package itself (`lard-o-matic`).
