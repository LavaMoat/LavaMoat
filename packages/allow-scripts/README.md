# @lavamoat/allow-scripts

a tool for only running dependency lifecycle hooks specified in an allowlist


### configure

configuration goes in `package.json`
```json
{
  "lavamoat": {
    "allowScripts": {
      "keccak": true,
      "core-js": false
    }
  }
}
```

automatically generate a configuration (that skips all lifecycle scripts) and write into `package.json`. edit as necesary.
```sh
allow-scripts auto
```

### run

run all lifecycle scripts for packages specified in `package.json`
```sh
allow-scripts
```

### debug

prints comprehension of configuration and dependencies with lifecycle scripts
```sh
allow-scripts list
```