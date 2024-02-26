const files = ['./test/*.spec.js']

// FIXME: these tests timeout half of the time on GH's macOS CI runners
if (process.env.CI && process.platform === 'darwin') {
  files.push('!./test/runScenarios.spec.js')
  console.error('[SKIP] runScenarios.spec.js skipped - flaky macOS CI')
}

export default {
  files,
  timeout: '4m',
  concurrency: 1,
}
