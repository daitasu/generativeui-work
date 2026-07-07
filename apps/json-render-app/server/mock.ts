/**
 * ANTHROPIC_API_KEY が無い環境向けのモック応答。
 * 実LLMと同じ「SpecStream (JSON Patch の JSONL)」を返すので、描画パスの検証に使える。
 */
export function mockLines(): string[] {
  const patches: object[] = [
    { op: "add", path: "/root", value: "main" },
    {
      op: "add",
      path: "/elements/main",
      value: { type: "Stack", props: { direction: "column", gap: 3 }, children: [] },
    },
    {
      op: "add",
      path: "/elements/summary",
      value: {
        type: "Text",
        props: { text: "【モック】東京は晴れ時々くもり。日中は過ごしやすい陽気です。" },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "summary" },
    {
      op: "add",
      path: "/elements/widget",
      value: {
        type: "WeatherWidget",
        props: {
          city: "東京",
          temperature: 22,
          condition: "partly-cloudy",
          high: 25,
          low: 17,
          humidity: 48,
          windSpeed: 3,
        },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "widget" },
    { op: "add", path: "/elements/sep", value: { type: "Separator", props: {}, children: [] } },
    { op: "add", path: "/elements/main/children/-", value: "sep" },
    {
      op: "add",
      path: "/elements/title2",
      value: { type: "Heading", props: { text: "週間予報", level: 3 }, children: [] },
    },
    { op: "add", path: "/elements/main/children/-", value: "title2" },
    {
      op: "add",
      path: "/elements/forecast",
      value: {
        type: "WeeklyForecastList",
        props: {
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
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "forecast" },
  ];
  return patches.map((p) => JSON.stringify(p));
}
