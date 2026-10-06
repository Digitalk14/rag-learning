import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import LlamaCloud from "@llamaindex/llama-cloud";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { CohereClientV2 } from "cohere-ai";
import { v4 as uuidv4 } from "uuid";

import {
  getFile,
  parse,
  splitToChunks,
  generateQueryEmbedding,
  buildSparseVector,
  rerankChunks,
  printResults,
  qdrantCreateCollection,
  createPoints,
  denseSearch,
  sparseSearch,
  hybridSearch,
  getParents,
} from "./naive_rag/index.ts";

import { EMBED_MODEL, CHAT_MODEL } from "./naive_rag/const.ts";
import { generateMultiQueries } from "./naive_rag/generateMultiQueries.ts";

const DATASET = [
  {
    question: "What happened to Gideon?",
    expected:
      "He poured black ink over the map, causing the sky to turn to ink and swallow the kingdom.",
    expectedChunkIndex: 14,
  },
  {
    question: "What happened to the clockmaker's family?",
    expected:
      "His children became toddlers and then vanished entirely into nonexistence.",
    expectedChunkIndex: 0,
  },
  {
    question: "What happened to the backward gear?",
    expected:
      "It rewound the clockmaker's life, making him younger while the world around him faded into history.",
    expectedChunkIndex: 0,
  },
];

const openai = new OpenAI();

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY,
});

const qdrant = new QdrantClient({
  url: "http://127.0.0.1:6333",
});

const client = new LlamaCloud({
  apiKey: process.env.LLAMA_INDEX_API_KEY,
});

const QUERY_QUESTION = "What happened to Gideon?";

const COLLECTION_NAME = "advanced_rag_collection";
const DOCUMENT_NAME = "20_tales.pdf";

export const TOP_K = 5;
const RETRIEVAL_K = 10;

async function main() {
  // ============================================================
  // 1. LOAD DOCUMENT
  // ============================================================

  const file = await getFile(`../../samples/${DOCUMENT_NAME}`, client);

  const parsed = await parse(file, client);

  const parents = await getParents(parsed)


  const chunks = splitToChunks({
    parsed,
    chunkSize: 256,
    chunkOverlap: 30,
  });

  // console.log(`\nTotal chunks: ${chunks.length}`);
  const setup = async (queryData: {
    question: string;
    expected: string;
    expectedChunkIndex: number;
  }) => {
    // ============================================================
    // 2. CREATE QUERY VECTORS
    // ============================================================

    const queries = await generateMultiQueries(openai, queryData.question);

    // console.log("\n================ MULTI-QUERIES ================");

    // queries.forEach((query, index) => {
    //   console.log(`${index + 1}. ${query}`);
    // });

    // console.log("================================================");

    // const queryVector = await generateQueryEmbedding(openai, QUERY_QUESTION);

    // if (!queryVector) {
    //   console.error(
    //     "Ошибка: не удалось сгенерировать dense embedding для запроса.",
    //   );
    //   return;
    // }

    // const querySparseVector = buildSparseVector(QUERY_QUESTION);

    // ============================================================
    // 3. RECREATE COLLECTION
    // ============================================================

    await qdrantCreateCollection(qdrant, COLLECTION_NAME);

    // ============================================================
    // 4. CREATE DENSE EMBEDDINGS FOR ALL CHUNKS
    // ============================================================

    // console.log("\nGenerating dense embeddings...");

    const embedResponse = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: chunks,
    });

    // ============================================================
    // 5. CREATE QDRANT POINTS
    // ============================================================

    const points = await createPoints(chunks, embedResponse, DOCUMENT_NAME);
    

    // console.log(`Upserting ${points.length} points...`);

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    // console.log("Upsert complete.");

    // ============================================================
    // 6. DENSE SEARCH
    // ============================================================

    const allDenseResponses = [];

    for (const query of queries) {
      const queryVector = await generateQueryEmbedding(openai, query);
      if (!queryVector) {
        throw new Error(`Dense embedding missing for query: ${query}`);
      }

      const denseResponse = await denseSearch(
        qdrant,
        COLLECTION_NAME,
        queryVector,
        TOP_K,
        DOCUMENT_NAME,
      );
      allDenseResponses.push(denseResponse);
    }

    // await printResults(
    //   "DENSE / SEMANTIC SEARCH",
    //   allDenseResponses.flatMap((response) => response.points),
    // );

    // ============================================================
    // 7. SPARSE SEARCH
    // ============================================================

    const allSparseResponses = [];

    for (const query of queries) {
      const sparseResponse = await sparseSearch(
        qdrant,
        COLLECTION_NAME,
        query,
        TOP_K,
        DOCUMENT_NAME,
      );

      allSparseResponses.push(sparseResponse);
    }

    // await printResults(
    //   "SPARSE / KEYWORD SEARCH",
    //   allSparseResponses.flatMap((response) => response.points),
    // );

    // ============================================================
    // 8. HYBRID SEARCH
    // ============================================================

    const allHybridResponses = [];

    for (const query of queries) {
      const queryVector = await generateQueryEmbedding(openai, query);
      if (!queryVector) {
        throw new Error(`Dense embedding missing for query: ${query}`);
      }
      const hybridResponse: any = await hybridSearch(
        qdrant,
        COLLECTION_NAME,
        query,
        queryVector,
        RETRIEVAL_K,
      );

      allHybridResponses.push(hybridResponse);
    }

    const uniquePoints = Array.from(
      new Map(
        allHybridResponses
          .flatMap((response) => response.points)
          .map((point) => [point.id, point]),
      ).values(),
    );

    // const allHybridPoints = allHybridResponses.flatMap(
    //   (response) => response.points,
    // );

    // console.log(`Multi-query retrieved ${allHybridResponses.length} points`);

    // console.log(`After deduplication: ${uniquePoints.length} unique points`);

    // await printResults(
    //   "HYBRID SEARCH / RRF",
    //   allHybridResponses.flatMap((response) => response.points),
    // );

    // ============================================================
    // 9. RERANK HYBRID RESULTS
    // ============================================================

    const rerankedPoints = await rerankChunks(
      cohere,
      TOP_K,
      QUERY_QUESTION,
      uniquePoints,
    );

    // await printResults("RERANKED / COHERE", rerankedPoints);

    // ============================================================
    // 10. BUILD CONTEXT FOR GPT
    // ============================================================

    const topChunksText = rerankedPoints
      .map((point) => point.payload?.text)
      .filter((text): text is string => typeof text === "string");

    const contextText = topChunksText.join("\n---\n");

    // console.log("\n\n================ CONTEXT SENT TO GPT ================");

    // console.log(contextText);

    // console.log("======================================================");

    // ============================================================
    // 11. GPT
    // ============================================================

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: "Answer the question using only the context. Be concise.",
        },
        {
          role: "user",
          content: `Context:
${contextText}
Question: ${QUERY_QUESTION}`,
        },
      ],
      temperature: 0,
    });

    // console.log("\n\n================ GPT ANSWER ================");

    // console.log(response.choices[0]?.message?.content);

    // console.log("============================================");
    return {
      query: queryData.question,
      expected: queryData.expected,
      expectedChunkIndex: queryData.expectedChunkIndex,
      actualAnswer: response.choices[0]?.message?.content,
      retrievedChunkIndexes: rerankedPoints.map((point) => ({
        chunkIndex: point.payload?.chunkIndex,
        score: point.score,
        rerankScore: point.rerankScore,
      })),
    };
  };

  for (const query of DATASET) {
    const setResult = await setup(query);
    console.log(setResult);
  }
}

main().catch(console.error);
