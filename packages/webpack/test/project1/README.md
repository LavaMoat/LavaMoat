# LavaMoat Webpack Example

## Quick Start

```bash
yarn lavamoat
yarn start
```

### Explanation

In this example, the config autogeneration and build scripts use the [Webpack](https://github.com/webpack/webpack) build command and the [Serve](https://github.com/zeit/serve) development server.

### Scripts:

```js
{
  "lavamoat": "(cd test/project1/ && webpack entry.js)",
  "start": "(cd test/project1/ && serve dist)"
}
```

### Generate Config

**`yarn lavamoat`**

Start by having Lavamoat automatically build and generate a configuration file. The following options in `webpack.config.js` are used:

```js
optimization: {
    concatenateModules: false,
    minimize: false
  },
  plugins: [
    new LavaMoatPlugin({
      writeAutoConfig: true
    })
  ]
```

After running the command, the bundle `main.js` will appear under `/dist`.

### Serve

**`yarn start`**

Uses `serve` to serve a static asset server under `/dist`. 





