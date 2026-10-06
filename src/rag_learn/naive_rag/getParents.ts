import LlamaCloud from "@llamaindex/llama-cloud";

export const getParents = async (parsed: LlamaCloud.Parsing.ParsingGetResponse) => {
  const pages = parsed?.markdown.pages;
  const parents = pages?.map((page, index) => {
    return {
      id: `tale-${index + 1}`,
      text: page.markdown,
    };
  });

  return parents;
};
