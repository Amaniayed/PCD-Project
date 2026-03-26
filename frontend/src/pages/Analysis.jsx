import { useState, useEffect } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const authHeaders = () => ({
  Authorization: `Bearer ${authService.getToken()}`,
});

const TYPE_COLOR = {
  "Temporal Shift": { bg: "rgba(55,138,221,0.15)", text: "#60a5fa", dot: "#378add" },
  "Duration":       { bg: "rgba(239,159,39,0.15)", text: "#fbbf24", dot: "#ef9f27" },
  "Order":          { bg: "rgba(212,83,126,0.15)", text: "#f472b6", dot: "#d4537e" },
  "Unknown":        { bg: "rgba(136,135,128,0.15)", text: "#9ca3af", dot: "#888780" },
};

export default function Analysis() {
  const [datasets,    setDatasets]    = useState([]);
  const [homes,       setHomes]       = useState([]);
  const [selectedId,  setSelectedId]  = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("All");

  // ── Fetch homes + datasets on mount ──────────────────────
  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${API}/homes`,    { headers }).then((r) => r.json()),
      fetch(`${API}/datasets`, { headers }).then((r) => r.json()),
    ])
      .then(([h, d]) => {
        setHomes(Array.isArray(h) ? h : []);
        setDatasets(Array.isArray(d) ? d : []);
      })
      .catch(() => setError("Failed to load datasets. Make sure you are logged in."))
      .finally(() => setFetching(false));
  }, []);

  const homeName = (homeId) =>
    homes.find((h) => h.id === homeId)?.name || `Home #${homeId}`;

  const selectedDataset = datasets.find((d) => d.id === Number(selectedId));

  // ── Run analysis ─────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedId) return setError("Please select a dataset.");
    setError(""); setResult(null); setLoading(true);
    try {
      const res  = await fetch(`${API}/analyze/${selectedId}`, {
        method: "POST", headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed.");
      setResult(data);
      setSearch(""); setTypeFilter("All");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pct = result
    ? Math.round((result.total_anomalies / result.total_days) * 100)
    : 0;

  const filteredAnomalies = (result?.anomalies || []).filter((a) => {
    const matchType   = typeFilter === "All" || a.anomaly_type === typeFilter;
    const matchSearch =
      a.date.includes(search) ||
      a.anomaly_type.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // ── Styles (shared) ───────────────────────────────────────
  const card = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  };

  const label = {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 7,
  };

  const selectStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 13px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  };

  // ── Loading state ─────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, paddingTop: 40 }}>
        Loading datasets…
      </div>
    );
  }

  return (
    <div style={{ color: "var(--color-text-primary, #fff)", fontFamily: "'DM Sans', sans-serif", maxWidth: 960 }}>

      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>
        Anomaly Detection
      </h1>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "0 0 28px" }}>
        Run the Classic Autoencoder model on any uploaded dataset
      </p>

      {/* Dataset selector card */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 18px", color: "rgba(255,255,255,0.85)" }}>
          Select Dataset
        </h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span style={label}>Dataset *</span>
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setResult(null); setError(""); }}
              style={selectStyle}
            >
              <option value="">— Choose a dataset —</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} · {d.file_name} — {homeName(d.home_id)} ({d.duration || "?"} days)
                </option>
              ))}
            </select>
          </div>

          {selectedDataset && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", paddingBottom: 10 }}>
              Uploaded {new Date(selectedDataset.upload_date).toLocaleDateString()}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedId}
            style={{
              background: loading || !selectedId ? "rgba(99,102,241,0.4)" : "#6366f1",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "11px 28px", fontSize: 14, fontWeight: 600,
              cursor: loading || !selectedId ? "not-allowed" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Analyzing…" : "⚡ Run Analysis"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading hint */}
        {loading && (
          <div style={{ marginTop: 14, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            Running model — this may take a few seconds…
          </div>
        )}

        {/* Empty datasets warning */}
        {!fetching && datasets.length === 0 && (
          <div style={{ marginTop: 14, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            No datasets found. Go to the <strong style={{ color: "#818cf8" }}>Data</strong> page and upload a CSV first.
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Days",       value: result.total_days,               color: "#818cf8" },
              { label: "Anomalies Found",  value: result.total_anomalies,          color: "#f87171" },
              { label: "Anomaly Rate",     value: `${pct}%`,                       color: "#fbbf24" },
              { label: "Threshold",        value: result.threshold.toFixed(5),     color: "#34d399" },
            ].map((c) => (
              <div key={c.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* Type breakdown */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 18px", color: "rgba(255,255,255,0.85)" }}>
              Anomaly Type Breakdown
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {Object.entries(result.type_counts).map(([type, count]) => {
                const col   = TYPE_COLOR[type] || TYPE_COLOR["Unknown"];
                const share = result.total_anomalies > 0
                  ? Math.round((count / result.total_anomalies) * 100)
                  : 0;
                return (
                  <div key={type} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{type}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{count}</div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${share}%`, background: col.dot, borderRadius: 2, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>
                      {share}% of anomalies
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly table */}
          {result.anomalies.length > 0 ? (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "rgba(255,255,255,0.85)" }}>
                  Detected Anomalies
                  <span style={{ marginLeft: 10, background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    {filteredAnomalies.length}
                  </span>
                </h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    placeholder="Search date or type…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", width: 190 }}
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  >
                    <option value="All">All types</option>
                    {Object.keys(result.type_counts).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["#", "Date", "Anomaly Type", "Reconstruction Error"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnomalies.map((a, i) => {
                      const col = TYPE_COLOR[a.anomaly_type] || TYPE_COLOR["Unknown"];
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                            {a.day_index + 1}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
                            {a.date}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: col.bg, color: col.text, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                              {a.anomaly_type}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                            {a.reconstruction_error.toFixed(6)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.25)", fontSize: 15 }}>
              No anomalies detected in this dataset.
            </div>
          )}
        </>
      )}
    </div>
  );
}