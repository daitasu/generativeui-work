/**
 * 天気用カスタムコンポーネント + カタログ定義。
 *
 * a2ui v0.9 では「API (Zod スキーマ)」と「実装 (React FC)」を分離して定義し、
 * Catalog にまとめて MessageProcessor へ渡す。
 */
import { z } from "zod";
import { Catalog, CommonSchemas, BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9";
import {
  createComponentImplementation,
  // 標準 basic catalog のコンポーネント実装（再利用）
  Text,
  Image,
  Icon,
  Row,
  Column,
  List,
  Card,
  Divider,
  Button,
} from "@a2ui/react/v0_9";

/** 天気状態 → 絵文字。 */
export const WEATHER_ICONS: Record<string, string> = {
  sunny: "☀️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  thunder: "⛈️",
  foggy: "🌫️",
};

const ConditionSchema = CommonSchemas.DynamicString;

// --- WeatherIcon -----------------------------------------------------------

const WeatherIconApi = {
  name: "WeatherIcon",
  schema: z.object({
    condition: ConditionSchema,
    size: CommonSchemas.DynamicNumber.optional(),
  }),
};

const WeatherIcon = createComponentImplementation(WeatherIconApi, ({ props }) => (
  <span
    className="weather-icon"
    style={{ fontSize: props.size ?? 28 }}
    role="img"
    aria-label={String(props.condition)}
  >
    {WEATHER_ICONS[String(props.condition)] ?? "🌡️"}
  </span>
));

// --- WeatherWidget ---------------------------------------------------------

const WeatherWidgetApi = {
  name: "WeatherWidget",
  schema: z.object({
    city: CommonSchemas.DynamicString,
    temperature: CommonSchemas.DynamicNumber,
    condition: ConditionSchema,
    high: CommonSchemas.DynamicNumber.optional(),
    low: CommonSchemas.DynamicNumber.optional(),
    humidity: CommonSchemas.DynamicNumber.optional(),
    windSpeed: CommonSchemas.DynamicNumber.optional(),
  }),
};

const WeatherWidget = createComponentImplementation(WeatherWidgetApi, ({ props }) => (
  <div className="weather-widget">
    <div className="weather-widget-main">
      <span className="weather-widget-icon">
        {WEATHER_ICONS[String(props.condition)] ?? "🌡️"}
      </span>
      <div>
        <div className="weather-widget-city">{props.city}</div>
        <div className="weather-widget-temp">{props.temperature}°C</div>
      </div>
    </div>
    <div className="weather-widget-meta">
      {props.high != null && <span>最高 {props.high}°</span>}
      {props.low != null && <span>最低 {props.low}°</span>}
      {props.humidity != null && <span>湿度 {props.humidity}%</span>}
      {props.windSpeed != null && <span>風速 {props.windSpeed}m/s</span>}
    </div>
  </div>
));

// --- WeeklyForecastList ----------------------------------------------------

const WeeklyForecastListApi = {
  name: "WeeklyForecastList",
  schema: z.object({
    days: z.array(
      z.object({
        day: z.string(),
        condition: z.string(),
        high: z.number(),
        low: z.number(),
      }),
    ),
  }),
};

const WeeklyForecastList = createComponentImplementation(
  WeeklyForecastListApi,
  ({ props }) => (
    <div className="forecast-list">
      {(props.days ?? []).map((d, i) => (
        <div className="forecast-row" key={i}>
          <span className="forecast-day">{d.day}</span>
          <span className="forecast-cond">{WEATHER_ICONS[d.condition] ?? "🌡️"}</span>
          <span className="forecast-temp">
            <b>{d.high}°</b> / {d.low}°
          </span>
        </div>
      ))}
    </div>
  ),
);

// --- Catalog ---------------------------------------------------------------

export const WEATHER_CATALOG_ID = "https://example.com/catalogs/weather-basic/v1.json";

/** 標準 basic コンポーネントのサブセット + 天気カスタム3種。 */
export const weatherCatalog = new Catalog(
  WEATHER_CATALOG_ID,
  [Text, Image, Icon, Row, Column, List, Card, Divider, Button, WeatherIcon, WeatherWidget, WeeklyForecastList],
  BASIC_FUNCTIONS,
);
