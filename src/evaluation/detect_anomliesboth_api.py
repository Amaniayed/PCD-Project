"""
detect_anomalies_api.py
=======================
Universal script — supports BOTH pipelines:
  - REFIT dataset     (real homes)
  - Simulator dataset (generated data)

Usage:
    python detect_anomalies_api.py <csv_path> <model_path> <val_path> <scaler_path>
"""

import torch
import pandas as pd
import numpy as np
import os, sys, json, joblib

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

CONSUMPTION_COLS = [f"m_{i}" for i in range(1, 1441)]
K = 3.0


def preprocess_csv(csv_path, scaler_path):
    if not os.path.exists(scaler_path):
        return None, None, f"Scaler not found: {scaler_path}. Run preprocessing first."
    scaler = joblib.load(scaler_path)

    if not os.path.exists(csv_path):
        return None, None, f"CSV not found: {csv_path}"

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        return None, None, f"Cannot read CSV: {e}"

    missing = [c for c in CONSUMPTION_COLS if c not in df.columns]
    if missing:
        return None, None, f"CSV missing {len(missing)} columns (m_1…m_1440). Upload a processed dataset."

    if len(df) == 0:
        return None, None, "CSV is empty."

    raw = np.clip(df[CONSUMPTION_COLS].values.astype("float32"), 0, 20000)
    raw = np.nan_to_num(raw, nan=0.0)

    # ✅ transform only — NEVER fit_transform on new data
    normalized = scaler.transform(raw)
    return torch.tensor(normalized, dtype=torch.float32), df, None


def compute_threshold(model, val_tensor, k):
    model.eval()
    with torch.no_grad():
        mse = torch.mean((val_tensor - model(val_tensor)) ** 2, dim=1).numpy()
    return float(np.mean(mse) + k * np.std(mse))


def detect(model, test_tensor, threshold):
    model.eval()
    with torch.no_grad():
        mse = torch.mean((test_tensor - model(test_tensor)) ** 2, dim=1).numpy()
    return (mse > threshold).astype(int), mse


def main():
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: detect_anomalies_api.py <csv> <model> <val> <scaler>"}))
        sys.exit(1)

    csv_path, model_path, val_path, scaler_path = sys.argv[1:5]

    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model not found: {model_path}. Train the model first."}))
        sys.exit(1)

    model = Autoencoder(input_dim=1440)
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    test_tensor, test_df, err = preprocess_csv(csv_path, scaler_path)
    if err:
        print(json.dumps({"error": err}))
        sys.exit(1)

    if not os.path.exists(val_path):
        print(json.dumps({"error": f"Validation data not found: {val_path}. Train the model first."}))
        sys.exit(1)

    val_df     = pd.read_csv(val_path)
    val_tensor = torch.tensor(val_df[CONSUMPTION_COLS].values.astype("float32"), dtype=torch.float32)

    threshold  = compute_threshold(model, val_tensor, K)
    preds, mse = detect(model, test_tensor, threshold)

    has_type   = "anomaly_type" in test_df.columns
    type_counts = {"Temporal Shift": 0, "Duration": 0, "Order": 0, "Unknown": 0}
    anomalies   = []

    for i, (is_anom, score) in enumerate(zip(preds, mse)):
        if is_anom:
            a_type = str(test_df.iloc[i]["anomaly_type"]) if has_type else "Unknown"
            if a_type == "None": a_type = "Unknown"
            if a_type not in type_counts: a_type = "Unknown"
            type_counts[a_type] += 1
            anomalies.append({
                "day_index":            int(i),
                "date":                 str(test_df.iloc[i]["Date"]) if "Date" in test_df.columns else f"Day {i+1}",
                "reconstruction_error": float(round(float(score), 6)),
                "anomaly_type":         a_type,
            })

    print(json.dumps({
        "total_days":      int(len(test_df)),
        "total_anomalies": int(np.sum(preds)),
        "threshold":       float(round(threshold, 6)),
        "k_value":         K,
        "type_counts":     type_counts,
        "anomalies":       anomalies,
    }))

if __name__ == "__main__":
    main()