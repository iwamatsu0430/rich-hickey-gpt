import { setTimeout } from "timers/promises";
import openai from "./openai";
import sqlite from "./sqlite";

if (require.main === module) {
  (async () => {
    const openaiClient = openai.init();
    const db = sqlite.init();
    const rows = await sqlite.list(
      db,
      `
        SELECT
          c.id
          , c.chunk
        FROM
          chunks AS c
          LEFT JOIN embeddings AS e
            ON c.id = e.chunk_id
        WHERE
          e.id IS NULL
      `
    );
    for (const row of rows) {
      const embedding = await openai.fetchEmbedding(openaiClient, row.chunk);
      await sqlite.exec(
        db,
        `
        INSERT INTO embeddings
          (chunk_id, embedding)
        VALUES
          (${row.id}, '${String(embedding)}')
        `
      );
      console.log(`embeded: id=${row.id}`);
      await setTimeout(2000);
    }
    db.close();
  })();
}
