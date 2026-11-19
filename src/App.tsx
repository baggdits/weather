import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { COUNTRIES, Country } from "./countries";
import { City } from "./geocoding";
import { fromCity, loadSaved, MAX_SAVED, persistSaved, Place } from "./places";
import { CurrentSummary, fetchCurrentBatch } from "./weather";
import { describe } from "./weatherCodes";
import CitySearch from "./CitySearch";
import SavedPlaces from "./SavedPlaces";
import WeatherPanel from "./WeatherPanel";

const FLY_MS = 2000;
const CITY_ALTITUDE = 0.35;

interface LabelDatum {
  place: Place;
  lat: number;
  lng: number;
  cur?: CurrentSummary;
}

export default function App() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [country, setCountry] = useState<Country | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [saved, setSaved] = useState<Place[]>(loadSaved);
  const [currents, setCurrents] = useState<Record<string, CurrentSummary>>({});
  const [geo, setGeo] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Slow idle spin until the user picks a place.
  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = !country && !place;
    controls.autoRotateSpeed = 0.4;
  }, [country, place]);

  // Persist saved places.
  useEffect(() => persistSaved(saved), [saved]);

  // One batched request for the current weather of every saved place.
  useEffect(() => {
    if (saved.length === 0) {
      setCurrents({});
      return;
    }
    const controller = new AbortController();
    fetchCurrentBatch(saved, controller.signal)
      .then((list) => {
        const next: Record<string, CurrentSummary> = {};
        saved.forEach((p, i) => {
          if (list[i]) next[p.id] = list[i];
        });
        setCurrents(next);
      })
      .catch(() => {
        /* keep previous values; labels just show names */
      });
    return () => controller.abort();
  }, [saved]);

  const flyTo = (lat: number, lng: number, altitude: number) =>
    globeRef.current?.pointOfView({ lat, lng, altitude }, FLY_MS);

  const selectPlace = (p: Place) => {
    setPlace(p);
    flyTo(p.latitude, p.longitude, CITY_ALTITUDE);
  };

  const onCountryChange = (code: string) => {
    const next = COUNTRIES.find((c) => c.code === code) ?? null;
    setCountry(next);
    setPlace(null);
    if (next) flyTo(next.lat, next.lng, 0.6);
    else flyTo(20, 0, 2.5);
  };

  const onCitySelect = (c: City) => selectPlace(fromCity(c));

  const locate = () => {
    if (!navigator.geolocation) {
      setGeo({ loading: false, error: "Your browser doesn't support location." });
      return;
    }
    setGeo({ loading: true, error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ loading: false, error: null });
        setCountry(null);
        selectPlace({ id: "me", name: "My location", latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (err) =>
        setGeo({
          loading: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location access is blocked. Pick a country instead."
              : "Couldn't find your location. Try again.",
        }),
      { timeout: 10000 },
    );
  };

  const isSaved = (p: Place) => saved.some((s) => s.id === p.id);
  const toggleSave = (p: Place) =>
    setSaved((list) =>
      list.some((s) => s.id === p.id)
        ? list.filter((s) => s.id !== p.id)
        : list.length >= MAX_SAVED
          ? list
          : [...list, p],
    );

  const labels = useMemo<LabelDatum[]>(
    () => saved.map((p) => ({ place: p, lat: p.latitude, lng: p.longitude, cur: currents[p.id] })),
    [saved, currents],
  );

  const makeLabel = (d: object) => {
    const { place: p, cur } = d as LabelDatum;
    const el = document.createElement("button");
    el.className = "globe-label" + (p.id === place?.id ? " selected" : "");
    const temp = cur ? `${describe(cur.weather_code, cur.is_day === 1).icon} ${Math.round(cur.temperature_2m)}° ` : "";
    el.textContent = `${temp}${p.name}`;
    el.style.pointerEvents = "auto";
    el.onclick = () => selectPlace(p);
    return el;
  };

  return (
    <div className="stage">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#7cc4ff"
        pointsData={place ? [place] : []}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={() => "#ffc857"}
        pointAltitude={0.005}
        pointRadius={0.12}
        htmlElementsData={labels}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.01}
        htmlElement={makeLabel}
      />

      <aside className="picker" aria-label="Choose a place">
        <h1>Weather Globe</h1>
        <label>
          Country
          <select value={country?.code ?? ""} onChange={(e) => onCountryChange(e.target.value)}>
            <option value="">Pick a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {country && <CitySearch key={country.code} country={country} onSelect={onCitySelect} />}
        <button className="locate" onClick={locate} disabled={geo.loading}>
          {geo.loading ? "Finding you…" : "Where am I?"}
        </button>
        {geo.error && <p className="hint error">{geo.error}</p>}
        <p className="hint">
          {place
            ? `Showing ${place.name}${place.admin1 ? `, ${place.admin1}` : ""}.`
            : country
              ? `Search for a city in ${country.name}.`
              : "Choose a country, or use your location."}
        </p>
        <SavedPlaces
          saved={saved}
          currents={currents}
          selectedId={place?.id}
          onSelect={selectPlace}
          onRemove={(p) => toggleSave(p)}
        />
      </aside>

      {place && (
        <WeatherPanel
          city={place}
          saved={isSaved(place)}
          canSave={saved.length < MAX_SAVED}
          onToggleSave={() => toggleSave(place)}
        />
      )}
    </div>
  );
}
