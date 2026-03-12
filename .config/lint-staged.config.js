// @ts-check

/** @param {string} filename */
const isFormattable = (filename) => !filename.includes('/node_modules/')

/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.js': (files) => {
    const formattableFiles = files.filter(isFormattable)
    return formattableFiles.length
      ? [
          `eslint --fix ${formattableFiles.join(' ')}`,
          `prettier --write ${formattableFiles.join(' ')}`,
        ]
      : []
  },
  '*.(ts|md|ya?ml)': (files) => {
    const formattableFiles = files.filter(isFormattable)
    return formattableFiles.length
      ? [`prettier --write ${formattableFiles.join(' ')}`]
      : []
  },
  '*.json': (files) => {
    const formattableFiles = files.filter(
      (p) => isFormattable(p) && !/\/(?:package-lock|policy)[^/]*\.json$/.test(p)
    )
    return formattableFiles.length
      ? [`prettier --write ${formattableFiles.join(' ')}`]
      : []
  },
}
