import { PDFReader } from "@llamaindex/readers/pdf";
import { TokenTextSplitter } from "llamaindex";
import * as path from "node:path";

/**
 * Читает PDF файл и нарезает его на чанки (Nodes)
 * @param filePath - Полный путь к PDF файлу
 */
async function parsePdfToChunks(filePath: string) {
  const reader = new PDFReader();
  
  // Читает строго один указанный файл
  const documents = await reader.loadData(filePath); 
  
  const splitter = new TokenTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });

  return splitter.getNodesFromDocuments(documents);
}


// Пример запуска
async function main() {
  // Убедитесь, что в этой папке лежит ваш test.pdf
  const myPdfPath = path.join(import.meta.dirname, "test.pdf");
  
  try {
    const chunks = await parsePdfToChunks(myPdfPath);
    console.log(`Успешно создано чанков: ${chunks.length}`);
    
    if (chunks.length > 0) {
      // В LlamaIndex.ts у объектов TextNode текст лежит в свойстве .text
      console.log("\n--- Текст первого чанка ---");
      console.log(chunks[0].text.substring(0, 300) + "...");
    }
  } catch (err) {
    console.error("Произошла ошибка:", err);
  }
}

main();
