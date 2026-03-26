const { spawn } = require("child_process");
const path       = require("path");
const fs         = require("fs");
const { saveResult } = require("../models/AnalysisResult");

const PROJECT_ROOT  = path.resolve(__dirname, "..", "..", "..");
const PYTHON_SCRIPT = path.join(PROJECT_ROOT, "src", "evaluation", "detect_anomalies_api.py");
const PYTHON_BIN    = process.env.PYTHON_BIN ||
  path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe");

const PIPELINES = {
  refit: {
    model:  path.join(PROJECT_ROOT, "models", "saved_models", "autoencoder_refit_best.pth"),
    val:    path.join(PROJECT_ROOT, "data",   "validation",   "refit_validation_dataset.csv"),
    scaler: path.join(PROJECT_ROOT, "data",   "processed",    "scaler_refit.joblib"),
    label:  "REFIT",
  },
  simulator: {
    model:  path.join(PROJECT_ROOT, "models", "saved_models", "autoencoder_best.pth"),
    val:    path.join(PROJECT_ROOT, "data",   "validation",   "normal_validation_dataset.csv"),
    scaler: path.join(PROJECT_ROOT, "data",   "processed",    "scaler.joblib"),
    label:  "Simulator",
  },
};

/**
 * POST /analyze/:datasetId
 * Body: { pipeline: "refit" | "simulator" }
 */
const analyzeDataset = (req, res) => {
  const filePath  = req.datasetFilePath;
  const dataset   = req.dataset;           // full dataset object from route
  const pipeline  = req.body?.pipeline || "refit";
  const config    = PIPELINES[pipeline];

  if (!config) {
    return res.status(400).json({
      detail: `Unknown pipeline '${pipeline}'. Use 'refit' or 'simulator'.`,
    });
  }

  // ── Checks ────────────────────────────────────────────────
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ detail: "CSV file not found on disk." });
  }
  if (!fs.existsSync(config.model)) {
    return res.status(503).json({
      detail: `${config.label} model not trained yet.`,
      hint:   pipeline === "refit"
        ? "Run train_autoencoder_refit.py first."
        : "Run train_autoencoder.py first.",
    });
  }
  if (!fs.existsSync(config.scaler)) {
    return res.status(503).json({
      detail: `${config.label} scaler not found.`,
      hint:   pipeline === "refit"
        ? "Run preprocess_refit.py first."
        : "Run preprocess_data.py first.",
    });
  }
  if (!fs.existsSync(config.val)) {
    return res.status(503).json({
      detail: `${config.label} validation data not found.`,
    });
  }

  // ── Spawn Python ─────────────────────────────────────────
  const args = [PYTHON_SCRIPT, filePath, config.model, config.val, config.scaler];
  console.log(`[analyze] Pipeline : ${config.label}`);
  console.log(`[analyze] CSV      : ${filePath}`);

  const py   = spawn(PYTHON_BIN, args);
  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  py.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  py.on("close", async (code) => {
    if (code !== 0) {
      console.error("[analyze] Python error:\n", stderr);
      return res.status(500).json({
        detail:       "Analysis failed.",
        python_error: stderr.slice(-800),
      });
    }

    try {
      const lines    = stdout.trim().split("\n");
      const jsonLine = lines.reverse().find((l) => l.trim().startsWith("{"));
      if (!jsonLine) throw new Error("No JSON in Python output");

      const result = JSON.parse(jsonLine);
      if (result.error) return res.status(400).json({ detail: result.error });

      // ── Save result to DB ──────────────────────────────────
      try {
        await saveResult({
          dataset_id:      dataset.id,
          home_id:         dataset.home_id,
          user_id:         req.user.id,
          pipeline:        config.label,
          total_days:      result.total_days,
          total_anomalies: result.total_anomalies,
          threshold:       result.threshold,
          type_counts:     result.type_counts,
          anomalies:       result.anomalies,
        });
        console.log(`[analyze] Result saved to DB`);
      } catch (dbErr) {
        console.error("[analyze] Failed to save result to DB:", dbErr.message);
        // Don't fail the request — just log it
      }

      console.log(`[analyze] Done — ${result.total_days} days, ${result.total_anomalies} anomalies`);
      return res.json({ ...result, pipeline: config.label });
    } catch (e) {
      return res.status(500).json({ detail: "Invalid output from analysis script." });
    }
  });

  py.on("error", (err) => {
    console.error("[analyze] Cannot start Python:", err.message);
    return res.status(500).json({
      detail: `Cannot start Python ('${PYTHON_BIN}'). Make sure Python is installed.`,
    });
  });
};

module.exports = { analyzeDataset };