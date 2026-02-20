"use client";

import { useState } from "react";

interface SearchResult {
  rank: number;
  filename: string;
  document_id: string;
  chunk_index: number;
  similarity: number;
  content: string;
}

export default function SearchTab({
  accessToken,
}: {
  accessToken: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
      } else {
        console.error("Search error:", data.error);
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    }

    setLoading(false);
  }

  function similarityColor(sim: number) {
    if (sim >= 0.7) return "text-green-400";
    if (sim >= 0.5) return "text-yellow-400";
    return "text-orange-400";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Semantic Search</h2>
        <p className="text-sm text-gray-400 mt-1">
          Search your knowledge base using natural language
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would you like to find?"
          className="flex-1 px-4 py-2.5 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6c5ce7] transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {searched && !loading && results.length === 0 && (
        <div className="bg-[#1a1a2e] rounded-xl p-8 text-center border border-gray-800">
          <p className="text-gray-400">No matching results found.</p>
          <p className="text-sm text-gray-500 mt-1">
            Try a different query or upload more documents.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((r) => (
            <div
              key={`${r.document_id}-${r.chunk_index}`}
              className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-[#6c5ce7]/20 text-[#6c5ce7] px-2 py-0.5 rounded-full">
                    #{r.rank}
                  </span>
                  <span className="text-sm text-white font-medium">
                    {r.filename}
                  </span>
                  <span className="text-xs text-gray-500">
                    chunk {r.chunk_index}
                  </span>
                </div>
                <span
                  className={`text-sm font-mono font-medium ${similarityColor(r.similarity)}`}
                >
                  {(r.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {r.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
