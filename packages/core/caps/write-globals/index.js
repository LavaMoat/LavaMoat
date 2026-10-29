module.exports = [
  {
    names: ['support-define-global', 'support-define-symbol'],
    file: require.resolve('./define-set.js'),
  },
  {
    names: ['endow-symbol-write', 'endow-symbol-read'],
    file: require.resolve('./symbol-write.js'),
  },
]
