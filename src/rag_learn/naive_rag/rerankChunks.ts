import { CohereClientV2 } from "cohere-ai";

export const rerankChunks = async (client: CohereClientV2, top_k: number, query: string, points: any[]) => {
  const documents = points
    .map((point) => point.payload?.text)
    .filter((text): text is string => typeof text === "string");

  if (documents.length === 0) {
    return [];
  }

  const response = await client.rerank({
    model: "rerank-v4.0-pro",
    query,
    documents,
    topN: top_k,
  });

  return response.results.map((result) => ({
    ...points[result.index],
    rerankScore: result.relevanceScore,
  }));
}