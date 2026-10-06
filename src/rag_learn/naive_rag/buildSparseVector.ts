// Простая функция для генерации разреженного вектора (Sparse Vector) из текста.
// В реальном продакшене лучше использовать полноценный BM25 токенизатор.
export const buildSparseVector = (text: string): { indices: number[]; values: number[] } => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const counts: Record<string, number> = {};
  
  words.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });

  const indices: number[] = [];
  const values: number[] = [];

  Object.entries(counts).forEach(([word, count]) => {
    // Хешируем строку в число для получения индекса (простой способ без словаря)
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 1000000; // Ограничиваем размер пространства
    indices.push(index);
    values.push(count); // В качестве веса используем частоту слова (TF)
  });

  return { indices, values };
}