import { Document, SentenceSplitter } from "llamaindex";
import * as fs from "fs";
import * as path from "path";

export type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
  parsed: any;
  cacheDir?: string; // Добавили опциональный путь к папке кэша
};

type TaleChunks = {
  taleIndex: number;
  title: string;
  chunks: string[];
};

export const splitToChunks = ({
  parsed,
  chunkSize = 512,
  chunkOverlap = 50,
  cacheDir = "./cache",
}: ChunkOptions): string[] => {

  // 1. Формируем уникальное имя файла на основе параметров
  const fileName = `chunks_${chunkSize}_${chunkOverlap}.json`;
  const filePath = path.join(cacheDir, fileName);

  // 2. Проверяем кэш
  if (fs.existsSync(filePath)) {
    console.log(
      `[Cache] Найден готовый кэш для параметров ${chunkSize}/${chunkOverlap}. Читаем из файла...`,
    );

    try {
      const cacheData = JSON.parse(
        fs.readFileSync(filePath, "utf-8"),
      );

      return cacheData.chunks;
    } catch (error) {
      console.error(
        "[Cache] Ошибка чтения файла кэша, выполняем чанкинг заново:",
        error,
      );
    }
  }

  console.log(
    `[2/6] Кэш не найден. Передаем каждую историю отдельно в LlamaIndex ` +
    `для чанкинга (Size: ${chunkSize}, Overlap: ${chunkOverlap})...`,
  );

  const pages = parsed?.markdown?.pages ?? [];

  const splitter = new SentenceSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks: string[] = [];

  // ============================================================
  // ВАЖНО:
  // Каждая page = отдельная Tale.
  //
  // Поэтому splitter никогда не сможет взять текст
  // из конца одной истории и начало следующей.
  // ============================================================

  for (const page of pages) {
    if (!page?.success || !page.markdown) {
      continue;
    }

    const document = new Document({
      text: page.markdown,
    });

    const nodes = splitter.getNodesFromDocuments([document]);

    const pageChunks = nodes.map((node) => node.text);

    chunks.push(...pageChunks);

    console.log(
      `Tale/Page ${page.page_number}: ${pageChunks.length} chunks`,
    );
  }

  console.log(`Total chunks: ${chunks.length}`);

  // 3. Сохраняем результат в кэш
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const dataToSave = {
      chunkSize,
      chunkOverlap,
      chunks,
    };

    fs.writeFileSync(
      filePath,
      JSON.stringify(dataToSave, null, 2),
      "utf-8",
    );

    console.log(
      `[Cache] Результат успешно сохранен в ${filePath}`,
    );
  } catch (error) {
    console.error(
      "[Cache] Не удалось сохранить файл кэша:",
      error,
    );
  }

  return chunks;
};
