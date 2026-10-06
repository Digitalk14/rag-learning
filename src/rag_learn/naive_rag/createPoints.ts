import { v4 as uuidv4 } from "uuid";

export const createPoints = async (chunks: string[], embedResponse: any, documentName: string) => {
    const points = chunks.map((chunk, index) => {
        const denseVector = embedResponse.data[index]?.embedding;
        if (!denseVector) {
            throw new Error(`Dense embedding missing for chunk ${index}`);
        }
        return {
            id: uuidv4(),
            vector: {
                "text-dense": denseVector,
                "text-sparse": {
                    text: chunk,
                    model: "qdrant/bm25",
                },
            },
            payload: {
                text: chunk,
                document: documentName,
                chunkIndex: index,
                parentId: `tale-${index + 1}`
            },
        };
    });

    return points
}