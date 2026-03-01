import torch
import pandas as pd
import numpy as np
import os
import sys
import matplotlib.pyplot as plt
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from src.training.autoencoder import Autoencoder
except ImportError:
    try:
        from src.training.autoencoder import Autoencoder
    except ImportError:
        sys.path.append(os.path.join(project_root, "src"))
        from src.training.autoencoder import Autoencoder
from sklearn.metrics import precision_score, recall_score, f1_score
def compute_threshold(model, val_tensor, k):
    model.eval()
    with torch.no_grad():
        recon = model(val_tensor)
        mse = torch.mean((val_tensor - recon)**2, dim=1).numpy()

    mu = np.mean(mse)
    sigma = np.std(mse)
    threshold = mu + k * sigma
    return threshold

def detect_on_test(model, test_tensor, threshold):
    model.eval()
    with torch.no_grad():
        recon = model(test_tensor)
        mse = torch.mean((test_tensor - recon)**2, dim=1).numpy()

    preds = (mse > threshold).astype(int)
    return preds, mse

def main():
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )
    model_path = os.path.join(base_dir, "models", "saved_models", "autoencoder_best.pth")
    normal_val_path = os.path.join(base_dir, "data", "validation", "normal_validation_dataset.csv")

    anomalous_path = os.path.join(base_dir, "data", "anomalous", "anomalous_dataset.csv")
    
    if not os.path.exists(model_path):
        print("Model not found. Please run train_autoencoder.py first.")
        return
    
    model = Autoencoder(input_dim=1440)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    val_df = pd.read_csv(normal_val_path)
    consumption_cols = [f"m_{i}" for i in range(1, 1441)]

    val_data = val_df[consumption_cols].values
    val_tensor = torch.tensor(val_data, dtype=torch.float32)

    test_df = pd.read_csv(anomalous_path)
    test_data = test_df[consumption_cols].values
    true_labels = test_df["is_anomaly"].values
    anomaly_types = test_df["anomaly_type"].values

    test_tensor = torch.tensor(test_data, dtype=torch.float32)


    k_values = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5]

    summary = []
    for k in k_values:
        threshold = compute_threshold(model, val_tensor, k)
        preds, mse = detect_on_test(model, test_tensor, threshold)
        
        precision = precision_score(true_labels, preds, zero_division=0)
        recall = recall_score(true_labels, preds, zero_division=0)
        f1 = f1_score(true_labels, preds, zero_division=0)
        
        type_recall = {}
        for t in ["Temporal Shift", "Duration", "Order"]:
            mask = anomaly_types == t
            if np.sum(mask) > 0:
                type_recall[t] = recall_score(
                    true_labels[mask], preds[mask], zero_division=0
                )
            else:
                type_recall[t] = 0.0
        
        summary.append({
            "k": k,
                "threshold": threshold,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "recall_temporal": type_recall["Temporal Shift"],
                "recall_duration": type_recall["Duration"],
                "recall_order": type_recall["Order"],
                "detected_count": np.sum(preds),
                "total_anomalies": np.sum(true_labels),
        })
        print(
            f"k={k} | Precision={precision:.3f} | Recall={recall:.3f} | F1={f1:.3f}"
        )
    
    results_dir = os.path.join(os.getcwd(), "data", "results")
    os.makedirs(results_dir, exist_ok=True) 

    summary_df = pd.DataFrame(summary)
    summary_path = os.path.join(results_dir, "detection_summary.csv")
    summary_df.to_csv(summary_path, index=False)

    print("\nDetection summary saved to:", summary_path)
    best_k = 2.5 
    best_threshold = compute_threshold(model, val_tensor, best_k)
    best_preds, best_mse = detect_on_test(model, test_tensor, best_threshold)

    test_df["reconstruction_error"] = best_mse
    test_df["predicted_label"] = best_preds

    error_output_path = os.path.join(results_dir, "test_with_errors.csv")
    test_df.to_csv(error_output_path, index=False)

    print("Saved reconstruction errors to:", error_output_path)
    

    plt.figure(figsize=(8,6))

    plt.plot(summary_df["k"], summary_df["precision"], marker='o', label="Precision")
    plt.plot(summary_df["k"], summary_df["recall"], marker='o', label="Recall")
    plt.plot(summary_df["k"], summary_df["f1"], marker='o', label="F1-score")

    plt.xlabel("k value")
    plt.ylabel("Score")
    plt.title("Performance Metrics vs k")
    plt.legend()
    plt.grid(True)
    reports_dir = os.path.join(base_dir, "reports")
    figures_dir = os.path.join(reports_dir, "figures")
    plot1_path = os.path.join(figures_dir, "k_comparison_plot.png")
    plt.savefig(plot1_path, dpi=150, bbox_inches='tight')
    print(f"Graphique sauvegardé: {plot1_path}")
    plt.show()
    plt.figure(figsize=(8,6))

    plt.plot(summary_df["k"], summary_df["recall_temporal"], marker='o', label="Temporal")
    plt.plot(summary_df["k"], summary_df["recall_duration"], marker='o', label="Duration")
    plt.plot(summary_df["k"], summary_df["recall_order"], marker='o', label="Order")

    plt.xlabel("k value")
    plt.ylabel("Recall")
    plt.title("Recall per Anomaly Type vs k")
    plt.legend()
    plt.grid(True)
    plot1_path = os.path.join(figures_dir, "recall_per_type.png")
    plt.savefig(plot1_path, dpi=150, bbox_inches='tight')
    print(f"Graphique sauvegardé: {plot1_path}")
    plt.show()
    

if __name__ == "__main__":
    main()