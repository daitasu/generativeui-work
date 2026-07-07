/**
 * カタログの React 実装。
 *
 * 束縛の解決タイミングに注目:
 *   - $state / $template などの「読み取り束縛」は Renderer が props に渡す前に解決するので、
 *     表示系コンポーネント(WeatherWidget 等)は解決済みの素の値を props で受け取るだけでよい。
 *   - $bindState の「双方向束縛」だけは、コンポーネントが bindings(prop名→statePath)を受け取り、
 *     useBoundProp で書き戻す(FavoriteToggle 参照)。
 *   - on に紐付いたアクションは emit(event) で発火する(UnitToggle 参照)。
 */
import { defineRegistry, useBoundProp } from "@json-render/react";
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

const toF = (c: number) => Math.round((c * 9) / 5 + 32);
// 摂氏で保持している値を、表示単位に応じて整形する。binding された unit がここを駆動する。
const fmt = (c: number, unit: string) => (unit === "F" ? `${toF(c)}°F` : `${Math.round(c)}°C`);
const fmtShort = (c: number, unit: string) => (unit === "F" ? `${toF(c)}°` : `${Math.round(c)}°`);

export const { registry } = defineRegistry(catalog, {
  components: {
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Text: shadcnComponents.Text,
    Separator: shadcnComponents.Separator,

    WeatherWidget: ({ props }) => {
      const unit = props.unit ?? "C";
      return (
        <div className="weather-widget">
          <div className="weather-widget-main">
            <span className="weather-widget-icon">{WEATHER_ICONS[props.condition] ?? "🌡️"}</span>
            <div>
              <div className="weather-widget-city">{props.city}</div>
              <div className="weather-widget-temp">{fmt(props.temperature, unit)}</div>
            </div>
          </div>
          <div className="weather-widget-meta">
            {props.high != null && <span>最高 {fmtShort(props.high, unit)}</span>}
            {props.low != null && <span>最低 {fmtShort(props.low, unit)}</span>}
            {props.humidity != null && <span>湿度 {props.humidity}%</span>}
            {props.windSpeed != null && <span>風速 {props.windSpeed}m/s</span>}
          </div>
        </div>
      );
    },

    WeeklyForecastList: ({ props }) => {
      const unit = props.unit ?? "C";
      return (
        <div className="forecast-list">
          {(props.days ?? []).map((d, i) => (
            <div className="forecast-row" key={i}>
              <span className="forecast-day">{d.day}</span>
              <span className="forecast-cond">{WEATHER_ICONS[d.condition] ?? "🌡️"}</span>
              <span className="forecast-temp">
                <b>{fmtShort(d.high, unit)}</b> / {fmtShort(d.low, unit)}
              </span>
            </div>
          ))}
        </div>
      );
    },

    // on に紐付いた setState アクションを emit で発火 → /unit が書き換わり、
    // /unit を束縛している全表示が再解決される。
    UnitToggle: ({ props, emit }) => {
      const unit = props.unit ?? "C";
      return (
        <div className="unit-toggle" role="group" aria-label="温度単位">
          <button className={unit === "C" ? "active" : ""} onClick={() => emit("setC")}>
            ℃
          </button>
          <button className={unit === "F" ? "active" : ""} onClick={() => emit("setF")}>
            ℉
          </button>
        </div>
      );
    },

    // $bindState の双方向束縛。useBoundProp が [値, セッター] を返し、セッターが /favorite に書き戻す。
    FavoriteToggle: ({ props, bindings }) => {
      const [fav, setFav] = useBoundProp<boolean>(props.value, bindings?.value);
      return (
        <button className={`fav-toggle${fav ? " on" : ""}`} onClick={() => setFav(!fav)}>
          {fav ? "★ お気に入り" : "☆ お気に入りに追加"}
        </button>
      );
    },
  },
});
