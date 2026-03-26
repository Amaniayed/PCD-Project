const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getAll, getOne, create, update, remove } = require("../controllers/homeController");

router.use(protect);

router.get("/",      getAll);   // GET    /homes
router.get("/:id",   getOne);   // GET    /homes/:id
router.post("/",     create);   // POST   /homes
router.put("/:id",   update);   // PUT    /homes/:id
router.delete("/:id",remove);   // DELETE /homes/:id

module.exports = router;