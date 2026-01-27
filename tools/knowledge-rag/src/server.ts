#!/usr/bin/env node
/**
 * LavaMoat Knowledge Base MCP Server
 *
 * Exposes the knowledge base as MCP tools for use with Claude Desktop, Claude
 * Code, Cursor, and other MCP-compatible clients.
 *
 * Tools:
 *
 * - Search_knowledge: Semantic search over the knowledge base
 * - Index_knowledge: Re-index the knowledge base (after adding/updating docs)
 * - List_knowledge_files: List all indexed knowledge files
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { searchKnowledge } from './query.js'
import { indexKnowledgeBase } from './index.js'
import { findMarkdownFiles, KNOWLEDGE_DIR, isIndexed } from './db.js'
import * as path from 'node:path'

// Create MCP server
const server = new McpServer({
  name: 'lavamoat-knowledge',
  version: '0.0.1',
})

// Tool: search_knowledge
server.tool(
  'search_knowledge',
  {
    query: z.string().describe('The question or topic to search for'),
    limit: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .describe('Maximum number of results (default: 5)'),
  },
  async ({ query, limit }) => {
    try {
      const results = await searchKnowledge(query, limit ?? 5)

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No relevant knowledge base entries found for this query.',
            },
          ],
        }
      }

      const formattedResults = results.map((r, i) => {
        const similarity = ((1 - r._distance) * 100).toFixed(1)
        return `## Result ${i + 1} [${similarity}% match]\n**File:** ${r.file}\n**Section:** ${r.heading}\n\n${r.content}`
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${results.length} relevant entries:\n\n${formattedResults.join('\n\n---\n\n')}`,
          },
        ],
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error searching knowledge base: ${(err as Error).message}`,
          },
        ],
        isError: true,
      }
    }
  }
)

// Tool: index_knowledge
server.tool('index_knowledge', {}, async () => {
  const logs: string[] = []

  try {
    const { files, chunks } = await indexKnowledgeBase((msg) => logs.push(msg))

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully indexed ${files} file(s) into ${chunks} searchable chunks.\n\n${logs.join('\n')}`,
        },
      ],
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error indexing knowledge base: ${(err as Error).message}\n\n${logs.join('\n')}`,
        },
      ],
      isError: true,
    }
  }
})

// Tool: list_knowledge_files
server.tool('list_knowledge_files', {}, async () => {
  try {
    const files = await findMarkdownFiles(KNOWLEDGE_DIR)
    const indexed = await isIndexed()

    if (files.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No markdown files found in ${KNOWLEDGE_DIR}\n\nAdd .md files to this directory and run index_knowledge to make them searchable.`,
          },
        ],
      }
    }

    const relativeFiles = files.map((f) => path.relative(KNOWLEDGE_DIR, f))
    const status = indexed
      ? '✅ Indexed'
      : '⚠️ Not indexed (run index_knowledge)'

    return {
      content: [
        {
          type: 'text' as const,
          text: `Knowledge base status: ${status}\n\nFiles (${files.length}):\n${relativeFiles.map((f) => `  - ${f}`).join('\n')}`,
        },
      ],
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error listing knowledge files: ${(err as Error).message}`,
        },
      ],
      isError: true,
    }
  }
})

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Server is now running and listening on stdin/stdout
}

main().catch((err) => {
  // Log errors to stderr (not stdout, which is used for MCP protocol)
  console.error('MCP Server error:', err)
  process.exit(1)
})
