import { pipeline } from '@huggingface/transformers';
import * as path from 'path';
import { cosine_similarity, euclidean_distance } from './cos_similarity_and_euclidean_distance';

// Load the pre-trained sentence transformer model
const model_name = "BAAI/bge-base-en-v1.5";

// Replicating os.path.join(os.environ['MODELS'], model_name)
const modelsEnv = process.env.MODELS || './models';
const modelPath = path.join(modelsEnv, model_name);

// Helper function to extract embeddings since JS/TS works with pipeline objects
async function getPipeline() {
    // We use the 'feature-extraction' task, which is the TS equivalent of SentenceTransformer
    return await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5');
}

async function main() {
    const extractor = await getPipeline();

    // To get a string embedded, just pass it to the model.
    // In JS/TS, we add pooling and convert to a standard nested array.
    const resOutput = await extractor("RAG is awesome", { pooling: 'mean', normalize: true });
    const res = Array.from(resOutput.data as Float32Array);
    
    // Print the length (dimensions) instead of Python's .shape
    console.log(`(${res.length},)`);

    // An array of strings can be passed, and the output will be an array of vectors, each with 768 dimensions.
    const batchOutput = await extractor(['apple', 'car'], { pooling: 'mean', normalize: true });
    // In TS we parse the flat 1D tensor data back into a 2D array of [2, 768]
    const batchEmbeddings: number[][] = [];
    const dim = 768;
    for (let i = 0; i < batchOutput.data.length; i += dim) {
        batchEmbeddings.push(Array.from(batchOutput.data.slice(i, i + dim) as Float32Array));
    }

    // Print the first 100 elements of the embedding.
    console.log(res.slice(0, 100));

    const words = ['apple', 'car', 'fruit', 'automobile', 'love', 'sentiment'];
    
    // Vectorize multiple words
    const wordsOutput = await extractor(words, { pooling: 'mean', normalize: true });
    const vectorized_words: number[][] = [];
    for (let i = 0; i < wordsOutput.data.length; i += dim) {
        vectorized_words.push(Array.from(wordsOutput.data.slice(i, i + dim) as Float32Array));
    }

    const word = 'apple';
    console.log(`${word}:`);
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        // Get the vectorized word for the word defined above
        const vectorized_word = vectorized_words[words.indexOf(word)];
        
        // Call the cosine_similarity function we wrote earlier
        const simScore = cosine_similarity(vectorized_word, vectorized_words[i])[0];
        console.log(`\t${w}:\t\tCosine Similarity: ${simScore.toFixed(4)}`);
    }
    console.log("\n\n\n");

    const documents = [
        "Mt. Fuji is a breathtaking place to explore during autumn.",
        "Santorini offers stunning views to admire during spring.",
        "Banff National Park is a picturesque destination to visit in the summer.",
        "The Great Wall of China is a spectacular site to experience during winter.",
        "The fjords of Norway are a magical place to cruise through in the spring.",
        "Prague is an enchanting city to wander through in winter.",
        "Kyoto's cherry blossoms create a beautiful scene to witness during spring.",
        "Marrakech offers vibrant markets and culture to enjoy in the fall.",
        "The Maldives are a paradisiacal getaway to savor during summer.",
        "The Christmas markets in Vienna are a festive delight to explore in winter."
    ];

    const query = "Suggest to me great places to visit in Asia.";
    
    // Testing with Cosine Similarity
    const scoreCosine = await retrieve_relevant(query, documents, 'cosine_similarity', extractor);
    console.log("--- Cosine Similarity Results ---");
    console.log(scoreCosine);

    // Testing with Euclidean Distance
    const scoreEuclidean = await retrieve_relevant(query, documents, 'euclidean', extractor);
    console.log("\n--- Euclidean Distance Results ---");
    console.log(scoreEuclidean);
}

/**
 * Retrieves and ranks documents based on their similarity to a given query using the specified metric.
 * 
 * @param query - The query string for which relevant documents are to be retrieved.
 * @param documents - A list of documents to be compared against the query.
 * @param metric - The similarity measurement metric to be used. Supports 'cosine_similarity' and 'euclidean'. Defaults to 'cosine_similarity'.
 * @param extractor - The preloaded transformers pipeline extractor.
 * @returns A list of tuples where each tuple contains a document and its similarity or distance score.
 */
async function retrieve_relevant(
    query: string, 
    documents: string[], 
    metric: 'cosine_similarity' | 'euclidean' = 'cosine_similarity',
    extractor: any
): Promise<[string, number][]> {
    
    const dim = 768;
    
    // Encode query
    const queryOutput = await extractor(query, { pooling: 'mean', normalize: true });
    const query_emb = Array.from(queryOutput.data as Float32Array);
    
    // Encode documents
    const docsOutput = await extractor(documents, { pooling: 'mean', normalize: true });
    const documents_emb: number[][] = [];
    for (let i = 0; i < docsOutput.data.length; i += dim) {
        documents_emb.push(Array.from(docsOutput.data.slice(i, i + dim) as Float32Array));
    }
    
    let vals: [string, number][] = [];

    if (metric === 'cosine_similarity') {
        // Compute similarity for each document vector
        const distances = documents_emb.map(doc_vector => cosine_similarity(query_emb, doc_vector)[0]);
        
        // Python's zip(documents, distances) approach
        vals = documents.map((doc, idx) => [doc, distances[idx]]);
        
        // Sort in descending order
        vals.sort((a, b) => b[1] - a[1]);
        
    } else if (metric === 'euclidean') {
        // Compute distance for each document vector
        const distances = documents_emb.map(doc_vector => euclidean_distance(query_emb, doc_vector)[0]);
        
        // Python's zip(documents, distances) approach
        vals = documents.map((doc, idx) => [doc, distances[idx]]);
        
        // Sort in ascending order
        vals.sort((a, b) => a[1] - b[1]);
    }
        
    return vals;
}

// Run the application
main().catch(console.error);
