#!/usr/bin/env node
/**
 * Claude Code Hook Script for Knowledge Base RAG
 *
 * This script is called by Claude Code's UserPromptSubmit hook. It queries the
 * knowledge base and injects relevant context as a systemMessage.
 *
 * Input (stdin): JSON with user_prompt field Output (stdout): JSON with
 * systemMessage field (or empty for no injection)
 */

import { searchKnowledge } from './query.js'
import { isIndexed } from './db.js'

/** Minimum similarity score (0-1) to include a result */
const MIN_SIMILARITY = 0.5

/** Maximum results to include in context */
const MAX_RESULTS = 3

/** Maximum total characters to inject */
const MAX_CONTEXT_LENGTH = 4000

interface HookInput {
  user_prompt?: string
  session_id?: string
  cwd?: string
  hook_event_name?: string
}

interface HookOutput {
  systemMessage?: string
}

async function main(): Promise<void> {
  // Read hook input from stdin
  let input: HookInput
  try {
    const stdin = await readStdin()
    input = JSON.parse(stdin)
  } catch {
    // Invalid input, silently exit (don't break the hook chain)
    process.exit(0)
  }

  const userPrompt = input.user_prompt?.trim()
  if (!userPrompt) {
    // No prompt to analyze
    process.exit(0)
  }

  // Skip very short prompts (likely not substantive)
  if (userPrompt.length < 15) {
    process.exit(0)
  }

  // Check if knowledge base is indexed
  try {
    if (!(await isIndexed())) {
      // Not indexed, skip silently
      process.exit(0)
    }
  } catch {
    process.exit(0)
  }

  // Query the knowledge base
  let results
  try {
    results = await searchKnowledge(userPrompt, MAX_RESULTS + 2) // fetch extra in case some are filtered
  } catch {
    // Query failed, skip silently
    process.exit(0)
  }

  // Filter by similarity threshold
  const relevant = results.filter((r) => {
    const similarity = 1 - r._distance
    return similarity >= MIN_SIMILARITY
  })

  if (relevant.length === 0) {
    // No relevant results
    process.exit(0)
  }

  // Build context message
  const chunks: string[] = []
  let totalLength = 0

  for (const r of relevant.slice(0, MAX_RESULTS)) {
    const similarity = ((1 - r._distance) * 100).toFixed(0)
    const chunk = `### ${r.heading} (${r.file})\n${r.content}`

    if (totalLength + chunk.length > MAX_CONTEXT_LENGTH) {
      break
    }

    chunks.push(chunk)
    totalLength += chunk.length
  }

  if (chunks.length === 0) {
    process.exit(0)
  }

  const systemMessage = `**Relevant LavaMoat Knowledge Base Context:**

The following documentation may be relevant to this task. Consider this context when making decisions:

${chunks.join('\n\n---\n\n')}

---
*Context auto-injected from docs/knowledge/ via RAG (${chunks.length} chunk${chunks.length > 1 ? 's' : ''} matched)*`

  const output: HookOutput = { systemMessage }
  console.log(JSON.stringify(output))
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!data) {
        reject(new Error('Stdin timeout'))
      }
    }, 5000)
  })
}

main()
