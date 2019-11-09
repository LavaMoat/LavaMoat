### instructions

```bash
yarn
yarn start
```

### charts

[View the latest charts here](https://lavamoat.github.io/lavamoat-browserify-perf/).

### explanation

runs a dependency-using task in 4 ways:
  - in node directly
  - in node, via browserify (without lavamoat)
  - in node, via browserify with lavamoat
  - in node, via browserify with lavamoat and a hand-tuned config utilizing the `"harden"` `exportsDefense` strategy

the tasks are run with different "n" values, indicating how many times the individual work should be done.

perf is collected, and printed to `stdout` as csv

this graph was generated using the data

![alt text](./stats.png "Graph of performance")
