import { City } from "./geocoding";

export interface Place {
  id: string; // "c<geonameId>" for searched cities, "me" for the user's location
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export const MAX_SAVED = 20;
const KEY = "weather-globe:saved";

export const fromCity = (c: City): Place => ({
  id: `c${c.id}`,
  name: c.name,
  admin1: c.admin1,
  latitude: c.latitude,
  longitude: c.longitude,
});

const isPlace = (p: unknown): p is Place => {
  const x = p as Place;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && typeof x.latitude === "number" && typeof x.longitude === "number";
};

export function loadSaved(): Place[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isPlace).slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

export function persistSaved(places: Place[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    /* storage unavailable: saved places just won't persist */
  }
}
