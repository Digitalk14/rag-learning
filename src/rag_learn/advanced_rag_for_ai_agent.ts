import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import OpenAI from "openai";
import { CohereClientV2 } from "cohere-ai";
import { QdrantClient } from "@qdrant/js-client-rest";

import {
  generateQueryEmbedding,
  hybridSearch,
  rerankChunks,
} from "./naive_rag/index.ts";

import { generateMultiQueries } from "./naive_rag/generateMultiQueries.ts";

const openai = new OpenAI();

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY,
});

const qdrant = new QdrantClient({
  url: "http://127.0.0.1:6333",
});

const COLLECTION_NAME = "advanced_rag_collection";

const TOP_K = 5;
const RETRIEVAL_K = 10;

export async function searchKnowledge(query: string) {
  // ============================================================
  // 1. GENERATE MULTI-QUERIES
  // ============================================================

  const queries = await generateMultiQueries(openai, query);

  // ============================================================
  // 2. HYBRID SEARCH FOR EACH QUERY
  // ============================================================

  const allHybridResponses = [];

  for (const queryVariant of queries) {
    const queryVector = await generateQueryEmbedding(openai, queryVariant);

    if (!queryVector) {
      throw new Error(`Dense embedding missing for query: ${queryVariant}`);
    }

    const hybridResponse = await hybridSearch(
      qdrant,
      COLLECTION_NAME,
      queryVariant,
      queryVector,
      RETRIEVAL_K,
    );

    allHybridResponses.push(hybridResponse);
  }

  // ============================================================
  // 3. DEDUPLICATE RESULTS
  // ============================================================

  const uniquePoints = Array.from(
    new Map(
      allHybridResponses
        .flatMap((response) => response.points)
        .map((point) => [point.id, point]),
    ).values(),
  );

  // ============================================================
  // 4. RERANK WITH COHERE
  // ============================================================

  const rerankedPoints = await rerankChunks(cohere, TOP_K, query, uniquePoints);

  // ============================================================
  // 5. RETURN CONTEXT
  // ============================================================

  const chunks = rerankedPoints
    .map((point) => ({
      text: point.payload?.text,
      chunkIndex: point.payload?.chunkIndex,
      score: point.score,
      rerankScore: point.rerankScore,
    }))
    .filter(
      (
        chunk,
      ): chunk is {
        text: string;
        chunkIndex: unknown;
        score: number;
        rerankScore: number;
      } => typeof chunk.text === "string",
    );

  return {
    query,
    chunks,
  };
}

