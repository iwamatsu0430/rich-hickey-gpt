import { verbose, Database } from "sqlite3";
import { Configuration, OpenAIApi } from "openai";

export const list = async (db: Database, sql: string) => {
  const result: Array<any> = [];
  return new Promise<Array<any>>((resolve, reject) => {
    db.each(
      sql,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          result.push(row);
        }
      },
      () => resolve(result)
    );
  });
};

export const exec = async (db: Database, sql: string) =>
  new Promise((resolve) => {
    db.exec(sql, resolve);
  });

const fetchEmbedding = async (openai: OpenAIApi, query: string) => {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: query,
  });
  const [{ embedding }] = response.data.data;
  return embedding;
};

export default {
  sqlite: {
    client: () => {
      const sqlite3 = verbose();
      return new sqlite3.Database("data.db");
    },
    list,
    exec,
  },
  openai: {
    client: () => {
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return new OpenAIApi(configuration);
    },
    fetchEmbedding,
  },
};
