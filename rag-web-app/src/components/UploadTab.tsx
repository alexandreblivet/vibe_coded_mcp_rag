"use client";

import { useState, useRef, useCallback } from "react";

export default function UploadTab({ accessToken }: { accessToken: string }) {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadFile(file: File) {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string);
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

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

      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`bg-[#1a1a2e] rounded-xl p-8 border-2 border-dashed cursor-pointer transition-all duration-200 text-center ${
          dragging
            ? "border-[#6c5ce7] bg-[#6c5ce7]/10 scale-[1.01]"
            : "border-gray-700 hover:border-gray-500"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.text,.markdown"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-3xl mb-2">{dragging ? "\u2B07" : "\u{1F4C4}"}</div>
        <p className="text-sm text-gray-300">
          {dragging ? "Drop file here" : "Drop a file here, or click to browse"}
        </p>
        <p className="text-xs text-gray-500 mt-1">.txt, .md files supported</p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#0a0a1a] text-gray-500">
            or paste text
          </span>
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
          className="px-6 py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <span className="spinner spinner-sm" />}
          {loading ? "Ingesting..." : "Ingest Document"}
        </button>
      </form>

      {result && (
        <div
          className={`p-4 rounded-lg text-sm animate-slide-up ${
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
