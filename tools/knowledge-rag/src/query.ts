/**
 * Knowledge Base Query Tool
 *
 * Search the indexed knowledge base using semantic similarity. Usage: npm run
 * query "your question here"
 */

import { embed, getExtractor } from './embeddings.js'
import { TABLE_NAME, type SearchResult, connectDB, isIndexed } from './db.js'

const DEFAULT_LIMIT = 5

export async function searchKnowledge(
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<SearchResult[]> {
  // Check if indexed
  if (!(await isIndexed())) {
    throw new Error('Knowledge base not indexed. Run "npm run index" first.')
  }

  // Load model and generate query embedding
  await getExtractor()
  const [queryVector] = await embed(query)

  // Search
  const db = await connectDB()
  const table = await db.openTable(TABLE_NAME)

  const results = (await table
    .vectorSearch(queryVector)
    .limit(limit)
    .toArray()) as SearchResult[]

  return results
}

// CLI entrypoint
async function main() {
  const query = process.argv.slice(2).join(' ').trim()

  if (!query) {
    console.log('Usage: npm run query "your question here"')
    console.log('')
    console.log('Examples:')
    console.log('  npm run query "how does policy generation work"')
    console.log('  npm run query "what is scuttling"')
    console.log('  npm run query "security considerations for plugins"')
    process.exit(1)
  }

  console.log(`🔍 Searching for: "${query}"\n`)

  try {
    console.log('🤖 Loading embedding model...')
    console.log('🔢 Generating query embedding...\n')

    const results = await searchKnowledge(query)

    if (results.length === 0) {
      console.log('No results found.')
      process.exit(0)
    }

    // Display results
    console.log(`📚 Top ${results.length} results:\n`)
    console.log('─'.repeat(60))

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const similarity = 1 - r._distance
      const score = (similarity * 100).toFixed(1)

      console.log(`\n${i + 1}. [${score}%] ${r.file}`)
      console.log(`   Section: ${r.heading}`)
      console.log('   ' + '─'.repeat(56))

      // Truncate content for display
      const preview =
        r.content.length > 300 ? r.content.slice(0, 300) + '...' : r.content
      const indented = preview
        .split('\n')
        .map((line) => '   ' + line)
        .join('\n')
      console.log(indented)
    }

    console.log('\n' + '─'.repeat(60))
  } catch (err) {
    console.error('❌', (err as Error).message)
    process.exit(1)
  }
}

// Only run CLI if this is the entry point (not when imported)
const isEntryPoint = import.meta.url === `file://${process.argv[1]}`
if (isEntryPoint) {
  main()
}
