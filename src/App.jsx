import { useState, useEffect, useRef } from "react";

const OKAPI_BASE = "https://www.opencaching.de/okapi";

const fetchOKAPI = async (path, params = {}) => {
  const url = new URL(`${OKAPI_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  let res;
  try {
    res = await fetch(url.toString());
  } catch (netErr) {
    throw new Error(
      `Cannot reach opencaching.de — likely blocked by sandbox CSP. ` +
      `Open this artifact in a new tab (↗ icon, top-right of artifact) and try again. ` +
      `Raw: ${netErr.message}`
    );
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Non-JSON from OKAPI (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const msg = json?.error?.developer_message || JSON.stringify(json?.error) || text.slice(0, 300);
    throw new Error(`OKAPI ${res.status}: ${msg}`);
  }
  return json;
};

const CACHE_NODE = "https://www.opencaching.de";

// ── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Unbounded:wght@300;600;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0c0f;
    --surface: #111417;
    --surface2: #181c20;
    --border: #242830;
    --accent: #c8f540;
    --accent2: #40f5c8;
    --muted: #4a5060;
    --text: #e8ecf0;
    --text2: #8892a0;
    --danger: #f54060;
    --radius: 4px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Space Mono', monospace; font-size: 13px; line-height: 1.6; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    border-bottom: 1px solid var(--border);
    padding: 20px 28px;
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--surface);
    position: sticky; top: 0; z-index: 300;
    height: 61px;
  }
  .header-logo {
    font-family: 'Unbounded', sans-serif;
    font-weight: 900;
    font-size: 18px;
    color: var(--accent);
    letter-spacing: -0.5px;
  }
  .header-sub { color: var(--muted); font-size: 11px; flex: 1; }
  .header-node { color: var(--accent2); font-size: 10px; background: rgba(64,245,200,0.08); padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(64,245,200,0.2); }

  .main { display: grid; grid-template-columns: 340px 1fr; flex: 1; height: calc(100vh - 61px); transition: grid-template-columns 0.25s ease; }
  .main.sidebar-closed { grid-template-columns: 0px 1fr; }

  /* Sidebar */
  .sidebar {
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    background: var(--surface); overflow: hidden;
    transition: width 0.25s ease, opacity 0.2s ease;
    width: 340px; min-width: 0;
  }
  .sidebar.closed { width: 0; opacity: 0; pointer-events: none; border-right: none; }

  .toggle-btn {
    background: transparent; border: 1px solid var(--border); color: var(--text2);
    width: 32px; height: 32px; border-radius: var(--radius); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
    flex-shrink: 0; transition: border-color 0.15s, color 0.15s;
  }
  .toggle-btn:hover { border-color: var(--accent); color: var(--accent); }

  @media (max-width: 640px) {
    .main { grid-template-columns: 1fr; }
    .main.sidebar-closed { grid-template-columns: 1fr; }
    .sidebar {
      position: fixed; top: 61px; left: 0; bottom: 0; z-index: 250;
      width: 85vw; max-width: 340px;
      transform: translateX(0);
      transition: transform 0.25s ease, opacity 0.2s ease;
      box-shadow: 4px 0 24px rgba(0,0,0,0.5);
    }
    .sidebar.closed {
      transform: translateX(-100%);
      opacity: 0;
      pointer-events: none;
    }
    .sidebar-overlay {
      display: block;
      position: fixed;
      top: 61px; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      z-index: 249;
      cursor: pointer;
    }
    .sidebar-overlay.hidden { display: none; }
  }
  @media (min-width: 641px) { .sidebar-overlay { display: none !important; } }

  .sidebar-section { padding: 16px; border-bottom: 1px solid var(--border); }
  .sidebar-label { font-size: 9px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }

  .key-input-wrap { position: relative; }
  .key-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    font-family: 'Space Mono', monospace; font-size: 11px; padding: 8px 10px;
    border-radius: var(--radius); outline: none; transition: border-color 0.2s;
  }
  .key-input:focus { border-color: var(--accent); }
  .key-input::placeholder { color: var(--muted); }

  .search-row { display: flex; gap: 8px; margin-top: 8px; }
  .btn {
    background: var(--accent); color: #0a0c0f; border: none;
    font-family: 'Unbounded', sans-serif; font-size: 9px; font-weight: 600;
    letter-spacing: 1px; padding: 7px 14px; border-radius: var(--radius);
    cursor: pointer; transition: opacity 0.15s, transform 0.1s; white-space: nowrap;
  }
  .btn:hover { opacity: 0.85; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost {
    background: transparent; color: var(--text2); border: 1px solid var(--border);
    font-family: 'Space Mono', monospace; font-size: 10px;
  }
  .btn-ghost:hover { border-color: var(--accent2); color: var(--accent2); }
  .btn-sm { padding: 4px 10px; font-size: 8px; }

  .bbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .coord-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    font-family: 'Space Mono', monospace; font-size: 11px; padding: 6px 8px;
    border-radius: var(--radius); outline: none; transition: border-color 0.2s;
  }
  .coord-input:focus { border-color: var(--accent2); }

  .cache-list { flex: 1; overflow-y: auto; }
  .cache-list::-webkit-scrollbar { width: 4px; }
  .cache-list::-webkit-scrollbar-track { background: var(--surface); }
  .cache-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .cache-item {
    padding: 12px 16px; border-bottom: 1px solid var(--border); cursor: pointer;
    transition: background 0.15s; display: flex; flex-direction: column; gap: 4px;
  }
  .cache-item:hover { background: var(--surface2); }
  .cache-item.active { background: rgba(200,245,64,0.06); border-left: 2px solid var(--accent); }

  .cache-name { font-size: 12px; color: var(--text); font-weight: 700; line-height: 1.3; }
  .cache-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .badge {
    font-size: 9px; padding: 2px 6px; border-radius: 2px; font-family: 'Unbounded', sans-serif;
    letter-spacing: 0.5px; font-weight: 600;
  }
  .badge-type { background: rgba(64,245,200,0.12); color: var(--accent2); }
  .badge-diff { background: rgba(200,245,64,0.12); color: var(--accent); }
  .badge-size { background: rgba(74,80,96,0.4); color: var(--muted); }
  .cache-code { font-size: 10px; color: var(--muted); font-style: italic; }

  /* Main panel */
  .panel { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }

  .panel-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: var(--muted); gap: 12px;
  }
  .panel-empty-icon { font-size: 48px; opacity: 0.3; }
  .panel-empty-text { font-family: 'Unbounded', sans-serif; font-size: 11px; letter-spacing: 1px; }

  .panel-header { padding: 20px 24px 0; border-bottom: 1px solid var(--border); }
  .panel-title { font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 20px; line-height: 1.2; margin-bottom: 8px; }
  .panel-tabs { display: flex; gap: 0; margin-top: 12px; }
  .tab {
    padding: 8px 18px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
    cursor: pointer; border-bottom: 2px solid transparent; color: var(--muted);
    font-family: 'Unbounded', sans-serif; font-weight: 600; transition: all 0.15s;
  }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab:hover:not(.active) { color: var(--text2); }

  .panel-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
  .panel-body::-webkit-scrollbar { width: 4px; }
  .panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Cache detail */
  .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
  .detail-card-label { font-size: 9px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px; }
  .detail-card-value { font-family: 'Unbounded', sans-serif; font-weight: 600; font-size: 14px; color: var(--accent); }

  .desc-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
  .desc-box p, .desc-box div { color: var(--text2); line-height: 1.7; font-size: 12px; }

  /* Logs */
  .log-entry { border-bottom: 1px solid var(--border); padding: 14px 0; }
  .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .log-user { font-weight: 700; color: var(--accent2); font-size: 11px; }
  .log-date { color: var(--muted); font-size: 10px; }
  .log-type-badge { font-size: 9px; padding: 2px 7px; border-radius: 2px; font-family: 'Unbounded', sans-serif; }
  .log-found { background: rgba(200,245,64,0.12); color: var(--accent); }
  .log-dnf { background: rgba(245,64,96,0.12); color: var(--danger); }
  .log-other { background: rgba(74,80,96,0.3); color: var(--muted); }
  .log-comment { color: var(--text2); font-size: 12px; line-height: 1.65; }
  .log-comment p { margin-bottom: 4px; }

  /* Fun Facts / AI panel */
  .facts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .facts-title { font-family: 'Unbounded', sans-serif; font-weight: 600; font-size: 13px; color: var(--accent); }

  .fact-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 16px; margin-bottom: 10px;
    border-left: 3px solid var(--accent);
    animation: slideIn 0.3s ease forwards;
    opacity: 0;
  }
  .fact-card:nth-child(2) { animation-delay: 0.05s; border-left-color: var(--accent2); }
  .fact-card:nth-child(3) { animation-delay: 0.1s; border-left-color: #f5c840; }
  .fact-card:nth-child(4) { animation-delay: 0.15s; }
  .fact-card:nth-child(5) { animation-delay: 0.2s; border-left-color: var(--accent2); }
  .fact-card:nth-child(6) { animation-delay: 0.25s; border-left-color: #f5c840; }
  .fact-card:nth-child(n+7) { animation-delay: 0.3s; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fact-emoji { font-size: 18px; margin-bottom: 6px; }
  .fact-text { color: var(--text); font-size: 12px; line-height: 1.65; }
  .fact-category { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }

  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat-box { background: var(--surface); border: 1px solid var(--border); padding: 12px; border-radius: var(--radius); text-align: center; }
  .stat-num { font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 22px; color: var(--accent); }
  .stat-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

  .loading { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 20px 0; }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-box { background: rgba(245,64,96,0.08); border: 1px solid rgba(245,64,96,0.25); border-radius: var(--radius); padding: 12px 16px; color: var(--danger); font-size: 11px; margin: 12px 0; }

  .hint { font-size: 10px; color: var(--muted); margin-top: 6px; line-height: 1.5; }

  .no-key-warn { background: rgba(200,245,64,0.06); border: 1px solid rgba(200,245,64,0.2); border-radius: var(--radius); padding: 10px 14px; color: var(--accent); font-size: 10px; margin-bottom: 12px; }

  .presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .preset-btn {
    font-size: 9px; padding: 4px 10px; border-radius: 20px; cursor: pointer;
    background: rgba(64,245,200,0.08); border: 1px solid rgba(64,245,200,0.2); color: var(--accent2);
    font-family: 'Space Mono', monospace; transition: all 0.15s;
  }
  .preset-btn:hover { background: rgba(64,245,200,0.15); }
`;

// ── Preset bounding boxes ────────────────────────────────────────────────────
const PRESETS = [
  { name: "Berlin 🇩🇪", bbox: "52.45,13.30,52.55,13.50" },
  { name: "Vienna 🇦🇹", bbox: "48.17,16.32,48.25,16.42" },
  { name: "Munich 🇩🇪", bbox: "48.11,11.52,48.18,11.62" },
  { name: "Cologne 🇩🇪", bbox: "50.92,6.94,50.97,7.02" },
];

// ── Strip HTML ───────────────────────────────────────────────────────────────
const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [consumerKey, setConsumerKey] = useState(() => localStorage.getItem("okapi_consumer_key") || "");
  const [bbox, setBbox] = useState("52.49,13.36,52.54,13.44");
  const [caches, setCaches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cacheDetail, setCacheDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [facts, setFacts] = useState([]);
  const [logStats, setLogStats] = useState(null);
  const [tab, setTab] = useState("logs");
  const [loading, setLoading] = useState(false);
  const [factsLoading, setFactsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState(null); // null | "ok" | "fail"
  const [geolocating, setGeolocating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keySaved, setKeySaved] = useState(false);

  // Persist consumer key to localStorage
  useEffect(() => {
    if (consumerKey) {
      localStorage.setItem("okapi_consumer_key", consumerKey);
      setKeySaved(true);
      const t = setTimeout(() => setKeySaved(false), 1800);
      return () => clearTimeout(t);
    } else {
      localStorage.removeItem("okapi_consumer_key");
    }
  }, [consumerKey]);

  // Connectivity test
  const pingOKAPI = async () => {
    setPingStatus(null);
    try {
      const r = await fetch("https://www.opencaching.de/okapi/services/apisrv/stats");
      if (r.ok) setPingStatus("ok");
      else setPingStatus("fail:" + r.status);
    } catch (e) {
      setPingStatus("fail:" + e.message.slice(0, 80));
    }
  };

  // Search caches by bbox
  const searchCaches = async () => {
    if (!consumerKey) { setError("Consumer key required. Get one free at opencaching.de/okapi/signup.html"); return; }
    if (!bbox.match(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)) {
      setError("Invalid bbox format. Use: south_lat,west_lon,north_lat,east_lon"); return;
    }
    setError(""); setSearchLoading(true); setCaches([]); setSelected(null); setCacheDetail(null); setLogs([]); setFacts([]);
    try {
      const [s, w, n, e] = bbox.split(",");
      // search/bbox returns list of cache codes
      const searchRes = await fetchOKAPI("services/caches/search/bbox", {
        consumer_key: consumerKey,
        bbox: `${s}|${w}|${n}|${e}`,
        limit: 30,
        status: "Available",
      });
      const codes = searchRes.results || [];
      if (!codes.length) { setError("No caches found in this area."); setSearchLoading(false); return; }
      // bulk fetch geocache details
      const geocachesRes = await fetchOKAPI("services/caches/geocaches", {
        consumer_key: consumerKey,
        cache_codes: codes.join("|"),
        fields: "code|name|type|difficulty|terrain|size2|location|url|status",
      });
      setCaches(Object.values(geocachesRes).filter(Boolean));
    } catch (e) {
      setError("API error: " + (e.message || "Check your consumer key and try again."));
    }
    setSearchLoading(false);
  };

  // Load cache detail + logs
  const selectCache = async (cache) => {
    setSelected(cache.code);
    setCacheDetail(null); setLogs([]); setFacts([]); setLogStats(null);
    setLoading(true); setTab("logs"); setError("");
    // Auto-close sidebar on mobile after picking a cache
    if (window.innerWidth <= 640) setSidebarOpen(false);
    try {
      // detail
      const detail = await fetchOKAPI("services/caches/geocache", {
        consumer_key: consumerKey,
        cache_code: cache.code,
        fields: "code|name|type|difficulty|terrain|size2|location|description|short_description|url|date_hidden|founds|notfounds|recommendations",
      });
      setCacheDetail(detail);

      // logs
      const logsRes = await fetchOKAPI("services/logs/logs", {
        consumer_key: consumerKey,
        cache_code: cache.code,
        limit: 50,
        fields: "uuid|date|user|type|comment",
      });
      const logList = Array.isArray(logsRes) ? logsRes : (logsRes.logs || []);
      setLogs(logList);

      // stats
      const found = logList.filter(l => l.type === "Found it").length;
      const dnf = logList.filter(l => l.type === "Didn't find it").length;
      const avgLen = logList.length
        ? Math.round(logList.reduce((a, l) => a + stripHtml(l.comment || "").length, 0) / logList.length)
        : 0;
      const longest = logList.reduce((a, l) => {
        const len = stripHtml(l.comment || "").length;
        return len > a ? len : a;
      }, 0);
      setLogStats({ total: logList.length, found, dnf, avgLen, longest });
    } catch (e) {
      setError("Failed to load cache: " + e.message);
    }
    setLoading(false);
  };

  // AI fun facts
  const generateFacts = async () => {
    if (!logs.length) return;
    setFactsLoading(true); setFacts([]); setTab("facts");
    const logSample = logs.slice(0, 30).map(l =>
      `[${l.type}] ${l.user?.username || "?"} (${l.date?.slice(0,10)}): ${stripHtml(l.comment || "").slice(0, 300)}`
    ).join("\n\n");

    const cacheInfo = cacheDetail
      ? `Cache: "${cacheDetail.name}" | Type: ${cacheDetail.type} | Difficulty: ${cacheDetail.difficulty} | Terrain: ${cacheDetail.terrain} | Founds: ${cacheDetail.founds} | DNFs: ${cacheDetail.notfounds}`
      : "";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You analyze geocache log entries and extract funny, interesting, surprising, or notable facts. 
Return ONLY a valid JSON array of 6-8 objects. No preamble, no markdown fences, just the raw JSON array.
Each object has: { "emoji": string, "text": string, "category": string }
Categories can be: FUNNY | UNUSUAL | ADVENTURE | MYSTERY | EMOTIONAL | STATS | QUIRKY | DISCOVERY`,
          messages: [{
            role: "user",
            content: `${cacheInfo}\n\nLast 30 log entries:\n\n${logSample}\n\nExtract 6-8 fun facts, interesting observations, funny moments, or unusual patterns from these logs. Be specific, reference actual log content where possible.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      setFacts(JSON.parse(clean));
    } catch (e) {
      setError("AI analysis failed: " + e.message);
    }
    setFactsLoading(false);
  };

  const geolocate = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setGeolocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        // ~1km padding in degrees (rough but good enough for a bbox)
        const pad = 0.04; // ~4km radius, matches Berlin preset scale
        setBbox(`${(lat - pad).toFixed(2)},${(lon - pad).toFixed(2)},${(lat + pad).toFixed(2)},${(lon + pad).toFixed(2)}`);
        setGeolocating(false);
      },
      (err) => { setError("Geolocation failed: " + err.message); setGeolocating(false); },
      { timeout: 8000 }
    );
  };

  const applyPreset = (p) => {
    const [s, w, n, e] = p.bbox.split(",");
    setBbox(`${s},${w},${n},${e}`);
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <div className="header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div className="header-logo">GEOCACHE_EXPLORER</div>
          <div className="header-sub">OKAPI · opencaching.de · Fun Facts Engine</div>
          <div className="header-node">DE NODE</div>
        </div>

        <div className={`main${sidebarOpen ? "" : " sidebar-closed"}`}>
          {/* Sidebar */}
          <div className={`sidebar-overlay${sidebarOpen ? "" : " hidden"}`} onClick={() => setSidebarOpen(false)} />
          <div className={`sidebar${sidebarOpen ? "" : " closed"}`}>
            {/* API Key */}
            <div className="sidebar-section">
              <div className="sidebar-label">OKAPI Consumer Key</div>
              <div className="key-input-wrap" style={{display:"flex",gap:"6px",alignItems:"center"}}>
                <input
                  className="key-input"
                  type="password"
                  placeholder="Paste your consumer key…"
                  value={consumerKey}
                  onChange={e => setConsumerKey(e.target.value)}
                  style={{flex:1}}
                />
                {consumerKey && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setConsumerKey(""); setPingStatus(null); }}
                    title="Clear saved key"
                    style={{padding:"6px 8px",flexShrink:0}}
                  >✕</button>
                )}
              </div>
              {keySaved && <div style={{color:"var(--accent)",fontSize:"10px",marginTop:"4px"}}>✅ Key saved to browser</div>}
              {!keySaved && consumerKey && <div style={{color:"var(--muted)",fontSize:"10px",marginTop:"4px"}}>🔑 Key loaded from browser storage</div>}
              <button className="btn btn-ghost btn-sm" style={{marginTop:"8px"}} onClick={pingOKAPI}>
                Test connection
              </button>
              {pingStatus === "ok" && <div style={{color:"var(--accent)",fontSize:"10px",marginTop:"4px"}}>✅ Connected to opencaching.de</div>}
              {pingStatus && pingStatus !== "ok" && <div style={{color:"var(--danger)",fontSize:"10px",marginTop:"4px",wordBreak:"break-all"}}>⚠️ {pingStatus}</div>}
              <div className="hint">
                Free key at <span style={{color:"var(--accent2)"}}>opencaching.de/okapi/signup.html</span>
              </div>
            </div>

            {/* Bbox search */}
            <div className="sidebar-section">
              <div className="sidebar-label">Search Area (Bounding Box)</div>
              <div className="bbox-grid">
                {["S lat","W lon","N lat","E lon"].map((lbl, i) => (
                  <div key={i}>
                    <div style={{fontSize:"9px",color:"var(--muted)",marginBottom:"3px"}}>{lbl}</div>
                    <input
                      className="coord-input"
                      type="text"
                      value={bbox.split(",")[i] || ""}
                      onChange={e => {
                        const parts = bbox.split(",");
                        parts[i] = e.target.value;
                        setBbox(parts.join(","));
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="presets">
                {PRESETS.map(p => (
                  <button key={p.name} className="preset-btn" onClick={() => applyPreset(p)}>{p.name}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                <button className="btn btn-ghost btn-sm" onClick={geolocate} disabled={geolocating} style={{flex:1}}>
                  {geolocating ? "Locating…" : "📍 Use my location"}
                </button>
              </div>
              <div className="search-row">
                <button className="btn" style={{flex:1}} onClick={searchCaches} disabled={searchLoading}>
                  {searchLoading ? "SEARCHING…" : "SEARCH CACHES"}
                </button>
              </div>
              {error && <div className="error-box">{error}</div>}
            </div>

            {/* Cache list */}
            <div className="cache-list">
              {searchLoading && (
                <div className="loading" style={{padding:"16px"}}>
                  <div className="spinner" />
                  Fetching caches…
                </div>
              )}
              {!searchLoading && caches.length === 0 && (
                <div style={{padding:"16px",color:"var(--muted)",fontSize:"10px",textAlign:"center",marginTop:"8px"}}>
                  No caches loaded yet.<br/>Enter your key and search.
                </div>
              )}
              {caches.map(c => (
                <div
                  key={c.code}
                  className={`cache-item${selected === c.code ? " active" : ""}`}
                  onClick={() => selectCache(c)}
                >
                  <div className="cache-name">{c.name}</div>
                  <div className="cache-meta">
                    <span className="badge badge-type">{(c.type||"").replace("Traditional Cache","TRAD").replace("Multi-Cache","MULTI").replace("Unknown Cache","MYSTERY")}</span>
                    <span className="badge badge-diff">D{c.difficulty}/T{c.terrain}</span>
                    <span className="badge badge-size">{c.size2 || "?"}</span>
                  </div>
                  <div className="cache-code">{c.code}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main panel */}
          <div className="panel">
            {!selected && (
              <div className="panel-empty">
                <div className="panel-empty-icon">🗺</div>
                <div className="panel-empty-text">SELECT A CACHE TO EXPLORE</div>
                <div style={{color:"var(--muted)",fontSize:"10px",maxWidth:"260px",textAlign:"center"}}>
                  Search for caches in a region, then click one to load logs and generate AI-powered fun facts.
                </div>
              </div>
            )}

            {selected && (
              <>
                <div className="panel-header">
                  <div className="panel-title">
                    {cacheDetail?.name || caches.find(c=>c.code===selected)?.name || selected}
                  </div>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",paddingBottom:"4px"}}>
                    {cacheDetail && <>
                      <span className="badge badge-type">{cacheDetail.type}</span>
                      <span className="badge badge-diff">D{cacheDetail.difficulty} / T{cacheDetail.terrain}</span>
                      <span className="badge badge-size">{cacheDetail.size2}</span>
                      <a href={cacheDetail.url} target="_blank" rel="noopener noreferrer"
                        style={{color:"var(--accent2)",fontSize:"10px",textDecoration:"none",marginLeft:"auto"}}>
                        View on OC →
                      </a>
                    </>}
                  </div>
                  <div className="panel-tabs">
                    <div className={`tab${tab==="logs"?" active":""}`} onClick={()=>setTab("logs")}>LOGS</div>
                    <div className={`tab${tab==="detail"?" active":""}`} onClick={()=>setTab("detail")}>DETAILS</div>
                    <div className={`tab${tab==="facts"?" active":""}`} onClick={()=>setTab("facts")}>🤖 FUN FACTS</div>
                  </div>
                </div>

                <div className="panel-body">
                  {loading && <div className="loading"><div className="spinner" />Loading cache data…</div>}

                  {/* LOGS tab */}
                  {!loading && tab==="logs" && (
                    <>
                      {logStats && (
                        <div className="stats-row">
                          <div className="stat-box"><div className="stat-num">{logStats.total}</div><div className="stat-label">Logs Loaded</div></div>
                          <div className="stat-box"><div className="stat-num">{logStats.found}</div><div className="stat-label">Found It</div></div>
                          <div className="stat-box"><div className="stat-num">{logStats.dnf}</div><div className="stat-label">DNF</div></div>
                          <div className="stat-box"><div className="stat-num">{logStats.avgLen}</div><div className="stat-label">Avg Log Chars</div></div>
                        </div>
                      )}
                      {logStats && (
                        <div style={{marginBottom:"16px"}}>
                          <button className="btn" onClick={generateFacts} disabled={factsLoading}>
                            {factsLoading ? "🤖 ANALYSING…" : "🤖 GENERATE FUN FACTS"}
                          </button>
                        </div>
                      )}
                      {logs.map(log => (
                        <div key={log.uuid} className="log-entry">
                          <div className="log-header">
                            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                              <span className="log-user">{log.user?.username || "Unknown"}</span>
                              <span className={`log-type-badge ${log.type==="Found it"?"log-found":log.type==="Didn't find it"?"log-dnf":"log-other"}`}>
                                {log.type}
                              </span>
                            </div>
                            <span className="log-date">{log.date?.slice(0,10)}</span>
                          </div>
                          <div className="log-comment"
                            dangerouslySetInnerHTML={{__html: log.comment || "<em style='color:var(--muted)'>No comment.</em>"}}
                          />
                        </div>
                      ))}
                      {!logs.length && !loading && <div style={{color:"var(--muted)",padding:"20px 0"}}>No logs found.</div>}
                    </>
                  )}

                  {/* DETAIL tab */}
                  {!loading && tab==="detail" && cacheDetail && (
                    <>
                      <div className="detail-grid">
                        <div className="detail-card">
                          <div className="detail-card-label">Total Founds</div>
                          <div className="detail-card-value">{cacheDetail.founds ?? "—"}</div>
                        </div>
                        <div className="detail-card">
                          <div className="detail-card-label">DNFs</div>
                          <div className="detail-card-value" style={{color:"var(--danger)"}}>{cacheDetail.notfounds ?? "—"}</div>
                        </div>
                        <div className="detail-card">
                          <div className="detail-card-label">Recommendations</div>
                          <div className="detail-card-value" style={{color:"var(--accent2)"}}>{cacheDetail.recommendations ?? "—"}</div>
                        </div>
                        <div className="detail-card">
                          <div className="detail-card-label">Hidden</div>
                          <div className="detail-card-value" style={{fontSize:"11px"}}>{cacheDetail.date_hidden?.slice(0,10) ?? "—"}</div>
                        </div>
                        <div className="detail-card">
                          <div className="detail-card-label">Difficulty</div>
                          <div className="detail-card-value">{cacheDetail.difficulty} / 5</div>
                        </div>
                        <div className="detail-card">
                          <div className="detail-card-label">Terrain</div>
                          <div className="detail-card-value">{cacheDetail.terrain} / 5</div>
                        </div>
                      </div>
                      {(cacheDetail.short_description || cacheDetail.description) && (
                        <div className="desc-box">
                          <div className="sidebar-label" style={{marginBottom:"8px"}}>Cache Description</div>
                          <div dangerouslySetInnerHTML={{__html: cacheDetail.short_description || cacheDetail.description || ""}} />
                        </div>
                      )}
                    </>
                  )}

                  {/* FUN FACTS tab */}
                  {tab==="facts" && (
                    <>
                      <div className="facts-header">
                        <div className="facts-title">🤖 AI-Powered Fun Facts</div>
                        <button className="btn btn-ghost btn-sm" onClick={generateFacts} disabled={factsLoading}>
                          {factsLoading ? "Analysing…" : "Regenerate"}
                        </button>
                      </div>
                      {factsLoading && (
                        <div className="loading"><div className="spinner" />Claude is reading the logs…</div>
                      )}
                      {!factsLoading && facts.length === 0 && (
                        <div style={{color:"var(--muted)",fontSize:"11px"}}>
                          Click <strong style={{color:"var(--accent)"}}>🤖 GENERATE FUN FACTS</strong> on the Logs tab to analyse this cache with Claude AI.
                        </div>
                      )}
                      {facts.map((f, i) => (
                        <div key={i} className="fact-card">
                          <div className="fact-emoji">{f.emoji}</div>
                          <div className="fact-text">{f.text}</div>
                          <div className="fact-category">{f.category}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
