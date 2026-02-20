import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { chunkText, embedTexts } from "@/lib/embeddings";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, content } = await request.json();
  if (!filename || !content) {
    return NextResponse.json(
      { error: "filename and content are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();
    const chunks = chunkText(content);
    const embeddings = await embedTexts(chunks);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ user_id: user.id, filename, content, metadata: {} })
      .select()
      .single();

    if (docError) throw docError;

    const chunkRows = chunks.map((text, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content: text,
      embedding: JSON.stringify(embeddings[i]),
    }));

    const { error: chunkError } = await supabase
      .from("chunks")
      .insert(chunkRows);

    if (chunkError) throw chunkError;

    return NextResponse.json({
      document_id: doc.id,
      filename: doc.filename,
      chunks_created: chunks.length,
      total_characters: content.length,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
