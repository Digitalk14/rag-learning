import { QdrantClient } from "@qdrant/js-client-rest";

export const sparseSearch = async (
  qdrant: QdrantClient,
  collectionName: string,
  query: string,
  topK: number,
  documentName: string,
) => {
  const sparseResponse = await qdrant.query(collectionName, {
    query: {
      text: query,
      model: "qdrant/bm25",
    },
    using: "text-sparse",
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
  return sparseResponse;
};
