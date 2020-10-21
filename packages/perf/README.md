### instructions

```bash
yarn
yarn start
```

### charts

[View the latest charts here](https://lavamoat.github.io/lavamoat-browserify-perf/).

### explanation

runs a dependency-using task in a few ways:
  - "node" in node directly. beware: may use native modules
  - "bify" browserify bundle in node, no protections
  - "bify+ses" browserify bundle run in a single SES root realm
  - "bify+lavamoat" browserify bundle with lavamoat in node, default lavamoat config
  - "bify+lavamoat w/ harden" browserify bundle with lavamoat in node, with hand-tuned config utilizing the `"harden"` `exportsDefense` strategy when possible

the tasks are run with different "n" values, indicating how many times the individual work should be done.

perf is collected, and printed to `stdout` as csv

this graph was generated using the data

![alt text](./stats.png "Graph of performance")
