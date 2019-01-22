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
// [ a, c, d ]
// [ a, b, c, d ]
// [ a, e, f, g, d ]

const flatMap = require('lodash.flatmap')

const reverseDepGraph = {
  d: new Set(['a', 'b', 'c', 'g']),
  c: new Set(['a', 'b']),
  b: new Set(['a']),
  e: new Set(['a']),
  f: new Set(['e']),
  g: new Set(['f']),
}

x = calculateDepPaths('d', reverseDepGraph)
console.log(x)

function calculateDepPaths (moduleName, reverseDepGraph, partialPath) {
  // only present in recursion
  if (!partialPath) partialPath = [moduleName]
  // fans out into each new possibility
  const nextDeps = reverseDepGraph[moduleName]
  if (!nextDeps) return [partialPath]
  const current = Array.from(nextDeps).map(dep => {
    return [dep].concat(partialPath)
  })
  // recurse and flatten
  return flatMap(current, partial => {
    const next = partial[0]
    return calculateDepPaths(next, reverseDepGraph, partial)
  })
}