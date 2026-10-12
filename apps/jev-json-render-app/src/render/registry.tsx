/**
 * カタログの各コンポーネントに対する React 実装 (registry)。
 * shadcn 実装は @json-render/shadcn のものをそのまま再利用し、
 * 天気3種だけ自前実装する。
 */
import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";

const WEATHER_ICONS: Record<string, string> = {
  sunny: "☀️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  thunder: "⛈️",
  foggy: "🌫️",
};

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Text: shadcnComponents.Text,
    Badge: shadcnComponents.Badge,
    Separator: shadcnComponents.Separator,

    WeatherIcon: ({ props }) => (
      <span
        className="weather-icon"
        style={{ fontSize: props.size ?? 28 }}
        role="img"
        aria-label={props.condition}
      >
        {WEATHER_ICONS[props.condition] ?? "🌡️"}
      </span>
    ),

    WeatherWidget: ({ props }) => (
      <div className="weather-widget">
        <div className="weather-widget-main">
          <span className="weather-widget-icon">{WEATHER_ICONS[props.condition] ?? "🌡️"}</span>
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
    ),

    WeeklyForecastList: ({ props }) => (
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
  },
});
