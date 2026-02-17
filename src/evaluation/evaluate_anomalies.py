import os
import torch
import pandas as pd
import numpy as np
import sys
import joblib

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

def evaluate():
    processed_path = os.path.join(project_root, "data", "processed", "processed_full_year_dataset.csv")
    scaler_path = os.path.join(project_root, "data", "processed", "scaler.joblib")
    model_path = os.path.join(project_root, "models", "saved_models", "autoencoder_best.pth")
    
    output_dir = os.path.join(project_root, "data", "results")
    os.makedirs(output_dir, exist_ok=True) 
    output_path = os.path.join(output_dir, "anomaly_evaluation_summary.csv") 
    
    df = pd.read_csv(processed_path)
    consumption_cols = [f"m_{i}" for i in range(1, 1441)]
    data = df[consumption_cols].values

    scaler = joblib.load(scaler_path)
    model = Autoencoder(input_dim=1440)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    # 1. Calcul de l'erreur de reconstruction pour les jours "normaux"
    data_tensor = torch.tensor(data, dtype=torch.float32)
    with torch.no_grad():
        reconstructions = model(data_tensor).numpy()
    
    mse_normal = np.mean((data - reconstructions)**2, axis=1)
    threshold = np.mean(mse_normal) + 3 * np.std(mse_normal)
    
    print(f"Normal MSE - Mean: {np.mean(mse_normal):.6f}, Std: {np.std(mse_normal):.6f}")
    print(f"Detection Threshold (Mean + 3*Std): {threshold:.6f}")
    
    # 2. Test de différents types d'anomalies
    anomalies = {
        "Huge Spike (5kW)": lambda x: x + 5000,
        "Small Spike (500W)": lambda x: x + 500,
        "Zero Consumption": lambda x: x * 0,
        "Constant High (2kW)": lambda x: np.full_like(x, 2000)
    }
    
    results = []
    
    for name, func in anomalies.items():
        # Sélection d'un jour aléatoire
        idx = np.random.randint(len(data))
        orig_day_norm = data[idx].copy()
        
        # Correction : Utilisation d'un DataFrame pour éviter l'avertissement sklearn
        orig_day_norm_df = pd.DataFrame(orig_day_norm.reshape(1, -1), columns=consumption_cols)
        orig_day = scaler.inverse_transform(orig_day_norm_df)
        
        # Application de l'anomalie sur une fenêtre (ex: 2 heures entre 10h et 12h)
        anomalous_day = orig_day.copy()
        anomalous_day[0, 600:720] = func(anomalous_day[0, 600:720])
        
        # Correction : Transformation inverse avec DataFrame pour les noms de colonnes
        anomalous_day_df = pd.DataFrame(anomalous_day, columns=consumption_cols)
        anomalous_day_norm = scaler.transform(anomalous_day_df).flatten()
        
        # Prédiction avec le modèle
        with torch.no_grad():
            input_tensor = torch.tensor(anomalous_day_norm, dtype=torch.float32).unsqueeze(0)
            recon = model(input_tensor).numpy().flatten()
        
        # Calcul de la MSE et détection
        mse = np.mean((anomalous_day_norm - recon)**2)
        detected = mse > threshold
        
        results.append({
            "Anomaly Type": name,
            "MSE": f"{mse:.6f}",
            "Detected": "YES" if detected else "NO"
        })
    

    results_df = pd.DataFrame(results)
    print("\nAnomaly Detection Evaluation Results:")
    print(results_df.to_string(index=False))
    
    # Sauvegarde des résultats dans data/results/
    results_df.to_csv(output_path, index=False)
    print(f"\nReport saved to: {output_path}")

if __name__ == "__main__":
    evaluate()
