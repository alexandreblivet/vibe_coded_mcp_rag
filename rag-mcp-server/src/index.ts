import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chunkText, embedTexts, embedQuery } from "./services/embeddings.js";
import {
  insertDocument,
  insertChunks,
  searchChunks,
  listDocuments,
  deleteDocument,
} from "./services/supabase.js";

const server = new McpServer({
  name: "rag-server",
  version: "1.0.0",
});

function getUserId(): string {
  return process.env.RAG_USER_ID || "default";
}

// Tool 1: ingest_document
server.registerTool("ingest_document", {
  description:
    "Ingest a document into the RAG knowledge base. The document will be chunked, embedded, and stored for semantic search.",
  inputSchema: {
    filename: z.string().describe("Name of the document file"),
    content: z.string().describe("Full text content of the document"),
    chunk_size: z
      .number()
      .optional()
      .describe("Maximum chunk size in characters (default: 1000)"),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe("Optional metadata to attach to the document"),
  },
}, async ({ filename, content, chunk_size, metadata }) => {
  try {
    const userId = getUserId();
    const chunks = chunkText(content, chunk_size || 1000);
    const embeddings = await embedTexts(chunks);

    const doc = await insertDocument(userId, filename, content, metadata || {});

    const chunkInserts = chunks.map((text, i) => ({
      content: text,
      embedding: embeddings[i],
      chunk_index: i,
    }));

    await insertChunks(doc.id, chunkInserts);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              document_id: doc.id,
              filename: doc.filename,
              chunks_created: chunks.length,
              total_characters: content.length,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error ingesting document: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool 2: search_documents
server.registerTool("search_documents", {
  description:
    "Search the RAG knowledge base using semantic similarity. Returns the most relevant document chunks matching the query.",
  inputSchema: {
    query: z.string().describe("The search query"),
    top_k: z
      .number()
      .optional()
      .describe("Number of results to return (default: 5)"),
    similarity_threshold: z
      .number()
      .optional()
      .describe("Minimum similarity score 0-1 (default: 0.3)"),
  },
}, async ({ query, top_k, similarity_threshold }) => {
  try {
    const userId = getUserId();
    const queryEmbedding = await embedQuery(query);
    const results = await searchChunks(
      queryEmbedding,
      top_k || 5,
      similarity_threshold || 0.3,
      userId
    );

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No matching documents found for the given query.",
          },
        ],
      };
    }

    const formatted = results.map((r, i) => ({
      rank: i + 1,
      filename: r.filename,
      document_id: r.document_id,
      chunk_index: r.chunk_index,
      similarity: Math.round(r.similarity * 1000) / 1000,
      content: r.content,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { results: formatted, total: formatted.length },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error searching documents: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool 3: list_documents
server.registerTool("list_documents", {
  description:
    "List all documents in the RAG knowledge base for the current user.",
  inputSchema: {},
}, async () => {
  try {
    const userId = getUserId();
    const docs = await listDocuments(userId);

    if (docs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No documents found in the knowledge base.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { documents: docs, total: docs.length },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error listing documents: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool 4: delete_document
server.registerTool("delete_document", {
  description:
    "Delete a document and all its chunks from the RAG knowledge base.",
  inputSchema: {
    document_id: z
      .string()
      .uuid()
      .describe("UUID of the document to delete"),
  },
}, async ({ document_id }) => {
  try {
    await deleteDocument(document_id);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              message: `Document ${document_id} and all its chunks have been deleted.`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error deleting document: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RAG MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
