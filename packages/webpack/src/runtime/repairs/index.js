exports.repairs = [
  {
    target: ['MessageEvent', 'addEventListener'],
    file: require.resolve('./messageevent'),
  },
  {
    target: ['event'],
    file: require.resolve('./eventsetter'),
  },
  {
    target: ['globalThis'],
    file: require.resolve('./globalthis'),
  },
]
