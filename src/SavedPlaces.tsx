import { Place } from "./places";
import { CurrentSummary } from "./weather";
import { describe } from "./weatherCodes";

interface Props {
  saved: Place[];
  currents: Record<string, CurrentSummary>;
  selectedId?: string;
  onSelect: (p: Place) => void;
  onRemove: (p: Place) => void;
}

export default function SavedPlaces({ saved, currents, selectedId, onSelect, onRemove }: Props) {
  return (
    <div className="saved">
      <h2>Your places</h2>
      {saved.length === 0 ? (
        <p className="hint">Save a place from its weather card to compare it here.</p>
      ) : (
        <ul>
          {saved.map((p) => {
            const cur = currents[p.id];
            const d = cur ? describe(cur.weather_code, cur.is_day === 1) : null;
            return (
              <li key={p.id} className={p.id === selectedId ? "selected" : ""}>
                <button className="saved-main" onClick={() => onSelect(p)}>
                  <span className="saved-name">{p.name}</span>
                  <span className="saved-temp">{cur && d ? `${d.icon} ${Math.round(cur.temperature_2m)}°` : "…"}</span>
                </button>
                <button className="saved-remove" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p)}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
