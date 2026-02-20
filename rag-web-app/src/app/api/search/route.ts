import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { embedQuery } from "@/lib/embeddings";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, top_k = 5, similarity_threshold = 0.3 } = await request.json();
  if (!query) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();
    const queryEmbedding = await embedQuery(query);

    const { data, error } = await supabase.rpc("match_chunks", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: top_k,
      filter_user_id: user.id,
      similarity_threshold,
    });

    if (error) throw error;

    const results = (data || []).map(
      (r: { chunk_id: string; document_id: string; filename: string; chunk_index: number; content: string; similarity: number }, i: number) => ({
        rank: i + 1,
        filename: r.filename,
        document_id: r.document_id,
        chunk_index: r.chunk_index,
        similarity: Math.round(r.similarity * 1000) / 1000,
        content: r.content,
      })
    );

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
