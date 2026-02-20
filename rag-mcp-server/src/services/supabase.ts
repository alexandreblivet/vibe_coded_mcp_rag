import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required"
      );
    }
    client = createClient(url, key);
  }
  return client;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChunkInsert {
  content: string;
  embedding: number[];
  chunk_index: number;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export async function insertDocument(
  userId: string,
  filename: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<Document> {
  const { data, error } = await getClient()
    .from("documents")
    .insert({ user_id: userId, filename, content, metadata })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert document: ${error.message}`);
  return data as Document;
}

export async function insertChunks(
  documentId: string,
  chunks: ChunkInsert[]
): Promise<void> {
  const rows = chunks.map((c) => ({
    document_id: documentId,
    chunk_index: c.chunk_index,
    content: c.content,
    embedding: JSON.stringify(c.embedding),
  }));

  const { error } = await getClient().from("chunks").insert(rows);
  if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
}

export async function searchChunks(
  queryEmbedding: number[],
  topK: number = 5,
  threshold: number = 0.3,
  userId?: string
): Promise<SearchResult[]> {
  const { data, error } = await getClient().rpc("match_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    filter_user_id: userId || null,
    similarity_threshold: threshold,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data as SearchResult[]) || [];
}

export async function listDocuments(
  userId?: string
): Promise<
  Pick<Document, "id" | "filename" | "metadata" | "created_at">[]
> {
  let query = getClient()
    .from("documents")
    .select("id, filename, metadata, created_at")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list documents: ${error.message}`);
  return data || [];
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await getClient()
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}
