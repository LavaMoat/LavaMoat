# Snapshot report for `test/compartment-map.spec.js`

The actual snapshot is saved in `compartment-map.spec.js.snap`.

Generated by [AVA](https://avajs.dev).

## compartment map is deterministic

> Snapshot 1

    {
      compartmentMap: {
        compartments: {
          'app-v1.0.0': {
            label: 'app-v1.0.0',
            location: 'app-v1.0.0',
            modules: {
              './main.js': {
                location: 'main.js',
                parser: 'mjs',
                sha512: '2013c4c59637796bd4e7c44f012cf4f687d42daaca9901ba83efbf4646539643d0b8c970a63860a6291017abc8d509f957b194901fa078052da969d2fe68066c',
              },
              app: {
                compartment: 'app-v1.0.0',
                module: './main.js',
              },
              avery: {
                compartment: 'avery-v1.0.0',
                module: './avery.js',
              },
              brooke: {
                compartment: 'brooke-v1.0.0',
                module: './brooke.js',
              },
              cjs: {
                compartment: 'cjs-v1.0.0',
                module: './index.js',
              },
              clarke: {
                compartment: 'clarke-v1.0.0',
                module: './index.js',
              },
              danny: {
                compartment: 'danny-v1.0.0',
                module: './src/index.js',
              },
              ignored: {
                compartment: 'ignored-v1.0.0',
                module: './index.js',
              },
            },
            name: 'app',
            policy: undefined,
          },
          'avery-v1.0.0': {
            label: 'avery-v1.0.0',
            location: 'avery-v1.0.0',
            modules: {
              './avery.js': {
                location: 'avery.js',
                parser: 'mjs',
                sha512: '5e252740e8027f147bb34ed4b35d488ad7885d68be0a16fe8315f474e56eb0fe92952bbb5ea1accca207555475149e92bfb4e4d979fcf8618f2891e804ee5ac4',
              },
              avery: {
                compartment: 'avery-v1.0.0',
                module: './avery.js',
              },
              edwin: {
                compartment: 'edwin-v1.0.0',
                module: './index.js',
              },
            },
            name: 'avery',
            policy: undefined,
          },
          'brooke-v1.0.0': {
            label: 'brooke-v1.0.0',
            location: 'brooke-v1.0.0',
            modules: {
              './brooke.js': {
                location: 'brooke.js',
                parser: 'mjs',
                sha512: '0b55ba1213382817a0c519938bef33f00dce6dc8e242e9fcc6e5a7c48412f3e0bb10385204c08e205c0bb9d4f00cb0b11cad658e7c43e3e4fcfffa17db5b47b2',
              },
              brooke: {
                compartment: 'brooke-v1.0.0',
                module: './brooke.js',
              },
              clarke: {
                compartment: 'clarke-v1.0.0',
                module: './index.js',
              },
            },
            name: 'brooke',
            policy: undefined,
          },
          'cjs-v1.0.0': {
            label: 'cjs-v1.0.0',
            location: 'cjs-v1.0.0',
            modules: {
              '.': {
                compartment: 'cjs-v1.0.0',
                module: './index.js',
              },
              './index.js': {
                location: 'index.js',
                parser: 'cjs',
                sha512: '9a681053d05f1bb4b72d3bf6c3227d41960cf811690ad7e84af663fef124aa60934658547eb2f2f22641670375600f0ba6e81098865cdc74479d1a8d2d876de4',
              },
              cjs: {
                compartment: 'cjs-v1.0.0',
                module: './index.js',
              },
              clarke: {
                compartment: 'clarke-v1.0.0-n1',
                module: './index.js',
              },
            },
            name: 'cjs',
            policy: undefined,
          },
          'clarke-v1.0.0': {
            label: 'clarke-v1.0.0',
            location: 'clarke-v1.0.0',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: 'b57595b64b5ba15398757f7b0772a52bc46f9c5e013139b85e20c33c61b9ccd4b2cf6981e3b97f59fa6e03f844c9e4899da9168a092d935e66bb20353f6ef575',
              },
              clarke: {
                compartment: 'clarke-v1.0.0',
                module: './index.js',
              },
            },
            name: 'clarke',
            policy: undefined,
          },
          'clarke-v1.0.0-n1': {
            label: 'clarke-v1.0.0',
            location: 'clarke-v1.0.0-n1',
            modules: {
              '.': {
                compartment: 'clarke-v1.0.0-n1',
                module: './index.js',
              },
              './index.js': {
                location: 'index.js',
                parser: 'cjs',
                sha512: 'eaef3c6b800de6bcd90ff52affdafe0f091bddb3a29da1898a80e41efe1262544a8520b4084e97e8c6ee3fdcf0e40ed1f79b8cb7ab618558c3fee822004cb8e2',
              },
              clarke: {
                compartment: 'clarke-v1.0.0-n1',
                module: './index.js',
              },
            },
            name: 'clarke',
            policy: undefined,
          },
          'danny-v1.0.0': {
            label: 'danny-v1.0.0',
            location: 'danny-v1.0.0',
            modules: {
              './src/danny.js': {
                location: 'src/danny.js',
                parser: 'mjs',
                sha512: '5c8564400e8f6806e0147e003aff6267bb8f67b39765932ddfcdf0ae07a3ebad0aca5853c99ff42962e0a90e11acde8ed7ef8941b35afe03930aaab731e106e6',
              },
              './src/index.js': {
                location: 'src/index.js',
                parser: 'mjs',
                sha512: 'c857a8deb2176f823796aa370c3eea4884c27ecf6df206e2391476faa6f078823df94d3a06afb7b2e9ae178a0a8b26ee3aa6d2a3240c2ef461874129cb73e0a2',
              },
              danny: {
                compartment: 'danny-v1.0.0',
                module: './src/index.js',
              },
              'danny/src/danny.js': {
                compartment: 'danny-v1.0.0',
                module: './src/danny.js',
              },
            },
            name: 'danny',
            policy: undefined,
          },
          'edwin-v1.0.0': {
            label: 'edwin-v1.0.0',
            location: 'edwin-v1.0.0',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: 'e19ed5e96fb4b02a5a6d1ecb35f2bc83383ccabade2772a336ddabdfe3bc9f43df521d96b31a3ff506177508312155a6fc7c1794e8a712312280a81b2a0a5a68',
              },
              edwin: {
                compartment: 'edwin-v1.0.0',
                module: './index.js',
              },
            },
            name: 'edwin',
            policy: undefined,
          },
          'main-v1.0.0': {
            label: 'main-v1.0.0',
            location: 'main-v1.0.0',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: 'c0acf098e630d89f7edb678cba86a4189f38179ff5691a5777ab0728b0722071e8d6fe00af199e81d2ea3f3413cb9b548cd225ee4252388b4ab170d8022aff58',
              },
              app: {
                compartment: 'app-v1.0.0',
                module: './main.js',
              },
              main: {
                compartment: 'main-v1.0.0',
                module: './index.js',
              },
            },
            name: 'main',
            policy: undefined,
          },
        },
        entry: {
          compartment: 'main-v1.0.0',
          module: './index.js',
        },
        tags: [],
      },
      renames: {
        'app-v1.0.0': 'file:///node_modules/app/',
        'avery-v1.0.0': 'file:///node_modules/avery/',
        'brooke-v1.0.0': 'file:///node_modules/brooke/',
        'cjs-v1.0.0': 'file:///node_modules/cjs/',
        'clarke-v1.0.0': 'file:///node_modules/clarke/',
        'clarke-v1.0.0-n1': 'file:///node_modules/cjs/node_modules/clarke/',
        'danny-v1.0.0': 'file:///node_modules/danny/',
        'edwin-v1.0.0': 'file:///node_modules/edwin/',
        'ignored-v1.0.0': 'file:///node_modules/ignored/',
        'main-v1.0.0': 'file:///',
      },
      sources: {
        'app-v1.0.0': {
          './main.js': {
            bytes: Buffer @Uint8Array [
              2f2a2067 6c6f6261 6c20676c 6f62616c 50726f70 65727479 202a2f0a 0a657870
              6f727420 7b206176 65727920 7d206672 6f6d2027 61766572 79273b0a 2f2f204d
              7920286b 7269736b 6f77616c 29207468 656f7279 20697320 74686174 20746865
              2062726f 6f6b6520 6d6f6475 6c652069 736e2774 20726573 6f6c7661 626c6520
              62656361 75736520 7468650a 2f2f206c 696e7465 72206973 6e277420 61776172
              65206f66 20706163 6b616765 2e6a736f 6e277320 6d61696e 2070726f 70657274
              7920616e 64207365 656d7320 746f2068 6f706520 74686174 0a2f2f20 62726f6f
              6b652f69 6e646578 2e6a7320 7374616e 64732069 6e20666f 72206974 2e0a2f2f
              2065736c 696e742d 64697361 626c652d 6e657874 2d6c696e 6520696d 706f7274
              2f6e6f2d 756e7265 736f6c76 65640a65 78706f72 74207b20 62726f6f 6b65207d
              2066726f 6d202762 726f6f6b 65273b0a 6578706f 7274207b 20636c61 726b6520
              7d206672 6f6d2027 636c6172 6b65273b 0a657870 6f727420 7b206461 6e6e7920
              7d206672 6f6d2027 64616e6e 79273b0a 0a657870 6f727420 636f6e73 74207265
              63656976 6564476c 6f62616c 50726f70 65727479 203d2067 6c6f6261 6c50726f
              70657274 793b0a0a 6578706f 72742063 6f6e7374 20696d70 6f72744d 65746155
              726c203d 20696d70 6f72742e 6d657461 2e75726c 3b0a0a69 66202821 4f626a65
              63742e69 7346726f 7a656e28 676c6f62 616c5468 69732929 207b0a20 20746872
              6f77206e 65772045 72726f72 28275468 6520676c 6f62616c 206f626a 65637420
              6d757374 20626520 66726f7a 656e2069 6e20616c 6c20636f 6d706172 746d656e
              74732729 3b0a7d0a 0a2f2f20 7265666c 65786976 6974790a 696d706f 7274202a
              20617320 61707020 66726f6d 20276170 70273b0a 696d706f 7274202a 20617320
              6170704d 61696e20 66726f6d 20276170 70273b0a 69662028 61707020 213d3d20
              6170704d 61696e29 207b0a20 20746872 6f77206e 65772045 72726f72 280a2020
              20202749 6d706f72 7420616c 69617365 7320666f 72207468 65207265 666c6578
              69766520 6d6f6475 6c65206e 616d6520 73686f75 6c642070 726f6475 63652069
              64656e74 6963616c 206e616d 65737061 6365206f 626a6563 7473272c 0a202029
              3b0a7d0a 0a696d70 6f727420 636a7320 66726f6d 2027636a 73273b0a 6578706f
              72742063 6f6e7374 20636a73 56616c75 65203d20 636a732e 636a733b 0a0a
            ],
            location: 'main.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                cjsValue: [
                  'cjsValue',
                ],
                importMetaUrl: [
                  'importMetaUrl',
                ],
                receivedGlobalProperty: [
                  'receivedGlobalProperty',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: true,
              __reexportMap__: {
                avery: [
                  [
                    'avery',
                    'avery',
                  ],
                ],
                brooke: [
                  [
                    'brooke',
                    'brooke',
                  ],
                ],
                clarke: [
                  [
                    'clarke',
                    'clarke',
                  ],
                ],
                danny: [
                  [
                    'danny',
                    'danny',
                  ],
                ],
              },
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   let app,appMain,cjs;$h͏_imports([["avery", []],["brooke", []],["clarke", []],["danny", []],["app", [["*", [$h͏_a => (app = $h͏_a),$h͏_a => (appMain = $h͏_a)]]]],["cjs", [["default", [$h͏_a => (cjs = $h͏_a)]]]]]);   ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              ␊
              const        receivedGlobalProperty=  globalProperty;$h͏_once.receivedGlobalProperty(receivedGlobalProperty);␊
              ␊
              const        importMetaUrl=  $h͏____meta.url;$h͏_once.importMetaUrl(importMetaUrl);␊
              ␊
              if( !Object.isFrozen(globalThis)) {␊
                throw new Error('The global object must be frozen in all compartments');␊
               }␊
              ␊
              // reflexivity␊
              ␊
              ␊
              if( app!==  appMain) {␊
                throw new Error(␊
                  'Import aliases for the reflexive module name should produce identical namespace objects');␊
              ␊
               }␊
              ␊
              ␊
              const        cjsValue=  cjs.cjs;$h͏_once.cjsValue(cjsValue);␊
              })()␊
              //# sourceURL=file:///node_modules/app/main.js␊
              `,
              exports: [
                'cjsValue',
                'importMetaUrl',
                'receivedGlobalProperty',
                undefined,
                undefined,
                undefined,
                undefined,
              ],
              imports: [
                'avery',
                'brooke',
                'clarke',
                'danny',
                'app',
                'cjs',
              ],
              reexports: [],
            },
            sha512: '2013c4c59637796bd4e7c44f012cf4f687d42daaca9901ba83efbf4646539643d0b8c970a63860a6291017abc8d509f957b194901fa078052da969d2fe68066c',
            sourceLocation: 'file:///node_modules/app/main.js',
          },
        },
        'avery-v1.0.0': {
          './avery.js': {
            bytes: Buffer @Uint8Array [
              6578706f 72742063 6f6e7374 20617665 7279203d 20274176 65727927 3b0a6578
              706f7274 207b2065 6477696e 207d2066 726f6d20 272e2e2f 65647769 6e273b0a
            ],
            location: 'avery.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                avery: [
                  'avery',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {
                '../edwin': [
                  [
                    'edwin',
                    'edwin',
                  ],
                ],
              },
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   $h͏_imports([["../edwin", []]]);   const        avery=  'Avery';$h͏_once.avery(avery);␊
              })()␊
              //# sourceURL=file:///node_modules/avery/avery.js␊
              `,
              exports: [
                'avery',
                undefined,
              ],
              imports: [
                '../edwin',
              ],
              reexports: [],
            },
            sha512: '5e252740e8027f147bb34ed4b35d488ad7885d68be0a16fe8315f474e56eb0fe92952bbb5ea1accca207555475149e92bfb4e4d979fcf8618f2891e804ee5ac4',
            sourceLocation: 'file:///node_modules/avery/avery.js',
          },
        },
        'brooke-v1.0.0': {
          './brooke.js': {
            bytes: Buffer @Uint8Array [
              696d706f 7274207b 20636c61 726b6520 7d206672 6f6d2027 636c6172 6b65273b
              0a0a6578 706f7274 20636f6e 73742062 726f6f6b 65203d20 2742726f 6f6b6527
              3b0a0a69 66202821 4f626a65 63742e69 7346726f 7a656e28 676c6f62 616c5468
              69732929 207b0a20 20746872 6f77206e 65772045 72726f72 28275468 6520676c
              6f62616c 206f626a 65637420 6d757374 20626520 66726f7a 656e2069 6e20616c
              6c20636f 6d706172 746d656e 74732729 3b0a7d0a
            ],
            location: 'brooke.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                brooke: [
                  'brooke',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   let clarke;$h͏_imports([["clarke", [["clarke", [$h͏_a => (clarke = $h͏_a)]]]]]);   ␊
              ␊
              const        brooke=  'Brooke';$h͏_once.brooke(brooke);␊
              ␊
              if( !Object.isFrozen(globalThis)) {␊
                throw new Error('The global object must be frozen in all compartments');␊
               }␊
              })()␊
              //# sourceURL=file:///node_modules/brooke/brooke.js␊
              `,
              exports: [
                'brooke',
              ],
              imports: [
                'clarke',
              ],
              reexports: [],
            },
            sha512: '0b55ba1213382817a0c519938bef33f00dce6dc8e242e9fcc6e5a7c48412f3e0bb10385204c08e205c0bb9d4f00cb0b11cad658e7c43e3e4fcfffa17db5b47b2',
            sourceLocation: 'file:///node_modules/brooke/brooke.js',
          },
        },
        'cjs-v1.0.0': {
          './index.js': {
            bytes: Buffer @Uint8Array [
              72657175 69726528 27636c61 726b6527 290a0a6d 6f64756c 652e6578 706f7274
              73203d20 7b0a2020 636a733a 20747275 650a7d0a
            ],
            location: 'index.js',
            parser: 'cjs',
            record: {
              execute: Function execute {},
              exports: [
                'cjs',
                'default',
              ],
              imports: [
                'clarke',
              ],
              reexports: [],
            },
            sha512: '9a681053d05f1bb4b72d3bf6c3227d41960cf811690ad7e84af663fef124aa60934658547eb2f2f22641670375600f0ba6e81098865cdc74479d1a8d2d876de4',
            sourceLocation: 'file:///node_modules/cjs/index.js',
          },
        },
        'clarke-v1.0.0': {
          './index.js': {
            bytes: Buffer @Uint8Array [
              6578706f 72742063 6f6e7374 20636c61 726b6520 3d202743 6c61726b 65273b0a
              0a696620 28214f62 6a656374 2e697346 726f7a65 6e28676c 6f62616c 54686973
              2929207b 0a202074 68726f77 206e6577 20457272 6f722827 54686520 676c6f62
              616c206f 626a6563 74206d75 73742062 65206672 6f7a656e 20696e20 616c6c20
              636f6d70 6172746d 656e7473 27293b0a 7d0a
            ],
            location: 'index.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                clarke: [
                  'clarke',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   $h͏_imports([]);   const        clarke=  'Clarke';$h͏_once.clarke(clarke);␊
              ␊
              if( !Object.isFrozen(globalThis)) {␊
                throw new Error('The global object must be frozen in all compartments');␊
               }␊
              })()␊
              //# sourceURL=file:///node_modules/clarke/index.js␊
              `,
              exports: [
                'clarke',
              ],
              imports: [],
              reexports: [],
            },
            sha512: 'b57595b64b5ba15398757f7b0772a52bc46f9c5e013139b85e20c33c61b9ccd4b2cf6981e3b97f59fa6e03f844c9e4899da9168a092d935e66bb20353f6ef575',
            sourceLocation: 'file:///node_modules/clarke/index.js',
          },
        },
        'clarke-v1.0.0-n1': {
          './index.js': {
            bytes: Buffer @Uint8Array [
              6578706f 7274732e 636c6172 6b65203d 2027436c 61726b65 273b0a0a 69662028
              214f626a 6563742e 69734672 6f7a656e 28676c6f 62616c54 68697329 29207b0a
              20207468 726f7720 6e657720 4572726f 72282754 68652067 6c6f6261 6c206f62
              6a656374 206d7573 74206265 2066726f 7a656e20 696e2061 6c6c2063 6f6d7061
              72746d65 6e747327 293b0a7d 0a
            ],
            location: 'index.js',
            parser: 'cjs',
            record: {
              execute: Function execute {},
              exports: [
                'clarke',
                'default',
              ],
              imports: [],
              reexports: [],
            },
            sha512: 'eaef3c6b800de6bcd90ff52affdafe0f091bddb3a29da1898a80e41efe1262544a8520b4084e97e8c6ee3fdcf0e40ed1f79b8cb7ab618558c3fee822004cb8e2',
            sourceLocation: 'file:///node_modules/cjs/node_modules/clarke/index.js',
          },
        },
        'danny-v1.0.0': {
          './src/danny.js': {
            bytes: Buffer @Uint8Array [
              6578706f 72742063 6f6e7374 2064616e 6e79203d 20274461 6e6e7927 3b0a0a69
              66202821 4f626a65 63742e69 7346726f 7a656e28 676c6f62 616c5468 69732929
              207b0a20 20746872 6f77206e 65772045 72726f72 28275468 6520676c 6f62616c
              206f626a 65637420 6d757374 20626520 66726f7a 656e2069 6e20616c 6c20636f
              6d706172 746d656e 74732729 3b0a7d0a
            ],
            location: 'src/danny.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                danny: [
                  'danny',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   $h͏_imports([]);   const        danny=  'Danny';$h͏_once.danny(danny);␊
              ␊
              if( !Object.isFrozen(globalThis)) {␊
                throw new Error('The global object must be frozen in all compartments');␊
               }␊
              })()␊
              //# sourceURL=file:///node_modules/danny/src/danny.js␊
              `,
              exports: [
                'danny',
              ],
              imports: [],
              reexports: [],
            },
            sha512: '5c8564400e8f6806e0147e003aff6267bb8f67b39765932ddfcdf0ae07a3ebad0aca5853c99ff42962e0a90e11acde8ed7ef8941b35afe03930aaab731e106e6',
            sourceLocation: 'file:///node_modules/danny/src/danny.js',
          },
          './src/index.js': {
            bytes: Buffer @Uint8Array [
              6578706f 7274202a 2066726f 6d202764 616e6e79 2f737263 2f64616e 6e792e6a
              73273b0a 0a696620 28214f62 6a656374 2e697346 726f7a65 6e28676c 6f62616c
              54686973 2929207b 0a202074 68726f77 206e6577 20457272 6f722827 54686520
              676c6f62 616c206f 626a6563 74206d75 73742062 65206672 6f7a656e 20696e20
              616c6c20 636f6d70 6172746d 656e7473 27293b0a 7d0a
            ],
            location: 'src/index.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {},
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   $h͏_imports([["danny/src/danny.js", []]]);   ␊
              ␊
              if( !Object.isFrozen(globalThis)) {␊
                throw new Error('The global object must be frozen in all compartments');␊
               }␊
              })()␊
              //# sourceURL=file:///node_modules/danny/src/index.js␊
              `,
              exports: [],
              imports: [
                'danny/src/danny.js',
              ],
              reexports: [
                'danny/src/danny.js',
              ],
            },
            sha512: 'c857a8deb2176f823796aa370c3eea4884c27ecf6df206e2391476faa6f078823df94d3a06afb7b2e9ae178a0a8b26ee3aa6d2a3240c2ef461874129cb73e0a2',
            sourceLocation: 'file:///node_modules/danny/src/index.js',
          },
        },
        'edwin-v1.0.0': {
          './index.js': {
            bytes: Buffer @Uint8Array [
              6578706f 72742063 6f6e7374 20656477 696e203d 205b2745 64646965 272c2027
              4564275d 3b0a
            ],
            location: 'index.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                edwin: [
                  'edwin',
                ],
              },
              __liveExportMap__: {},
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   $h͏_imports([]);   const        edwin=  ['Eddie', 'Ed'];$h͏_once.edwin(edwin);␊
              })()␊
              //# sourceURL=file:///node_modules/edwin/index.js␊
              `,
              exports: [
                'edwin',
              ],
              imports: [],
              reexports: [],
            },
            sha512: 'e19ed5e96fb4b02a5a6d1ecb35f2bc83383ccabade2772a336ddabdfe3bc9f43df521d96b31a3ff506177508312155a6fc7c1794e8a712312280a81b2a0a5a68',
            sourceLocation: 'file:///node_modules/edwin/index.js',
          },
        },
        'ignored-v1.0.0': {},
        'main-v1.0.0': {
          './index.js': {
            bytes: Buffer @Uint8Array [
              696d706f 7274202a 20617320 41707020 66726f6d 20276170 70270a0a 6578706f
              72742063 6f6e7374 2068656c 6c6f203d 2027776f 726c6427 0a657870 6f727420
              7b204170 70207d0a
            ],
            location: 'index.js',
            parser: 'mjs',
            record: ModuleSource {
              __fixedExportMap__: {
                hello: [
                  'hello',
                ],
              },
              __liveExportMap__: {
                App: [
                  'App',
                  false,
                ],
              },
              __needsImportMeta__: false,
              __reexportMap__: {},
              __syncModuleProgram__: `({   imports: $h͏_imports,   liveVar: $h͏_live,   onceVar: $h͏_once,   importMeta: $h͏____meta, }) => (function () { 'use strict';   let App;$h͏_imports([["app", [["*", [$h͏_a => (App = $h͏_a),$h͏_live["App"]]]]]]);   ␊
              ␊
              const        hello=  'world';$h͏_once.hello(hello);␊
              })()␊
              //# sourceURL=file:///index.js␊
              `,
              exports: [
                'App',
                'hello',
              ],
              imports: [
                'app',
              ],
              reexports: [],
            },
            sha512: 'c0acf098e630d89f7edb678cba86a4189f38179ff5691a5777ab0728b0722071e8d6fe00af199e81d2ea3f3413cb9b548cd225ee4252388b4ab170d8022aff58',
            sourceLocation: 'file:///index.js',
          },
        },
      },
    }