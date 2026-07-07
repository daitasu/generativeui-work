/**
 * json-render の「state 束縛 (data binding)」パターンを示すカタログ。
 *
 * json-render-app との違い:
 *   - json-render-app  : 天気の値を各コンポーネントの props に「直書き」する最小構成。
 *   - json-render-state: 値は spec の /state に集約し、props は {$state:"..."} で参照(束縛)する。
 *     さらに UnitToggle(setState アクション)/ FavoriteToggle($bindState 双方向) で
 *     state を書き換えると、束縛された表示が reactive に更新される。
 */
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const CONDITIONS = [
  "sunny",
  "partly-cloudy",
  "cloudy",
  "rainy",
  "snowy",
  "thunder",
  "foggy",
] as const;

export const UNITS = ["C", "F"] as const;

export const catalog = defineCatalog(schema, {
  components: {
    // --- shadcn の汎用部品を再利用(text/level は $template も受け付ける) ---
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Separator: shadcnComponentDefinitions.Separator,

    // --- 天気カード。データは持たず、各 prop は /state を $state で束縛する ---
    WeatherWidget: {
      props: z.object({
        city: z.string().describe('都市名。通常 {"$state":"/city"} を束縛'),
        condition: z.enum(CONDITIONS).describe('通常 {"$state":"/weather/condition"} を束縛'),
        temperature: z
          .number()
          .describe('現在気温。必ず摂氏(℃)の数値。通常 {"$state":"/weather/temp"} を束縛'),
        high: z.number().optional().describe('最高気温(℃)。{"$state":"/weather/high"}'),
        low: z.number().optional().describe('最低気温(℃)。{"$state":"/weather/low"}'),
        humidity: z.number().optional().describe('湿度(%)。{"$state":"/weather/humidity"}'),
        windSpeed: z.number().optional().describe('風速(m/s)。{"$state":"/weather/wind"}'),
        unit: z
          .enum(UNITS)
          .describe('表示単位。必ず {"$state":"/unit"} を束縛する(コンポーネントが℃/℉変換する)'),
      }),
      description:
        "現在の天気を表示する大きなカード。値はここに直書きせず、すべて /state を $state で参照する。",
    },

    WeeklyForecastList: {
      props: z.object({
        days: z
          .array(
            z.object({
              day: z.string().describe("曜日1文字。例: 月"),
              condition: z.enum(CONDITIONS),
              high: z.number().describe("最高気温(℃)"),
              low: z.number().describe("最低気温(℃)"),
            }),
          )
          .describe('7日分の予報(摂氏)。通常 {"$state":"/forecast"} を束縛'),
        unit: z.enum(UNITS).describe('表示単位。{"$state":"/unit"} を束縛'),
      }),
      description: "週間予報リスト。days は /state/forecast を束縛し、unit で℃/℉表示を切り替える。",
    },

    // --- ℃/℉ 切替。on に setState アクションを付けて /unit を書き換える ---
    UnitToggle: {
      props: z.object({
        unit: z.enum(UNITS).describe('現在の単位。必ず {"$state":"/unit"} を束縛(表示のハイライト用)'),
      }),
      description:
        '摂氏/華氏の切替ボタン。必ず element の on に {"setC":{"action":"setState","params":{"statePath":"/unit","value":"C"}},"setF":{"action":"setState","params":{"statePath":"/unit","value":"F"}}} を付ける。',
    },

    // --- お気に入りトグル。value を $bindState で /favorite に双方向束縛 ---
    FavoriteToggle: {
      props: z.object({
        value: z
          .boolean()
          .describe('お気に入り状態。必ず {"$bindState":"/favorite"} で双方向束縛する'),
      }),
      description:
        "お気に入りトグル。押すと /favorite が反転する。$bindState による双方向バインドの例。",
    },
  },
  actions: {},
});

export type WeatherSpec = typeof catalog._specType;
