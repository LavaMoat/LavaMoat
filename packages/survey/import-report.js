// resources[package].environment[module].importStatementMatches@npmfs

const results = require('./results/_all.json').resources

const importStatementMatchesResults = {}

Object.entries(results).map(([packageName, data]) => {
  if (!data.environment) return
  Object.values(data.environment).map(({ importStatementMatches }) => {
    if (!importStatementMatches) return
    importStatementMatchesResults[packageName] = (importStatementMatchesResults[packageName] || []).concat(
      importStatementMatches.map(({ npmfs }) => npmfs)
    )
  })
})

Object.entries(importStatementMatchesResults).map(([packageName, matches]) => {
  const matchLinks = matches.map((match, index) => `[${index}](${match})`).join(' ')
  console.log(`- ${packageName} ${matchLinks}`)
})