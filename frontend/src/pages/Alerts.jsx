import { useEffect, useState } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const h = () => ({ Authorization: `Bearer ${authService.getToken()}` });

// ── constants ──────────────────────────────────────────────
const TYPE_META = {
  "Temporal Shift": {
    icon: "⏱", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe",
    desc: "Activity occurred at an unusual time of day",
  },
  Duration: {
    icon: "📏", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
    desc: "Activity lasted significantly longer or shorter than usual",
  },
  Order: {
    icon: "🔀", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0",
    desc: "Sequence of daily activities was disrupted",
  },
};
const fallback = { icon: "⚠️", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", desc: "Unclassified anomaly" };
function typeMeta(type) { return TYPE_META[type] || fallback; }

// ── mini donut chart ───────────────────────────────────────
function DonutChart({ typeCounts }) {
  const entries = Object.entries(typeCounts || {});
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;
  let offset = 0;
  const R = 28, C = 36, stroke = 10, circ = 2 * Math.PI * R;
  const slices = entries.map(([type, count]) => {
    const pct = count / total, dash = pct * circ, gap = circ - dash, o = offset;
    offset += pct * circ;
    return { type, dash, gap, offset: o };
  });
  return (
    <svg width={72} height={72} viewBox={`0 0 ${C * 2} ${C * 2}`} style={{ flexShrink: 0 }}>
      {slices.map(({ type, dash, gap, offset: off }) => (
        <circle key={type} cx={C} cy={C} r={R} fill="none"
          stroke={typeMeta(type).color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={-off + circ * 0.25} strokeLinecap="round" />
      ))}
      <text x={C} y={C + 1} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 13, fontWeight: 700, fill: "#1e1f2e", fontFamily: "DM Sans, sans-serif" }}>
        {total}
      </text>
    </svg>
  );
}

function RateBar({ count, total }) {
  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = pct >= 40 ? "#ef4444" : pct >= 20 ? "#f59e0b" : "#6366f1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "#f0f1f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

function AnomalyRow({ anomaly, idx }) {
  const m   = typeMeta(anomaly.anomaly_type);
  const err = typeof anomaly.reconstruction_error === "number"
    ? anomaly.reconstruction_error.toFixed(5) : "—";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "32px 100px 1fr 110px",
      alignItems: "center", gap: 12, padding: "10px 14px",
      borderRadius: 10, background: idx % 2 === 0 ? "#fafafa" : "#fff",
      borderLeft: `3px solid ${m.color}`, fontSize: 13,
    }}>
      <span style={{ color: "#b0b5c4", fontFamily: "monospace", fontSize: 11 }}>#{anomaly.day_index ?? idx}</span>
      <span style={{ color: "#374151", fontWeight: 500 }}>{anomaly.date || "—"}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
          {m.icon} {anomaly.anomaly_type}
        </span>
        <span style={{ fontSize: 11, color: "#9196a8" }}>{m.desc}</span>
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9196a8", textAlign: "right" }}>err: {err}</span>
    </div>
  );
}

