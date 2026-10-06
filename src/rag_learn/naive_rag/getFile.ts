import LlamaCloud from "@llamaindex/llama-cloud";
import fs from "fs";

export const getFile = async (path: string, client: LlamaCloud) => {
  return await client.files.create({
    file: fs.createReadStream(path),
    purpose: "parse",
  });
};