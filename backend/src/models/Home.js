const pool = require("../config/db");

const createHomesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS homes (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(150)  NOT NULL,
      location    VARCHAR(255),
      user_id     INTEGER       REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMP     DEFAULT NOW()
    );
  `);
  console.log("✅ Homes table ready");
};

const findAllByUser = async (userId) => {
  const result = await pool.query(
    "SELECT * FROM homes WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
};

const findById = async (id, userId) => {
  const result = await pool.query(
    "SELECT * FROM homes WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0] || null;
};

const createHome = async (name, location, userId) => {
  const result = await pool.query(
    `INSERT INTO homes (name, location, user_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, location || null, userId]
  );
  return result.rows[0];
};

const updateHome = async (id, name, location, userId) => {
  const result = await pool.query(
    `UPDATE homes SET name = $1, location = $2
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [name, location || null, id, userId]
  );
  return result.rows[0] || null;
};

const deleteHome = async (id, userId) => {
  const result = await pool.query(
    "DELETE FROM homes WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createHomesTable,
  findAllByUser,
  findById,
  createHome,
  updateHome,
  deleteHome,
};