function DetailPanel({ alert }) {
  const typeCounts = alert.type_counts || {};
  const anomalies  = alert.anomalies  || [];
  const total      = alert.total_days || anomalies.length;
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? anomalies : anomalies.filter((a) => a.anomaly_type === filter);

  return (
    <div style={{ borderTop: "1px solid #e8eaf0", background: "#f8f9fc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total days",  value: total,               icon: "📅" },
          { label: "Anomalies",   value: alert.anomaly_count, icon: "⚠️" },
          { label: "Clean days",  value: Math.max(0, total - alert.anomaly_count), icon: "✅" },
          { label: "Pipeline",    value: alert.pipeline || "—", icon: "🔬" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1e1f2e", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#9196a8", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Anomaly Rate</div>
        <RateBar count={alert.anomaly_count} total={total} />
      </div>

      {Object.keys(typeCounts).length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Anomaly Type Breakdown</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <DonutChart typeCounts={typeCounts} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(typeCounts).map(([type, count]) => {
                const m   = typeMeta(type);
                const pct = alert.anomaly_count > 0 ? Math.round((count / alert.anomaly_count) * 100) : 0;
                return (
                  <div key={type}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1f2e", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{m.icon}</span> {type}
                      </span>
                      <span style={{ fontSize: 12, color: "#9196a8" }}>{count} day{count !== 1 ? "s" : ""} · {pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#f0f1f6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: m.color, borderRadius: 99, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9196a8", marginTop: 3 }}>{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Anomaly Log — {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", ...Object.keys(typeCounts)].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? "#6366f1" : "#f0f1f8",
                  color: filter === f ? "#fff" : "#6366f1",
                  border: "none", borderRadius: 20, padding: "4px 12px",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                }}>
                  {f === "all" ? `All (${anomalies.length})` : `${typeMeta(f).icon} ${f}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "32px 100px 1fr 110px", gap: 12, padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#b0b5c4", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>#</span><span>Date</span><span>Type</span><span style={{ textAlign: "right" }}>Error</span>
            </div>
            {filtered.map((anomaly, i) => <AnomalyRow key={i} anomaly={anomaly} idx={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function Alerts() {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [openId,   setOpenId]   = useState(null);
  // sending state: { [alertId]: "idle" | "sending" | "ok" | "error" }
  const [sendState, setSendState] = useState({});

  useEffect(() => {
    fetch(`${API}/alerts`, { headers: h() })
      .then((r) => r.json())
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await fetch(`${API}/alerts/${id}/read`, { method: "PATCH", headers: h() });
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const toggleOpen = (id) => setOpenId((prev) => (prev === id ? null : id));

  // ── Send to Doctor ────────────────────────────────────────
  const handleSendToDoctor = async (alertId) => {
    setSendState((s) => ({ ...s, [alertId]: "sending" }));
    try {
      const res = await fetch(`${API}/alerts/${alertId}/send-to-doctor`, {
        method:  "POST",
        headers: { ...h(), "Content-Type": "application/json" },
      });

      // Always try to parse JSON — backend now guarantees it
      let data = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // Unexpected HTML response — surface raw text for debugging
        const raw = await res.text();
        console.error("[send-to-doctor] Non-JSON response:", raw);
        data = { detail: `Server error (${res.status}). Check backend logs.` };
      }

      if (!res.ok) {
        window.alert(`❌ ${data.detail || "Failed to send email."}`);
        setSendState((s) => ({ ...s, [alertId]: "error" }));
      } else {
        window.alert(`✅ ${data.message}`);
        setSendState((s) => ({ ...s, [alertId]: "ok" }));
      }
    } catch (e) {
      window.alert(`❌ Network error: ${e.message}`);
      setSendState((s) => ({ ...s, [alertId]: "error" }));
    }
  };

  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <div style={{ color: "#1e1f2e", fontFamily: "'DM Sans', sans-serif", maxWidth: 900 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            🔔 Alerts
            {unread > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>
                {unread} new
              </span>
            )}
          </h1>
          <p style={{ color: "#9196a8", fontSize: 14, margin: 0 }}>Anomaly alerts generated from your analysis runs</p>
        </div>
        {unread > 0 && (
          <button
            onClick={async () => { for (const a of alerts.filter((x) => !x.is_read)) await markRead(a.id); }}
            style={{ background: "#f8f9fc", color: "#4b5060", border: "1px solid #e2e5ef", borderRadius: 10, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: "#b0b5c4", padding: 48, textAlign: "center" }}>Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔔</div>
          <p style={{ color: "#9196a8", fontSize: 15 }}>No alerts yet. Run an analysis to start monitoring.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map((a) => {
            const isOpen     = openId === a.id;
            const typeCounts = a.type_counts || {};
            const types      = Object.keys(typeCounts);
            const state      = sendState[a.id] || "idle";

            return (
              <div key={a.id} style={{
                background: "#fff",
                border: `1px solid ${!a.is_read ? "#c7d2fe" : "#e8eaf0"}`,
                borderRadius: 16, overflow: "hidden",
                boxShadow: !a.is_read ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
                transition: "box-shadow 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>

                  <div style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    background: a.is_read ? "#d1d5db" : "#6366f1",
                    boxShadow: a.is_read ? "none" : "0 0 0 3px rgba(99,102,241,0.2)",
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: a.is_read ? "#374151" : "#1e1f2e" }}>
                        ⚠️ {a.anomaly_count} anomal{a.anomaly_count === 1 ? "y" : "ies"} detected
                      </span>
                      {types.map((type) => {
                        const m = typeMeta(type);
                        return (
                          <span key={type} style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                            {m.icon} {type} ({typeCounts[type]})
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>🏠 {a.home_name}</span>
                      <span>📄 {a.file_name}</span>
                      <span>🔬 {a.pipeline}</span>
                      {a.total_days && <span>📅 {a.total_days} days</span>}
                      <span>🕐 {new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>

                    {/* ── Send to Doctor button ── */}
                    <button
                      onClick={() => handleSendToDoctor(a.id)}
                      disabled={state === "sending"}
                      style={{
                        background: state === "ok"      ? "#10b981"
                                  : state === "error"   ? "#ef4444"
                                  : state === "sending" ? "rgba(99,102,241,0.5)"
                                  : "#6366f1",
                        color: "#fff", border: "none", borderRadius: 9,
                        padding: "8px 14px", fontSize: 13, fontWeight: 600,
                        cursor: state === "sending" ? "not-allowed" : "pointer",
                        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                        transition: "background 0.2s",
                      }}
                    >
                      {state === "sending" ? "⏳ Sending…"
                       : state === "ok"    ? "✅ Sent!"
                       : state === "error" ? "❌ Retry"
                       : "📩 Send to Doctor"}
                    </button>

                    <button
                      onClick={() => { toggleOpen(a.id); if (!a.is_read) markRead(a.id); }}
                      style={{
                        background: isOpen ? "#6366f1" : "#eef2ff",
                        color: isOpen ? "#fff" : "#6366f1",
                        border: "none", borderRadius: 9, padding: "8px 14px",
                        fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Details"}
                    </button>

                    {!a.is_read && (
                      <button
                        onClick={() => markRead(a.id)}
                        style={{ background: "#f8f9fc", color: "#6b7280", border: "1px solid #e2e5ef", borderRadius: 9, padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        ✓ Mark read
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && <DetailPanel alert={a} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}