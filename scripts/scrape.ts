import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import { setTimeout } from "timers/promises";
import { Database } from "sqlite3";
import sqlite from "./sqlite";

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
const TALK_PATHS = [
  "/ClojureConcurrency.md",
  "/ClojureForJavaProgrammers.md",
  "/ClojureIntroForLispProgrammers.md",
  "/AreWeThereYet.md",
  "/PersistentDataStructure.md",
  "/HammockDrivenDev.md",
  // "/RichHickeyQandA.md", // No metadata
  "/SimpleMadeEasy.md",
  "/SimplicityMatters.md",
  "/ValueOfValuesLong.md",
  "/WritingDatomicInClojure.md",
  "/Reducers.md",
  "/ValueOfValues.md",
  "/DeconstructingTheDatabase.md",
  "/LanguageSystem.md",
  "/FunctionalDatabase.md",
  "/CoreAsync.md",
  "/DesignCompositionPerformance.md",
  "/ImplementationDetails.md",
  "/Transducers.md",
  "/InsideTransducers.md",
  "/ClojureMadeSimple.md",
  "/ClojureSpec.md",
  "/Spec_ulation.md",
  "/EffectivePrograms.md",
  "/DatomicIons.md",
  "/ProblemSolving.md",
  "/MaybeNot.md",
];

const setupDb = async () => {
  const db = sqlite.init();
  await sqlite.exec(
    db,
    `CREATE TABLE IF NOT EXISTS talks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      conference TEXT NOT NULL,
      video_url TEXT
    )`
  );
  await sqlite.exec(
    db,
    `
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      talk_id INTEGER NOT NULL,
      chunk TEXT NOT NULL,
      chunk_length INTEGER NOT NULL,
      tokens INTEGER NOT NULL
    )`
  );
  await sqlite.exec(
    db,
    `
    CREATE TABLE IF NOT EXISTS embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_id INTEGER NOT NULL,
      embedding TEXT NOT NULL
    )`
  );
  await sqlite.exec(db, `DELETE FROM chunks;`);
  return db;
};

const getContents = async (path: string) => {
  const html = await axios.get(`${BASE_URL}${path}`);
  const $ = cheerio.load(html.data);
  const article = $("article.markdown-body");
  const metadata = $(article)
    .find("ul")
    .children("li")
    .map((_, l) => $(l).text())
    .toArray();
  const texts = $(article)
    .find("p")
    .filter((_, p) => {
      const text = $(p).text();
      return !/^\[.+\]$/.test(text) && $(p).find("img").length === 0;
    })
    .map((_, p) => $(p).text())
    .toArray();
  const conferenceElement = metadata.find((text) =>
    /^(Conference|Event|Meeting|)\:/.test(text)
  );
  const videoUrlElement = metadata.find((text) => /^Video( \d+)*\:/.test(text));
  return <Content>{
    path: path,
    title: $(article).find("h1").text(),
    conference: conferenceElement?.split(": ").slice(1).join(""),
    videoUrl: videoUrlElement?.split(": ").slice(1).join(": "),
    texts: texts,
  };
};

const save = async (db: Database, content: Content) => {
  await sqlite.exec(
    db,
    `
    INSERT INTO talks (
      path
      , title
      , conference
      , video_url
    ) VALUES (
      '${BASE_URL}${content.path}'
      , '${content.title}'
      , '${content.conference}'
      , '${content.videoUrl}'
    )`
  );
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
    await sqlite.exec(
      db,
      `
      INSERT INTO chunks (
        talk_id
        , chunk
        , chunk_length
        , tokens
      ) SELECT
        id
        , '${chunk}'
        , ${chunk.length}
        , ${encode(chunk).length}
      FROM
        talks
      WHERE
        path = '${BASE_URL}${content.path}'
    `
    );
  }
};

if (require.main === module) {
  (async () => {
    const db = await setupDb();
    for (const path of TALK_PATHS) {
      console.log(`scarape: ${path}`);
      const content = await getContents(path);
      await save(db, content);
      await setTimeout(2000);
    }
    db.close();
  })();
}
