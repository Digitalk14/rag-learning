import { QdrantClient } from "@qdrant/js-client-rest";

export const denseSearch = async (
  qdrant: QdrantClient,
  collectionName: string,
  queryVector: number[],
  topK: number,
  documentName: string,
) => {
  const searchResponse = await qdrant.query(collectionName, {
    query: queryVector,
    using: "text-dense",
    limit: topK,
    with_payload: true,
    filter: {
      must: [
        {
          key: "document",
          match: {
            value: documentName,
          },
        },
      ],
    },
  });

  return searchResponse;
};
