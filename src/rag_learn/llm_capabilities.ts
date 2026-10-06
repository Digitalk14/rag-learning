// Описываем типы для сообщений и параметров
interface Message {
  role: string;
  content: string;
}

interface GenerationOptions {
  prompt?: string;
  role?: string;
  top_p?: number | null;
  temperature?: number | null;
  max_tokens?: number;
  model?: string;
  top_k?: number;
  repetition_penalty?: number | null;
  [key: string]: any; // Для поддержки любых других параметров (аналог **kwargs)
}

// 1. Объявление базовых функций (сигнатуры)
declare function generate_with_single_input(
  prompt: string,
  role?: string,
  top_p?: number | null,
  temperature?: number | null,
  max_tokens?: number,
  model?: string,
  extraParams?: Record<string, any>,
): Message;

declare function generate_with_multiple_input(
  messages: Message[],
  top_p?: number | null,
  temperature?: number | null,
  max_tokens?: number,
  model?: string,
  extraParams?: Record<string, any>,
): Message;

// 2. Примеры одиночного и множественного ввода
generate_with_single_input(
  "Explain to me very briefly what is a Cyclotomic Polynomial. No more than 5 sentences.",
);

const system_dict: Message = {
  role: "system",
  content: "You are a very ironic, but helpful assistant.",
};
const user_dict: Message = {
  role: "user",
  content:
    "Explain to me very briefly what is a Cyclotomic Polynomial. No more than 5 sentences.",
};
const messages: Message[] = [system_dict, user_dict];
generate_with_multiple_input(messages);

// 3. Передача параметров через объект (деструктуризация вместо **kwargs)
const kwargs: GenerationOptions = {
  prompt: "Write a poem about a flying rabbit.",
  top_p: 0.7,
  temperature: 1.4,
  max_tokens: 100,
};
generate_with_single_input(
  kwargs.prompt!,
  "user",
  kwargs.top_p,
  kwargs.temperature,
  kwargs.max_tokens,
);

// 4. Функция генерации словаря параметров
function generate_params_dict(
  prompt: string,
  temperature: number | null = null,
  role: string = "user",
  top_p: number | null = null,
  max_tokens: number = 500,
  model: string = "Qwen/Qwen3.5-9B",
): GenerationOptions {
  return { prompt, role, temperature, top_p, max_tokens, model };
}

let currentKwargs = generate_params_dict("Solve 2x + 1 = 0.");
console.log(currentKwargs);

let result = generate_with_single_input(
  currentKwargs.prompt!,
  currentKwargs.role,
  currentKwargs.top_p,
  currentKwargs.temperature,
  currentKwargs.max_tokens,
  currentKwargs.model,
);
console.log(result.content);

// 5. Функция работы с контекстом (историей диалога)
function call_llm_with_context(
  prompt: string,
  context: Message[],
  role: string = "user",
  options: GenerationOptions = {},
): Message {
  // Добавляем новое сообщение пользователя в историю
  context.push({ role, content: prompt });

  // Извлекаем базовые параметры, а остальные передаем как extraParams
  const { top_p, temperature, max_tokens, model, ...extraParams } = options;

  // Вызываем модель со всей историей
  const response = generate_with_multiple_input(
    context,
    top_p,
    temperature,
    max_tokens,
    model,
    extraParams,
  );

  // Добавляем ответ модели в историю
  context.push(response);

  return response;
}

// 6. Использование контекста для ведения диалога
let context: Message[] = [
  { role: "system", content: "You are an ironic but helpful assistant." },
  { role: "assistant", content: "How can I help you, majesty?" },
];

let response = call_llm_with_context("Make a 2 sentence poem", context, "user");
console.log(response.content);
console.log(context);

response = call_llm_with_context("Now add two more sentences.", context);
console.log(response.content);

// Помощник для имитации random.randint в Python
const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const query =
  "In one sentence, explain to me what is RAG (Retrieval Augmented Generation).";

// 7. Эксперименты с Top_P
let results = Array.from({ length: 3 }, () =>
  generate_with_single_input(
    query,
    "user",
    0,
    null,
    500 + getRandomInt(1, 200),
  ),
);
results.forEach((res, i) =>
  console.log(`Call number ${i + 1}:\nResponse: ${res.content}`),
);

results = Array.from({ length: 3 }, () =>
  generate_with_single_input(
    query,
    "user",
    0.8,
    null,
    500 + getRandomInt(1, 200),
  ),
);
results.forEach((res, i) =>
  console.log(`Call number ${i + 1}:\nResponse: ${res.content}`),
);

// 8. Эксперименты с Top_K
results = Array.from({ length: 3 }, () =>
  generate_with_single_input(
    query,
    "user",
    null,
    null,
    500 + getRandomInt(1, 200),
    undefined,
    { top_k: 0 },
  ),
);
results.forEach((res, i) =>
  console.log(`Call number ${i + 1}:\nResponse: ${res.content}`),
);

results = Array.from({ length: 3 }, () =>
  generate_with_single_input(
    query,
    "user",
    null,
    null,
    500 + getRandomInt(1, 200),
    undefined,
    { top_k: 10 },
  ),
);
results.forEach((res, i) =>
  console.log(`Call number ${i + 1}:\nResponse: ${res.content}`),
);

// 9. Эксперименты с Температурой (Temperature)
const temperatures = [0.3, 1.5, 3];
let tempResults = temperatures.map((t) =>
  generate_with_single_input(query, "user", null, t),
);
console.log(`Query: ${query}`);
tempResults.forEach((res, i) => {
  console.log(
    `\x1b[1mCall number ${i + 1}.\x1b[0m \x1b[1mTemperature = ${temperatures[i]}\x1b[0m\nResponse: ${res.content}\n\n\n`,
  );
});

// 10. Комбинация Температуры и Top_P
const poemQuery = "Write a small poem about a flying rabbit.";
const params = [
  [0.3, 0.8],
  [1.5, 0.5],
  [3, 0.05],
];
let combResults = params.map(([t, p]) =>
  generate_with_single_input(poemQuery, "user", p, t),
);

combResults.forEach((res, i) => {
  const [t, p] = params[i];
  console.log(
    `\x1b[1mCall number ${i + 1}.\x1b[0m \x1b[1mTemperature = ${t}\x1b[0m, \x1b[1mtop_p = ${p}\x1b[0m\nResponse: ${res.content}\n\n\n`,
  );
});

// 11. Штраф за повторения (Repetition Penalty)
const breakfastQuery = "List healthy breakfast options.";
const penalties = [null, 1.2, 2];
let penaltyResults = penalties.map((r) =>
  generate_with_single_input(
    breakfastQuery,
    "user",
    null,
    null,
    500 + getRandomInt(1, 200),
    undefined,
    { repetition_penalty: r },
  ),
);

console.log(`Query: ${breakfastQuery}`);
// Примечание: в исходном коде Python была опечатка в выводе параметров (выводились значения [0.3, 1.5, 3] вместо penalties). Здесь выводим корректные штрафы:
penaltyResults.forEach((res, i) => {
  console.log(
    `\x1b[1mCall number ${i + 1}.\x1b[0m \x1b[1mRepetition Penalty = ${penalties[i]}\x1b[0m\nResponse: ${res.content}\n\n\n`,
  );
});
