# LavaMoat Knowledge Base RAG

A semantic search tool for the LavaMoat project knowledge base, with MCP server support for integration with Claude Desktop, Claude Code, Cursor, and other AI assistants.

## What is this?

This tool indexes markdown documents from `docs/knowledge/` and allows you to search them using natural language queries. It uses:

- **LanceDB**: An embedded vector database (no server required)
- **BGE-base-en-v1.5**: A sentence embedding model that runs locally via Transformers.js
- **MCP (Model Context Protocol)**: For integration with AI assistants

## Setup

```bash
cd tools/knowledge-rag
npm install
npm run build
```

The first run will download the embedding model (~400MB), which is cached locally.

## Usage

### CLI Usage

#### Index the knowledge base

```bash
npm run index
```

This scans all `.md` files in `docs/knowledge/`, chunks them by heading, generates embeddings, and stores them in a local LanceDB database.

#### Query the knowledge base

```bash
npm run query "your question here"
```

Examples:

```bash
npm run query "how does compartmentalization work"
npm run query "what are the security risks of policy generation"
npm run query "why did we choose SES"
```

### Claude Code Hook (Automatic Context Injection)

The knowledge base integrates with Claude Code via a `UserPromptSubmit` hook that automatically injects relevant context when you ask questions.

**How it works:**

1. When you submit a prompt, the hook queries the knowledge base
2. If relevant documentation is found (similarity > 50%), it's injected as context
3. Claude sees the relevant architectural decisions, security considerations, etc.

**Setup:**

```bash
# Build the hook script (already done if you ran npm run build)
cd tools/knowledge-rag
npm run build

# Index the knowledge base
npm run index
```

The hook is configured in `.claude/settings.json` and activates automatically in Claude Code sessions within this repo.

**Configuration:** The hook injects up to 3 chunks (max 4000 chars) with >50% similarity. Edit `src/hook.ts` to adjust thresholds.

### MCP Server Usage

The tool can also run as an MCP server for explicit queries, allowing AI assistants to search the knowledge base directly.

#### With Claude Code

Add to your Claude Code MCP configuration:

```bash
claude mcp add lavamoat-knowledge -- node /path/to/lavamoat/tools/knowledge-rag/dist/server.js
```

Or add manually to your MCP config:

```json
{
  "mcpServers": {
    "lavamoat-knowledge": {
      "command": "node",
      "args": ["/absolute/path/to/lavamoat/tools/knowledge-rag/dist/server.js"]
    }
  }
}
```

#### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "lavamoat-knowledge": {
      "command": "node",
      "args": ["/absolute/path/to/lavamoat/tools/knowledge-rag/dist/server.js"]
    }
  }
}
```

Then restart Claude Desktop.

#### Available MCP Tools

| Tool                   | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `search_knowledge`     | Semantic search over the knowledge base. Pass a `query` string and optional `limit` (1-20). |
| `index_knowledge`      | Re-index the knowledge base after adding or updating documents.                             |
| `list_knowledge_files` | List all markdown files in the knowledge base and indexing status.                          |

#### Testing with MCP Inspector

```bash
npm run inspector
```

This opens the MCP Inspector, letting you test the server interactively.

## Knowledge Base Structure

Add your documentation to `docs/knowledge/`:

```text
docs/knowledge/
├── architecture/     # System design, component relationships
├── decisions/        # ADRs (Architecture Decision Records)
├── security/         # Security considerations, threat models
├── patterns/         # Common patterns and best practices
└── gotchas/          # Known issues, workarounds, edge cases
```

### Writing Good Knowledge Documents

For best search results:

1. **Use clear headings**: The tool chunks by `#`, `##`, `###` headings
2. **Be specific**: "Policy generation requires fs access for X" beats "it needs filesystem"
3. **Include context**: Explain _why_, not just _what_
4. **Keep chunks focused**: One topic per section

### ADR Template

For decision records in `decisions/`:

```markdown
# ADR-NNN: Title

## Status

Accepted | Superseded | Deprecated

## Context

What situation prompted this decision?

## Decision

What did we decide?

## Consequences

What are the tradeoffs?
```

## How It Works

1. **Indexing**: Markdown files are split into chunks at heading boundaries. Each chunk is converted to a 768-dimensional vector using the BGE embedding model.

2. **Querying**: Your question is converted to a vector using the same model, then LanceDB finds the chunks with the most similar vectors (cosine similarity).

3. **Results**: The top 5 most relevant chunks are returned with their similarity scores.

## Files

```text
tools/knowledge-rag/
├── src/
│   ├── server.ts      # MCP server
│   ├── index.ts       # Indexing script
│   ├── query.ts       # Query script
│   ├── embeddings.ts  # Shared embedding utilities
│   └── db.ts          # Shared database utilities
├── dist/              # Compiled JS (after npm run build)
├── .lancedb/          # Vector database (gitignored)
└── package.json
```

## Limitations

- English only (the embedding model is optimized for English)
- Max ~512 tokens per chunk (longer sections are still indexed but may lose context)
- First query after startup is slower (model loading)
- No LLM synthesis—just retrieval (the AI assistant handles synthesis)
