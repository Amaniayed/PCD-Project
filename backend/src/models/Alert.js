// src/api/models/Alert.js
const pool = require("../config/db");

// ── Create table ──────────────────────────────────────────
async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
      home_id             INTEGER REFERENCES homes(id) ON DELETE CASCADE,
      analysis_result_id  INTEGER REFERENCES analysis_results(id) ON DELETE CASCADE,
      home_name           TEXT,
      file_name           TEXT,
      pipeline            TEXT,
      anomaly_count       INTEGER DEFAULT 0,
      total_days          INTEGER DEFAULT 0,
      type_counts         JSONB   DEFAULT '{}',
      anomalies           JSONB   DEFAULT '[]',
      is_read             BOOLEAN DEFAULT FALSE,
      created_at          TIMESTAMP DEFAULT NOW()
    );
  `);
}

// ── Create one alert (called after analysis saves result) ─
async function create({
  user_id,
  home_id,
  analysis_result_id,
  home_name,
  file_name,
  pipeline,
  anomaly_count,
  total_days,
  type_counts,
  anomalies,
}) {
  const { rows } = await pool.query(
    `INSERT INTO alerts
       (user_id, home_id, analysis_result_id, home_name, file_name,
        pipeline, anomaly_count, total_days, type_counts, anomalies)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      user_id,
      home_id,
      analysis_result_id,
      home_name,
      file_name,
      pipeline,
      anomaly_count,
      total_days,
      JSON.stringify(type_counts),
      JSON.stringify(anomalies),
    ]
  );
  return rows[0];
}

// ── Get all alerts for a user (newest first) ──────────────
async function findByUser(user_id) {
  const { rows } = await pool.query(
    `SELECT * FROM alerts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [user_id]
  );
  return rows;
}

// ── Mark one alert as read ────────────────────────────────
async function markRead(id, user_id) {
  const { rows } = await pool.query(
    `UPDATE alerts SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, user_id]
  );
  return rows[0];
}

module.exports = { createTable, create, findByUser, markRead };