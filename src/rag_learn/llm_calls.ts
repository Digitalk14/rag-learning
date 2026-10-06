import { getProxyUrl, getTogetherKey, getProxyHeaders } from "../utils/proxy";
import { OpenAI } from 'openai';
import { Agent, fetch as undiciFetch } from 'undici';

const baseUrl = getProxyUrl()

// --- 1. Custom HTTP Client Setup (Bypassing SSL Verification) ---

// Replicates httpx.HTTPTransport(local_address="0.0.0.0", verify=False)
const customAgent = new Agent({
  connect: {
    localAddress: '0.0.0.0',
    rejectUnauthorized: false, // Disables SSL/TLS verification (verify=False)
  },
});

// Configure custom headers and attach the custom agent override
const customFetch = (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const mergedHeaders = {
    ...init?.headers,
    ...getProxyHeaders(),
  };

  return undiciFetch(url, {
    ...init,
    headers: mergedHeaders,
    dispatcher: customAgent,
  }) as unknown as Promise<Response>;
};

// Instantiate OpenAI Client with the custom fetch pipeline
const client = new OpenAI({
  apiKey: getTogetherKey(),
  baseURL: baseUrl,
  fetch: customFetch, // Overriding default fetch mimics passing custom http_client
});

// --- 2. Execute Client Request ---

async function runChatCompletion() {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'user', content: 'Hello, who won the FIFA world cup in 2018?' },
    { role: 'assistant', content: 'France won the 2018 FIFA World Cup.' },
    { role: 'user', content: 'Who was the captain?' },
  ];

  const response = await client.chat.completions.create({
    messages: messages,
    model: 'Qwen/Qwen3.5-9B',
    // extra_body maps directly to root object level configuration extensions
    extra_body: {
      reasoning: false,
    },
  });

  console.log(response.choices[0]?.message?.content);
}

// --- 3. Data Layouts & Prompt Templates ---

interface House {
  address: string;
  city: string;
  state: string;
  zip: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  price: number;
  year_built: number;
}

const houseData: House[] = [
  {
    address: '123 Maple Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1500,
    price: 230000,
    year_built: 1998,
  },
  {
    address: '456 Elm Avenue',
    city: 'Shelbyville',
    state: 'TN',
    zip: '37160',
    bedrooms: 4,
    bathrooms: 3,
    square_feet: 2500,
    price: 320000,
    year_built: 2005,
  },
];

function houseInfoLayout(houses: House[]): string {
  let layout = '';
  for (const house of houses) {
    layout += `House located at ${house.address}, ${house.city}, ${house.state} ${house.zip} with ` +
              `${house.bedrooms} bedrooms, ${house.bathrooms} bathrooms, ` +
              `${house.square_feet} sq ft area, priced at $${house.price}, ` +
              `built in ${house.year_built}.\n`;
  }
  return layout;
}

function generatePrompt(query: string, houses: House[]): string {
  const housesLayout = houseInfoLayout(houses);
  return `
Use the following houses information to answer users queries.
${housesLayout}
Query: ${query}    
  `;
}

// Placeholder helper mimicking your function from Step 1
async function generateWithSingleInput(params: { prompt: string; role: string }) {
  // Uses client configuration established above
  const res = await client.chat.completions.create({
    model: 'Qwen/Qwen3.5-9B',
    messages: [{ role: params.role as any, content: params.prompt }],
  });
  return { content: res.choices[0]?.message?.content };
}

// --- 4. Main Orchestration Flow ---

async function main() {
  await runChatCompletion();

  console.log(houseInfoLayout(houseData));
  console.log(generatePrompt('What is the most expensive house?', houseData));

  const query = 'What is the most expensive house? And the bigger one?';
  
  // Asking without the augmented prompt
  const queryWithoutHouseInfo = await generateWithSingleInput({ prompt: query, role: 'user' });
  
  // With house info pipeline execution
  const enhancedQuery = generatePrompt(query, houseData);
  const queryWithHouseInfo = await generateWithSingleInput({ prompt: enhancedQuery, role: 'assistant' });

  console.log(queryWithHouseInfo.content);
}

main().catch(console.error);
