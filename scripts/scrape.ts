import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import { setTimeout } from "timers/promises";
import { Database } from "sqlite3";
import util from "./util";

type Content = {
  path: string;
  title: string;
  conference: string;
  videoUrl: string;
  texts: Array<string>;
};

const BASE_URL =
  "https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich";
const CHUNK_SIZE = 200;
const TALK_PATHS = ["/SimpleMadeEasy.md", "/MaybeNot.md"];

const initializeDb = async () => {
  const db = util.sqlite.client();
  await util.sqlite.exec(
    db,
    `
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      conference TEXT NOT NULL,
      video_url TEXT NOT NULL,
      chunk TEXT NOT NULL,
      chunk_length INTEGER NOT NULL,
      tokens INTEGER NOT NULL,
      embedding TEXT
    );`
  );
  await util.sqlite.exec(db, `DELETE FROM chunks;`);
  return db;
};

const getContents = async (path: string) => {
  const html = await axios.get(`${BASE_URL}${path}`);
  const $ = cheerio.load(html.data);
  const article = $("article.markdown-body");
  const texts = $(article)
    .find('p[dir="auto"]')
    .filter((_, p) => {
      const text = $(p).text();
      return !/^\[.+\]$/.test(text) && $(p).find("img").length === 0;
    })
    .map((_, p) => $(p).text())
    .toArray();
  return <Content>{
    path: path,
    title: $(article).find("h1").text(),
    conference: $(article).find("ul > li:nth-of-type(2)").text(),
    videoUrl: $(article).find("ul > li:nth-of-type(3)").text().split(": ")[1],
    texts: texts,
  };
};

const save = async (db: Database, content: Content) => {
  const chunks = content.texts.flatMap((text) => {
    if (encode(text).length > CHUNK_SIZE) {
      return text.split(".").flatMap((sentence) => {
        if (encode(sentence).length <= CHUNK_SIZE) return [sentence.trim()];
        else return sentence.split(",").map((t) => t.trim());
      });
    } else {
      return [text];
    }
  });
  for (const chunk of chunks) {
    await util.sqlite.exec(
      db,
      `
      INSERT INTO chunks (
        path,
        title,
        conference,
        video_url,
        chunk,
        chunk_length,
        tokens
      ) VALUES ('${BASE_URL}${content.path}', '${content.title}', '${
        content.conference
      }', '${content.videoUrl}', '${chunk}', ${chunk.length}, ${
        encode(chunk).length
      })
    `
    );
  }
};

if (require.main === module) {
  (async () => {
    const db = await initializeDb();
    for (const talkPath of TALK_PATHS) {
      const content = await getContents(talkPath);
      await save(db, content);
      await setTimeout(1000);
    }
  })();
}
