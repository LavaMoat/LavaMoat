/**
 * Knowledge Base Indexer
 *
 * Walks the docs/knowledge directory, chunks markdown files by heading,
 * generates embeddings, and stores them in LanceDB.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { embed, getExtractor, MODEL_NAME } from './embeddings.js'
import {
  KNOWLEDGE_DIR,
  DB_PATH,
  TABLE_NAME,
  type Chunk,
  parseMarkdown,
  findMarkdownFiles,
  connectDB,
} from './db.js'

/**
 * Generate embeddings for text chunks in batches.
 */
async function generateEmbeddings(
  chunks: Omit<Chunk, 'vector'>[]
): Promise<Chunk[]> {
  const batchSize = 10
  const results: Chunk[] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const batchTexts = batch.map((c) => c.content)

    console.log(
      `  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`
    )

    const vectors = await embed(batchTexts)

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        vector: vectors[j],
      })
    }
  }

  return results
}

export async function indexKnowledgeBase(
  log: (msg: string) => void = console.log
): Promise<{ files: number; chunks: number }> {
  // Check if knowledge directory exists
  try {
    await fs.access(KNOWLEDGE_DIR)
  } catch {
    throw new Error(`Knowledge directory not found: ${KNOWLEDGE_DIR}`)
  }

  // Find all markdown files
  log(`📂 Scanning ${KNOWLEDGE_DIR}...`)
  const files = await findMarkdownFiles(KNOWLEDGE_DIR)

  if (files.length === 0) {
    throw new Error('No markdown files found in knowledge directory.')
  }

  log(`   Found ${files.length} markdown file(s)`)

  // Parse all files into chunks
  log('📄 Parsing markdown files...')
  const allChunks: Omit<Chunk, 'vector'>[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    const chunks = parseMarkdown(content, file)
    allChunks.push(...chunks)
    log(`   ${path.relative(KNOWLEDGE_DIR, file)}: ${chunks.length} chunk(s)`)
  }

  log(`   Total: ${allChunks.length} chunk(s)`)

  // Load embedding model
  log(`🤖 Loading embedding model (${MODEL_NAME})...`)
  await getExtractor() // Warm up the model

  // Generate embeddings
  log('🔢 Generating embeddings...')
  const chunksWithVectors = await generateEmbeddings(allChunks)

  // Store in LanceDB
  log(`💾 Storing in LanceDB (${DB_PATH})...`)

  const db = await connectDB()

  // Drop existing table if it exists
  const tables = await db.tableNames()
  if (tables.includes(TABLE_NAME)) {
    await db.dropTable(TABLE_NAME)
  }

  await db.createTable(
    TABLE_NAME,
    chunksWithVectors as unknown as Record<string, unknown>[]
  )

  log(
    `   Created table '${TABLE_NAME}' with ${chunksWithVectors.length} records`
  )

  return { files: files.length, chunks: chunksWithVectors.length }
}

// CLI entrypoint
async function main() {
  console.log('🔍 LavaMoat Knowledge Base Indexer\n')

  try {
    const { files, chunks } = await indexKnowledgeBase()
    console.log('\n✅ Indexing complete!')
    console.log(
      `   Run 'npm run query "your question"' to search the knowledge base.`
    )
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
