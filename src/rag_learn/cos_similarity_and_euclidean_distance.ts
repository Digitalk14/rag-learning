// Distance formulas. 
// In this ungraded lab, distance formulas are implemented here. In future assignments, you will import functions from specialized libraries.

/**
 * Compute the cosine similarity between a vector and an array of vectors.
 * 
 * @param v1 - The first vector.
 * @param array_of_vectors - An array of vectors or a single vector.
 * @returns A list of cosine similarities between v1 and each vector in array_of_vectors.
 */
function cosine_similarity(v1: number[], array_of_vectors: number[] | number[][]): number[] {
    // Ensure that v1 is a numpy array (In TS, we ensure it's a number array)
    const v1_arr = [...v1];
    // Initialize a list to store similarities
    const similarities: number[] = [];
    
    // Check if array_of_vectors is a single vector
    // In TS, we check if the first element is a number (1D array) or another array (2D array)
    let vectors_list: number[][];
    if (!Array.isArray(array_of_vectors[0])) {
        vectors_list = [array_of_vectors as number[]];
    } else {
        vectors_list = array_of_vectors as number[][];
    }
    
    // Iterate over each vector in the array
    for (const v2 of vectors_list) {
        // Convert the current vector to a numpy array (In TS, clone the array)
        const v2_arr = [...v2];
        
        // Compute the dot product of v1 and v2
        let dot_product = 0;
        for (let i = 0; i < v1_arr.length; i++) {
            dot_product += v1_arr[i] * v2_arr[i];
        }
        
        // Compute the norms of the vectors
        let sum_sq_v1 = 0;
        let sum_sq_v2 = 0;
        for (let i = 0; i < v1_arr.length; i++) {
            sum_sq_v1 += v1_arr[i] ** 2;
            sum_sq_v2 += v2_arr[i] ** 2;
        }
        const norm_v1 = Math.sqrt(sum_sq_v1);
        const norm_v2 = Math.sqrt(sum_sq_v2);
        
        // Compute the cosine similarity and append to the list
        const similarity = dot_product / (norm_v1 * norm_v2);
        similarities.push(similarity);
    }
    // Return float values (In JS/TS all numbers are already floats)
    return similarities;
}

/**
 * Compute the Euclidean distance between a vector and an array of vectors.
 * 
 * @param v1 - The first vector.
 * @param array_of_vectors - An array of vectors or a single vector.
 * @returns A list of Euclidean distances between v1 and each vector in array_of_vectors.
 */
function euclidean_distance(v1: number[], array_of_vectors: number[] | number[][]): number[] {
    // Ensure that v1 is a numpy array (In TS, we ensure it's a number array)
    const v1_arr = [...v1];
    // Initialize a list to store distances
    const distances: number[] = [];
    
    // Check if array_of_vectors is a single vector
    let vectors_list: number[][];
    if (!Array.isArray(array_of_vectors[0])) {
        vectors_list = [array_of_vectors as number[]];
    } else {
        vectors_list = array_of_vectors as number[][];
    }
    
    // Iterate over each vector in the array
    for (const v2 of vectors_list) {
        // Convert the current vector to a numpy array (In TS, clone the array)
        const v2_arr = [...v2];
        
        // Check if the input arrays have the same shape
        if (v1_arr.length !== v2_arr.length) {
            throw new Error(`Shapes don't match: v1 shape: ${v1_arr.length}, v2 shape: ${v2_arr.length}`);
        }
        
        // Calculate the Euclidean distance and append to the list
        let sum_squared_diff = 0;
        for (let i = 0; i < v1_arr.length; i++) {
            sum_squared_diff += (v1_arr[i] - v2_arr[i]) ** 2;
        }
        const dist = Math.sqrt(sum_squared_diff);
        distances.push(dist);
    }
    // Return float values (In JS/TS all numbers are already floats)
    return distances;
}

const v1 = [1, 2]
const v2 = [10, 20]

const cosine_sim = cosine_similarity(v1, v2);
const euclidean_dist = euclidean_distance(v1, v2);

console.log('Cosine Similarity:', cosine_sim);
console.log('Euclidean Distance:', euclidean_dist);

export { cosine_similarity, euclidean_distance };