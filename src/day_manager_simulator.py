import random
import os

class MasterDayManager:
    def __init__(self):
        # Puissances en Watts basées sur vos équipements
        self.LOADS = {
            "fridge": 100, "medical": 80, "night_lights": 30,
            "kettle": 2000, "microwave": 1000, "radio": 20,
            "tv": 120, "lights": 150, "heating": 400,
            "washing_machine": 1500, "vacuum": 800, "oven": 2500,
            "steam_cleaner": 1200, "computer": 60
        }

    def generate_day(self, scenario_id):
        data = {}
        for minute in range(1, 1441):
            h = (minute - 1) // 60
            m = (minute - 1) % 60
            
            # --- CHARGE DE BASE (Sommeil : 22h - 6h) ---
            is_sleep = (h >= 22 or h < 6)
            
            if is_sleep:
                # Le scénario 9 (Dehors) n'a pas de veilleuse la nuit
                nl = 0 if scenario_id == 9 else self.LOADS["night_lights"]
                current_load = self.LOADS["fridge"] + self.LOADS["medical"] + nl
            else:
                # Heures actives : Frigo + Médical + Bruit aléatoire pour le réalisme
                noise = random.uniform(0.98, 1.02)
                current_load = (self.LOADS["fridge"] + self.LOADS["medical"]) * noise
                
                # --- LOGIQUE DES SCÉNARIOS COHÉRENTS (SENIORS) ---
                
                if scenario_id == 9: # Outside Day
                    pass # Uniquement les charges de base
                else:
                    # Chauffage (Plus intense pour le scénario 10)
                    heat_mult = 2.0 if scenario_id == 10 else 1.0
                    if 7 <= h < 21: 
                        current_load += self.LOADS["heating"] * heat_mult
                    
                    # Éléments de routine (Lumières, Radio, Bouilloire)
                    if 6 <= h < 9: 
                        current_load += self.LOADS["lights"] + self.LOADS["radio"]
                        if (h == 6 and 30 <= m < 35) or (h == 8 and 0 <= m < 5): 
                            current_load += self.LOADS["kettle"]
                    
                    if h == 12:
                        current_load += self.LOADS["lights"]
                        if 10 <= m < 20: current_load += self.LOADS["microwave"]
                        if scenario_id in [6, 7]: current_load += self.LOADS["kettle"]
                    
                    if 13 <= h < 22:
                        current_load += self.LOADS["tv"]
                        if h >= 17: current_load += self.LOADS["lights"]
                    
                    # Scénarios spécifiques
                    if scenario_id in [2, 4, 6] and h == 10:
                        current_load += self.LOADS["washing_machine"]
                    
                    if scenario_id in [3, 4] and h == 14 and m < 30:
                        current_load += self.LOADS["vacuum"]
                    
                    if scenario_id in [5, 6] and h == 18 and 30 <= m < 60:
                        current_load += self.LOADS["oven"]
                    
                    if scenario_id == 7 and 17 <= h < 21:
                        current_load += self.LOADS["oven"] * 0.5 + self.LOADS["lights"]
                    
                    if scenario_id == 8 and 9 <= h < 12:
                        current_load += self.LOADS["vacuum"] + self.LOADS["steam_cleaner"]

                    # --- NOUVEAUX SCÉNARIOS (11 à 20) ---
                    if scenario_id == 11: # Radio Fan
                        if 8 <= h < 20: current_load += self.LOADS["radio"]

                    if scenario_id == 12: # Winter Day
                        if 7 <= h < 22: current_load += self.LOADS["heating"]
                        if m == 0: current_load += self.LOADS["kettle"]

                    if scenario_id == 13: # Laundry Day
                        if h == 9: current_load += self.LOADS["washing_machine"]
                        if 19 <= h < 22: current_load += self.LOADS["tv"]

                    if scenario_id == 14: # Grandchildren Visit
                        if 14 <= h < 16: current_load += self.LOADS["oven"]
                        if 14 <= h < 18: current_load += self.LOADS["tv"] + self.LOADS["lights"]

                    if scenario_id == 15: # Small Cleaning
                        if h == 15 and 0 <= m < 20: current_load += self.LOADS["vacuum"]

                    if scenario_id == 16: # Early Bird
                        if 5 <= h < 7: current_load += self.LOADS["kettle"] + self.LOADS["radio"] + self.LOADS["lights"]

                    if scenario_id == 17: # Long Cooking
                        if 10 <= h < 12: current_load += self.LOADS["oven"]

                    if scenario_id == 18: # Computer Hobby
                        if 16 <= h < 18: current_load += self.LOADS["computer"]

                    if scenario_id == 19: # Steam Cleaning
                        if 10 <= h < 11: current_load += self.LOADS["steam_cleaner"]

                    if scenario_id == 20: # Sick Day
                        if 7 <= h < 22: current_load += self.LOADS["heating"] + self.LOADS["radio"]

            data[minute] = round(current_load, 2)
        return data

def save_table(name, data):
    # Création du chemin de sortie
    output_dir = os.path.join("data", "scenarios")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = f"table_{name.lower().replace(' ', '_')}.txt"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, "w") as f:
        f.write(f"Minute | Consumption (W) - SCENARIO: {name}\n")
        f.write("-" * 45 + "\n")
        for m, v in data.items():
            f.write(f"{m:<6} | {v:<15.2f}\n")
    return filepath

if __name__ == "__main__":
    manager = MasterDayManager()
    scenarios = {
        1: "Daily Routine",
        2: "Routine + Laundry",
        3: "Routine + Light Cleaning",
        4: "Routine + Laundry + Cleaning",
        5: "Routine + Cooking",
        6: "Laundry + Cooking + Guests",
        7: "Social Day",
        8: "Big Cleaning",
        9: "Outside Day",
        10: "Extreme Cold Day",
        11: "Radio Fan Day",
        12: "Winter Tea Day",
        13: "Weekly Laundry",
        14: "Grandchildren Visit",
        15: "Small Maintenance",
        16: "Early Bird Morning",
        17: "Traditional Lunch Cooking",
        18: "Computer Hobby Session",
        19: "Monthly Steam Cleaning",
        20: "Rest and Sick Day"
    }

    

    for scenario_id, scenario_name in scenarios.items():
        data = manager.generate_day(scenario_id)
        filepath = save_table(scenario_name, data)
        print(f"Scenario {scenario_id}: '{scenario_name}' généré -> {filepath}")