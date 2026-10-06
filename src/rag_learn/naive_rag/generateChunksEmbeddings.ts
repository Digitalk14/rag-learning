import OpenAI from "openai";
import { EMBED_MODEL } from "./const.ts";

export const generateChunksEmbeddings = async (
  llmModel: OpenAI,
  chunks: string[] | any[],
  queryVector: number[],
) => {
  const docVectors: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const res = await llmModel.embeddings.create({
        model: EMBED_MODEL,
        input: chunks[i],
      });
      docVectors.push(res.data[0]?.embedding);
      console.log(
        `   -> Чанк ${i + 1}/${chunks.length} успешно векторизован (Размерность: ${res.data[0]?.embedding?.length})`,
      );
    } catch (chunkError) {
      console.warn(
        `[Внимание] Ошибка векторизации чанка ${i}, применяем нулевую заглушку.`,
      );
      docVectors.push(new Array(queryVector?.length || 0).fill(0));
    }
  }
  return docVectors;
};
