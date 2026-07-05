import { useEffect, useState } from "react";

export interface LibraryEntry {
  id: string;
  name: string;
  url: string;
}

// Exposed by preload.js when running inside the packaged/dev Electron app.
// Absent when running in a plain browser (e.g. `vite dev` without Electron),
// in which case everything below falls back to localStorage.
declare global {
  interface Window {
    electronAPI?: {
      libraryLoad:   (section: string) => Promise<LibraryEntry[]>;
      libraryAdd:    (section: string, name: string, dataUrl: string) => Promise<LibraryEntry | null>;
      libraryRemove: (section: string, id: string) => Promise<void>;
    };
  }
}

/** Custom (user-baked) library entries — e.g. "body-xbox-one", "kb-body",
 *  "kb-keys", "mouse". In Electron these are real files under the app's
 *  userData folder (bounded only by actual disk space — this is the
 *  intended path once packaged as a desktop app). Outside Electron (plain
 *  browser dev) they fall back to localStorage, which is still capped at
 *  a few MB — fine for testing, not for real use. */

function storageKey(section: string): string {
  return `css-custom-library-${section}`;
}
function loadFromLocalStorage(section: string): LibraryEntry[] {
  try { return JSON.parse(localStorage.getItem(storageKey(section)) ?? "[]"); } catch { return []; }
}
function saveToLocalStorage(section: string, entries: LibraryEntry[]): boolean {
  try { localStorage.setItem(storageKey(section), JSON.stringify(entries)); return true; } catch { return false; }
}

export async function loadCustomLibrary(section: string): Promise<LibraryEntry[]> {
  if (window.electronAPI) return window.electronAPI.libraryLoad(section);
  return loadFromLocalStorage(section);
}

/** Returns the new entry on success, or null if the write failed (disk full,
 *  or — outside Electron — the localStorage quota exceeded). Callers MUST
 *  check this rather than assuming success. */
export async function addToCustomLibrary(section: string, name: string, url: string): Promise<LibraryEntry | null> {
  if (window.electronAPI) return window.electronAPI.libraryAdd(section, name, url);
  const entry: LibraryEntry = { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, url };
  const entries = loadFromLocalStorage(section);
  entries.push(entry);
  return saveToLocalStorage(section, entries) ? entry : null;
}

export async function removeFromCustomLibrary(section: string, id: string): Promise<void> {
  if (window.electronAPI) { await window.electronAPI.libraryRemove(section, id); return; }
  saveToLocalStorage(section, loadFromLocalStorage(section).filter(e => e.id !== id));
}

/** Same-style picker as the thumbstick/bezel libraries, but with a single
 *  flat list and no tabs — for sections that only ever need one library
 *  (controller body per controller type, keyboard body, keyboard keys,
 *  mouse skin). Loads and refreshes its own custom entries internally —
 *  callers just hand it the section key and the built-in static entries. */
export function LibraryPicker({
  title, section, staticEntries, current, onSelect, onClose,
}: {
  title: string;
  section: string;
  staticEntries: LibraryEntry[];
  current: string | null;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [customEntries, setCustomEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCustomLibrary(section).then(loaded => {
      if (!cancelled) { setCustomEntries(loaded); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [section, refreshTick]);

  async function handleRemove(id: string) {
    await removeFromCustomLibrary(section, id);
    setRefreshTick(t => t + 1);
  }

  const entries = [...staticEntries, ...customEntries];

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"rgba(10,10,14,0.96)", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:18, padding:"22px 24px",
        boxShadow:"0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)",
        width:640, maxWidth:"92vw", display:"flex", flexDirection:"column", gap:16,
      }}>
        {/* Header — title + count, close button */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.08em", color:"#fff", textTransform:"uppercase" }}>
              {title}
            </span>
            <span style={{
              fontSize:10, fontWeight:700, color:"#aaa",
              background:"rgba(255,255,255,0.08)", borderRadius:999, padding:"1px 6px", lineHeight:1.4,
            }}>{entries.length}</span>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ padding:"32px 8px", textAlign:"center", color:"#666", fontSize:12 }}>
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding:"32px 8px", textAlign:"center", color:"#666", fontSize:12 }}>
            No entries in this library yet.
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, maxHeight:520, overflowY:"auto", paddingRight:4 }}>
            {entries.map(entry => (
              <div key={entry.id} style={{ position:"relative" }}>
                <button onClick={() => { onSelect(entry.url); onClose(); }}
                  style={{
                    width:"100%",
                    background: current === entry.url ? "rgba(228,7,7,0.18)" : "rgba(255,255,255,0.05)",
                    border:`2px solid ${current === entry.url ? "#e40707" : "rgba(255,255,255,0.10)"}`,
                    borderRadius:10, padding:"10px 6px", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                    transition:"border-color 0.15s, background 0.15s",
                  }}>
                  <img src={entry.url} alt={entry.name}
                    style={{ width:84, height:84, objectFit:"contain" }} />
                  <span style={{ fontSize:10, color:"#aaa", textAlign:"center", lineHeight:1.3 }}>{entry.name}</span>
                </button>
                {entry.id.startsWith("custom-") && (
                  <button onClick={(e) => { e.stopPropagation(); handleRemove(entry.id); }}
                    title="Remove from library"
                    style={{
                      position:"absolute", top:4, right:4, width:18, height:18, lineHeight:"16px",
                      borderRadius:"50%", background:"rgba(0,0,0,0.75)", border:"1px solid rgba(255,255,255,0.25)",
                      color:"#ccc", fontSize:11, cursor:"pointer", padding:0,
                    }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
