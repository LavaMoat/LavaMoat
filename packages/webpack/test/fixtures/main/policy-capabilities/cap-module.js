// Capability Module: maps capability names to implementation files.
module.exports = [
  {
    names: ['prefix-log'],
    file: require.resolve('./prefix-log.cap.js'),
  },
  {
    names: ['repair-marker'],
    file: require.resolve('./repair-marker.cap.js'),
  },
]
