import LlamaCloud from "@llamaindex/llama-cloud";

export const parse = async (file: LlamaCloud.Files.FileCreateResponse, client: LlamaCloud) => {
  return await client.parsing.parse({
    file_id: file.id,
    tier: "fast",
    version: "latest",
    expand: ["markdown"],
    disable_cache: false,
    processing_options: {
      confidence_score_effort: "high",
      ocr_parameters: { languages: ["en"] },
    },
    processing_control: {
      timeouts: {
        base_in_seconds: 30,
        extra_time_per_page_in_seconds: 15,
      },
    },
  });
};