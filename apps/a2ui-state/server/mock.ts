import { WEATHER_CATALOG_ID } from "./systemPrompt";

/**
 * ANTHROPIC_API_KEY が無い環境向けのモック応答(分割ストリーム版)。
 *
 * a2ui-app のモックが updateComponents 1発でツリー全体を送るのに対し、
 * こちらは updateComponents を root → 子 → 子 と複数回に分けて送るので、
 * client 側で [Loading <id>...] が順に本体へ置き換わり、UI が node ごとに育つ。
 * 最後に updateDataModel を再送し、束縛された天気カードが自動更新される様子を見せる。
 */
export function mockLines(surfaceId: string): string[] {
  const s = surfaceId;
  const v = "v0.9";
  return [
    // 1. surface を作る
    JSON.stringify({ version: v, createSurface: { surfaceId: s, catalogId: WEATHER_CATALOG_ID } }),

    // 2. 表示する値を先にデータモデルへ(構造は後から {path} で束縛する)
    JSON.stringify({
      version: v,
      updateDataModel: {
        surfaceId: s,
        path: "/",
        value: {
          summary: "【モック】東京は晴れ時々くもり。日中は過ごしやすい陽気です。",
          weather: {
            city: "東京",
            temp: 22,
            condition: "partly-cloudy",
            high: 25,
            low: 17,
            humidity: 48,
            wind: 3,
          },
        },
      },
    }),

    // 3. まず root だけ(子はまだ無い → [Loading summary...] などが表示される)
    JSON.stringify({
      version: v,
      updateComponents: {
        surfaceId: s,
        components: [
          { id: "root", component: "Column", children: ["summary", "widget", "sep", "title2", "forecast"] },
        ],
      },
    }),

    // 4. 子を1つずつ流す(node ごとに育つ)
    JSON.stringify({
      version: v,
      updateComponents: {
        surfaceId: s,
        components: [{ id: "summary", component: "Text", text: { path: "/summary" } }],
      },
    }),
    JSON.stringify({
      version: v,
      updateComponents: {
        surfaceId: s,
        components: [
          {
            id: "widget",
            component: "WeatherWidget",
            city: { path: "/weather/city" },
            temperature: { path: "/weather/temp" },
            condition: { path: "/weather/condition" },
            high: { path: "/weather/high" },
            low: { path: "/weather/low" },
            humidity: { path: "/weather/humidity" },
            windSpeed: { path: "/weather/wind" },
          },
        ],
      },
    }),
    JSON.stringify({
      version: v,
      updateComponents: { surfaceId: s, components: [{ id: "sep", component: "Divider" }] },
    }),
    JSON.stringify({
      version: v,
      updateComponents: {
        surfaceId: s,
        components: [{ id: "title2", component: "Text", text: "**週間予報**" }],
      },
    }),
    JSON.stringify({
      version: v,
      updateComponents: {
        surfaceId: s,
        components: [
          {
            id: "forecast",
            component: "WeeklyForecastList",
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

    // 5. 後から updateDataModel を再送 → 束縛された天気カードが自動更新(a2ui の強み)
    JSON.stringify({
      version: v,
      updateDataModel: {
        surfaceId: s,
        path: "/weather",
        value: { city: "東京", temp: 19, condition: "rainy", high: 21, low: 15, humidity: 72, wind: 6 },
      },
    }),
    JSON.stringify({
      version: v,
      updateDataModel: {
        surfaceId: s,
        path: "/summary",
        value: "【モック・更新】天気が変わりました：雨に。気温も下がっています。",
      },
    }),
  ];
}
