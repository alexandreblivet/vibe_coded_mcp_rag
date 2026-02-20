const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-4-lite";

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY environment variable is required");
  return key;
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (currentChunk.length + trimmed.length + 1 <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Keep overlap from end of previous chunk
        const words = currentChunk.split(/\s+/);
        const overlapWords = [];
        let overlapLen = 0;
        for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
          overlapWords.unshift(words[i]);
          overlapLen += words[i].length + 1;
        }
        currentChunk = overlapWords.join(" ") + "\n\n" + trimmed;
      } else {
        currentChunk = trimmed;
      }

      // If a single paragraph exceeds chunkSize, split by sentences
      if (currentChunk.length > chunkSize) {
        const sentences = currentChunk.match(/[^.!?]+[.!?]+\s*/g) || [
          currentChunk,
        ];
        currentChunk = "";
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= chunkSize) {
            currentChunk += sentence;
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      output_dimension: 512,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data.map((d) => d.embedding);
}

export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}
