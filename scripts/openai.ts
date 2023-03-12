import { Configuration, OpenAIApi } from "openai";

export const apiKey = process.env.OPENAI_API_KEY;

export const init = () => {
  const configuration = new Configuration({ apiKey });
  return new OpenAIApi(configuration);
};

export const fetchEmbedding = async (openai: OpenAIApi, query: string) => {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: query,
  });
  const [{ embedding }] = response.data.data;
  return embedding;
};

export default {
  apiKey,
  init,
  fetchEmbedding,
};
