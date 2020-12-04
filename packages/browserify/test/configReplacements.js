const test = require('ava')
const { runSimpleOneTwo } = require('./util')

// coming soon : )

// test('configReplacements - empty', async (t) => {
//   const config = {
//     resources: {
//       one: {
//         packages: {
//           two: {
//             type: 'empty'
//           }
//         }
//       },
//     }
//   }
//   const oneExports = await runSimpleOneTwo({ config })
//   t.deepEqual(oneExports, {}, 'exports is empty')
// })

// test('configReplacements - replace', async (t) => {
//   const config = {
//     resources: {
//       one: {
//         packages: {
//           two: {
//             type: 'replace',
//             replacement: 'three'
//           }
//         }
//       },
//     }
//   }
//   const oneExports = await runSimpleOneTwo({ config })
//   t.deepEqual(oneExports, { value: 'this is module three' }, 'exports matches package "three" exports')
// })

// test('configReplacements - factory', async (t) => {
//   const config = {
//     resources: {
//       one: {
//         packages: {
//           two: {
//             type: 'factory',
//             replacement: 'three',
//             options: {
//               a: 1,
//               b: 2,
//             }
//           },
//         }
//       },
//     }
//   }

//   function defineThree () {
//     module.exports = {
//       create: (options) => ({
//         value: 'created in module three',
//         options,
//       })
//     }
//   }

//   const oneExports = await runSimpleOneTwo({ config, defineThree })
//   t.deepEqual(oneExports, { value: 'created in module three', options: { a:1, b:2 } }, 'exports matches package "three" exports')
// })