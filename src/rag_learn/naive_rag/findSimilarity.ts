import { cosineSimilarity } from "./cosineSimilarity.ts";

export const findSimilarity = (
  chunks: string[],
  queryVector: number[],
  docVectors: number[][],
) => {
  const searchResults = chunks.map((text, index) => {
    const similarity = cosineSimilarity(queryVector, docVectors[index]);
    return { text, similarity };
  });
  searchResults.sort((a, b) => b.similarity - a.similarity);
  const topChunks = searchResults.slice(0, 2);
  const contextText = topChunks.map((c) => c.text).join("\n---\n");
  return { topChunks, contextText };
};
