import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const authHeaders = () => ({
  Authorization: `Bearer ${authService.getToken()}`,
});

const TYPE_COLOR = {
  "Temporal Shift": "#60a5fa",
  "Duration":       "#fbbf24",
  "Order":          "#f472b6",
  "Unknown":        "#9ca3af",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch(`${API}/dashboard/stats`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.detail) throw new Error(d.detail);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats  = data?.stats  || {};
  const latest = data?.latest || null;
  const recent = data?.recentAnomalies || [];

  const statCards = [
    { label: "Total Homes",    value: stats.total_homes     ?? 0, icon: "🏠", color: "#818cf8" },
    { label: "Datasets",       value: stats.total_datasets  ?? 0, icon: "📂", color: "#60a5fa" },
    { label: "Analyses Run",   value: stats.total_analyses  ?? 0, icon: "⚡", color: "#fbbf24" },
    { label: "Anomalies Found",value: stats.total_anomalies ?? 0, icon: "⚠",  color: "#f87171" },
    { label: "Clean Days",     value: stats.total_clean_days?? 0, icon: "✓",  color: "#34d399" },
  ];

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {authService.getToken() ? "ElderGuard User" : ""}  — here's your overview</p>
        </div>
        <div className="header-actions">
          <button className="btn-action" onClick={() => navigate("/data")}>
            ⊞ Upload Data
          </button>
          <button className="btn-action primary" onClick={() => navigate("/analysis")}>
            ⚡ Run Analysis
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error">{error}</div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading dashboard…</p>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="stats-grid">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div>
                  <div className="stat-value" style={{ color: s.color }}>
                    {s.value.toLocaleString()}
                  </div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bottom-grid">
            {/* ── Last Analysis ── */}
            <div className="card">
              <h2>Last Analysis</h2>
              {latest ? (
                <div className="latest-analysis">
                  <div className="latest-row">
                    <span className="latest-label">Home</span>
                    <span className="latest-val">🏠 {latest.home_name || "—"}</span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">File</span>
                    <span className="latest-val">📄 {latest.file_name || "—"}</span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Pipeline</span>
                    <span className="pipeline-badge">
                      {latest.pipeline === "REFIT" ? "🏠" : "⚡"} {latest.pipeline}
                    </span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Total Days</span>
                    <span className="latest-val">{latest.total_days}</span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Anomalies</span>
                    <span style={{ color: "#f87171", fontWeight: 700 }}>
                      {latest.total_anomalies}
                      <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                        ({latest.anomaly_rate}%)
                      </span>
                    </span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Threshold</span>
                    <span style={{ color: "#34d399", fontFamily: "monospace", fontSize: 13 }}>
                      {Number(latest.threshold).toFixed(5)}
                    </span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Date</span>
                    <span className="latest-val">
                      {new Date(latest.analyzed_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="btn-goto"
                    onClick={() => navigate("/analysis")}
                  >
                    Run new analysis →
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No analysis run yet.</p>
                  <button className="btn-action primary" onClick={() => navigate("/analysis")}>
                    ⚡ Run First Analysis
                  </button>
                </div>
              )}
            </div>

            {/* ── Recent Anomalies ── */}
            <div className="card">
              <h2>Recent Anomalies</h2>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <p>No anomalies recorded yet.</p>
                </div>
              ) : (
                <div className="anomaly-list">
                  {recent.map((a, i) => {
                    const color = TYPE_COLOR[a.anomaly_type] || TYPE_COLOR["Unknown"];
                    return (
                      <div key={i} className="anomaly-item">
                        <div className="anomaly-dot" style={{ background: color }} />
                        <div className="anomaly-body">
                          <div className="anomaly-top">
                            <span className="anomaly-date">{a.date}</span>
                            <span className="anomaly-type-badge" style={{ color, background: `${color}20` }}>
                              {a.anomaly_type}
                            </span>
                          </div>
                          <div className="anomaly-meta">
                            🏠 {a.home_name} &nbsp;·&nbsp;
                            Error: <span style={{ fontFamily: "monospace" }}>{a.reconstruction_error?.toFixed(5)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="card quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              {[
                { icon: "🏠", label: "Add a Home",      sub: "Register a new home",          to: "/data"     },
                { icon: "📂", label: "Upload Dataset",   sub: "Import a CSV file",            to: "/data"     },
                { icon: "⚡", label: "Run Analysis",     sub: "Detect anomalies",             to: "/analysis" },
              ].map((a) => (
                <div key={a.label} className="action-card" onClick={() => navigate(a.to)}>
                  <span className="action-icon">{a.icon}</span>
                  <div>
                    <div className="action-label">{a.label}</div>
                    <div className="action-sub">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        .dash { color: #fff; font-family: 'DM Sans', sans-serif; max-width: 1100px; }

        .dash-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          flex-wrap: wrap; gap: 16px; margin-bottom: 32px;
        }
        .dash-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.5px; }
        .dash-header p  { color: rgba(255,255,255,0.35); font-size: 14px; margin: 0; }
        .header-actions { display: flex; gap: 10px; align-items: center; }

        .btn-action {
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          padding: 9px 18px; font-size: 14px; font-weight: 500;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .btn-action:hover { background: rgba(255,255,255,0.1); }
        .btn-action.primary { background: #6366f1; color: #fff; border-color: transparent; }
        .btn-action.primary:hover { background: #818cf8; }

        .alert-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; padding: 12px 16px; border-radius: 10px;
          font-size: 13px; margin-bottom: 24px;
        }

        /* Stats */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px; margin-bottom: 24px;
        }
        .stat-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 20px; display: flex; align-items: center; gap: 14px;
          transition: border-color 0.15s;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.15); }
        .stat-icon  { font-size: 26px; }
        .stat-value { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Bottom grid */
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 768px) { .bottom-grid { grid-template-columns: 1fr; } }

        /* Cards */
        .card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 24px;
        }
        .card h2 { font-size: 15px; font-weight: 600; margin: 0 0 18px; color: rgba(255,255,255,0.8); }

        /* Latest analysis */
        .latest-analysis { display: flex; flex-direction: column; gap: 10px; }
        .latest-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .latest-label { color: rgba(255,255,255,0.4); }
        .latest-val   { color: rgba(255,255,255,0.8); }
        .pipeline-badge {
          background: rgba(129,140,248,0.15); color: #818cf8;
          border-radius: 6px; padding: 2px 10px; font-size: 12px; font-weight: 600;
        }
        .btn-goto {
          margin-top: 8px; background: none; border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); border-radius: 8px; padding: 8px 14px;
          font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
          text-align: left;
        }
        .btn-goto:hover { border-color: #818cf8; color: #818cf8; }

        /* Anomaly list */
        .anomaly-list { display: flex; flex-direction: column; gap: 10px; }
        .anomaly-item { display: flex; align-items: flex-start; gap: 12px; }
        .anomaly-dot  { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .anomaly-body { flex: 1; }
        .anomaly-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .anomaly-date { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); }
        .anomaly-type-badge { font-size: 11px; font-weight: 600; border-radius: 5px; padding: 2px 8px; }
        .anomaly-meta { font-size: 12px; color: rgba(255,255,255,0.35); }

        /* Quick actions */
        .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .action-card {
          display: flex; align-items: center; gap: 14px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.15s;
        }
        .action-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }
        .action-icon  { font-size: 24px; }
        .action-label { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px; }
        .action-sub   { font-size: 12px; color: rgba(255,255,255,0.35); }

        /* Loading */
        .loading { display: flex; flex-direction: column; align-items: center; padding: 80px 0; gap: 16px; color: rgba(255,255,255,0.35); }
        .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Empty */
        .empty-state { text-align: center; padding: 24px 0; color: rgba(255,255,255,0.3); font-size: 14px; }
        .empty-state p { margin: 0 0 16px; }
      `}</style>
    </div>
  );
}