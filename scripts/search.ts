import similarity from "compute-cosine-similarity";
import util from "./util";

export const search = async (query: string) => {
  const openai = util.openai.client();
  const db = util.sqlite.client();
  const queryEmbedding = await util.openai.fetchEmbedding(openai, query);
  const rows = await util.sqlite.list(
    db,
    "SELECT path, title, conference, chunk, video_url, embedding FROM chunks WHERE embedding IS NOT NULL"
  );
  const result = rows
    .map((row) => {
      const embedding: Array<number> = row.embedding
        .split(",")
        .map((e: string) => Number(e.trim()));
      return {
        path: row.path,
        title: row.title,
        conference: row.conference,
        chunk: row.chunk,
        videoUrl: row.video_url,
        similarity: 1 - similarity(queryEmbedding, embedding),
      };
    })
    .sort((a, b) => a.similarity - b.similarity);
  db.close();
  return result.slice(0, 5);
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
