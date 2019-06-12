// a -> [ b, c, d, e ]
// b -> [ c, d ]
// c -> [ d ]
// e -> [ f ]
// f -> [ g ]
// g -> [ d ]

// d <- [ a, b, c, g]
// c <- [ a, b ]
// b <- [ a ]
// e <- [ a ]
// f <- [ e ]
// g <- [ f ]

// d:
// [ a, d ]
// [ a, b, d ]
// [ a, c, d ]
// [ a, b, c, d ]
// [ a, e, f, g, d ]

const test = require('tape')
const flatMap = require('lodash.flatmap')
const { calculateDepPaths } = require('../src/generateConfig')

test('walk reverse dep graph', (t) => {
  const reverseDepGraph = {
    d: new Set(['a', 'b', 'c', 'g']),
    c: new Set(['a', 'b']),
    b: new Set(['a']),
    e: new Set(['a']),
    f: new Set(['e']),
    g: new Set(['f'])
  }

  const depPaths = calculateDepPaths('d', reverseDepGraph)
  t.deepEqual(depPaths, [
    [ 'a', 'd' ],
    [ 'a', 'b', 'd' ],
    [ 'a', 'c', 'd' ],
    [ 'a', 'b', 'c', 'd' ],
    [ 'a', 'e', 'f', 'g', 'd' ]
  ])
  t.end()
})
