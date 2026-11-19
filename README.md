# Weather Globe

Explore the weather around the world on an interactive 3D globe. Pick a country, search for a city (or use your location), and the globe flies there and shows the current conditions and a 7-day forecast. Save the places you discover and compare them at a glance, both in a list and as temperature labels on the globe.

Weather data comes from the [Open-Meteo](https://open-meteo.com/) Forecast and Geocoding APIs (free tier, no API key).

## 1. Installation and setup

**Prerequisites**
- Node.js 18 or newer
- npm (bundled with Node)
- An internet connection (globe textures and the font load from CDNs, weather comes from Open-Meteo)

**Steps**
```bash
npm install
npm run dev
```
Then open the URL printed in the terminal (usually http://localhost:5173).

**Other scripts**
- `npm run build` type-checks and creates a production build in `dist/`
- `npm run preview` serves the production build locally

**Environment variables:** none. Open-Meteo's free tier needs no key.

**Note on location:** the browser only allows Geolocation on `localhost` or HTTPS, so "Where am I?" works with `npm run dev` and on any HTTPS deployment.

## 2. Implementation choices

| Choice | Why |
| --- | --- |
| **Vite + React 18 + TypeScript** | Fast setup, typed API responses, simple component model. |
| **react-globe.gl** (Three.js) | A ready-made 3D globe with drag/zoom, an animated `pointOfView` call for the "fly to" movement, and HTML overlays for the labels. |
| **Native `fetch` + small modules** | The app makes only a few kinds of requests, so a data-fetching library wasn't needed. Caching is a small in-memory map per module. |
| **`localStorage`** | Persists saved places across reloads without a backend. |
| **Plain CSS** | A single stylesheet with CSS variables; no UI library. |

**How the app works**
1. **Country** is a dropdown fed by a static list in `src/countries.ts`. Open-Meteo has no "list countries" endpoint, so this costs no requests.
2. **City** is a searchable combobox (`src/CitySearch.tsx`) that queries the Geocoding API filtered by the selected country's `countryCode`. It supports the keyboard and has loading, empty and error states.
3. **My location** uses the browser Geolocation API and falls back to a message asking the user to pick a country if permission is denied.
4. **Weather** (`src/WeatherPanel.tsx`) shows current conditions (temperature, feels-like, humidity, wind) and a 7-day forecast with a min/max range bar per day.
5. **Your places** (`src/SavedPlaces.tsx`): places saved from the weather card are listed with their current temperature and shown as labels on the globe. Clicking either one flies to that place.

**Being mindful of API limits**
- City search starts at 2 characters and is debounced by 300 ms; an in-flight request is cancelled when the user keeps typing.
- Geocoding results are cached per country and query.
- One forecast request per selected place, cached for 10 minutes. Coordinates are rounded to 2 decimals so nearby lookups share a cache entry.
- The current weather of **all saved places is fetched in a single batched request** (Open-Meteo accepts comma-separated coordinates), and cached for 10 minutes.
- Choosing a country makes no request. Saved places are capped at 20.

**Third-party resources:** globe textures and the sky background load from `unpkg.com/three-globe`; the Bricolage Grotesque font loads from Google Fonts.

## 3. Incomplete requirements

All the core flows from the brief are implemented. These are the gaps I'm aware of:

- The country list is a curated set of about 50 countries, not every country.
- No hourly forecast, only current conditions and daily values.
- The location result is named "My location" because Open-Meteo has no reverse geocoding, so the city name isn't shown.
- Places can only be chosen through the dropdowns, location button, saved list or labels, not by clicking any point on the globe.
- Labels on the globe can overlap when saved places are close together.
- No automated tests, and I haven't checked every browser/device combination.

## 4. Next steps

- Click anywhere on the globe to see the weather there (needs a reverse-geocoding source for place names).
- Full country list, ideally generated from a data source instead of a hand-written file.
- Hourly forecast and a units toggle (°C/°F, km/h/mph).
- Smarter label placement or clustering, and a way to compare saved places side by side (e.g. a sortable table).
- Unit and component tests; keyboard and screen-reader testing of the globe controls.
- Self-host the textures and font to remove CDN dependencies, and share saved places via a URL.

## 5. Additional notes

- The globe is a canvas, so the country, city and location controls are regular HTML elements to keep the main flow keyboard accessible. The globe itself isn't keyboard-navigable, but saved places can be selected from the list.
- The layout is responsive: the weather panel sits on the right on desktop and at the bottom on small screens.
- I used an AI assistant (Claude) while building this project, and I reviewed the code and can walk through it.
