// use globalThis.process to avoid hardcoding value when bundling
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

const run = () => {
  // throw away the assumption that a specific buffer size is optimized by adding count
  const x = new Uint8Array(nTimes);
  for (let i = 0; i < x.length; i++) {
    x[i] = 1;
  }
};

run();