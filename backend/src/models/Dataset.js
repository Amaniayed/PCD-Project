const pool = require("../config/db");

const createDatasetsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS datasets (
      id           SERIAL PRIMARY KEY,
      file_name    VARCHAR(255)  NOT NULL,
      file_path    VARCHAR(500)  NOT NULL,
      duration     VARCHAR(100),
      home_id      INTEGER       NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      upload_date  TIMESTAMP     DEFAULT NOW()
    );
  `);
  console.log("✅ Datasets table ready");
};

// Get all datasets for a given home (owned by user)
const findAllByHome = async (homeId, userId) => {
  const result = await pool.query(
    `SELECT d.* FROM datasets d
     JOIN homes h ON h.id = d.home_id
     WHERE d.home_id = $1 AND h.user_id = $2
     ORDER BY d.upload_date DESC`,
    [homeId, userId]
  );
  return result.rows;
};

// Get all datasets across all homes of a user
const findAllByUser = async (userId) => {
  const result = await pool.query(
    `SELECT d.*, h.name AS home_name FROM datasets d
     JOIN homes h ON h.id = d.home_id
     WHERE h.user_id = $1
     ORDER BY d.upload_date DESC`,
    [userId]
  );
  return result.rows;
};

const findById = async (id, userId) => {
  const result = await pool.query(
    `SELECT d.* FROM datasets d
     JOIN homes h ON h.id = d.home_id
     WHERE d.id = $1 AND h.user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
};

const createDataset = async (fileName, filePath, duration, homeId) => {
  const result = await pool.query(
    `INSERT INTO datasets (file_name, file_path, duration, home_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [fileName, filePath, duration || null, homeId]
  );
  return result.rows[0];
};

const updateDataset = async (id, duration, homeId, userId) => {
  const result = await pool.query(
    `UPDATE datasets d SET duration = $1, home_id = $2
     FROM homes h
     WHERE d.id = $3 AND d.home_id = h.id AND h.user_id = $4
     RETURNING d.*`,
    [duration || null, homeId, id, userId]
  );
  return result.rows[0] || null;
};

const deleteDataset = async (id, userId) => {
  const result = await pool.query(
    `DELETE FROM datasets d
     USING homes h
     WHERE d.home_id = h.id AND d.id = $1 AND h.user_id = $2
     RETURNING d.*`,
    [id, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createDatasetsTable,
  findAllByHome,
  findAllByUser,
  findById,
  createDataset,
  updateDataset,
  deleteDataset,
};