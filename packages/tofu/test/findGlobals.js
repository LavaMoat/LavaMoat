'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const test = require('tape');
const { parse } = require('../src/index');
const { findGlobals } = require('../src/findGlobals');

function detect(code) {
  const ast = parse(code)
  const globals = findGlobals(ast)
  const globalNames = [...globals.keys()].sort()
  return globalNames
}

function read(file) {
  return fs.readFileSync(path.resolve(__dirname + '/fixtures/', file), 'utf8');
}

// function buildQualifiedVariableName(node) {
//   const namePath = [];
//   for (const i = node.parents.length - 1; i >= 0; i--) {
//     const parent = node.parents[i];
//     if (parent.type === "Identifier") {
//       namePath.push(parent.name);
//     } else if (parent.type === "MemberExpression") {
//       namePath.push(parent.property.name || parent.property.value);
//     } else if (parent.type === "ThisExpression") {
//       namePath.push("this");
//     } else {
//       break;
//     }
//   }
//   return namePath.join('.');
// }

test('object method', (t) => {
  t.deepEqual(detect('const x = { xyz () {} }'), []);
  t.end()
});
test('argument.js - parameters from inline arguments', (t) => {
  t.deepEqual(detect(read('argument.js')), []);
  t.end()
});
test('arrow_functions.js - arguments of arrow functions are not globals', (t) => {
  t.deepEqual(detect(read('arrow_functions.js')), ['z', 'b', 'c', 'arguments'].sort());
  t.end()
});
test('assign_implicit.js - assign from an implicit global', (t) => {
  t.deepEqual(detect(read('assign_implicit.js')), ['bar']);
  t.end()
});
test('catch-pattern.js - pattern in catch', (t) => {
  t.deepEqual(detect(read('catch-pattern.js')), []);
  t.end()
});
test('class.js - ES2015 classes', (t) => {
  t.deepEqual(detect(read('class.js')), ['G', 'OtherClass_', 'SuperClass', 'this'].sort());
  t.end()
});
test('class-expression.js - class as expression', (t) => {
  t.deepEqual(detect(read('class-expression.js')), []);
  t.end()
});
test('default-argument.js - ES2015 default argument', (t) => {
  t.deepEqual(detect(read('default-argument.js')), ['c', 'h', 'j', 'k']);
  t.end()
});
test('destructuring-rest.js - ES2015 destructuring rest', (t) => {
  t.deepEqual(detect(read('destructuring-rest.js')), []);
  t.end()
});
test('destructuring.js - ES2015 variable destructuring', (t) => {
  t.deepEqual(detect(read('destructuring.js')), ['g']);
  t.end()
});
test('detect.js - check locals and globals', (t) => {
  t.deepEqual(
    detect(read('detect.js')),
    ['w', 'foo', 'process', 'console', 'AAA', 'BBB', 'CCC', 'xyz', 'ZZZ', 'BLARG', 'RAWR'].sort()
  );
    t.end()
});
// test('detect.js - check variable names', (t) => {
//   t.deepEqual(
//     detect(read('detect.js')).map(function (node) { return '[' + node.nodes.map(buildQualifiedVariableName) + ']'; }),
//     [
//       '[w.foo,w]',
//       '[foo]',
//       '[process.nextTick]',
//       '[console.log,console.log]',
//       '[AAA.aaa]',
//       '[BBB.bbb]',
//       '[CCC.x]',
//       '[xyz]',
//       '[ZZZ,ZZZ.foo]',
//       '[BLARG]',
//       '[RAWR,RAWR.foo]'
//     ].sort()
//   );
//     t.end()
// });
// test('export.js - Anything that has been imported is not a global', (t) => {
//   t.deepEqual(detect(read('export.js')), ['baz']);
//   t.end()
// });
// test('export-default-anonymous-class.js - export anonymous class as default', (t) => {
//   t.deepEqual(detect(read('export-default-anonymous-class.js')), []);
//   t.end()
// });
// test('export-default-anonymous-function.js - export anonymous function as default', (t) => {
//   t.deepEqual(detect(read('export-default-anonymous-function.js')), []);
//   t.end()
// });
// test('import.js - Anything that has been imported is not a global', (t) => {
//   t.deepEqual(detect(read('import.js')), ['whatever']);
//   t.end()
// });
test('labels.js - labels for while loops are not globals', (t) => {
  t.deepEqual(detect(read('labels.js')), []);
  t.end()
});
// test('multiple-exports.js - multiple-exports', (t) => {
//   t.deepEqual(detect(read('multiple-exports.js')), ['bar', 'exports']);
//   t.end()
// });
test('named_arg.js - named argument / parameter', (t) => {
  t.deepEqual(detect(read('named_arg.js')), []);
  t.end()
});
test('names-in-object-prototype.js - check names in object prototype', (t) => {
  t.deepEqual(detect(read('names-in-object-prototype.js')).sort(), ['__proto__', 'constructor', 'hasOwnProperty']);
  t.end()
});
test('obj.js - globals on the right-hand of a colon in an object literal', (t) => {
  t.deepEqual(detect(read('obj.js')), ['bar', 'module']);
  t.end()
});
// test('properties.js - check variable names', (t) => {
//   t.deepEqual(
//     detect(read('properties.js')).map(function (node) { return '[' + node.nodes.map(buildQualifiedVariableName) + ']'; }),
//     [
//       '[simple_g]',
//       '[qualified_g]',
//       '[ugly.chained.methodCall,ugly.chained.lookup]',
//       '[uglier.chained.property.lookup]'
//     ].sort()
//   );
//     t.end()
// });
test('reserved-words.js - check we do not force into strict mode', (t) => {
  t.deepEqual(detect(read('reserved-words.js')), ['console']);
  t.end()
});
test('rest-argument.js - ES2015 rest argument', (t) => {
  t.deepEqual(detect(read('rest-argument.js')), []);
  t.end()
});
test('return_hash.js - named argument / parameter', (t) => {
  t.deepEqual(detect(read('return_hash.js')), []);
  t.end()
});
test('right_hand.js - globals on the right-hand of assignment', (t) => {
  t.deepEqual(detect(read('right_hand.js')), [ 'exports', '__dirname', '__filename' ].sort());
  t.end()
});
test('try_catch.js - the exception in a try catch block is a local', (t) => {
  t.deepEqual(detect(read('try_catch.js')), []);
  t.end()
});
// test('this.js - `this` is considered a global', (t) => {
//   t.deepEqual(detect(read('this.js')), ['this']);
// });
