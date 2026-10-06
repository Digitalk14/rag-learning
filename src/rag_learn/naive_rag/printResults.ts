export const printResults = async (title: string, points: any[]) => {
  console.log(`\n\n================ ${title} ================`);

  if (!points || points.length === 0) {
    console.log("No results.");
    return;
  }

  points.forEach((point, index) => {
    console.log(`\n#${index + 1}`);
    if (point.score !== undefined) {
      console.log(`Qdrant score: ${point.score?.toFixed(4)}`);
    }
    if (point.rerankScore !== undefined) {
      console.log(`Cohere score: ${point.rerankScore?.toFixed(4)}`);
    }
    console.log(`chunkIndex: ${point.payload?.chunkIndex}`);
    console.log(`text:\n${point.payload?.text}`);
  });

  console.log("\n================================================");
}