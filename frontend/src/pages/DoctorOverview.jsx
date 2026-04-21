import { useEffect, useRef, useState } from "react";
import { authService } from "../services/api";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, DoughnutController, BarController, BarElement, CategoryScale, LinearScale);

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Friendly names for anomaly types ────────────────────────
const FRIENDLY = {
  "Temporal Shift": {
    label: "Unusual Timing",
    desc:  "The patient's activities shifted to unexpected time slots",
    icon:  "🕐", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe",
  },
  "Duration": {
    label: "Activity Duration",
    desc:  "Activities lasted much longer or shorter than usual",
    icon:  "⏱️", color: "#d97706", bg: "#fffbeb", border: "#fde68a",
  },
  "Order": {
    label: "Routine Disruption",
    desc:  "Daily routine happened in an unexpected order",
    icon:  "🔄", color: "#7c3aed", bg: "#fdf4ff", border: "#e9d5ff",
  },
  "Unknown": {
    label: "Minor Variation",
    desc:  "A small deviation that needs further observation",
    icon:  "❓", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0",
  },
};
const friendly = (t) => FRIENDLY[t] || { label: t, desc: "", icon: "📌", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" };

const severityOf = (rate) => {
  if (rate >= 20) return { label: "Needs Attention",  color: "#ef4444", bg: "#fef2f2" };
  if (rate >= 5)  return { label: "Monitor Closely",  color: "#d97706", bg: "#fffbeb" };
  return               { label: "Mostly Normal",      color: "#059669", bg: "#ecfdf5" };
};

// ── Donut center-text plugin ─────────────────────────────────
const centerPlugin = {
  id: "doctorCenter",
  beforeDraw(chart) {
    const { width, height, ctx } = chart;
    const [line1, line2] = chart.data._center || ["—", ""];
    ctx.save();
    ctx.font = "700 22px 'DM Sans', sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(line1, width / 2, height / 2 - 11);
    ctx.font = "400 11px 'DM Sans', sans-serif";
    ctx.fillStyle = "#9196a8";
    ctx.fillText(line2, width / 2, height / 2 + 11);
    ctx.restore();
  },
};

export default function DoctorOverview() {
  const [data,  setData]  = useState(null);
  const [error, setError] = useState("");

  const donutRef  = useRef(null);
  const donutInst = useRef(null);
  const barRef    = useRef(null);
  const barInst   = useRef(null);

  // ── Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/analyze/results`, {
      headers: { Authorization: `Bearer ${authService.getToken()}` },
    })
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(results => {
        if (!Array.isArray(results)) throw new Error("Invalid data format");

        const totalAnomalies = results.reduce((s, r) => s + (r.total_anomalies || 0), 0);
        const totalDays      = results.reduce((s, r) => s + (r.total_days      || 0), 0);
        const cleanDays      = totalDays - totalAnomalies;
        const homes          = new Set(results.map(r => r.home_name)).size;
        const critical       = results.filter(r =>
          r.total_days > 0 && (r.total_anomalies / r.total_days) * 100 >= 20
        ).length;

        const typeTotals = {};
        results.forEach(r => {
          const tc = r.type_counts
            ? (typeof r.type_counts === "string" ? JSON.parse(r.type_counts) : r.type_counts)
            : {};
          Object.entries(tc).forEach(([k, v]) => { typeTotals[k] = (typeTotals[k] || 0) + v; });
        });

        setData({ totalAnalyses: results.length, totalAnomalies, cleanDays, totalDays, homes, critical, typeTotals, results });
      })
      .catch(e => { console.error(e); setError(e.message); });
  }, []);

  // ── Donut chart ──────────────────────────────────────────────
  useEffect(() => {
    if (!donutRef.current || !data?.totalDays) return;
    if (donutInst.current) { donutInst.current.destroy(); donutInst.current = null; }

    const pct = `${((data.cleanDays / data.totalDays) * 100).toFixed(0)}%`;
    const chartData = {
      datasets: [{ data: [data.cleanDays || 0.001, data.totalAnomalies], backgroundColor: ["#10b981", "#f87171"], borderWidth: 0, hoverOffset: 5 }],
      _center: [pct, "safe days"],
    };
    donutInst.current = new Chart(donutRef.current, {
      type: "doughnut", data: chartData,
      options: { cutout: "74%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataIndex === 0 ? ` ${data.cleanDays.toLocaleString()} normal days` : ` ${data.totalAnomalies.toLocaleString()} days with alerts` } } }, animation: { duration: 700 } },
      plugins: [centerPlugin],
    });
    return () => { if (donutInst.current) { donutInst.current.destroy(); donutInst.current = null; } };
  }, [data]);

  // ── Bar chart ────────────────────────────────────────────────
  useEffect(() => {
    if (!barRef.current || !data) return;
    if (barInst.current) { barInst.current.destroy(); barInst.current = null; }
    const entries = Object.entries(data.typeTotals);
    if (!entries.length) return;

    const labels = entries.map(([k]) => friendly(k).label);
    const values = entries.map(([, v]) => v);
    const colors = entries.map(([k]) => friendly(k).color);

    barInst.current = new Chart(barRef.current, {
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: colors.map(c => `${c}cc`), hoverBackgroundColor: colors, borderRadius: 8, borderSkipped: false }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => ` ${item.raw} days flagged` } } },
        scales: {
          x: { beginAtZero: true, grid: { color: "#f0f1f6" }, ticks: { font: { size: 11 }, color: "#9196a8" } },
          y: { grid: { display: false }, ticks: { font: { size: 12, weight: "600" }, color: "#374151" } },
        },
        animation: { duration: 600 },
      },
    });
    return () => { if (barInst.current) { barInst.current.destroy(); barInst.current = null; } };
  }, [data]);

  // ── Error / loading states ───────────────────────────────────
  if (error) return (
    <div style={{ padding: 32, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "14px 18px", borderRadius: 10, fontSize: 14 }}>⚠️ {error}</div>
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14, color: "#9196a8", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: 34, height: 34, border: "3px solid #e8eaf0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <p style={{ margin: 0, fontSize: 14 }}>Loading medical overview…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const overallRate = data.totalDays > 0 ? ((data.totalAnomalies / data.totalDays) * 100).toFixed(1) : 0;
  const overallSev  = severityOf(+overallRate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'DM Sans', sans-serif", maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>🩺</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.5px" }}>Medical Dashboard</h1>
        </div>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Overview of patient anomalies and system activity</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { title: "Monitoring Sessions",       value: data.totalAnalyses,  icon: "📊", iconBg: "#eef2ff", color: "#6366f1" },
          { title: "Days with Unusual Activity", value: data.totalAnomalies, icon: "⚠️", iconBg: "#fffbeb", color: "#d97706" },
          { title: "Homes Under Observation",    value: data.homes,          icon: "🏠", iconBg: "#e0f9ff", color: "#0ea5e9" },
          { title: "Cases Needing Review",       value: data.critical,       icon: "🔴", iconBg: "#fef2f2", color: "#ef4444" },
        ].map(s => (
          <div key={s.title} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1.4 }}>{s.title}</div>
              <div style={{ background: s.iconBg, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: "-2px", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Anomaly type cards — friendly language */}
      {Object.keys(data.typeTotals).length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#0f172a" }}>🔍 Types of Unusual Activity Detected</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
            {Object.entries(data.typeTotals).map(([type, count]) => {
              const f = friendly(type);
              return (
                <div key={type} style={{ background: f.bg, border: `1.5px solid ${f.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{f.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.label}</span>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: f.color }}>{count.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9196a8", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>

        {/* Donut */}
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#0f172a", alignSelf: "flex-start" }}>📅 Days Overview</h3>
          {!data.totalDays ? (
            <div style={{ color: "#b0b5c4", fontSize: 13, padding: "40px 0" }}>No data yet</div>
          ) : (
            <>
              <div style={{ width: 164, height: 164, margin: "4px 0 20px" }}>
                <canvas ref={donutRef} width={164} height={164} />
              </div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { dot: "#10b981", label: "Normal days",      val: data.cleanDays.toLocaleString() },
                  { dot: "#f87171", label: "Days with alerts", val: data.totalAnomalies.toLocaleString(), bold: true },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.dot, display: "inline-block" }} />
                      {r.label}
                    </div>
                    <span style={{ fontWeight: r.bold ? 700 : 500, color: r.bold ? "#ef4444" : "#374151" }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #f0f1f6", paddingTop: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#9196a8" }}>Alert rate</span>
                    <span style={{ fontWeight: 600, color: +overallRate > 5 ? "#ef4444" : "#10b981" }}>{overallRate}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
                    <span style={{ color: "#9196a8" }}>Overall status</span>
                    <span style={{ background: overallSev.bg, color: overallSev.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                      {overallSev.label}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bar chart */}
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>📊 What Types of Alerts Were Detected?</h3>
          <p style={{ fontSize: 12, color: "#9196a8", margin: "0 0 20px" }}>Each bar shows how many patient-days were flagged for that type of unusual activity</p>
          {!Object.keys(data.typeTotals).length ? (
            <div style={{ color: "#b0b5c4", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No anomaly data yet</div>
          ) : (
            <>
              <div style={{ position: "relative", height: 160 }}>
                <canvas ref={barRef} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {Object.keys(data.typeTotals).map(type => {
                  const f = friendly(type);
                  return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, background: f.bg, border: `1px solid ${f.border}`, borderRadius: 20, padding: "4px 12px" }}>
                      <span style={{ fontSize: 12 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: f.color }}>{f.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#0f172a" }}>🕐 Recent Analyses</h3>
        {data.results.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>No analyses yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Patient Home", "Study Type", "Days Monitored", "Unusual Days", "Alert Rate", "Date"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #f0f1f6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((r, i) => {
                  const rate = r.total_days > 0 ? ((r.total_anomalies / r.total_days) * 100).toFixed(1) : 0;
                  const sev  = severityOf(+rate);
                  return (
                    <tr key={r.id ?? i} style={{ borderBottom: "1px solid #f8f9fc" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafbff"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1e293b" }}>🏠 {r.home_name || `Home #${r.home_id}`}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: "#eef2ff", color: "#6366f1", border: "1px solid #c7d2fe", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          {r.pipeline}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{r.total_days}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: r.total_anomalies > 0 ? "#fee2e2" : "#ecfdf5", color: r.total_anomalies > 0 ? "#ef4444" : "#059669", borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 12 }}>
                          {r.total_anomalies}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: sev.bg, color: sev.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                          {rate}% — {sev.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12 }}>
                        {new Date(r.analyzed_at || r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}