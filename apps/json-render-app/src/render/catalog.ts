/**
 * json-render のカタログ定義(LLM に見せる語彙)。
 * クライアント(registry)とサーバー(catalog.prompt())の両方から import される。
 *
 * 既存の shadcn カタログ定義のサブセット + 天気用カスタム3種。
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

export const catalog = defineCatalog(schema, {
  components: {
    // --- 既存 shadcn カタログの再利用 ---
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Badge: shadcnComponentDefinitions.Badge,
    Separator: shadcnComponentDefinitions.Separator,

    // --- 天気用カスタムコンポーネント ---
    WeatherWidget: {
      props: z.object({
        city: z.string().describe("都市名(日本語)"),
        temperature: z.number().describe("現在気温(℃)"),
        condition: z.enum(CONDITIONS),
        high: z.number().optional().describe("最高気温"),
        low: z.number().optional().describe("最低気温"),
        humidity: z.number().optional().describe("湿度(%)"),
        windSpeed: z.number().optional().describe("風速(m/s)"),
      }),
      description: "現在の天気を表示する大きなカード。現在の天気を聞かれたら必ずこれを使う。",
    },
    WeatherIcon: {
      props: z.object({
        condition: z.enum(CONDITIONS),
        size: z.number().optional().describe("フォントサイズ(px)。省略時28"),
      }),
      description: "天気状態のアイコン単体。",
    },
    WeeklyForecastList: {
      props: z.object({
        days: z
          .array(
            z.object({
              day: z.string().describe("曜日1文字。例: 月"),
              condition: z.enum(CONDITIONS),
              high: z.number(),
              low: z.number(),
            }),
          )
          .describe("7日分の予報"),
      }),
      description: "週間天気予報のリスト。週間予報を聞かれたら必ずこれを使う。",
    },
  },
  actions: {},
});

export type WeatherSpec = typeof catalog._specType;
