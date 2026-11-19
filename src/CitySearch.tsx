import { useEffect, useState } from "react";
import { City, searchCities } from "./geocoding";
import { Country } from "./countries";

interface Props {
  country: Country;
  onSelect: (city: City) => void;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export default function CitySearch({ country, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await searchCities(q, country.code, controller.signal);
        setResults(found);
        setActive(0);
        setSearched(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Couldn't load cities. Try again.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, country.code]);

  const choose = (city: City) => {
    setQuery(city.name);
    setOpen(false);
    onSelect(city);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= MIN_CHARS;

  return (
    <div className="city">
      <label>
        City
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="city-list"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={`Search a city in ${country.name}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </label>

      {showList && (
        <ul id="city-list" role="listbox" className="city-list">
          {loading && <li className="city-note">Searching…</li>}
          {error && <li className="city-note">{error}</li>}
          {!loading && !error && searched && results.length === 0 && (
            <li className="city-note">No cities found for “{query.trim()}”.</li>
          )}
          {!error &&
            results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{c.name}</span>
                {c.admin1 && <small>{c.admin1}</small>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
