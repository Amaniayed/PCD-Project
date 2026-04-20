import { useEffect, useState } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DoctorOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Correct path: /analyze/results (no /api prefix)
        const res = await fetch(`${API}/analyze/results`, {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
          },
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const results = await res.json();
        if (!Array.isArray(results)) throw new Error("Invalid data format");

        const totalAnalyses  = results.length;
        const totalAnomalies = results.reduce((acc, r) => acc + (r.total_anomalies || 0), 0);
        const homes          = new Set(results.map(r => r.home_name)).size;
        const critical       = results.filter(r => r.total_anomalies > 5).length;

        setData({ totalAnalyses, totalAnomalies, homes, critical, results });
      } catch (err) {
        console.error("DoctorOverview error:", err);
        setError(err.message);
      }
    };

    fetchData();
  }, []);

  if (error) return (
    <div style={{ padding: 32, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "14px 18px", borderRadius: 10, fontSize: 14 }}>
        ⚠️ {error}
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ padding: 32, fontFamily: "'DM Sans',sans-serif", color: "#64748b" }}>
      Loading overview…
    </div>
  );

  const typeTotals = {};
  data.results.forEach(r => {
    if (r.type_counts) {
      Object.entries(r.type_counts).forEach(([type, count]) => {
        typeTotals[type] = (typeTotals[type] || 0) + count;
      });
    }
  });

  return (
    <div className="doctor-overview">

      {/* HEADER */}
      <div className="header">
        <h1>🧑‍⚕️ Medical Dashboard</h1>
        <p>Overview of patient anomalies and system activity</p>
      </div>

      {/* STAT CARDS */}
      <div className="cards">
        <Card title="Total Analyses"  value={data.totalAnalyses}  icon="📊" />
        <Card title="Total Anomalies" value={data.totalAnomalies} icon="⚠️" highlight />
        <Card title="Homes Monitored" value={data.homes}          icon="🏠" />
        <Card title="Critical Cases"  value={data.critical}       icon="🚨" danger />
      </div>

      {/* ANOMALY TYPE BREAKDOWN */}
      {Object.keys(typeTotals).length > 0 && (
        <div className="panel">
          <h3>Anomaly Types Across All Analyses</h3>
          <div className="type-grid">
            {Object.entries(typeTotals).map(([type, count]) => {
              const colors = {
                "Temporal Shift": { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
                "Duration":       { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
                "Order":          { bg: "#fdf4ff", border: "#e9d5ff", text: "#7c3aed" },
                "Unknown":        { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
              };
              const c = colors[type] || colors["Unknown"];
              return (
                <div key={type} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>{type}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT ANALYSES TABLE */}
      <div className="panel">
        <h3>Recent Analyses</h3>
        {data.results.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 14, padding: "12px 0" }}>No analyses yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                {["Home", "Pipeline", "Days", "Anomalies", "Rate", "Date"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map(r => {
                const rate = r.anomaly_rate ?? (r.total_days > 0 ? ((r.total_anomalies / r.total_days) * 100).toFixed(1) : 0);
                const severity = r.total_anomalies > 5 ? "danger" : r.total_anomalies > 2 ? "warning" : "ok";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{r.home_name || `Home #${r.home_id}`}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{r.pipeline}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{r.total_days}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className={`badge ${severity}`}>{r.total_anomalies}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{rate}%</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12 }}>
                      {new Date(r.analyzed_at || r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .doctor-overview {
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: 'DM Sans', sans-serif;
        }
        .header h1 { font-size: 24px; font-weight: 700; color: #0f172a; }
        .header p  { color: #64748b; font-size: 14px; margin-top: 4px; }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .card {
          background: white; border-radius: 14px; padding: 18px;
          border: 1px solid #e8eaf0;
          display: flex; flex-direction: column; gap: 8px; transition: 0.2s;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
        .card .top  { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; }
        .card .value { font-size: 26px; font-weight: 700; color: #0f172a; }
        .card.highlight { border-color: #6366f1; background: rgba(99,102,241,0.05); }
        .card.danger    { border-color: #ef4444; background: rgba(239,68,68,0.06); }

        .panel {
          background: white; border-radius: 14px;
          border: 1px solid #e8eaf0; padding: 20px;
        }
        .panel h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }

        .type-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }

        .badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
        .badge.ok      { background: #dcfce7; color: #16a34a; }
        .badge.warning { background: #fef3c7; color: #d97706; }
        .badge.danger  { background: #fee2e2; color: #dc2626; }

        @media (max-width: 900px) { .cards { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .cards { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Card({ title, value, icon, highlight, danger }) {
  return (
    <div className={`card ${highlight ? "highlight" : ""} ${danger ? "danger" : ""}`}>
      <div className="top"><span>{title}</span><span>{icon}</span></div>
      <div className="value">{value}</div>
    </div>
  );
}