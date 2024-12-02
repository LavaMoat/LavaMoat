const { SourceMapConsumer } = require('source-map')
const validate = require('@lavamoat/sourcemap-validator')
const { fromSource: extractSourceMap } = require('convert-source-map')
const { explore } = require('source-map-explorer')
const { codeFrameColumns } = require('@babel/code-frame')

module.exports = { verifySourceMaps }

async function verifySourceMaps({ bundle, log = console.error.bind(console) }) {
  // basic sanity checking
  validate(bundle)
  // our custom sample checking
  await verifySamples(bundle, log)
  // generate a sourcemap explorer because its stricter than some other validations
  await verifyWithSourceExplorer(bundle)
}

async function verifyWithSourceExplorer(bundle) {
  try {
    await explore({ code: Buffer.from(bundle, 'utf8') })
  } catch (resultWithError) {
    if (resultWithError.errors) {
      resultWithError.errors.forEach((exploreError) => {
        // throw the first
        throw exploreError.error
      })
    } else {
      throw resultWithError
    }
  }
}

async function verifySamples(bundle, log) {
  const sourcemap = extractSourceMap(bundle).toObject()
  const consumer = await new SourceMapConsumer(sourcemap)

  const hasContentsOfAllSources = consumer.hasContentsOfAllSources()
  if (!hasContentsOfAllSources) {
    log('SourcemapValidator - missing content of some sources...')
  }

  const buildLines = bundle.split('\n')
  const targetString = 'module.exports'
  const matchesPerLine = buildLines.map((line) => indicesOf(targetString, line))
  const errors = []
  matchesPerLine.forEach((matchIndices, lineIndex) => {
    matchIndices.forEach((matchColumn) => {
      const position = { line: lineIndex + 1, column: matchColumn }
      const result = consumer.originalPositionFor(position)
      // warn if source content is missing
      if (!result.source) {
        const location = {
          start: { line: position.line, column: position.column + 1 },
        }
        const codeSample = codeFrameColumns(bundle, location, {
          message: 'missing source for position',
          highlightCode: true,
        })
        errors.push(`missing source for position, in bundle\n${codeSample}`)
        return
      }
      const sourceContent = consumer.sourceContentFor(result.source)
      const sourceLines = sourceContent.split('\n')
      const sourceLine = sourceLines[result.line - 1]
      // this sometimes includes the whole line though we tried to match somewhere in the middle
      const portion = sourceLine.slice(result.column)
      const foundValidSource = portion.includes(targetString)
      if (!foundValidSource) {
        const location = {
          start: { line: result.line + 1, column: result.column + 1 },
        }
        const codeSample = codeFrameColumns(sourceContent, location, {
          message: `expected to see ${JSON.stringify(targetString)}`,
          highlightCode: true,
        })
        errors.push(`Sourcemap seems invalid, ${result.source}\n${codeSample}`)
      }
    })
  })
  // error if any errors collected
  if (errors.length) {
    throw new Error(
      `Sourcemap validation encountered ${errors.length} errors:\n${errors.join(
        '\n'
      )}`
    )
  }
}

function indicesOf(substring, string) {
  const a = []
  let i = -1
  while ((i = string.indexOf(substring, i + 1)) >= 0) {
    a.push(i)
  }
  return a
}
