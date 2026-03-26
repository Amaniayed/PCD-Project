"""
detect_anomalies_api.py
=======================
This is YOUR detect_anomalies.py — same logic, same model, same threshold.
Only difference: outputs JSON instead of plots (for the Node.js backend).

Usage:
    python detect_anomalies_api.py <csv_path> <model_path> <val_path>
"""

import torch
import pandas as pd
import numpy as np
import os
import sys
import json

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from src.models.autoencoder import Autoencoder
except ImportError:
    try:
        from models.autoencoder import Autoencoder
    except ImportError:
        sys.path.append(os.path.join(project_root, "src"))
        from models.autoencoder import Autoencoder


# ── Exact same functions as your detect_anomalies.py ─────────────────────────

def compute_threshold(model, val_tensor, k):
    model.eval()
    with torch.no_grad():
        recon = model(val_tensor)
        mse = torch.mean((val_tensor - recon)**2, dim=1).numpy()
    mu = np.mean(mse)
    sigma = np.std(mse)
    return mu + k * sigma


def detect_on_test(model, test_tensor, threshold):
    model.eval()
    with torch.no_grad():
        recon = model(test_tensor)
        mse = torch.mean((test_tensor - recon)**2, dim=1).numpy()
    preds = (mse > threshold).astype(int)
    return preds, mse


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: python detect_anomalies_api.py <csv> <model.pth> <val_csv>"}))
        sys.exit(1)

    csv_path   = sys.argv[1]
    model_path = sys.argv[2]
    val_path   = sys.argv[3]
    k          = 3  

    CONSUMPTION_COLS = [f"m_{i}" for i in range(1, 1441)]

    # ── Load model — exact same as your script ────────────────────────────────
    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model not found. Please run train_autoencoder.py first."}))
        sys.exit(1)

    model = Autoencoder(input_dim=1440)
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    # ── Load validation data (normal) — exact same as your script ─────────────
    if not os.path.exists(val_path):
        print(json.dumps({"error": f"Validation data not found at {val_path}. Run train_autoencoder.py first."}))
        sys.exit(1)

    val_df     = pd.read_csv(val_path)
    val_data   = val_df[CONSUMPTION_COLS].values
    val_tensor = torch.tensor(val_data, dtype=torch.float32)

    # ── Load uploaded test CSV ────────────────────────────────────────────────
    if not os.path.exists(csv_path):
        print(json.dumps({"error": f"CSV not found at {csv_path}"}))
        sys.exit(1)

    try:
        test_df = pd.read_csv(csv_path)
    except Exception as e:
        print(json.dumps({"error": f"Cannot read CSV: {e}"}))
        sys.exit(1)

    missing = [c for c in CONSUMPTION_COLS if c not in test_df.columns]
    if missing:
        print(json.dumps({"error": f"CSV missing {len(missing)} columns (m_1...m_1440). Upload a processed dataset."}))
        sys.exit(1)

    test_data   = test_df[CONSUMPTION_COLS].values
    test_tensor = torch.tensor(test_data, dtype=torch.float32)

    # ── Compute threshold — exact same as your script ─────────────────────────
    threshold = compute_threshold(model, val_tensor, k)

    # ── Detect — exact same as your script ───────────────────────────────────
    preds, mse = detect_on_test(model, test_tensor, threshold)

    # ── Build anomaly type counts ─────────────────────────────────────────────
    has_type_col = "anomaly_type" in test_df.columns
    type_counts  = {"Temporal Shift": 0, "Duration": 0, "Order": 0, "Unknown": 0}
    anomaly_details = []

    for i, (is_anomaly, score) in enumerate(zip(preds, mse)):
        if is_anomaly:
            # Use the label from CSV if available (your anomalous_dataset.csv has it)
            if has_type_col:
                a_type = str(test_df.iloc[i]["anomaly_type"])
                if a_type == "None":
                    a_type = "Unknown"   # false positive
            else:
                a_type = "Unknown"       # real-world CSV without labels

            if a_type in type_counts:
                type_counts[a_type] += 1
            else:
                type_counts["Unknown"] += 1

            date_val = str(test_df.iloc[i]["Date"]) if "Date" in test_df.columns else f"Day {i+1}"
            anomaly_details.append({
                "day_index":            int(i),
                "date":                 date_val,
                "reconstruction_error": float(round(float(score), 6)),
                "anomaly_type":         a_type,
            })

    result = {
        "total_days":      int(len(test_df)),
        "total_anomalies": int(np.sum(preds)),
        "threshold":       float(round(float(threshold), 6)),
        "k_value":         k,
        "type_counts":     type_counts,
        "anomalies":       anomaly_details,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()