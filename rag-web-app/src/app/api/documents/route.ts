import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, metadata, created_at, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const documents = (data || []).map((d) => ({
      ...d,
      char_count: d.content?.length || 0,
      content: undefined,
    }));

    return NextResponse.json({ documents, total: documents.length });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("document_id");

  if (!documentId) {
    return NextResponse.json(
      { error: "document_id is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Verify ownership
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
