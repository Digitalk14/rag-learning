import Together from 'together-ai';

/**
 * Interface mimicking the standard Chat Completion choice output structure
 */
interface ChatOutput {
  role: string;
  content: string | null;
}

/**
 * Get the proxy URL from environment variable or fall back to Together.ai endpoint.
 * Uses TOGETHER_BASE_URL environment variable.
 * Defaults to https://api.together.xyz/ if not set.
 */
export function getProxyUrl(): string {
  return process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/';
}

/**
 * Get the appropriate headers for API calls based on the platform.
 * Returns Authorization header with Together API key if available.
 */
export function getProxyHeaders(): Record<string, string> {
  return {
    Authorization: process.env.TOGETHER_API_KEY || ''
  };
}

/**
 * Get the Together API key from environment variables.
 */
export function getTogetherKey(): string {
  return process.env.TOGETHER_API_KEY || '';
}

/**
 * Resolves a Together client instance. 
 * If a custom base URL proxy or headers are needed (when api key isn't locally set),
 * it configures the client option overrides accordingly.
 */
function getTogetherClient(togetherApiKey?: string | null): Together {
  const apiKey = togetherApiKey || process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    // If no API key is present, instantiate the client targeting the proxy setup
    return new Together({
      apiKey: '', // Empty or dummy key if proxy bypasses auth checking
      baseURL: getProxyUrl(),
      defaultHeaders: getProxyHeaders()
    });
  }

  return new Together({ apiKey });
}

/**
 * Helper to build the parameters object safely eliminating undefined properties
 */
function buildPayload(
  messages: any[],
  model: string,
  maxTokens: number,
  topP?: number | null,
  temperature?: number | null,
  kwargs?: Record<string, any>
): Record<string, any> {
  const payload: Record<string, any> = {
    model,
    messages,
    max_tokens: maxTokens,
    // Turn off reasoning tokens if required by your pipeline configuration
    reasoning: { enabled: false },
    ...kwargs
  };

  if (temperature !== undefined && temperature !== null) {
    payload.temperature = temperature;
  }
  if (topP !== undefined && topP !== null) {
    payload.top_p = topP;
  }

  return payload;
}

/**
 * Generate completion using a single string prompt input
 */
export async function generateWithSingleInput(
  prompt: string,
  role: string = 'user',
  topP?: number | null,
  temperature?: number | null,
  maxTokens: number = 500,
  model: string = 'Qwen/Qwen3.5-9B',
  togetherApiKey?: string | null,
  kwargs?: Record<string, any>
): Promise<ChatOutput> {
  const messages = [{ role, content: prompt }];
  const payload = buildPayload(messages, model, maxTokens, topP, temperature, kwargs);
  
  try {
    const client = getTogetherClient(togetherApiKey);
    // TypeScript SDK handles the explicit endpoint parsing automatically via chat.completions
    const response = await client.chat.completions.create(payload as any);
    
    const choice = response.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Failed to get correct output dict. Choice message is missing.');
    }

    return {
      role: choice.message.role.toLowerCase(),
      content: choice.message.content
    };
  } catch (error: any) {
    throw new Error(`Error while calling LLM: ${error?.message || error}`);
  }
}

/**
 * Generate completion using a structured array of chat messages
 */
export async function generateWithMultipleInput(
  messages: Array<{ role: string; content: string }>,
  topP?: number | null,
  temperature?: number | null,
  maxTokens: number = 500,
  model: string = 'Qwen/Qwen3.5-9B',
  togetherApiKey?: string | null,
  kwargs?: Record<string, any>
): Promise<ChatOutput> {
  const payload = buildPayload(messages, model, maxTokens, topP, temperature, kwargs);

  try {
    const client = getTogetherClient(togetherApiKey);
    const response = await client.chat.completions.create(payload as any);

    const choice = response.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Failed to get correct output dict. Choice message is missing.');
    }

    return {
      role: choice.message.role.toLowerCase(),
      content: choice.message.content
    };
  } catch (error: any) {
    throw new Error(`Error while calling LLM: ${error?.message || error}`);
  }
}
