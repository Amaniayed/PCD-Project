// ── MUST be first — loads .env before any other require ──────────────────────
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const cors    = require("cors");

const authRoutes    = require("./routes/auth");
const homeRoutes    = require("./routes/homes");
const datasetRoutes = require("./routes/datasets");
const analyzeRoutes = require("./routes/analyze");     
const dashboardRoutes = require("./routes/dashboard");

const { createUsersTable }    = require("./models/User");
const { createHomesTable }    = require("./models/Home");
const { createDatasetsTable } = require("./models/Dataset");
const { createAnalysisResultsTable } = require("./models/AnalysisResult");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/homes",    homeRoutes);
app.use("/datasets", datasetRoutes);
app.use("/analyze",  analyzeRoutes);                 
app.use("/dashboard", dashboardRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok" }));

// ── Init DB → Start server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

const start = async () => {
  await createUsersTable();
  await createHomesTable();
  await createDatasetsTable();
  await createAnalysisResultsTable();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();

module.exports = app;