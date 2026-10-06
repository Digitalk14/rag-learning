export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if(a === undefined || a === null || b === undefined || b === null) continue; // Skip if vecB[i] or vecA[i] is undefined or null
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}