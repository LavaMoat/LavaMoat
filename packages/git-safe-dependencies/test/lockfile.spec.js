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

test('validatePackages - invalid: unacceptable git URL', async (t) => {
  const packages = {
    'react-native-tcp@aprock/react-native-tcp#11/head': {
      version: '4.0.0',
      resolved:
        'https://codeload.github.com/aprock/react-native-tcp/tar.gz/98fbc801f0586297f16730b2f4c75eef15dfabcd',
    },
    'react-native-tcp@aprock/react-native-tcp#main': {
      version: '4.0.0',
      resolved:
        'https://codeload.github.com/aprock/react-native-tcp/tar.gz/98fbc801f0586297f16730b2f4c75eef15dfabcd',
    },
  }
  const result = await validatePackages(packages)
  t.true(result.length > 0)
  t.regex(JSON.stringify(result, null, 2), /GIT URLs must use a commit hash/)
})

test('validatePackages - invalid: unacceptable host', async (t) => {
  const packages = {
    'set-function-name@2.0.2-befb65fd1493d9197faae064de28a181b66bdd4f': {
      version: '2.0.2',
      resolved:
        'https://registry.definitelynotnpmjs.org/set-function-name/-/set-function-name-2.0.2.tgz',
      integrity:
        'sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==',
      requires: undefined,
    },
    'sha.js@2.4.11-61ab3ed91ba19d66b55341eaf1d81a26919616ac': {
      version: '2.4.11',
      resolved:
        'https://registry.definitelynotnpmjs.org/sha.js/-/sha.js-2.4.11.tgz',
      integrity:
        'sha512-QMEp5B7cftE7APOjk5Y6xgrbWu+WkLVQwk8JNjZ8nKRciZaByEW6MubieAiToS7+dwvrjGhH8jRXz3MVd0AYqQ==',
      requires: undefined,
    },
  }
  const result = await validatePackages(packages)
  t.true(result.length > 0)
  t.regex(JSON.stringify(result, null, 2), /invalid host/)
})
