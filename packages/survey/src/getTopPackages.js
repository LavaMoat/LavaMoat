const path = require('path')
const { promises: fs } = require('fs')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const pLimit = require('p-limit')

const concurrencyLimit = pLimit(8)

module.exports = {
  getTopPackages,
}

const npmDependentsScraper = createScraper({
  buildUrl: ({ offset }) => `https://www.npmjs.com/browse/depended?offset=${offset}`,
  entrySelector: '.flex-row.pr3',
  packagesPerPage: 36,
  // capped at 3 pages
  maxResults: 108,
})

const librariesIoDependentsScraper = createScraper({
  buildUrl: ({ page }) => `https://libraries.io/search?order=desc&page=${page+1}&platforms=npm&sort=dependents_count`,
  entrySelector: '.project a',
  packagesPerPage: 30,
  // capped at 100 pages
  maxResults: 3000,
})

const librariesIoDependentReposScraper = createScraper({
  buildUrl: ({ page }) => `https://libraries.io/search?order=desc&page=${page+1}&platforms=npm&sort=dependent_repos_count`,
  entrySelector: '.project a',
  packagesPerPage: 30,
  // capped at 100 pages
  maxResults: 3000,
})

const librariesIoRankScraper = createScraper({
  buildUrl: ({ page }) => `https://libraries.io/search?order=desc&page=${page+1}&platforms=npm&sort=rank`,
  entrySelector: '.project a',
  packagesPerPage: 30,
  // capped at 100 pages
  maxResults: 3000,
})

async function getTopPackages () {
  const indexPath = path.resolve(__dirname + '/../downloads/index.json')
  try {
    const indexContent = await fs.readFile(indexPath, 'utf8')
    return JSON.parse(indexContent)
  } catch (_) {}
  const queryResults = await Promise.all([
    // npmDependentsScraper(108),
    librariesIoDependentsScraper(3000),
    librariesIoDependentReposScraper(3000),
    librariesIoRankScraper(3000),
  ])
  const packages = Array.from(new Set(queryResults.flat().map(name => name.toLowerCase())))
  const indexContent = JSON.stringify(packages, null, 2)
  await fs.mkdir(path.dirname(indexPath), { recursive: true })
  await fs.writeFile(indexPath, indexContent)
  return packages
}

function createScraper ({ buildUrl, entrySelector, packagesPerPage, maxResults }) {

  return downloadTopPackages

  async function downloadTopPackages (count) {
    if (maxResults !== undefined) {
      count = Math.max(count, maxResults)
    }
    const pagesRequired = Math.ceil(count / packagesPerPage)
    const pageResults = await Promise.all(Array(pagesRequired).fill().map(async (_, index) => {
      return concurrencyLimit(
        () => downloadPage(index),
      )
    }), { concurrency: 8 })
    return pageResults.flat().slice(0, count)
  }
  
  async function downloadPage (page) {
    const offset = page * packagesPerPage
    const url = buildUrl({ page, offset })
    const res = await fetch(url)
    const content = await res.text()
    if (res.status !== 200) {
      throw new Error(`Error fetching "${url}":\n${content}`)
    }
    const $ = cheerio.load(content)
    const rows = $(entrySelector)
    const packages = [].map.call(rows, (item) => $(item).text())
    return packages
  }

}
