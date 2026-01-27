/**
 * Shared database utilities for the knowledge base.
 */

import * as lancedb from '@lancedb/lancedb'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Get directory name from import.meta.url (works in all Node ESM versions)
const __dirname = path.dirname(new URL(import.meta.url).pathname)

export const KNOWLEDGE_DIR = path.resolve(__dirname, '../../../docs/knowledge')
export const DB_PATH = path.resolve(__dirname, '../.lancedb')
export const TABLE_NAME = 'knowledge'

export interface Chunk {
  id: string
  file: string
  heading: string
  content: string
  vector?: number[]
}

export interface SearchResult {
  id: string
  file: string
  heading: string
  content: string
  _distance: number
}

/**
 * Parse a markdown file into chunks by heading.
 */
export function parseMarkdown(
  content: string,
  filePath: string
): Omit<Chunk, 'vector'>[] {
  const chunks: Omit<Chunk, 'vector'>[] = []
  const lines = content.split('\n')
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath)

  let currentHeading = 'Introduction'
  let currentContent: string[] = []
  let chunkIndex = 0

  const flushChunk = () => {
    const text = currentContent.join('\n').trim()
    if (text.length > 0) {
      chunks.push({
        id: `${relativePath}#${chunkIndex++}`,
        file: relativePath,
        heading: currentHeading,
        content: text,
      })
    }
    currentContent = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushChunk()
      currentHeading = headingMatch[2]
    } else {
      currentContent.push(line)
    }
  }
  flushChunk()

  return chunks
}

/**
 * Recursively find all markdown files in a directory.
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await findMarkdownFiles(fullPath)))
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }

  return files
}

/**
 * Connect to the LanceDB database.
 */
export async function connectDB(): Promise<lancedb.Connection> {
  return lancedb.connect(DB_PATH)
}

/**
 * Check if the knowledge base has been indexed.
 */
export async function isIndexed(): Promise<boolean> {
  try {
    const db = await connectDB()
    const tables = await db.tableNames()
    return tables.includes(TABLE_NAME)
  } catch {
    return false
  }
}
