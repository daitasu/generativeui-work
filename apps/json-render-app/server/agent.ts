import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { catalog } from "../src/render/catalog";
import { mockLines } from "./mock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// json-render はカタログ定義からシステムプロンプトを自動生成できる
const SYSTEM_PROMPT = catalog.prompt({
  mode: "standalone",
  customRules: [
    "テキストはすべて日本語で書く。",
    "これはデモなので、天気データはもっともらしい値を創作してよい(実APIは呼ばない)。",
    "現在の天気を聞かれたら WeatherWidget、週間予報を聞かれたら WeeklyForecastList を使う。両方聞かれたら Stack で両方並べる。",
    "ひとことの要約 Text を最初に添えると良い。",
  ],
});

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * POST /api/chat  { prompt: string }
 * レスポンス: SpecStream (RFC 6902 JSON Patch の JSONL) テキストストリーム
 */
export async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }
  const { prompt } = JSON.parse(await readBody(req)) as { prompt: string };

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  // ponytail: APIキー未設定の環境ではモックJSONLを流す(描画パス検証用)
  if (!process.env.ANTHROPIC_API_KEY) {
    for (const line of mockLines()) {
      res.write(line + "\n");
      await sleep(200);
    }
    res.end();
    return;
  }

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    stream.on("text", (text) => res.write(text));
    await stream.finalMessage();
  } catch (e) {
    res.write("\n" + JSON.stringify({ error: String(e) }) + "\n");
  }
  res.end();
}
