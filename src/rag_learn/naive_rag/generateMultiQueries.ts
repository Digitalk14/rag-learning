import OpenAI from "openai";
import { CHAT_MODEL } from "./const.ts";

export const generateMultiQueries = async (
  openai: OpenAI,
  question: string,
): Promise<string[]> => {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,

    messages: [
      {
        role: "system",
        content: `
Generate 3 alternative search queries for the user's question.

The queries should:
- preserve the original meaning
- approach the question from slightly different angles
- be useful for semantic and keyword retrieval
- not invent facts

Return ONLY a JSON array of strings.
        `.trim(),
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Multi-query generation returned empty response");
  }

  const queries = JSON.parse(content);

  if (!Array.isArray(queries)) {
    throw new Error("Multi-query response is not an array");
  }

  return queries.filter((query): query is string => typeof query === "string");
};
