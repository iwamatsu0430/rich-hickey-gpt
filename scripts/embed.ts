import { setTimeout } from "timers/promises";
import util from "./util";

if (require.main === module) {
  (async () => {
    const openai = util.openai.client();
    const db = util.sqlite.client();
    const rows = await util.sqlite.list(
      db,
      "SELECT id, chunk FROM chunks WHERE embedding IS NULL"
    );
    for (const row of rows) {
      const embedding = await util.openai.fetchEmbedding(openai, row.chunk);
      await util.sqlite.exec(
        db,
        `UPDATE chunks SET embedding = '${embedding
          .map((e) => String(e))
          .join(",")}' WHERE id = ${row.id}`
      );
      console.log(`embeded: id=${row.id}`);
      await setTimeout(2000);
    }

    db.close();
  })();
}
