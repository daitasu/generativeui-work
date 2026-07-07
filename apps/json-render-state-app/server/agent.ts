import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { catalog } from "../src/render/catalog";
import { mockLines } from "./mock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// catalog.prompt() は $state/$bindState/$template/visible/setState などの束縛記法を
// 自動で説明してくれる。ここではこのアプリ固有の運用ルールだけ足す。
const SYSTEM_PROMPT = catalog.prompt({
  mode: "standalone",
  customRules: [
    "テキストはすべて日本語で書く。",
    "これはデモなので、天気データは実APIを呼ばず、もっともらしい値を創作してよい。",
    "重要: 天気の値・都市名・お気に入り状態は必ず spec の /state に入れ、各コンポーネントの prop は {\"$state\":\"...\"} で state を参照する。値を prop に直書きしないこと。",
    "気温は必ず摂氏(℃)の数値で /state に入れる。表示単位は /state/unit ('C' | 'F') で切り替わり、WeatherWidget と WeeklyForecastList の unit prop には {\"$state\":\"/unit\"} を束縛する。初期値は 'C'。",
    "UnitToggle には必ず element の on に {\"setC\":{\"action\":\"setState\",\"params\":{\"statePath\":\"/unit\",\"value\":\"C\"}},\"setF\":{\"action\":\"setState\",\"params\":{\"statePath\":\"/unit\",\"value\":\"F\"}}} を付け、props.unit に {\"$state\":\"/unit\"} を束縛する。",
    "FavoriteToggle の value には {\"$bindState\":\"/favorite\"} を束縛する(初期値 false)。お気に入り登録時のメッセージ Text などは element の visible:{\"$state\":\"/favorite\"} で出し分ける。",
    "要約文は Text の text に $template を使う。例: {\"$template\":\"${/city}は本日、${/weather/summary}\"}。",
    "現在の天気には WeatherWidget、週間予報には WeeklyForecastList を使い、UnitToggle と FavoriteToggle も添える。",
    "出力順は必ず /state を先に、その後 /root と /elements を出す。",
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

  // ponytail: APIキー未設定の環境ではモックJSONLを流す(束縛の描画パス検証用)
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
