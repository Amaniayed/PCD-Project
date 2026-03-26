const express    = require("express");
const router     = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { findById } = require("../models/Dataset");
const { analyzeDataset } = require("../controllers/analyzeController");
const { analyzeDatasetboth } = require("../controllers/analyzeControllerboth");

router.use(protect);

router.post("/:datasetId", async (req, res, next) => {
  try {
    const dataset = await findById(req.params.datasetId, req.user.id);
    if (!dataset) {
      return res.status(404).json({ detail: "Dataset not found." });
    }
    req.datasetFilePath = dataset.file_path;
    req.dataset         = dataset;          // ← pass full object for saving result
    next();
  } catch (err) {
    console.error("[analyze route]", err);
    res.status(500).json({ detail: "Failed to load dataset metadata." });
  }
}, analyzeDataset);
router.post("/:datasetId", async (req, res, next) => {
  try {
    const dataset = await findById(req.params.datasetId, req.user.id);
    if (!dataset) {
      return res.status(404).json({ detail: "Dataset not found." });
    }
    req.datasetFilePath = dataset.file_path;
    req.dataset         = dataset;          // ← pass full object for saving result
    next();
  } catch (err) {
    console.error("[analyze route]", err);
    res.status(500).json({ detail: "Failed to load dataset metadata." });
  }
}, analyzeDatasetboth);
module.exports = router;