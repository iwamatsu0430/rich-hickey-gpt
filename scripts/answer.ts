import axios from "axios";
import { search } from "./search";
import openai from "./openai";

const answer = async (query: string, matchesCount: number = 5) => {
  const searchResult = await search(query, matchesCount);
  const answerResult = await axios
    .post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that accurately answers queries using Rich Hickey's talks. Use the text provided to form your answer, but avoid copying word-for-word from the talks. Try to use your own words when possible. Keep your answer under 5 sentences. Be accurate, helpful, concise, and clear.",
          },
          {
            role: "user",
            content: `Use the following passages to provide an answer to the query: "${query}"\n\n${searchResult
              .map((row) => row.chunk)
              .join("\n\n")}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.0,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openai.apiKey}`,
        },
      }
    )
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      } else {
        console.log("Failed api: ", res);
      }
    });
  return {
    searchResult,
    messages: answerResult.choices.map((c: any) => c.message.content),
  };
};

if (require.main === module) {
  (async () => {
    if (process.argv.length < 2) {
      console.log("Usage: npm run answer <query>");
      process.exit(1);
    }
    const query = process.argv[2];
    const result = await answer(query);
    console.log(`Chat GPT says: ${result.messages[0]}`);
    console.log("================");
    console.log("References:");
    result.searchResult
      .reduce((acc, row) => {
        return [
          ...acc,
          ...(!!acc.find((a) => a.path === row.path) ? [] : [row]),
        ];
      }, [])
      .forEach((row: any) => {
        console.log(`Title: ${row.title}`);
        console.log(`- Conference: ${row.conference}`);
        console.log(`- Video URL: ${row.videoUrl}`);
        console.log(`- Transcript: ${row.path}`);
      });
  })();
}
