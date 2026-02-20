"use client";

import { useState } from "react";

export default function McpConfigTab({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  const config = JSON.stringify(
    {
      mcpServers: {
        "rag-server": {
          command: "node",
          args: ["/ABSOLUTE/PATH/TO/rag-mcp-server/dist/index.js"],
          env: {
            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co",
            SUPABASE_SERVICE_KEY: "YOUR_SERVICE_ROLE_KEY",
            VOYAGE_API_KEY: "YOUR_VOYAGE_API_KEY",
            RAG_USER_ID: userId,
          },
        },
      },
    },
    null,
    2
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          MCP Configuration for Claude Code
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Connect Claude Code to your personal RAG knowledge base
        </p>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 space-y-4">
        <h3 className="text-white font-medium">Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>
            Copy the JSON config below
          </li>
          <li>
            Create or edit <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-1.5 py-0.5 rounded">.mcp.json</code> in
            your project root (or <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-1.5 py-0.5 rounded">~/.claude.json</code> for global)
          </li>
          <li>
            Replace <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-1.5 py-0.5 rounded">/ABSOLUTE/PATH/TO/</code> with
            the actual path to your rag-mcp-server
          </li>
          <li>
            Fill in your <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-1.5 py-0.5 rounded">SUPABASE_SERVICE_KEY</code> and{" "}
            <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-1.5 py-0.5 rounded">VOYAGE_API_KEY</code>
          </li>
          <li>Restart Claude Code — the RAG tools will appear automatically</li>
        </ol>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400 font-mono">.mcp.json</span>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white rounded-lg transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed">
          {config}
        </pre>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
        <h3 className="text-white font-medium mb-2">Your User ID</h3>
        <p className="text-sm text-gray-400 mb-2">
          This ID links Claude Code to your documents:
        </p>
        <code className="text-[#6c5ce7] bg-[#6c5ce7]/10 px-3 py-1.5 rounded-lg text-sm font-mono">
          {userId}
        </code>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
        <h3 className="text-white font-medium mb-2">Available Tools</h3>
        <div className="space-y-3 text-sm">
          <div>
            <code className="text-[#6c5ce7]">ingest_document</code>
            <span className="text-gray-400"> — Add documents to your knowledge base</span>
          </div>
          <div>
            <code className="text-[#6c5ce7]">search_documents</code>
            <span className="text-gray-400"> — Semantic search across your docs</span>
          </div>
          <div>
            <code className="text-[#6c5ce7]">list_documents</code>
            <span className="text-gray-400"> — See all your stored documents</span>
          </div>
          <div>
            <code className="text-[#6c5ce7]">delete_document</code>
            <span className="text-gray-400"> — Remove a document and its chunks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
