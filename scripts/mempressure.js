/**
 * Script which polls memory pressure across all threads and dumps information
 * to STDOUT as newline-delimited JSON. Polls every second by default.
 *
 * Usage:
 *
 * ```sh
 * node --import ./mempressure.js <entrypoint> [args...]
 * ```
 *
 * Set `SAMPLE_MS` to change the sample interval (in milliseconds).
 *
 * Output format:
 *
 * ```json
 * {"ts": 1724569200000,"rssMiB": 1024.0,"deltaMiB": 1024.0}
 * ```
 *
 * The final line outputs the peak RSS across all threads:
 *
 * ```json
 * {"peakRssMiB": 1024.0}
 * ```
 *
 * @packageDocumentation
 * @see {@link https://jsonlines.org/}
 * @see {@link https://nodejs.org/docs/latest/api/process.html#processmemoryusage}
 */

const SAMPLE_MS = process.env.SAMPLE_MS
  ? parseInt(process.env.SAMPLE_MS)
  : 1_000
let lastRss = 0

setInterval(() => {
  const rss = process.memoryUsage.rss() // bytes, whole process
  const delta = rss - lastRss
  lastRss = rss
  console.log(
    JSON.stringify({
      ts: Date.now(),
      rssMiB: +(rss / 1024 / 1024).toFixed(1),
      deltaMiB: +(delta / 1024 / 1024).toFixed(1),
    })
  )
}, SAMPLE_MS).unref()

process.on('beforeExit', () => {
  const { maxRSS } = process.resourceUsage()
  console.log(JSON.stringify({ peakRssMiB: maxRSS / 1024 }))
})
