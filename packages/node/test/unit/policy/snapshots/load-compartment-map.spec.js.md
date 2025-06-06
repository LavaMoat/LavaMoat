# Snapshot report for `test/unit/policy/load-compartment-map.spec.js`

The actual snapshot is saved in `load-compartment-map.spec.js.snap`.

Generated by [AVA](https://avajs.dev).

## result is deterministic

> Snapshot 1

    {
      compartmentMap: {
        compartments: {
          $root$: {
            label: '$root$',
            location: '$root$',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: '5e5138af2d1b16b870fea6fd1c4fee223f6700c461b316b0d18640b71255f63af8e72c748b8d56dafb5904c4416186843aae2a3a097ff1c3ab8edaafda191b7c',
              },
              app: {
                compartment: 'app',
                module: './main.js',
              },
            },
            name: 'main',
          },
          app: {
            label: 'app',
            location: 'app',
            modules: {
              './main.js': {
                location: 'main.js',
                parser: 'mjs',
                sha512: '0069904b07375527b509c793fc3857d77f709afc920cd83eb6a21f94c11b31a1c867c469cfd93f5a66f4f0b5aa1a288d8510da37526aae6e2b08f32999da7ce1',
              },
              app: {
                compartment: 'app',
                module: './main.js',
              },
              avery: {
                compartment: 'app>avery',
                module: './avery.js',
              },
              brooke: {
                compartment: 'app>brooke',
                module: './brooke.js',
              },
              cjs: {
                compartment: 'app>cjs',
                module: './index.js',
              },
              clarke: {
                compartment: 'app>clarke',
                module: './index.js',
              },
              danny: {
                compartment: 'app>danny',
                module: './src/index.js',
              },
            },
            name: 'app',
          },
          'app>avery': {
            label: 'app>avery',
            location: 'app>avery',
            modules: {
              './avery.js': {
                location: 'avery.js',
                parser: 'mjs',
                sha512: '1d739292144b4a0122511fd5c33e4a2cbad6b5f8d6805e5d3465da4e17bb4d23fe28705992ae5fcd1203ef6035067644889aec42f6e963d3cbcb8d71c91c9b30',
              },
              edwin: {
                compartment: 'app>avery>edwin',
                module: './index.js',
              },
            },
            name: 'avery',
          },
          'app>avery>edwin': {
            label: 'app>avery>edwin',
            location: 'app>avery>edwin',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: 'c7920b284db97f4d02c9fe689fc9ef2455dc2cf12bd482edcb75a4911d03fd285e1d2d75caaaab91f97c0203e9be7f0850b0a86c7e1884be11a86159fb06c478',
              },
            },
            name: 'edwin',
          },
          'app>brooke': {
            label: 'app>brooke',
            location: 'app>brooke',
            modules: {
              './brooke.js': {
                location: 'brooke.js',
                parser: 'mjs',
                sha512: '7fdd439288c3f58daba75ff038d823652224e972dc1d54a13724f21829817b0cc38ec76934731db8cf8e9cf47579a7d4590ca1409424d3c11b0b1734b2ff217d',
              },
              clarke: {
                compartment: 'app>clarke',
                module: './index.js',
              },
            },
            name: 'brooke',
          },
          'app>cjs': {
            label: 'app>cjs',
            location: 'app>cjs',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'cjs',
                sha512: 'bd01473aca254868a294e3e43177e79b4cf3921cafe96e3e50c30b11b0749758786933d7b32be903a6a8db156c46ee32807b96de404195fa713c595805fcd2d8',
              },
              clarke: {
                compartment: 'app>cjs>clarke',
                module: './index.js',
              },
            },
            name: 'cjs',
          },
          'app>cjs>clarke': {
            label: 'app>cjs>clarke',
            location: 'app>cjs>clarke',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'cjs',
                sha512: 'e6f97d9af40106740adef36b776ac52e72da8afefe904a228376dfe53c57db025e4c4be3bfc645facba85d40b2d32e1ac5e4f471db5ba264f651db81cd3dfe5e',
              },
            },
            name: 'clarke',
          },
          'app>clarke': {
            label: 'app>clarke',
            location: 'app>clarke',
            modules: {
              './index.js': {
                location: 'index.js',
                parser: 'mjs',
                sha512: '930b239bd0e298314617f84fdf245da64aad3d00408a3af206ce6ae38d189a4212345643a64e99106d2f405ce6a7e911d93a897abee59525389b0f99241c979d',
              },
            },
            name: 'clarke',
          },
          'app>danny': {
            label: 'app>danny',
            location: 'app>danny',
            modules: {
              './src/danny.js': {
                location: 'src/danny.js',
                parser: 'mjs',
                sha512: 'c3cabb976bfb8c98b7b955d77a680754f7a16c856f5c4c323a82217cae3e644cda30d64b9941d211730fc40fae1023b31c7f8a6afb71120e7379d15bd79ad88e',
              },
              './src/index.js': {
                location: 'src/index.js',
                parser: 'mjs',
                sha512: 'cf77aa945b8ebc216cd413ce2d548ba480ba5642a5c5c5883d07ed70d3cac75ace1b48d32fcbfb3bbaebf750068059860fcb62654d3f5099236857748f327da1',
              },
              'danny/src/danny.js': {
                compartment: 'app>danny',
                module: './src/danny.js',
              },
            },
            name: 'danny',
          },
        },
        entry: {
          compartment: '$root$',
          module: './index.js',
        },
        tags: [],
      },
      renames: {
        $root$: 'file:///',
        app: 'file:///node_modules/app/',
        'app>avery': 'file:///node_modules/avery/',
        'app>avery>edwin': 'file:///node_modules/edwin/',
        'app>brooke': 'file:///node_modules/brooke/',
        'app>cjs': 'file:///node_modules/cjs/',
        'app>cjs>clarke': 'file:///node_modules/cjs/node_modules/clarke/',
        'app>clarke': 'file:///node_modules/clarke/',
        'app>danny': 'file:///node_modules/danny/',
        'app>ignored': 'file:///node_modules/ignored/',
      },
    }
