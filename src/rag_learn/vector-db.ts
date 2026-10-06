import weaviate from "weaviate-client";

async function main() {
  // 1. Подключение к базе данных Weaviate
  // Если запускаете локально через Docker, укажите http://localhost:8080
  const client = await weaviate.connectToLocal({
    host: "localhost",
    port: 8085,
  });

  console.log("Успешное подключение к Weaviate!");

  const collectionName = "Article";

  // 1. ОБЯЗАТЕЛЬНО удаляем старую автоматическую коллекцию, чтобы сбросить её
  await client.collections.delete(collectionName);
  console.log(`Старая коллекция ${collectionName} удалена.`);

  // 2. Создаем чистую коллекцию с ЛОКАЛЬНЫМ трансформером из Docker
  try {
    await client.collections.create({
      name: collectionName,
      vectorizers: [
        weaviate.configure.vectorizer.text2VecTransformers({
          name: "default",
          // 👇 Настройки индекса HNSW и метрики теперь передаются прямо сюда
          vectorIndexConfig: weaviate.configure.vectorIndex.hnsw({
            distanceMetric: "cosine",
          }),
        }),
      ],
    });
    console.log(`Новая коллекция ${collectionName} успешно создана.`);
  } catch (error) {
    console.error("Ошибка при создании коллекции:", error);
  }

  // Получаем доступ к созданной коллекции
  const collection = client.collections.get(collectionName);

  // 3. Пакетная загрузка данных (Batch Insert)
  const articlesToInsert = [
    {
      title: "New mission to Mars",
      body: "The NASA rover successfully landed on the surface of the red planet to search for alien life.",
    },
    {
      title: "Apple pie recipe",
      body: "To bake the perfect sweet apple pie, you will need fresh Antonovka apples and cinnamon.",
    },
    {
      title: "Automotive industry crisis",
      body: "Electric vehicle sales in Europe dropped significantly due to the cancellation of government subsidies.",
    },
  ];

  console.log("Начало пакетной загрузки...");
  const batchResult = await collection.data.insertMany(articlesToInsert);

  // Проверяем, были ли ошибки при загрузке каких-то конкретных объектов
  if (batchResult.hasErrors) {
    console.error("При загрузке возникли ошибки:", batchResult.errors);
  } else {
    console.log("Все документы успешно проиндексированы!");
  }

  // 4. Выполнение ГИБРИДНОГО ПОИСКА с фильтрацией (Стандарт индустрии)
  console.log("\n--- Выполняем гибридный поиск ---");

  const searchResponse = await collection.query.hybrid(
    "space exploration and rover missions",
    {
      targetVector: "default",
      alpha: 0.6, // 60% веса отдаем семантическому смыслу векторов
      limit: 2,
      returnMetadata: ["score"],
    },
  );

  // Выводим результаты в консоль
  searchResponse.objects.forEach((item, index) => {
    console.log(`\n[Место #${index + 1}]`);
    console.log(`Заголовок: ${item.properties.title}`);
    console.log(`Текст: ${item.properties.body}`);
    console.log(`Финальный гибридный скор: ${item.metadata?.score}`);
  });
}

main().catch(console.error);
