export interface City {
  id: number;
  name: string;
  admin1?: string; // region / state
  latitude: number;
  longitude: number;
  country_code: string;
  population?: number;
}

const cache = new Map<string, City[]>();

/** Search cities by name inside one country. Results are cached per (country, query). */
export async function searchCities(query: string, countryCode: string, signal?: AbortSignal): Promise<City[]> {
  const key = `${countryCode}:${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const params = new URLSearchParams({
    name: query,
    count: "8",
    language: "en",
    format: "json",
    countryCode,
  });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = (await res.json()) as { results?: City[] };
  const results = data.results ?? [];
  cache.set(key, results);
  return results;
}
