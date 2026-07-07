/**
 * ANTHROPIC_API_KEY が無い環境向けのモック応答。
 * 実LLMと同じ「SpecStream (JSON Patch の JSONL)」を返す。
 *
 * このモックが state 束縛パターンの参照実装:
 *   1. 先に /state に権威データ(天気の値・単位・お気に入り)を入れる
 *      → Provider が mount する時点で state が seed 済みになる。
 *   2. 続いて構造を出す。各 prop の値は直書きせず {$state:"..."} で /state を参照。
 *   3. UnitToggle(on+setState) と FavoriteToggle($bindState) が state を書き換えると、
 *      束縛している表示(気温・お気に入り表示)が reactive に更新される。
 */
export function mockLines(): string[] {
  const patches: object[] = [
    // --- 1. 権威データを /state へ(構造より先に出す) ---
    { op: "add", path: "/state", value: { city: "東京", unit: "C", favorite: false } },
    {
      op: "add",
      path: "/state/weather",
      value: {
        condition: "partly-cloudy",
        summary: "晴れ時々くもり。日中は過ごしやすい陽気です",
        temp: 22,
        high: 25,
        low: 17,
        humidity: 48,
        wind: 3,
      },
    },
    {
      op: "add",
      path: "/state/forecast",
      value: [
        { day: "月", condition: "sunny", high: 25, low: 17 },
        { day: "火", condition: "partly-cloudy", high: 24, low: 16 },
        { day: "水", condition: "rainy", high: 20, low: 15 },
        { day: "木", condition: "rainy", high: 19, low: 14 },
        { day: "金", condition: "cloudy", high: 21, low: 15 },
        { day: "土", condition: "sunny", high: 26, low: 16 },
        { day: "日", condition: "sunny", high: 27, low: 18 },
      ],
    },

    // --- 2. 構造。値は直書きせず /state を $state / $template で参照 ---
    { op: "add", path: "/root", value: "main" },
    {
      op: "add",
      path: "/elements/main",
      value: { type: "Stack", props: { direction: "column", gap: 3 }, children: [] },
    },

    {
      op: "add",
      path: "/elements/header",
      value: {
        type: "Heading",
        props: { text: { $template: "${/city}の天気" }, level: 2 },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "header" },

    {
      op: "add",
      path: "/elements/summary",
      value: {
        type: "Text",
        props: { text: { $template: "${/city}は本日、${/weather/summary}。" } },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "summary" },

    // 単位トグル + お気に入りトグルを横並び
    {
      op: "add",
      path: "/elements/controls",
      value: { type: "Stack", props: { direction: "row", gap: 2 }, children: [] },
    },
    { op: "add", path: "/elements/main/children/-", value: "controls" },
    {
      op: "add",
      path: "/elements/unitToggle",
      value: {
        type: "UnitToggle",
        props: { unit: { $state: "/unit" } },
        // on に setState を紐付け → クリックで /unit を書き換える
        on: {
          setC: { action: "setState", params: { statePath: "/unit", value: "C" } },
          setF: { action: "setState", params: { statePath: "/unit", value: "F" } },
        },
        children: [],
      },
    },
    { op: "add", path: "/elements/controls/children/-", value: "unitToggle" },
    {
      op: "add",
      path: "/elements/favToggle",
      value: {
        type: "FavoriteToggle",
        // $bindState で /favorite に双方向束縛
        props: { value: { $bindState: "/favorite" } },
        children: [],
      },
    },
    { op: "add", path: "/elements/controls/children/-", value: "favToggle" },

    // お気に入り時だけ出す注記(visible 条件も state 束縛)
    {
      op: "add",
      path: "/elements/favNote",
      value: {
        type: "Text",
        props: { text: "★ お気に入りに登録しました" },
        visible: { $state: "/favorite" },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "favNote" },

    // 天気カード。全 prop が /state を参照(値の実体はカードに無い)
    {
      op: "add",
      path: "/elements/widget",
      value: {
        type: "WeatherWidget",
        props: {
          city: { $state: "/city" },
          condition: { $state: "/weather/condition" },
          temperature: { $state: "/weather/temp" },
          high: { $state: "/weather/high" },
          low: { $state: "/weather/low" },
          humidity: { $state: "/weather/humidity" },
          windSpeed: { $state: "/weather/wind" },
          unit: { $state: "/unit" },
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

    // 週間予報も /state/forecast を束縛。unit を変えれば全行が℃/℉切替
    {
      op: "add",
      path: "/elements/forecast",
      value: {
        type: "WeeklyForecastList",
        props: { days: { $state: "/forecast" }, unit: { $state: "/unit" } },
        children: [],
      },
    },
    { op: "add", path: "/elements/main/children/-", value: "forecast" },
  ];
  return patches.map((p) => JSON.stringify(p));
}
