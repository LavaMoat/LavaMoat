module.exports = [
  {
    names: ['endow-something', 'support-something'],
    file: require.resolve('./capability1.js'),
    tests: [
      {
        name: 'endow-something',
        options: ['k1', 'k9'],
        assertion: (
          {
            endowments,
            compartmentGlobalThis,
            //rootCompartmentGlobalThis
          },
          assert
        ) => {
          // repair results are ambient and should be reachable through any globalThis
          assert(
            typeof compartmentGlobalThis.Promise.fancyPolyfill === 'function',
            'Promise.fancyPolyfill is not defined'
          )
          assert(
            typeof Promise.fancyPolyfill === 'function',
            'Promise.fancyPolyfill is not defined'
          )
          // assert capability endowments
          assert(endowments.k1, 'k1 is not endowed')
          assert(endowments.k1 === 'k9', 'k1 does not equal k9')
        },
      },
    ],
  },
]
