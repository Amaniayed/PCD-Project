const { spawn } = require("child_process");
const path       = require("path");
const fs         = require("fs");
const PROJECT_ROOT  = path.resolve(__dirname, "..", "..", "..");
const PYTHON_SCRIPT = path.join(PROJECT_ROOT, "src", "evaluation", "detect_anomalies_api.py");
const MODEL_PATH    = path.join(PROJECT_ROOT, "models", "saved_models", "autoencoder_best.pth");
const VAL_PATH      = path.join(PROJECT_ROOT, "data", "validation", "normal_validation_dataset.csv");

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

/**
 * POST /analyze/:datasetId
 */
const analyzeDataset = (req, res) => {
  const filePath = req.datasetFilePath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ detail: "CSV file not found on disk." });
  }
  if (!fs.existsSync(MODEL_PATH)) {
    return res.status(503).json({
      detail: "Model not trained yet. Please run train_autoencoder.py first.",
      model_path: MODEL_PATH,
    });
  }

  // Call: python detect_anomalies_api.py <csv_path> <model_path> <val_path>
  const args = [PYTHON_SCRIPT, filePath, MODEL_PATH, VAL_PATH];
  console.log(`[analyze] Running: ${PYTHON_BIN} ${args.join(" ")}`);

  const py   = spawn(PYTHON_BIN, args);
  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  py.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  py.on("close", (code) => {
    if (code !== 0) {
      console.error("[analyze] Python error:\n", stderr);
      return res.status(500).json({
        detail: "Analysis failed.",
        python_error: stderr.slice(-500),
      });
    }
    try {
      const result = JSON.parse(stdout.trim());
      if (result.error) return res.status(400).json({ detail: result.error });
      return res.json(result);
    } catch {
      return res.status(500).json({ detail: "Invalid output from analysis script." });
    }
  });

  py.on("error", (err) => {
    res.status(500).json({
      detail: `Cannot start Python. Make sure '${PYTHON_BIN}' is installed.`,
    });
  });
};

module.exports = { analyzeDataset };