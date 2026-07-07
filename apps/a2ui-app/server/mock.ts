import { WEATHER_CATALOG_ID } from "./systemPrompt";

/**
 * ANTHROPIC_API_KEY が無い環境向けのモック応答。
 * 実LLMと同じ「A2UIメッセージのJSONL」を返すので、描画パスの検証に使える。
 */
export function mockLines(surfaceId: string): string[] {
  const s = surfaceId;
  return [
    JSON.stringify({ version: "v0.9", createSurface: { surfaceId: s, catalogId: WEATHER_CATALOG_ID } }),
    JSON.stringify({
      version: "v0.9",
      updateDataModel: { surfaceId: s, path: "/", value: { summary: "【モック】東京は晴れ時々くもり。日中は過ごしやすい陽気です。" } },
    }),
    JSON.stringify({
      version: "v0.9",
      updateComponents: {
        surfaceId: s,
        components: [
          { id: "root", component: "Column", children: ["summary", "widget", "div1", "title2", "forecast"] },
          { id: "summary", component: "Text", text: { path: "/summary" } },
          {
            id: "widget", component: "WeatherWidget",
            city: "東京", temperature: 22, condition: "partly-cloudy",
            high: 25, low: 17, humidity: 48, windSpeed: 3,
          },
          { id: "div1", component: "Divider" },
          { id: "title2", component: "Text", text: "**週間予報**" },
          {
            id: "forecast", component: "WeeklyForecastList",
            days: [
              { day: "月", condition: "sunny", high: 25, low: 17 },
              { day: "火", condition: "partly-cloudy", high: 24, low: 16 },
              { day: "水", condition: "rainy", high: 20, low: 15 },
              { day: "木", condition: "rainy", high: 19, low: 14 },
              { day: "金", condition: "cloudy", high: 21, low: 15 },
              { day: "土", condition: "sunny", high: 26, low: 16 },
              { day: "日", condition: "sunny", high: 27, low: 18 },
            ],
          },
        ],
      },
    }),
  ];
}
