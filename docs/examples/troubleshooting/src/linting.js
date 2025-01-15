const dynamicre = require('@example/dynamicre')

require('eslint-plugin-security') //It's been required, so should be available later

// Example usage of dynamicre package
const eslintConfig = {
  plugins: ['eslint-plugin-security'],
}
dynamicre.fakeEslint(eslintConfig)
