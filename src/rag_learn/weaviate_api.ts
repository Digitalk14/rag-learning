import weaviate, { dataType, vectorizer, reranker } from 'weaviate-client';
import { EmbeddedClient, EmbeddedOptions } from 'weaviate-ts-embedded';
import { v5 as uuidv5 } from 'uuid';
import * as fs from 'fs';
import { execSync } from 'child_process';

// 1. Аналог функции очистки портов kill_processes_on_ports
function killProcessesOnPorts(ports: number[]): void {
  for (const port of ports) {
    try {
      // Ищем PID процесса на порту (работает на Linux/macOS)
      const pid = execSync(`lsof -t -i:${port}`).toString().trim();
      if (pid) {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`Процесс ${pid} на порту ${port} успешно завершен.`);
      }
    } catch (e) {
      // Если на порту ничего нет, lsof выдаст ошибку, просто игнорируем ее
    }
  }
}

// Убиваем процессы перед стартом приложения
killProcessesOnPorts([5000, 8080, 8097, 50050, 50051]);

// Подгружаем данные (замените загрузку joblib на чтение аналогичного JSON/файла в Node.js)
// В TypeScript структура описывается интерфейсом для строгой типизации
interface TravelDocument {
  place: string;
  state: string;
  description: string;
  best_season_to_visit: string;
  attractions: string;
  budget: string;
  user_ratings: number;
  last_updated: string; // ISO формат даты
}

// Заглушка вместо joblib.load
const data: TravelDocument[] = JSON.parse(fs.readFileSync('data.json', 'utf-8'));
console.log('Первый элемент данных:', data[0]);

const YOUR_OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-key";
const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Стандартный DNS UUID для генерации v5

async function run() {
  // 2. Инициализация Встроенного (Embedded) Weaviate с переменными окружения
  // TypeScript Embedded клиент расширяет стандартный WeaviateClient
  const embeddedOptions = new EmbeddedOptions({
    version: '1.26.1',
    persistenceDataPath: './.collections',
    env: {
      ENABLE_API_BASED_MODULES: 'true',
      ENABLE_MODULES: 'text2vec-transformers, reranker-transformers',
      TRANSFORMERS_INFERENCE_API: 'http://127.0.0.1:5000/',
      RERANKER_INFERENCE_API: 'http://127.0.0.1:5000/'
    }
  });

  // В TS headers передаются при инициализации клиента (через опции подключения)
  const client = await weaviate.connectToLocal({
    ports: {
      http: 8080, // Embedded клиент по умолчанию использует 8080 или порт из настроек
      grpc: 50051
    },
    headers: {
      'X-OpenAI-Api-Key': YOUR_OPENAI_API_KEY
    }
  });

  const collectionName = 'ExampleCollection'; // В Weaviate имя класса обязано быть с Большой буквы!

  // 3. Удаление коллекции, если она существует
  const exists = await client.collections.exists(collectionName);
  if (exists) {
    await client.collections.delete(collectionName);
  }

  // 4. Создание коллекции со структурой Named Vectors (Синтаксис v3 client)
  // Мы типизируем коллекцию типом <TravelDocument, any> для автодополнения свойств
  const collection = await client.collections.create<TravelDocument, any>({
    name: collectionName,
    
    // Конфигурация векторных модулей
    vectorizers: [
      vectorizer.text2VecTransformers({
        name: 'vector',
        sourceProperties: ['place', 'state', 'description', 'best_season_to_visit', 'attractions', 'budget'],
        vectorizeCollectionName: false,
        // API url передается параметрами настройки модуля, если используется кастомная инференс-точка
      })
    ],
    
    // Конфигурация реранкера
    rerankers: reranker.transformers(),

    // Определение свойств (Properties) и типов данных
    properties: [
      { name: 'place', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'state', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'description', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'best_season_to_visit', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'attractions', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'budget', dataType: dataType.TEXT, vectorizePropertyName: true },
      { name: 'user_ratings', dataType: dataType.NUMBER },
      { name: 'last_updated', dataType: dataType.DATE },
    ]
  });

  // 5. Пакетная вставка данных (Batching)
  // В TS v3 batch-инструмент работает через итераторы или прямой метод insertMany (самый быстрый способ)
  const batchObjects = data.map((document) => {
    // Генерация UUID v5 на основе строкового представления объекта (аналог generate_uuid5 в Python)
    const stringifiedDoc = JSON.stringify(document);
    const uuid = uuidv5(stringifiedDoc, NAMESPACE_UUID);

    return {
      properties: document,
      id: uuid // в JS/TS поле называется 'id', а не 'uuid'
    };
  });

  // Выполняем пакетную вставку пакетами (размер 1, как в исходном коде)
  console.log('Идет вставка документов...');
  for (const chunk of batchObjects) {
    const result = await collection.insertMany([chunk]);
    if (result.hasErrors) {
      console.error('Ошибка вставки пакета:', result.errors);
    }
  }
  console.log('Вставка завершена успешно.');

  // 6. Выполнение запросов (Queries)
  
  // Запрос 1: Выборка объектов по фильтру (user_ratings >= 3.5)
  const filterResult = await collection.query.fetchObjects({
    limit: 2,
    filters: collection.filter.byProperty('user_ratings').greaterOrEqual(3.5)
  });
  console.log(`Найдено объектов по фильтру рейтинг: ${filterResult.objects.length}`);

  // Запрос 2: Векторный поиск по тексту (NearText)
  const searchResult = await collection.query.nearText(
    ['I want suggestions to travel during Winter. I want cheap places.'], // nearText принимает массив строк (concepts)
    {
      limit: 4
    }
  );

  // Вывод свойств найденных объектов
  console.log('\nРезультаты поиска nearText:');
  for (const obj of searchResult.objects) {
    // В v3 TS свойства лежат напрямую в obj.properties с сохранением типов данных интерфейса
    console.log(`Место: ${obj.properties.place}, Рейтинг: ${obj.properties.user_ratings}`);
    console.log(`Описание: ${obj.properties.description}\n---`);
  }
}

run().catch((err) => console.error('Критическая ошибка:', err));
