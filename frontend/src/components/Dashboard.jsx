import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const authHeaders = () => ({ Authorization: `Bearer ${authService.getToken()}` });

const TYPE_COLOR = {
  "Temporal Shift": "#3b82f6",
  "Duration":       "#d97706",
  "Order":          "#db2777",
  "Unknown":        "#9ca3af",
};

export default function Dashboard() {
  const navigate = useNavigate();

  // ── role ─────────────────────────────────────────────────
  const user        = authService.getUser?.() || null;
  const role        = user?.role || "caregiver";
  const isCaregiver = role === "caregiver";

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  // notification state per anomaly row
  const [notif,   setNotif]   = useState({});

  useEffect(() => {
    fetch(`${API}/dashboard/stats`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.detail) throw new Error(d.detail); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats  = data?.stats  || {};
  const latest = data?.latest || null;
  const recent = data?.recentAnomalies || [];

  const statCards = [
    { label: "Total Homes",     value: stats.total_homes     ?? 0, icon: "🏠", color: "#6366f1" },
    { label: "Datasets",        value: stats.total_datasets  ?? 0, icon: "📂", color: "#3b82f6" },
    { label: "Analyses Run",    value: stats.total_analyses  ?? 0, icon: "⚡", color: "#d97706" },
    { label: "Anomalies Found", value: stats.total_anomalies ?? 0, icon: "⚠",  color: "#ef4444" },
    { label: "Clean Days",      value: stats.total_clean_days?? 0, icon: "✓",  color: "#10b981" },
  ];

  // ── caregiver notification handlers ──────────────────────
  const sendToDoctor = async (i) => {
    setNotif(n => ({ ...n, [`doc_${i}`]: "sending" }));
    // TODO: wire to real backend endpoint e.g. POST /notify/doctor
    await new Promise(r => setTimeout(r, 900));
    setNotif(n => ({ ...n, [`doc_${i}`]: "sent" }));
  };
  const notifyFamily = async (i) => {
    setNotif(n => ({ ...n, [`fam_${i}`]: "sending" }));
    // TODO: wire to real backend endpoint e.g. POST /notify/family
    await new Promise(r => setTimeout(r, 900));
    setNotif(n => ({ ...n, [`fam_${i}`]: "sent" }));
  };

  return (
    <div className="dash">
      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <div className="header-title-row">
            <h1>Dashboard</h1>
            {/* Role pill — visible immediately next to the title */}
            <span className={`role-pill role-pill--${role}`}>
              {role === "doctor" ? "🧑‍⚕️ Doctor" : "👩‍⚕️ Caregiver"}
            </span>
          </div>
          <p>Welcome back{user?.name ? `, ${user.name}` : ""} — here's your overview</p>
        </div>
        <div className="header-actions">
          <button className="btn-action"         onClick={() => navigate("/data")}>⊞ Upload Data</button>
          <button className="btn-action primary" onClick={() => navigate("/analysis")}>⚡ Run Analysis</button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading dashboard…</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stats-grid">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bottom-grid">
            {/* Last Analysis */}
            <div className="card">
              <h2>Last Analysis</h2>
              {latest ? (
                <div className="latest-analysis">
                  <div className="latest-row"><span className="latest-label">Home</span><span className="latest-val">🏠 {latest.home_name || "—"}</span></div>
                  <div className="latest-row"><span className="latest-label">File</span><span className="latest-val">📄 {latest.file_name || "—"}</span></div>
                  <div className="latest-row">
                    <span className="latest-label">Pipeline</span>
                    <span className="pipeline-badge">{latest.pipeline === "REFIT" ? "🏠" : "⚡"} {latest.pipeline}</span>
                  </div>
                  <div className="latest-row"><span className="latest-label">Total Days</span><span className="latest-val">{latest.total_days}</span></div>
                  <div className="latest-row">
                    <span className="latest-label">Anomalies</span>
                    <span style={{ color: "#ef4444", fontWeight: 700 }}>
                      {latest.total_anomalies}
                      <span style={{ color: "#9196a8", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>({latest.anomaly_rate}%)</span>
                    </span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Threshold</span>
                    <span style={{ color: "#10b981", fontFamily: "monospace", fontSize: 13 }}>{Number(latest.threshold).toFixed(5)}</span>
                  </div>
                  <div className="latest-row">
                    <span className="latest-label">Date</span>
                    <span className="latest-val">{new Date(latest.analyzed_at).toLocaleString()}</span>
                  </div>
                  <button className="btn-goto" onClick={() => navigate("/analysis")}>Run new analysis →</button>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No analysis run yet.</p>
                  <button className="btn-action primary" onClick={() => navigate("/analysis")}>⚡ Run First Analysis</button>
                </div>
              )}
            </div>

            {/* Recent Anomalies */}
            <div className="card">
              <h2>Recent Anomalies</h2>
              {recent.length === 0 ? (
                <div className="empty-state"><p>No anomalies recorded yet.</p></div>
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
                            <span className="anomaly-type-badge" style={{ color, background: `${color}18` }}>{a.anomaly_type}</span>
                          </div>
                          <div className="anomaly-meta">
                            🏠 {a.home_name} &nbsp;·&nbsp; Error: <span style={{ fontFamily: "monospace" }}>{a.reconstruction_error?.toFixed(5)}</span>
                          </div>

                          {/* ── Caregiver-only: Send to Doctor / Notify Family ── */}
                          {isCaregiver && (
                            <div className="anomaly-actions">
                              <button
                                className={`act-btn act-doctor${notif[`doc_${i}`] === "sent" ? " sent" : ""}`}
                                disabled={!!notif[`doc_${i}`]}
                                onClick={() => sendToDoctor(i)}
                              >
                                {notif[`doc_${i}`] === "sending" ? "⏳ Sending…"
                                : notif[`doc_${i}`] === "sent"   ? "✓ Sent to Doctor"
                                : "🧑‍⚕️ Send to Doctor"}
                              </button>
                              <button
                                className={`act-btn act-family${notif[`fam_${i}`] === "sent" ? " sent" : ""}`}
                                disabled={!!notif[`fam_${i}`]}
                                onClick={() => notifyFamily(i)}
                              >
                                {notif[`fam_${i}`] === "sending" ? "⏳ Sending…"
                                : notif[`fam_${i}`] === "sent"   ? "✓ Family Notified"
                                : "👨‍👩‍👧 Notify Family"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              {[
                { icon: "🏠", label: "Add a Home",      sub: "Register a new home",  to: "/data"     },
                { icon: "📂", label: "Upload Dataset",   sub: "Import a CSV file",    to: "/data"     },
                { icon: "⚡", label: "Run Analysis",     sub: "Detect anomalies",     to: "/analysis" },
                ...(isCaregiver ? [
                  { icon: "🔔", label: "Manage Alerts",  sub: "Alert preferences",    to: "/alerts"   },
                  { icon: "📩", label: "Message Doctor", sub: "Send patient report",  to: "/messages" },
                ] : []),
                ...(role === "doctor" ? [
                  { icon: "🩺", label: "Medical View",   sub: "Diagnose & interpret", to: "/doctor/dashboard" },
                ] : []),
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
        .dash { color:#1e1f2e; font-family:'DM Sans',sans-serif; max-width:1100px; }

        /* header */
        .dash-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:32px; }
        .header-title-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:4px; }
        .dash-header h1 { font-size:28px; font-weight:700; margin:0; color:#1e1f2e; letter-spacing:-0.5px; }
        .dash-header p  { color:#9196a8; font-size:14px; margin:0; }
        .header-actions { display:flex; gap:10px; align-items:center; }

        /* role pill */
        .role-pill { display:inline-flex; align-items:center; gap:5px; padding:5px 13px; border-radius:20px; font-size:12px; font-weight:700; letter-spacing:0.3px; border:1.5px solid; }
        .role-pill--caregiver { background:#e0f2fe; color:#0284c7; border-color:#7dd3fc; }
        .role-pill--doctor    { background:#f3e8ff; color:#7c3aed; border-color:#c4b5fd; }

        .btn-action { background:#fff; color:#4b5060; border:1px solid #e2e5ef; border-radius:10px; padding:9px 18px; font-size:14px; font-weight:500; cursor:pointer; font-family:inherit; transition:all .15s; }
        .btn-action:hover { background:#f4f6fb; border-color:#c2c6d4; }
        .btn-action.primary { background:#6366f1; color:#fff; border-color:transparent; }
        .btn-action.primary:hover { background:#4f51d0; }
        .alert-error { background:#fef2f2; border:1px solid #fecaca; color:#ef4444; padding:12px 16px; border-radius:10px; font-size:13px; margin-bottom:24px; }
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:24px; }
        .stat-card { background:#fff; border:1px solid #e8eaf0; border-radius:14px; padding:20px; display:flex; align-items:center; gap:14px; box-shadow:0 1px 4px rgba(0,0,0,0.04); transition:box-shadow .15s; }
        .stat-card:hover { box-shadow:0 4px 16px rgba(99,102,241,0.08); }
        .stat-icon  { font-size:26px; }
        .stat-value { font-size:28px; font-weight:700; letter-spacing:-1px; }
        .stat-label { font-size:12px; color:#9196a8; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px; }
        .bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        @media (max-width:768px) { .bottom-grid { grid-template-columns:1fr; } }
        .card { background:#fff; border:1px solid #e8eaf0; border-radius:16px; padding:24px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
        .card h2 { font-size:15px; font-weight:600; margin:0 0 18px; color:#2d3048; }
        .latest-analysis { display:flex; flex-direction:column; gap:10px; }
        .latest-row { display:flex; justify-content:space-between; align-items:center; font-size:13px; border-bottom:1px solid #f4f5f9; padding-bottom:8px; }
        .latest-row:last-of-type { border-bottom:none; }
        .latest-label { color:#9196a8; }
        .latest-val   { color:#1e1f2e; font-weight:500; }
        .pipeline-badge { background:rgba(99,102,241,0.1); color:#6366f1; border-radius:6px; padding:2px 10px; font-size:12px; font-weight:600; }
        .btn-goto { margin-top:12px; background:none; border:1px solid #e2e5ef; color:#9196a8; border-radius:8px; padding:8px 14px; font-size:13px; cursor:pointer; font-family:inherit; transition:all .15s; text-align:left; width:100%; }
        .btn-goto:hover { border-color:#6366f1; color:#6366f1; background:#f4f4fe; }
        .anomaly-list { display:flex; flex-direction:column; gap:14px; }
        .anomaly-item { display:flex; align-items:flex-start; gap:12px; }
        .anomaly-dot  { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .anomaly-body { flex:1; }
        .anomaly-top  { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
        .anomaly-date { font-size:13px; font-weight:600; color:#1e1f2e; }
        .anomaly-type-badge { font-size:11px; font-weight:600; border-radius:5px; padding:2px 8px; }
        .anomaly-meta { font-size:12px; color:#9196a8; margin-bottom:6px; }

        /* caregiver action buttons */
        .anomaly-actions { display:flex; gap:6px; flex-wrap:wrap; }
        .act-btn { padding:4px 11px; border-radius:6px; border:1.5px solid; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; white-space:nowrap; background:transparent; }
        .act-btn:disabled { opacity:.55; cursor:not-allowed; }
        .act-doctor { border-color:#8b5cf6; color:#8b5cf6; background:#f5f3ff; }
        .act-doctor:hover:not(:disabled) { background:#8b5cf6; color:#fff; }
        .act-family { border-color:#0ea5e9; color:#0ea5e9; background:#e0f2fe; }
        .act-family:hover:not(:disabled) { background:#0ea5e9; color:#fff; }
        .act-btn.sent { border-color:#22c55e !important; color:#22c55e !important; background:#f0fdf4 !important; }

        .actions-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
        .action-card { display:flex; align-items:center; gap:14px; background:#f8f9fc; border:1px solid #e8eaf0; border-radius:12px; padding:16px; cursor:pointer; transition:all .15s; }
        .action-card:hover { background:#eeeffa; border-color:#c5c7f0; transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,0.08); }
        .action-icon  { font-size:24px; }
        .action-label { font-size:14px; font-weight:600; color:#1e1f2e; margin-bottom:2px; }
        .action-sub   { font-size:12px; color:#9196a8; }
        .loading { display:flex; flex-direction:column; align-items:center; padding:80px 0; gap:16px; color:#9196a8; }
        .spinner { width:36px; height:36px; border:3px solid #e8eaf0; border-top-color:#6366f1; border-radius:50%; animation:spin 0.8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty-state { text-align:center; padding:24px 0; color:#b0b5c4; font-size:14px; }
        .empty-state p { margin:0 0 16px; }
      `}</style>
    </div>
  );
}