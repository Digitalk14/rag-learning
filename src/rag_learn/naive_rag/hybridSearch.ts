import { QdrantClient } from "@qdrant/js-client-rest";

export const hybridSearch = async (
  qdrant: QdrantClient,
  collectionName: string,
  query: string,
  queryVector: number[],
  retrievalK: number,
) => {
    
  const hybridResponse = await qdrant.query(collectionName, {
    prefetch: [
      {
        query: queryVector,
        using: "text-dense",
        limit: retrievalK,
      },
      {
        query: {
          text: query,
          model: "qdrant/bm25",
        },
        using: "text-sparse",
        limit: retrievalK,
      },
    ],
    query: {
      fusion: "rrf",
    },
    limit: retrievalK,
    with_payload: true,
  });

  return hybridResponse;
};
