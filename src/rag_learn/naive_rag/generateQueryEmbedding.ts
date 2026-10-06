import OpenAI from "openai";
import { EMBED_MODEL } from "./const.ts";

export const generateQueryEmbedding = async (llmModel: OpenAI, query: string) => {
    const queryEmbResp = await llmModel.embeddings.create({
    model: EMBED_MODEL,
    input: query,
  });

  const queryVector = queryEmbResp?.data?.[0]?.embedding;

  return queryVector;
};
