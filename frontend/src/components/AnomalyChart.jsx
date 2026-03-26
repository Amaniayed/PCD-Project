import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ScatterChart,
    Scatter,
    Legend,
  } from "recharts";
  
  // Custom dot: red for anomalies, blue for normal
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    const color = payload.is_anomaly ? "#f87171" : "#818cf8";
    const r = payload.is_anomaly ? 6 : 4;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        stroke={payload.is_anomaly ? "#fca5a5" : "#a5b4fc"}
        strokeWidth={payload.is_anomaly ? 2 : 1}
        opacity={0.9}
      />
    );
  };
  
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{
        background: "rgba(10,10,15,0.95)",
        border: `1px solid ${d?.is_anomaly ? "rgba(248,113,113,0.4)" : "rgba(129,140,248,0.4)"}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        color: "#fff",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: d?.is_anomaly ? "#f87171" : "#818cf8" }}>
          {d?.is_anomaly ? "⚠ Anomaly" : "✓ Normal"}
        </div>
        <div>Value: <strong>{typeof d?.value === "number" ? d.value.toFixed(3) : d?.value}</strong></div>
        {d?.score !== undefined && (
          <div>Score: <strong>{d.score.toFixed(3)}</strong></div>
        )}
        {d?.timestamp && <div style={{ color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{d.timestamp}</div>}
      </div>
    );
  };
  
  export default function AnomalyChart({ data = [] }) {
    if (!data.length) {
      return (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          No data to display yet. Run a detection to see results.
        </div>
      );
    }
  
    // Prepare indexed data
    const chartData = data.map((d, i) => ({ ...d, index: i }));
    const normal = chartData.filter((d) => !d.is_anomaly);
    const anomalies = chartData.filter((d) => d.is_anomaly);
  
    return (
      <div>
        {/* Line chart for value over time */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>
            Signal over time — anomalies highlighted
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="index"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#818cf8"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 7, fill: "#6366f1" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
  
        {/* Scatter: value vs score */}
        <div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>
            Value vs anomaly score
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="value"
                name="Value"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                dataKey="score"
                name="Score"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "4 4", stroke: "rgba(255,255,255,0.1)" }} />
              <Legend
                formatter={(v) => <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{v}</span>}
              />
              <Scatter name="Normal" data={normal} fill="#818cf8" opacity={0.7} />
              <Scatter name="Anomaly" data={anomalies} fill="#f87171" opacity={0.9} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }