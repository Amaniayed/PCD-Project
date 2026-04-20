import { useState, useEffect } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const authHeaders = () => ({
  Authorization: `Bearer ${authService.getToken()}`,
});

const TYPE_COLOR = {
  "Temporal Shift": { bg: "rgba(55,138,221,0.15)", text: "#60a5fa", dot: "#378add" },
  "Duration":       { bg: "rgba(239,159,39,0.15)",  text: "#fbbf24", dot: "#ef9f27" },
  "Order":          { bg: "rgba(212,83,126,0.15)",  text: "#f472b6", dot: "#d4537e" },
  "Unknown":        { bg: "rgba(136,135,128,0.15)", text: "#9ca3af", dot: "#888780" },
};

export default function Analysis() {
  const [datasets,   setDatasets]   = useState([]);
  const [homes,      setHomes]      = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortDir,    setSortDir]    = useState("desc"); // for sorting by error
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 15;

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

  const handleAnalyze = async () => {
    if (!selectedId) return setError("Please select a dataset.");
    setError(""); setResult(null); setLoading(true); setPage(1);
    try {
      const res = await fetch(`${API}/analyze/${selectedId}`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        // Use "simulator" pipeline → Classic Autoencoder (autoencoder_best.pth)
        body: JSON.stringify({ pipeline: "simulator" }),
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

  const filteredAnomalies = (result?.anomalies || [])
    .filter((a) => {
      const matchType   = typeFilter === "All" || a.anomaly_type === typeFilter;
      const matchSearch =
        a.date.includes(search) ||
        a.anomaly_type.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    })
    .sort((a, b) =>
      sortDir === "desc"
        ? b.reconstruction_error - a.reconstruction_error
        : a.reconstruction_error - b.reconstruction_error
    );

  const totalPages = Math.ceil(filteredAnomalies.length / PAGE_SIZE);
  const paginated  = filteredAnomalies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const card = {
    background: "#ffffff",
    border: "1px solid #e8eaf0",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  };

  const label = {
    fontSize: 11,
    fontWeight: 600,
    color: "#9aa0b4",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 7,
  };

  const selectStyle = {
    background: "#f8f9fc",
    border: "1px solid #e8eaf0",
    borderRadius: 10,
    padding: "10px 13px",
    color: "#1e293b",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  };

  if (fetching) {
    return (
      <div style={{ color: "#9aa0b4", fontSize: 14, paddingTop: 40 }}>
        Loading datasets…
      </div>
    );
  }

  return (
    <div style={{ color: "#1e293b", fontFamily: "'DM Sans', sans-serif", maxWidth: 960 }}>

      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#0f172a" }}>
        Anomaly Detection
      </h1>
      <p style={{ color: "#9aa0b4", fontSize: 14, margin: "0 0 6px" }}>
        Run the Classic Autoencoder on your household energy dataset
      </p>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 10, padding: "6px 14px", marginBottom: 28,
      }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
          Classic Autoencoder — Simulator Dataset
        </span>
        <span style={{ fontSize: 11, color: "rgba(99,102,241,0.6)", marginLeft: 4 }}>
          threshold k = 3.0
        </span>
      </div>

      {/* Dataset selector card */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 18px", color: "#374151" }}>
          Select Dataset &amp; Run
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
            <div style={{ fontSize: 13, color: "#9aa0b4", paddingBottom: 10 }}>
              Uploaded {new Date(selectedDataset.upload_date).toLocaleDateString()}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedId}
            style={{
              background: loading || !selectedId ? "#c7d2fe" : "#6366f1",
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

        {error && (
          <div style={{
            marginTop: 14, padding: "12px 16px", borderRadius: 10,
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 14, color: "#9aa0b4", fontSize: 13 }}>
            Running autoencoder model — this may take a few seconds…
          </div>
        )}

        {!fetching && datasets.length === 0 && (
          <div style={{ marginTop: 14, color: "#9aa0b4", fontSize: 13 }}>
            No datasets found. Go to the <strong style={{ color: "#6366f1" }}>Data</strong> page and upload a CSV first.
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Days",      value: result.total_days,            color: "#6366f1" },
              { label: "Anomalies Found", value: result.total_anomalies,       color: "#ef4444" },
              { label: "Anomaly Rate",    value: `${pct}%`,                    color: "#f59e0b" },
              { label: "Threshold",       value: result.threshold?.toFixed(5), color: "#10b981" },
            ].map((c) => (
              <div key={c.label} style={{
                background: "#fff", borderRadius: 12, padding: "16px 18px",
                border: "1px solid #e8eaf0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9aa0b4", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
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
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 18px", color: "#374151" }}>
              Anomaly Type Breakdown
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {Object.entries(result.type_counts).map(([type, count]) => {
                const col   = TYPE_COLOR[type] || TYPE_COLOR["Unknown"];
                const share = result.total_anomalies > 0
                  ? Math.round((count / result.total_anomalies) * 100)
                  : 0;
                return (
                  <div key={type} style={{
                    background: "#f8f9fc", border: "1px solid #e8eaf0",
                    borderRadius: 12, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{type}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{count}</div>
                    <div style={{ height: 4, borderRadius: 2, background: "#e8eaf0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${share}%`, background: col.dot, borderRadius: 2, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9aa0b4", marginTop: 5 }}>
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
              {/* Table header + controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#374151" }}>
                  Detected Anomalies
                  <span style={{ marginLeft: 10, background: "#fef2f2", color: "#ef4444", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    {filteredAnomalies.length}
                  </span>
                </h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    placeholder="Search date or type…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    style={{ background: "#f8f9fc", border: "1px solid #e8eaf0", borderRadius: 8, padding: "7px 12px", color: "#1e293b", fontSize: 13, outline: "none", fontFamily: "inherit", width: 190 }}
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    style={{ background: "#f8f9fc", border: "1px solid #e8eaf0", borderRadius: 8, padding: "7px 12px", color: "#1e293b", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  >
                    <option value="All">All types</option>
                    {Object.keys(result.type_counts).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    style={{ background: "#f8f9fc", border: "1px solid #e8eaf0", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#6366f1", fontWeight: 600 }}
                  >
                    Error {sortDir === "desc" ? "↓" : "↑"}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e8eaf0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e8eaf0", background: "#f8f9fc" }}>
                      {["#", "Date", "Anomaly Type", "Reconstruction Error"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 600, color: "#9aa0b4", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a, i) => {
                      const col = TYPE_COLOR[a.anomaly_type] || TYPE_COLOR["Unknown"];
                      return (
                        <tr key={i}
                          style={{ borderBottom: "1px solid #f1f3f7", transition: "background 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fc"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#c4c9d4" }}>
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 14, color: "#374151", fontWeight: 500 }}>
                            {a.date}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: col.bg, color: col.text, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                              {a.anomaly_type}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280", fontFamily: "monospace" }}>
                            {a.reconstruction_error.toFixed(6)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ background: page === 1 ? "#f1f3f7" : "#6366f1", color: page === 1 ? "#c4c9d4" : "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 13, color: "#9aa0b4", display: "flex", alignItems: "center" }}>
                    Page {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ background: page === totalPages ? "#f1f3f7" : "#6366f1", color: page === totalPages ? "#c4c9d4" : "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 48, color: "#9aa0b4", fontSize: 15 }}>
              ✅ No anomalies detected in this dataset.
            </div>
          )}
        </>
      )}
    </div>
  );
}