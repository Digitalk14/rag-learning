import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import LlamaCloud from "@llamaindex/llama-cloud";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import {
  getFile,
  parse,
  splitToChunks,
  generateQueryEmbedding,
  findSimilarity,
} from "./naive_rag/index.ts";
import { EMBED_MODEL, COLLECTION_NAME } from "./naive_rag/const.ts";

// НАСТРОЙКА МОДЕЛЕЙ OPENAI
const CHAT_MODEL = "gpt-4o"; // Актуальная флагманская модель для ответов

// Инициализируем клиент OpenAI (автоматически использует процесс.env.OPENAI_API_KEY)
const openai = new OpenAI();

// Инициализируем клиент Qdrant (по умолчанию смотрит на localhost:6333)
const qdrant = new QdrantClient({ url: "http://127.0.0.1:6333" });

const client = new LlamaCloud({
  apiKey: process.env.LLAMA_INDEX_API_KEY,
});

async function main() {
  console.log("[1/6] Отправляем PDF файл на парсинг в LlamaCloud...");
  const file = await getFile("../../samples/sample-local-pdf.pdf", client);
  const parsed = await parse(file, client);

  // Создаем массив текстовых строк из нод для совместимости с вашим последующим кодом эмбеддингов
  const chunks = splitToChunks({
    parsed,
  });

  console.log(`[Chunking] LlamaIndex выделил ${chunks.length} умных чанков.`);

  const query = "How many pages are in the document?";

  console.log(
    `[3/6] Генерируем эмбеддинг для запроса через стабильную модель ${EMBED_MODEL}...`,
  );
  const queryVector = await generateQueryEmbedding(openai, query);

  if (!queryVector) {
    console.error("Ошибка: не удалось сгенерировать эмбеддинг для запроса.");
    return;
  }

  // === РАБОТА С ВЕКТОРНОЙ БАЗОЙ ДАННЫХ ===

  // Пересоздаем коллекцию в Qdrant (для тестов, чтобы данные не дублировались при перезапуске)
  console.log(`[БАЗА] Подготовка коллекции "${COLLECTION_NAME}" в Qdrant...`);
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
  } catch (e) {}

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: 1536, // Размерность векторов модели text-embedding-ada-002
      distance: "Cosine", // Способ расчета схожести — Косинусное сходство
    },
  });

  console.log(`[4/6] Генерируем эмбеддинги чанков и сохраняем в Qdrant...`);

  // Чтобы не делать запросы в OpenAI по одному в цикле, генерируем эмбеддинги пачкой (Batch)
  const embedResponse = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: chunks,
  });

  // Формируем точки (points) для Qdrant
  const points: any = chunks.map((chunk, index) => ({
    id: uuidv4(), // уникальный UUID для каждой точки
    vector: embedResponse.data[index]?.embedding, // сам вектор
    payload: { text: chunk }, // Полезные данные (текст чанка), которые мы достанем при поиске
  }));

  // Загружаем пачку данных в Qdrant
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: points,
  });
  console.log(
    `   -> ${points.length} чанков успешно проиндексировано в Qdrant.`,
  );

  console.log("[5/6] Вычисляем семантическое сходство через Qdrant...");

  // ИСПРАВЛЕНИЕ: Передаем вектор в явном виде для метода query
  const searchResponse = await qdrant.query(COLLECTION_NAME, {
    query: queryVector, // Передаем наш массив чисел эмбеддинга
    limit: 2,
    with_payload: true,
  });

  // Защита: проверяем, вернула ли база точки
  if (!searchResponse.points || searchResponse.points.length === 0) {
    console.warn("[ВНИМАНИЕ] Qdrant не вернул ни одного чанка! Контекст пуст.");
  }

  // Собираем текст из найденных точек
  const topChunksText = searchResponse.points
    .map((point) => point.payload?.text)
    .filter((text): text is string => typeof text === "string");

  const contextText = topChunksText.join("\n---\n");

  // РАСТЕМЕНТИРУЕМ И ИСПРАВЛЯЕМ ЛОГ: Достаем score из первой точки внутри points
  if (searchResponse.points.length > 0) {
    const bestScore = searchResponse.points[0]?.score;
    console.log(
      `\n-> Лучший найденный контекст из Qdrant (score/схожесть: ${bestScore?.toFixed(4)}):`,
    );
  }

  // console.log(`\n-> Лучший найденный контекст из Qdrant (score/схожесть: ${searchResponse[0].score.toFixed(4)}):`);
  // console.log(`   "${topChunksText[0].substring(0, 150)}..."`);
  console.log("=== ЛОГ ДЛЯ ОТЛАДКИ ===");
  console.log("Длина вектора запроса:", queryVector.length);
  console.log("Количество найденных чанков:", topChunksText.length);
  console.log("Финальный контекст, который уходит в GPT:\n", contextText);
  console.log("=======================");

  // === ОТВЕТ МОДЕЛИ ===
  console.log(`\n[6/6] Отправляем промпт с реальным контекстом в GPT...`);
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          'Ты — полезный ИИ-ассистент. Ответь на вопрос пользователя на английском языке, используя ТОЛЬКО предоставленный контекст. Если в контексте нет прямого ответа, напиши "I cannot find the answer in the document".',
      },
      {
        role: "user",
        content: `Контекст:\n${contextText}\n\nВопрос: ${query}`,
      },
    ],
    temperature: 0.0,
  });

  console.log(
    "\n================ [ ОТВЕТ НАСТОЯЩЕЙ RAG SYSTEM ] ================",
  );
  console.log(response.choices[0]?.message?.content);
  console.log(
    "================================================================",
  );
}

main().catch(console.error);
