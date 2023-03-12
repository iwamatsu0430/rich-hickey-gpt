import similarity from "compute-cosine-similarity";
import openai from "./openai";
import sqlite from "./sqlite";

export const search = async (query: string, matchesCount: number = 5) => {
  const openaiClient = openai.init();
  const db = sqlite.init();
  const queryEmbedding = await openai.fetchEmbedding(openaiClient, query);
  const rows = await sqlite.list(
    db,
    `
    SELECT
      t.path AS path
      , t.title AS title
      , t.conference AS conference
      , t.video_url AS videoUrl
      , c.chunk AS chunk
      , embedding AS embedding
    FROM
      embeddings AS e
      INNER JOIN chunks AS c
        ON e.chunk_id = c.id
      INNER JOIN talks AS t
        ON c.talk_id = t.id
    `
  );
  const result = rows
    .map((row) => {
      const embedding: Array<number> = row.embedding
        .split(",")
        .map((e: string) => Number(e.trim()));
      return {
        ...row,
        similarity: 1 - similarity(queryEmbedding, embedding),
      };
    })
    .sort((a, b) => a.similarity - b.similarity);
  db.close();
  return result.slice(0, matchesCount);
};

if (require.main === module) {
  (async () => {
    if (process.argv.length < 2) {
      console.log("Usage: npm run search <query>");
      process.exit(1);
    }
    const query = process.argv[2];
    const result = await search(query);
    console.log(result);
  })();
}
