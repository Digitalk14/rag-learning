import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import LlamaCloud from "@llamaindex/llama-cloud";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

import {
  getFile,
  parse,
  splitToChunks,
  createPoints,
  qdrantCreateCollection,
} from "./naive_rag/index.ts";

import { EMBED_MODEL } from "./naive_rag/const.ts";

const openai = new OpenAI();

const qdrant = new QdrantClient({
  url: "http://127.0.0.1:6333",
});

const client = new LlamaCloud({
  apiKey: process.env.LLAMA_INDEX_API_KEY,
});

const COLLECTION_NAME = "advanced_rag_collection";
const DOCUMENT_NAME = "20_tales.pdf";

async function indexDocument() {
  console.log("Loading document...");

  const file = await getFile(
    `../../samples/${DOCUMENT_NAME}`,
    client,
  );

  const parsed = await parse(file, client);

  const chunks = splitToChunks({
    parsed,
    chunkSize: 256,
    chunkOverlap: 30,
  });

  console.log(`Created ${chunks.length} chunks.`);

  // ============================================================
  // 1. CREATE / RECREATE QDRANT COLLECTION
  // ============================================================

  await qdrantCreateCollection(
    qdrant,
    COLLECTION_NAME,
  );

  // ============================================================
  // 2. GENERATE EMBEDDINGS
  // ============================================================

  console.log("Generating embeddings...");

  const embedResponse = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: chunks,
  });

  // ============================================================
  // 3. CREATE QDRANT POINTS
  // ============================================================

  const points = await createPoints(
    chunks,
    embedResponse,
    DOCUMENT_NAME,
  );

  console.log(`Upserting ${points.length} points...`);

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log("Indexing complete.");
}

indexDocument().catch(console.error);