"use client";

import { useState, useRef } from "react";

export default function UploadTab({ accessToken }: { accessToken: string }) {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string);
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!filename.trim() || !content.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ filename: filename.trim(), content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult({
        success: true,
        message: `"${data.filename}" ingested — ${data.chunks_created} chunks, ${data.total_characters} characters`,
      });
      setFilename("");
      setContent("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Upload Document</h2>
        <p className="text-sm text-gray-400 mt-1">
          Upload a .txt or .md file, or paste text directly
        </p>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
        <label className="block mb-4">
          <span className="text-sm text-gray-400">
            Choose file (.txt, .md)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text,.markdown"
            onChange={handleFileSelect}
            className="mt-2 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#6c5ce7] file:text-white hover:file:bg-[#5a4bd6] file:cursor-pointer"
          />
        </label>

        <div className="relative mb-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#1a1a2e] text-gray-500">
              or paste text
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Document name
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="my-notes.md"
            className="w-full px-4 py-2.5 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6c5ce7] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your document content here..."
            rows={10}
            className="w-full px-4 py-3 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6c5ce7] transition-colors resize-y font-mono text-sm"
          />
          {content && (
            <p className="text-xs text-gray-500 mt-1">
              {content.length.toLocaleString()} characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !filename.trim() || !content.trim()}
          className="px-6 py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Ingesting..." : "Ingest Document"}
        </button>
      </form>

      {result && (
        <div
          className={`p-4 rounded-lg text-sm ${
            result.success
              ? "bg-green-400/10 text-green-400 border border-green-400/20"
              : "bg-red-400/10 text-red-400 border border-red-400/20"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
