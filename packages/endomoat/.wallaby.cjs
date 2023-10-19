'use strict'

module.exports = () => {
  return {
    env: {
      type: 'node',
    },
    files: ['./src/**/*.js'],
    testFramework: 'ava',
    tests: ['./test/**/*.spec.js'],
    runMode: 'onsave',
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir
    },
  }
}
