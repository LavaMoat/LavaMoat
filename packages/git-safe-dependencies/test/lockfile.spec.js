const test = require('ava')
const { validatePackages } = require('../src/lockfile.js')

test('validatePackages - valid', async (t) => {
  const packages = {
    'set-function-name@2.0.2-befb65fd1493d9197faae064de28a181b66bdd4f': {
      version: '2.0.2',
      resolved:
        'https://registry.npmjs.org/set-function-name/-/set-function-name-2.0.2.tgz',
      integrity:
        'sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==',
      requires: undefined,
    },
    'sha.js@2.4.11-61ab3ed91ba19d66b55341eaf1d81a26919616ac': {
      version: '2.4.11',
      resolved: 'https://registry.npmjs.org/sha.js/-/sha.js-2.4.11.tgz',
      integrity:
        'sha512-QMEp5B7cftE7APOjk5Y6xgrbWu+WkLVQwk8JNjZ8nKRciZaByEW6MubieAiToS7+dwvrjGhH8jRXz3MVd0AYqQ==',
      requires: undefined,
    },
  }
  const result = await validatePackages(packages)
  t.deepEqual(result, [])
})

test('validatePackages - valid - Yarn v4 (Berry) - patch', async (t) => {
  const packages = {
    'jest-environment-jsdom@patch:jest-environment-jsdom@npm%3A29.7.0#~/.yarn/patches/jest-environment-jsdom-npm-29.7.0-0b72dd0e0b.patch':
      {
        version: '29.7.0',
        resolution:
          'jest-environment-jsdom@patch:jest-environment-jsdom@npm%3A29.7.0#~/.yarn/patches/jest-environment-jsdom-npm-29.7.0-0b72dd0e0b.patch::version=29.7.0&hash=a6aa71',
        dependencies: {
          '@jest/environment': 'npm:^29.7.0',
          '@jest/fake-timers': 'npm:^29.7.0',
          '@jest/types': 'npm:^29.6.3',
          '@types/jsdom': 'npm:^20.0.0',
          '@types/node': 'npm:*',
          'jest-mock': 'npm:^29.7.0',
          'jest-util': 'npm:^29.7.0',
          jsdom: 'npm:^20.0.0',
        },
        peerDependencies: {
          canvas: '^2.5.0',
        },
        peerDependenciesMeta: {
          canvas: {
            optional: true,
          },
        },
        checksum:
          '10/ccc6dc855d841cbcaac17c3f8b25bd63827c7766bf4ee555ee7b7c2b9707ae172659be4a813fdddbdd2a933d9d6c23a97e13924e176a68cf44299c57bf1e3009',
        languageName: 'node',
        linkType: 'hard',
      },
  }
  const result = await validatePackages(packages)
  t.deepEqual(result, [])
})

test('validatePackages - invalid: unacceptable git URL', async (t) => {
  const packages = {
    'react-native-tcp@aprock/react-native-tcp#11/head': {
      version: '4.0.0',
      resolved:
        'https://codeload.github.com/aprock/react-native-tcp/tar.gz/98fbc801f0586297f16730b2f4c75eef15dfabcd',
    },
  }
  const knownDirectDependencies = {
    'react-native-tcp': 'aprock/react-native-tcp#11/head',
  }
  const result = await validatePackages(packages, knownDirectDependencies)
  t.true(result.length > 0)
  t.regex(
    JSON.stringify(result, null, 2),
    /There's a mismatch between the specified git hash and URL/
  )
})
