import os
import torch
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
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

def detect_anomalies():
    processed_path = os.path.join(project_root, "data", "processed", "processed_full_year_dataset.csv")
    scaler_path = os.path.join(project_root, "data", "processed", "scaler.joblib")
    model_path = os.path.join(project_root, "models", "saved_models", "autoencoder_best.pth")

    df = pd.read_csv(processed_path)
    consumption_cols = [f"m_{i}" for i in range(1, 1441)]
    data = df[consumption_cols].values

    scaler = joblib.load(scaler_path)
    model = Autoencoder(input_dim=1440)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    

    sample_idx = 0
    normal_sample = data[sample_idx].copy()
    
    # Create an anomalous sample by injecting a spike
    anomalous_sample = normal_sample.copy()
    # Inject a massive spike (e.g., 5000W) between 14:00 and 15:00 (minutes 840 to 900)
    # Let\'s use the inverse transform to see original values, modify, then transform back.
    #add 5000W between: Minute 840 → 14:00 /Minute 900 → 15:00 
    normal_sample_orig = scaler.inverse_transform(normal_sample.reshape(1, -1))
    anomalous_sample_orig = normal_sample_orig.copy()
    anomalous_sample_orig[0, 840:900] += 5000 
    #Normalize Again
    anomalous_sample = scaler.transform(anomalous_sample_orig).flatten()
    
  
    normal_tensor = torch.tensor(normal_sample, dtype=torch.float32).unsqueeze(0)
    anomalous_tensor = torch.tensor(anomalous_sample, dtype=torch.float32).unsqueeze(0)
    
    # Reconstruction
    with torch.no_grad():
        normal_recon = model(normal_tensor).numpy().flatten()
        anomalous_recon = model(anomalous_tensor).numpy().flatten()
    
    # Calculate Reconstruction Error (MSE per point)
    normal_error = np.mean((normal_sample - normal_recon)**2)
    anomalous_error = np.mean((anomalous_sample - anomalous_recon)**2)
    #If anomaly exists: Reconstruction error should increase
    
    print(f"Normal Sample Reconstruction Error (MSE): {normal_error:.6f}")
    print(f"Anomalous Sample Reconstruction Error (MSE): {anomalous_error:.6f}")
    print(f"Ratio: {anomalous_error / normal_error:.2f}x higher error for anomaly")
    
    # Visualization
    plt.figure(figsize=(15, 10))
    
    # Normal Sample
    plt.subplot(2, 1, 1)
    plt.plot(normal_sample, label='Original (Normal)', color='blue', alpha=0.7)
    plt.plot(normal_recon, label='Reconstructed', color='red', linestyle='--')
    plt.title(f'Normal Day Reconstruction (MSE: {normal_error:.6f})')
    plt.legend()
    
    # Anomalous Sample
    plt.subplot(2, 1, 2)
    plt.plot(anomalous_sample, label='Original (Anomalous)', color='green', alpha=0.7)
    plt.plot(anomalous_recon, label='Reconstructed', color='red', linestyle='--')
    plt.title(f'Anomalous Day Reconstruction (MSE: {anomalous_error:.6f})')
    plt.legend()
    
    plt.tight_layout()
    
    # Create reports/anomaly directory if it doesn't exist
    output_dir = os.path.join(project_root, "reports", "anomaly")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "anomaly_detection_results.png")

    plt.savefig(output_path)
    print(f"Results saved to {output_path}")

if __name__ == "__main__":
    detect_anomalies()