### instructions

```bash
yarn
yarn start
```

### explanation

runs a dependency-using task bundle in 3 ways:
  - without lavamoat
  - with lavamoat
  - with lavamoat and a hand-tuned config utilizing the `"harden"` `exportsDefense` strategy

the tasks are run with different "n" values, indicating how many times the individual work should be done.

perf is collected, and printed to `stdout` as csv

this graph was generated using the data

![alt text](./stats.png "Graph of performance")
