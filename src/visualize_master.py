import matplotlib.pyplot as plt
import os
from day_manager_simulator import MasterDayManager

def visualize_each_scenario():
    manager = MasterDayManager()
    
    # Dictionnaire complet des 20 scénarios
    scenarios = {
        1: "Daily Routine", 2: "Routine + Laundry", 3: "Routine + Light Cleaning",
        4: "Laundry + Cleaning", 5: "Routine + Cooking", 6: "Laundry + Cooking + Guests",
        7: "Social Day", 8: "Big Cleaning", 9: "Outside Day", 10: "Extreme Cold Day",
        11: "Radio Fan Day", 12: "Winter Tea Day", 13: "Weekly Laundry",
        14: "Grandchildren Visit", 15: "Small Maintenance", 16: "Early Bird Morning",
        17: "Traditional Lunch Cooking", 18: "Computer Hobby Session", 19: "Monthly Steam Cleaning",
        20: "Rest and Sick Day"
    }

    # Création du dossier de destination
    output_dir = "reports/scenarios_individuels"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Dossier créé : {output_dir}")

    print("Génération des graphiques individuels...")

    for sid, name in scenarios.items():
        # Générer les données
        data = manager.generate_day(sid)
        minutes = list(data.keys())
        watts = list(data.values())

        # Création de la figure
        plt.figure(figsize=(12, 6))
        
        # Coloration différente pour rendre ça joli
        plt.plot(minutes, watts, color='tab:blue', linewidth=1.5, label='Consommation (W)')
        
        # Remplissage sous la courbe pour un effet visuel pro
        plt.fill_between(minutes, watts, color='tab:blue', alpha=0.2)

        # Configuration des axes et titres
        plt.title(f"Scénario {sid} : {name}", fontsize=16, fontweight='bold')
        plt.xlabel("Temps (Minutes de 1 à 1440)", fontsize=12)
        plt.ylabel("Puissance (Watts)", fontsize=12)
        plt.grid(True, linestyle='--', alpha=0.5)
        plt.xlim(1, 1440)
        plt.ylim(0, 5500) # Garder la même échelle pour comparer facilement les fichiers

        # Ajout d'une zone grise pour la nuit (Sommeil : 22h-6h)
        # 0 à 360 min (0h-6h) et 1320 à 1440 min (22h-0h)
        plt.axvspan(1, 360, color='gray', alpha=0.1, label='Nuit (Sommeil)')
        plt.axvspan(1320, 1440, color='gray', alpha=0.1)

        plt.legend()
        
        # Sauvegarde
        file_name = f"scenario_{sid}_{name.lower().replace(' ', '_')}.png"
        save_path = os.path.join(output_dir, file_name)
        plt.savefig(save_path)
        
        # Fermer la figure pour libérer la mémoire vive
        plt.close()
        print(f"Sauvegardé : {file_name}")

if __name__ == "__main__":
    visualize_each_scenario()