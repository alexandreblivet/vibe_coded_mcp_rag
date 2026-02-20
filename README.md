# RAG Vault

A dual-interface RAG (Retrieval-Augmented Generation) system: a **Next.js web app** for users and an **MCP server** for Claude Code — both powered by the same Supabase pgvector backend and Voyage AI embeddings.

## Architecture

```
                    +---------------------+
                    |    Supabase DB       |
                    |   (pgvector 512d)    |
                    +----------+----------+
                               |
              +----------------+----------------+
              |                                 |
   +----------v----------+          +-----------v-----------+
   |   Next.js Web App   |          |    MCP Server         |
   |   (localhost:3000)   |          |    (stdio transport)  |
   |                      |          |                       |
   |  - Auth (email/pw)   |          |  - ingest_document    |
   |  - Upload docs       |          |  - search_documents   |
   |  - Semantic search   |          |  - list_documents     |
   |  - MCP config guide  |          |  - delete_document    |
   +----------------------+          +-----------------------+
              |                                 |
              +----------------+----------------+
                               |
                    +----------v----------+
                    |    Voyage AI API     |
                    |  (voyage-4-lite)     |
                    +---------------------+
```

## Features

- **Semantic search** across documents using Voyage AI embeddings and pgvector cosine similarity
- **Dual access**: browse your knowledge base in the web UI, or query it from Claude Code via MCP
- **User-scoped data**: each user's documents are isolated — the web app uses Supabase Auth, the MCP server uses a user ID env var
- **Paragraph-aware chunking** with configurable size and overlap
- **Drag-and-drop uploads** for `.txt` and `.md` files
- **One-click MCP config** — the web app generates a ready-to-paste `.mcp.json` with your user ID pre-filled

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with pgvector enabled
- A [Voyage AI](https://www.voyageai.com) API key

### 1. Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  filename text not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(512)
);

create index on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_chunks(
  query_embedding vector(512),
  match_count int default 5,
  filter_user_id text default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select c.id, c.document_id, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where (filter_user_id is null or d.user_id = filter_user_id)
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

### 2. MCP Server

```bash
cd rag-mcp-server
cp .env.example .env   # then fill in your keys
npm install
npm run build
```

### 3. Web App

```bash
cd rag-web-app
cp .env.example .env.local   # then fill in your keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start uploading documents.

## Environment Variables

| Variable | Package | Description |
|---|---|---|
| `SUPABASE_URL` | MCP Server | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Both | Supabase service role key (server-side only) |
| `VOYAGE_API_KEY` | Both | Voyage AI API key |
| `RAG_USER_ID` | MCP Server | User ID to scope queries (get from web app MCP Config tab) |
| `NEXT_PUBLIC_SUPABASE_URL` | Web App | Supabase URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web App | Supabase anon key (for auth) |

## Demo Flow

1. **Sign up** — Open the web app and create an account
2. **Upload documents** — Drop 2-3 sample files (meeting notes, project docs, etc.)
3. **Semantic search** — Search with natural language ("What decisions were made about the API?")
4. **Switch to Claude Code** — Open a terminal with Claude Code
5. **Show MCP tools** — The RAG tools (`search_documents`, `ingest_document`, etc.) appear automatically
6. **Search from Claude** — Ask Claude to search your knowledge base using natural language
7. **Ingest from Claude** — Ask Claude to add a new document via MCP
8. **Back to web app** — Refresh the Documents tab — the new doc appears instantly
9. **The punchline**: same data, two interfaces, powered by pgvector + Voyage AI

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Auth**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL + pgvector
- **Embeddings**: Voyage AI (`voyage-4-lite`, 512 dimensions)
- **MCP Server**: TypeScript, `@modelcontextprotocol/sdk`, stdio transport
- **Chunking**: Paragraph-based, 1000 char max, 200 char overlap
