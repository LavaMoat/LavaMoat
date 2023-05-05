module.exports = {
  asyncSeriesRepeat,
}

async function asyncSeries(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

async function asyncSeriesRepeat (n, task) {
  const tasks = Array(n).fill(task);
  return await asyncSeries(tasks);
}