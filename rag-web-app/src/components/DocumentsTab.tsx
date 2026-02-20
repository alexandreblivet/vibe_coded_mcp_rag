"use client";

import { useState, useEffect, useCallback } from "react";

interface Document {
  id: string;
  filename: string;
  char_count: number;
  created_at: string;
}

export default function DocumentsTab({
  accessToken,
}: {
  accessToken: string;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) setDocuments(data.documents);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document and all its chunks?")) return;
    setDeleting(docId);

    try {
      const res = await fetch(`/api/documents?document_id=${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-12">
        Loading documents...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Documents</h2>
          <p className="text-sm text-gray-400 mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} in
            your knowledge base
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDocuments();
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-[#1a1a2e] rounded-xl p-12 text-center border border-gray-800">
          <p className="text-gray-400">No documents yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload a document from the Upload tab to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium truncate">
                  {doc.filename}
                </h3>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>
                    {new Date(doc.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>{doc.char_count.toLocaleString()} chars</span>
                  <span className="text-gray-600 font-mono text-[10px]">
                    {doc.id.slice(0, 8)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
                className="ml-4 px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting === doc.id ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
