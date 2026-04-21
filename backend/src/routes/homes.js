const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getAll, getOne, create, update, remove } = require("../controllers/homeController");
const pool = require("../config/db");

router.use(protect);

router.get("/",      getAll);   // GET    /homes

// ⚠️ Must be BEFORE /:id to avoid being swallowed by it
router.get("/:id/contacts", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM home_contacts WHERE home_id = $1 ORDER BY type, id",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[homes/contacts]", err.message);
    res.status(500).json({ detail: "Failed to fetch contacts." });
  }
});

router.get("/:id",   getOne);   // GET    /homes/:id
router.post("/",     create);   // POST   /homes
router.put("/:id",   update);   // PUT    /homes/:id
router.delete("/:id",remove);   // DELETE /homes/:id

module.exports = router;