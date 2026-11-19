import { useEffect, useState } from "react";
import { Place } from "./places";
import { fetchWeather, Weather } from "./weather";
import { describe } from "./weatherCodes";

const round = (n: number) => Math.round(n);

function dayName(iso: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${iso}T12:00:00`));
}

interface Props {
  city: Place;
  saved: boolean;
  canSave: boolean;
  onToggleSave: () => void;
}

export default function WeatherPanel({ city, saved, canSave, onToggleSave }: Props) {
  const [data, setData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setLoading(true);
    setError(null);
    fetchWeather(city.latitude, city.longitude, controller.signal)
      .then((w) => {
        setData(w);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError("Couldn't load the weather.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [city, retry]);

  const title = (
    <header className="weather-head">
      <div>
        <h2>{city.name}</h2>
        {city.admin1 && <p className="muted">{city.admin1}</p>}
      </div>
      <button className="save" onClick={onToggleSave} disabled={!saved && !canSave} aria-pressed={saved}>
        {saved ? "Saved ✓" : "Save"}
      </button>
    </header>
  );

  if (loading && !data) {
    return <section className="weather" aria-busy="true">{title}<p className="muted">Loading weather…</p></section>;
  }
  if (error || !data) {
    return (
      <section className="weather">
        {title}
        <p className="muted">{error}</p>
        <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
      </section>
    );
  }

  const { current: cur, daily } = data;
  const now = describe(cur.weather_code, cur.is_day === 1);
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = Math.max(weekMax - weekMin, 1);

  return (
    <section className="weather" aria-live="polite">
      {title}
      <div className="now">
        <span className="now-icon" aria-hidden="true">{now.icon}</span>
        <div>
          <p className="temp">{round(cur.temperature_2m)}°</p>
          <p className="muted">{now.label}</p>
        </div>
      </div>
      <dl className="facts">
        <div><dt>Feels like</dt><dd>{round(cur.apparent_temperature)}°</dd></div>
        <div><dt>Humidity</dt><dd>{cur.relative_humidity_2m}%</dd></div>
        <div><dt>Wind</dt><dd>{round(cur.wind_speed_10m)} km/h</dd></div>
      </dl>

      <h3>Next 7 days</h3>
      <ul className="days">
        {daily.time.map((d, i) => {
          const lo = daily.temperature_2m_min[i];
          const hi = daily.temperature_2m_max[i];
          const left = ((lo - weekMin) / span) * 100;
          const width = Math.max(((hi - lo) / span) * 100, 4);
          const rain = daily.precipitation_probability_max[i];
          return (
            <li key={d}>
              <span className="day">{dayName(d, i)}</span>
              <span className="day-icon" title={describe(daily.weather_code[i]).label}>
                {describe(daily.weather_code[i]).icon}
              </span>
              <span className="rain">{rain != null && rain > 0 ? `${rain}%` : ""}</span>
              <span className="lo">{round(lo)}°</span>
              <span className="bar"><i style={{ left: `${left}%`, width: `${width}%` }} /></span>
              <span className="hi">{round(hi)}°</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
