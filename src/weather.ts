export interface Weather {
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Weather }>();

/** Current conditions + 7-day forecast. Coordinates are rounded to 2 decimals so nearby clicks share a cache entry. */
export async function fetchWeather(lat: number, lng: number, signal?: AbortSignal): Promise<Weather> {
  const la = lat.toFixed(2);
  const lo = lng.toFixed(2);
  const key = `${la},${lo}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const params = new URLSearchParams({
    latitude: la,
    longitude: lo,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const data = (await res.json()) as Weather;
  cache.set(key, { at: Date.now(), data });
  return data;
}

export interface CurrentSummary {
  temperature_2m: number;
  weather_code: number;
  is_day: number;
}

const batchCache = new Map<string, { at: number; data: CurrentSummary[] }>();

/** Current conditions for many places in ONE request (Open-Meteo accepts comma-separated coordinates). */
export async function fetchCurrentBatch(
  places: { latitude: number; longitude: number }[],
  signal?: AbortSignal,
): Promise<CurrentSummary[]> {
  if (places.length === 0) return [];
  const la = places.map((p) => p.latitude.toFixed(2)).join(",");
  const lo = places.map((p) => p.longitude.toFixed(2)).join(",");
  const key = `${la}|${lo}`;
  const hit = batchCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const params = new URLSearchParams({
    latitude: la,
    longitude: lo,
    current: "temperature_2m,weather_code,is_day",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const json = await res.json();
  // One location returns an object, several return an array.
  const list = (Array.isArray(json) ? json : [json]) as { current: CurrentSummary }[];
  const data = list.map((x) => x.current);
  batchCache.set(key, { at: Date.now(), data });
  return data;
}
