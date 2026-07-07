import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { mockLines } from "./mock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * POST /api/chat  { prompt: string, surfaceId: string }
 * レスポンス: A2UI v0.9 メッセージの JSONL テキストストリーム
 */
export async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }
  const { prompt, surfaceId } = JSON.parse(await readBody(req)) as {
    prompt: string;
    surfaceId: string;
  };

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  // ponytail: APIキー未設定の環境ではモックJSONLを流す(描画パス検証用)
  if (!process.env.ANTHROPIC_API_KEY) {
    for (const line of mockLines(surfaceId)) {
      res.write(line + "\n");
      await sleep(300);
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
      messages: [{ role: "user", content: `surfaceId: ${surfaceId}\n\n${prompt}` }],
    });
    stream.on("text", (text) => res.write(text));
    await stream.finalMessage();
  } catch (e) {
    res.write("\n" + JSON.stringify({ error: String(e) }) + "\n");
  }
  res.end();
}
