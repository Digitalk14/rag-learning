import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrantCreateCollection = async (
  qdrantClient: QdrantClient,
  collectionName: string,
) => {
  try {
    await qdrantClient.deleteCollection(collectionName);
  } catch (e) {
    // Collection may not exist.
  }

  await qdrantClient.createCollection(collectionName, {
    vectors: {
      "text-dense": {
        size: 1536,
        distance: "Cosine",
      },
    },

    sparse_vectors: {
      "text-sparse": {
        modifier: "idf",
      },
    },
  });
};
