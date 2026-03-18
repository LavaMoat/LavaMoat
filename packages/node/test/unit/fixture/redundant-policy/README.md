Fixture which demonstrates that redundant builtin and global resources are
eliminated from the generated policy.

e.g.:

```json
{
  "resources": {
    "foo": {
      "builtin": {
        "node:fs.readFile": true,
        "node:fs.writeFile": true,
        "node:fs": true
      },
      "globals": {
        "console.log": true,
        "console.error": true,
        "console": true
      }
    }
  }
}
```

becomes:

```json
{
  "resources": {
    "foo": {
      "builtin": {
        "node:fs": true
      },
      "globals": {
        "console": true
      }
    }
  }
}
```
