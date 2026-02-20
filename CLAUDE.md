# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAG Vault — a dual-interface RAG system with an MCP server (for Claude Code integration) and a Next.js web app (for users). Both share the same Supabase backend (pgvector) and Voyage AI embeddings.

## Build & Run Commands

### MCP Server (`rag-mcp-server/`)
```bash
cd rag-mcp-server
npm run build    # tsc → dist/
npm start        # node dist/index.js (stdio transport)
```

### Web App (`rag-web-app/`)
```bash
cd rag-web-app
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm start        # production server
```

No test framework is configured yet.

## Architecture

Two independent packages in one repo, sharing the same Supabase database:

- **`rag-mcp-server/`** — TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport. Registers 4 tools: `ingest_document`, `search_documents`, `list_documents`, `delete_document`. User scoped via `RAG_USER_ID` env var.

- **`rag-web-app/`** — Next.js 16 (App Router, React 19, Tailwind 4). Supabase email/password auth with middleware session management. API routes at `/api/ingest`, `/api/search`, `/api/documents`. Single-page UI with 4 tabs (Upload, Documents, Search, MCP Config). User scoped via authenticated Supabase user ID.

### Shared Logic (Duplicated)

`embeddings.ts` exists in both packages with identical chunking and embedding logic. Changes to one must be mirrored in the other:
- `rag-mcp-server/src/services/embeddings.ts`
- `rag-web-app/src/lib/embeddings.ts`

### Embedding Config
- Model: `voyage-4-lite` (Voyage AI)
- Dimensions: 512 (set via `output_dimension` parameter)
- Chunking: paragraph-based, 1000 char default, 200 char overlap

### Database Schema (Supabase)
- `documents` table: `id` (uuid), `user_id`, `filename`, `content`, `metadata` (jsonb), `created_at`
- `chunks` table: `id` (uuid), `document_id` (FK, cascade delete), `chunk_index`, `content`, `embedding` (vector(512))
- `match_chunks` RPC function for cosine similarity search

### Auth Pattern
- Web app: Supabase Auth → middleware refreshes session → API routes extract user from Bearer token via `lib/auth.ts`
- MCP server: no auth, uses `RAG_USER_ID` env var to scope queries

## Environment Variables

### MCP Server (`rag-mcp-server/.env`)
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VOYAGE_API_KEY`, `RAG_USER_ID`

### Web App (`rag-web-app/.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `VOYAGE_API_KEY`

Web app API routes use the service key (bypasses RLS). Browser client uses the anon key (for auth only).
