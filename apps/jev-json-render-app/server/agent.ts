import type { IncomingMessage, ServerResponse } from "node:http";
import type { CONDITIONS } from "../src/render/catalog";

/**
 * Jev (TypeSafe の System One モデル) はテキストを生成しない。型付きの「判断」だけ返す。
 * なので役割分担は「Jev が閉じた選択肢から決める → コードが SpecStream を組む」。
 * クライアントは json-render-app と同じ JSON Patch (JSONL) を受け取るので App.tsx は共通。
 * https://docs.typesafe.ai/api
 */

type Condition = (typeof CONDITIONS)[number];
type ChoiceAnswer = { choice: string; confidence: number };
type JevResult = { model: string; answers: { view: ChoiceAnswer; city: ChoiceAnswer } };

// Jev は自由記述を抽出できないので、都市は閉じた集合から選ばせる
const CITIES: Record<string, string> = {
  tokyo: "東京",
  osaka: "大阪",
  sapporo: "札幌",
  sendai: "仙台",
  yokohama: "横浜",
  nagoya: "名古屋",
  kyoto: "京都",
  hiroshima: "広島",
  fukuoka: "福岡",
  naha: "那覇",
};

const COND_LABEL: Record<Condition, string> = {
  sunny: "晴れ",
  "partly-cloudy": "晴れ時々くもり",
  cloudy: "くもり",
  rainy: "雨",
  snowy: "雪",
  thunder: "雷雨",
  foggy: "霧",
};

// Jev は英語が最も得意なので instructions/criteria は英語。Choice は先頭の選択肢に寄りやすいので、
// 先頭には外しても無難なもの(current / tokyo)を置く
const QUESTIONS = {
  view: {
    type: "choice",
    instructions: "Which weather information does the user's message ask for?",
    criteria: {
      current: "Asks only about the current weather or today's weather",
      weekly: "Asks only about the weekly forecast or the next several days",
      both: "Asks for both the current weather and the weekly forecast",
      not_weather: "The message is not asking about the weather at all",
    },
  },
  city: {
    type: "choice",
    instructions: "Which city does the user's message ask about?",
    criteria: {
      ...Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, `${v} (${k})`])),
      unspecified: "No city is named, or the named city is not in this list",
    },
  },
};

async function askJev(prompt: string): Promise<JevResult> {
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: prompt, model: "jev-latest", questions: QUESTIONS }),
  });
  if (!res.ok) throw new Error(`Jev HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as JevResult;
}

// ponytail: TYPESAFE_API_KEY 未設定の環境ではキーワード一致で Jev の answers を真似る(描画パス検証用)
function mockJev(prompt: string): JevResult {
  const weekly = /週|予報/.test(prompt);
  const current = /今|現在|天気(は|を|と|$)/.test(prompt);
  const view = current && weekly ? "both" : current ? "current" : weekly ? "weekly" : "not_weather";
  const city = Object.keys(CITIES).find((k) => prompt.includes(CITIES[k])) ?? "unspecified";
  return {
    model: "mock",
    answers: { view: { choice: view, confidence: 1 }, city: { choice: city, confidence: 1 } },
  };
}

// 天気の値は Jev が作れない(数値は苦手と公式も明言)のでコードで作る。
// ponytail: 都市名シードの疑似乱数。本物にするなら天気 API をここで叩く
function fakeWeather(city: string) {
  let seed = [...city].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 2147483647, 7);
  const rand = (n: number) => (seed = (seed * 48271) % 2147483647) % n;
  const conds = Object.keys(COND_LABEL) as Condition[];
  const base = 12 + rand(14);
  const today = new Date().getDay();
  const days = Array.from({ length: 7 }, (_, i) => {
    const high = base + rand(5);
    return {
      day: "日月火水木金土"[(today + i) % 7],
      condition: conds[rand(conds.length)],
      high,
      low: high - 6 - rand(4),
    };
  });
  const { condition, high, low } = days[0];
  const temperature = low + rand(high - low + 1);
  return { current: { condition, high, low, temperature, humidity: 40 + rand(40), windSpeed: 1 + rand(6) }, days };
}

function buildPatches({ answers }: JevResult, meta: string): object[] {
  const { view, city } = answers;
  const key = city.choice in CITIES ? city.choice : "tokyo";
  const label = CITIES[key];
  const { current, days } = fakeWeather(key);
  const el = (id: string, type: string, props: object) => [
    { op: "add", path: `/elements/${id}`, value: { type, props, children: [] } },
    { op: "add", path: "/elements/main/children/-", value: id },
  ];

  const note = key === city.choice ? "" : "(都市が対応リスト外のため東京を表示) ";
  const summary =
    view.choice === "not_weather"
      ? "天気について聞いてください(例: 東京の天気は？ / 大阪の週間予報を見せて)"
      : view.choice === "weekly"
        ? `${note}${label}の週間予報です。`
        : `${note}${label}は${COND_LABEL[current.condition]}、いまの気温は${current.temperature}°C です。`;

  return [
    { op: "add", path: "/root", value: "main" },
    {
      op: "add",
      path: "/elements/main",
      value: { type: "Stack", props: { direction: "vertical", gap: "md" }, children: [] },
    },
    ...el("summary", "Text", { text: summary }),
    ...(view.choice === "current" || view.choice === "both"
      ? el("widget", "WeatherWidget", { city: label, ...current })
      : []),
    ...(view.choice === "both" ? el("title2", "Heading", { text: "週間予報", level: "h3" }) : []),
    ...(view.choice === "weekly" || view.choice === "both"
      ? el("forecast", "WeeklyForecastList", { days })
      : []),
    // Jev の判断と確信度、所要時間を UI 上で見せる(クライアント改修なしで済むよう既存カタログの Badge で出す)
    ...el("jev", "Badge", {
      text: `Jev: view=${view.choice} (${view.confidence.toFixed(2)}) · city=${city.choice} (${city.confidence.toFixed(2)}) · ${meta}`,
      variant: "outline",
    }),
  ];
}

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
 * レスポンス: SpecStream (RFC 6902 JSON Patch の JSONL)。Jev の応答後に全パッチを一括で流す
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

  try {
    const t0 = performance.now();
    const result = process.env.TYPESAFE_API_KEY ? await askJev(prompt) : mockJev(prompt);
    const ms = Math.round(performance.now() - t0);
    for (const p of buildPatches(result, `${result.model} · ${ms}ms`)) res.write(JSON.stringify(p) + "\n");
  } catch (e) {
    res.write("\n" + JSON.stringify({ error: String(e) }) + "\n");
  }
  res.end();
}

// 自己チェック: node server/agent.ts
if (import.meta.main) {
  const types = (prompt: string) =>
    buildPatches(mockJev(prompt), "check")
      .flatMap((p: any) => (p.value?.type ? [p.value.type] : []))
      .join(",");
  const assert = (got: string, want: string) => {
    if (got !== want) throw new Error(`got ${got}, want ${want}`);
  };
  assert(types("東京の天気は？"), "Stack,Text,WeatherWidget,Badge");
  assert(types("大阪の週間予報を見せて"), "Stack,Text,WeeklyForecastList,Badge");
  assert(types("札幌の天気と週間予報"), "Stack,Text,WeatherWidget,Heading,WeeklyForecastList,Badge");
  assert(types("こんにちは"), "Stack,Text,Badge");
  const { current, days } = fakeWeather("naha");
  if (days.length !== 7 || days.some((d) => d.low >= d.high) || current.temperature > current.high)
    throw new Error("fakeWeather out of range");
  console.log("ok");
}
