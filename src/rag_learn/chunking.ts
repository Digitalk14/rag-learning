import axios from 'axios';
import weaviate, { weaviate as weaviateClient } from 'weaviate-client';
import { execSync } from 'child_process';

// Интерфейсы для типизации данных
interface BookTextObject {
    body: string;
    chapter_title: string;
    filename: string;
}

interface ChunkObject {
    chapter_title: string;
    filename: string;
    chunk: string;
    chunk_index: number;
}

interface GitHubFileInfo {
    type: string;
    download_url: string;
    name: string;
}

/**
 * Аналог kill_processes_on_ports из Python.
 * Работает в Unix-подобных системах (Linux/macOS).
 */
function killProcessesOnPorts(ports: number[]): void {
    for (const port of ports) {
        try {
            // Ищем PID процесса на порту и принудительно завершаем его
            execSync(`lsof -t -i:${port} | xargs kill -9 2>/dev/null`);
        } catch (error) {
            // Если процессов на порту нет, lsof вернет ошибку, просто игнорируем её
        }
    }
}

// Убиваем процессы перед стартом основного кода
killProcessesOnPorts([5000, 8080, 8097, 50050, 50051]);

// Основная функция для запуска асинхронного кода
async function main() {
    const url = "https://raw.githubusercontent.com/progit/progit2/main/book/01-introduction/sections/what-is-git.asc";
    
    // Выполняем GET запрос
    const response = await axios.get<string>(url);
    const sourceText = response.data;

    function getChunksFixedSize(text: string, chunkSize: number): string[] {
        // Регулярное выражение \s+ корректно делит текст по любым пробелам/переносам строк
        const textWords = text.trim().split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < textWords.length; i += chunkSize) {
            const chunkWords = textWords.slice(i, i + chunkSize);
            chunks.push(chunkWords.join(" "));
        }
        return chunks;
    }

    const fixedSizeChunks = getChunksFixedSize(sourceText, 100);

    function getChunksFixedSizeWithOverlap(text: string, chunkSize: number, overlapFraction: number): string[] {
        const textWords = text.trim().split(/\s+/);
        const overlapInt = Math.floor(chunkSize * overlapFraction);
        const chunks: string[] = [];

        for (let i = 0; i < textWords.length; i += chunkSize) {
            const start = Math.max(i - overlapInt, 0);
            const chunkWords = textWords.slice(start, i + chunkSize);
            chunks.push(chunkWords.join(" "));
        }
        return chunks;
    }

    for (const chosenSize of) {
        const chunks = getChunksFixedSizeWithOverlap(sourceText, chosenSize, 0.2);
        console.log(`\nSize ${chosenSize} - ${chunks.length} chunks returned.`);
        for (let i = 0; i < Math.min(3, chunks.length); i++) {
            console.log(`Chunk ${i + 1}: ${chunks[i]}`);
        }
    }

    function getChunksByParagraph(text: string): string[] {
        return text.split("\n\n");
    }

    function getChunksByAsciidocSections(text: string): string[] {
        return text.split("\n==");
    }

    for (const marker of ["\n\n", "\n=="]) {
        const chunks = sourceText.split(marker);
        console.log(`\nUsing the marker: ${JSON.stringify(marker)} - ${chunks.length} chunks returned.`);
        for (let i = 0; i < Math.min(3, chunks.length); i++) {
            console.log(`Chunk ${i + 1}: ${JSON.stringify(chunks[i])}`);
        }
    }

    function mixedChunking(text: string): string[] {
        const chunks = text.split("\n==");
        const newChunks: string[] = [];
        let chunkBuffer = "";
        const minLength = 25;

        for (const chunk of chunks) {
            const newBuffer = chunkBuffer + chunk;
            // Делим по пробелам для подсчета слов
            const newBufferWords = newBuffer.trim().split(/\s+/);

            if (newBufferWords.length < minLength) {
                chunkBuffer = newBuffer;
            } {
                newChunks.push(newBuffer);
                chunkBuffer = "";
            }
        }

        if (chunkBuffer.length > 0) {
            newChunks.push(chunkBuffer);
        }

        return newChunks;
    }

    const mixedChunks = mixedChunking(sourceText);
    for (let i = 0; i < Math.min(3, mixedChunks.length); i++) {
        console.log(`Chunk ${i + 1}: ${JSON.stringify(mixedChunks[i])}`);
    }

    async function getBookTextObjects(): Promise<BookTextObject[]> {
        const textObjs: BookTextObject[] = [];
        const apiBaseUrl = 'https://api.github.com/repos/progit/progit2/contents/book';
        const chapterUrls = ['/01-introduction/sections', '/02-git-basics/sections'];

        for (const chapterUrl of chapterUrls) {
            const res = await axios.get<GitHubFileInfo[]>(apiBaseUrl + chapterUrl);

            for (const fileInfo of res.data) {
                if (fileInfo.type === 'file') {
                    const fileResponse = await axios.get<string>(fileInfo.download_url);
                    
                    const urlParts = fileInfo.download_url.split('/');
                    const chapterTitle = urlParts[urlParts.length - 3];
                    const filename = urlParts[urlParts.length - 1];

                    textObjs.push({
                        body: fileResponse.data,
                        chapter_title: chapterTitle,
                        filename: filename
                    });
                }
            }
        }
        return textObjs;
    }

    const bookTextObjs = await getBookTextObjects();
    if (bookTextObjs.length > 0) {
        console.log(Object.keys(bookTextObjs[0]));
    }

    function buildChunkObjs(bookTextObj: BookTextObject, chunks: string[]): ChunkObject[] {
        return chunks.map((chunk, index) => ({
            chapter_title: bookTextObj.chapter_title,
            filename: bookTextObj.filename,
            chunk: chunk,
            chunk_index: index
        }));
    }

    const chunkObjSets: Record<string, any> = {};
}

// Запускаем скрипт
main().catch(console.error);
