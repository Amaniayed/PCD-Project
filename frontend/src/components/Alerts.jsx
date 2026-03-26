import { useEffect, useState } from "react";
import { anomalyService } from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | anomaly | normal

  useEffect(() => {
    const load = async () => {
      try {
        const data = await anomalyService.getResults();
        setAlerts(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = alerts.filter((a) => {
    if (filter === "anomaly") return a.is_anomaly;
    if (filter === "normal") return !a.is_anomaly;
    return true;
  });

  const anomalyCount = alerts.filter((a) => a.is_anomaly).length;

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <div>
          <h2>Alerts</h2>
          <p>{anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"} detected</p>
        </div>
        <div className="filter-tabs">
          {["all", "anomaly", "normal"].map((f) => (
            <button
              key={f}
              className={`tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "anomaly" && anomalyCount > 0 && (
                <span className="tab-badge">{anomalyCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="alert-empty">Loading alerts…</div>
      ) : filtered.length === 0 ? (
        <div className="alert-empty">No {filter !== "all" ? filter : ""} alerts found.</div>
      ) : (
        <div className="alert-list">
          {filtered.slice().reverse().map((alert, i) => (
            <div
              key={i}
              className={`alert-item ${alert.is_anomaly ? "is-anomaly" : "is-normal"}`}
            >
              <div className="alert-dot" />
              <div className="alert-body">
                <div className="alert-title">
                  {alert.is_anomaly ? "⚠ Anomaly Detected" : "✓ Normal Reading"}
                </div>
                <div className="alert-meta">
                  <span>Value: <strong>{typeof alert.value === "number" ? alert.value.toFixed(3) : alert.value}</strong></span>
                  {alert.score !== undefined && (
                    <span>Score: <strong>{alert.score.toFixed(3)}</strong></span>
                  )}
                  {alert.label && <span>Label: <strong>{alert.label}</strong></span>}
                </div>
                {alert.timestamp && (
                  <div className="alert-time">{new Date(alert.timestamp).toLocaleString()}</div>
                )}
              </div>
              <div className={`alert-badge ${alert.is_anomaly ? "badge-red" : "badge-green"}`}>
                {alert.is_anomaly ? "ALERT" : "OK"}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .alerts-panel { color: #fff; font-family: 'DM Sans', sans-serif; }
        .alerts-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .alerts-header h2 { font-size: 20px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.3px; }
        .alerts-header p { font-size: 13px; color: rgba(255,255,255,0.35); margin: 0; }
        .filter-tabs { display: flex; gap: 8px; }
        .tab {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tab:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .tab.active { background: rgba(129,140,248,0.2); border-color: rgba(129,140,248,0.4); color: #818cf8; }
        .tab-badge {
          background: #f87171;
          color: #fff;
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 11px;
          font-weight: 700;
        }
        .alert-empty {
          text-align: center;
          padding: 48px;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
        }
        .alert-list { display: flex; flex-direction: column; gap: 10px; }
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid;
          transition: background 0.15s;
        }
        .alert-item.is-anomaly {
          background: rgba(239,68,68,0.05);
          border-color: rgba(239,68,68,0.2);
        }
        .alert-item.is-normal {
          background: rgba(52,211,153,0.04);
          border-color: rgba(52,211,153,0.1);
        }
        .alert-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .is-anomaly .alert-dot { background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.5); }
        .is-normal .alert-dot { background: #34d399; }
        .alert-body { flex: 1; }
        .alert-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
        .is-anomaly .alert-title { color: #f87171; }
        .is-normal .alert-title { color: #34d399; }
        .alert-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: rgba(255,255,255,0.5); }
        .alert-meta strong { color: rgba(255,255,255,0.85); }
        .alert-time { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 6px; }
        .alert-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          border-radius: 6px;
          padding: 3px 10px;
          flex-shrink: 0;
        }
        .badge-red { background: rgba(239,68,68,0.2); color: #f87171; }
        .badge-green { background: rgba(52,211,153,0.15); color: #34d399; }
      `}</style>
    </div>
  );
}