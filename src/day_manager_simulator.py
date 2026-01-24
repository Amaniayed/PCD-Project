import random
import os

class MasterDayManager:
    def __init__(self):
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
            
            # --- BASE LOADS (Always on) ---
            # Constant Sleep Logic (10 PM - 6 AM)
            is_sleep = (h >= 22 or h < 6)
            
            if is_sleep:
                # Outside Day (Scenario 9) has no night lights
                nl = 0 if scenario_id == 9 else self.LOADS["night_lights"]
                current_load = self.LOADS["fridge"] + self.LOADS["medical"] + nl
            else:
                # Active Hours
                noise = random.uniform(0.98, 1.02)
                current_load = (self.LOADS["fridge"] + self.LOADS["medical"]) * noise
                
                # --- SCENARIO LOGIC ---
                if scenario_id == 9: # Outside Day
                    pass # Only base loads
                else:
                    # Heating (Seasonal/Cold)
                    heat_mult = 2.0 if scenario_id == 10 else 1.0
                    if 7 <= h < 21: current_load += self.LOADS["heating"] * heat_mult
                    
                    # Routine Elements
                    if 6 <= h < 9: 
                        current_load += self.LOADS["lights"] + self.LOADS["radio"]
                        if (h == 6 and 30 <= m < 35) or (h == 8 and 0 <= m < 5): current_load += self.LOADS["kettle"]
                    
                    if h == 12:
                        current_load += self.LOADS["lights"]
                        if 10 <= m < 20: current_load += self.LOADS["microwave"]
                        if scenario_id in [6, 7]: current_load += self.LOADS["kettle"] # Extra tea for guests
                    
                    if 13 <= h < 22:
                        current_load += self.LOADS["tv"]
                        if h >= 17: current_load += self.LOADS["lights"]
                    
                    # Laundry (Scenarios 2, 4, 6)
                    if scenario_id in [2, 4, 6] and h == 10:
                        current_load += self.LOADS["washing_machine"]
                    
                    # Light Cleaning (Scenarios 3, 4)
                    if scenario_id in [3, 4] and h == 14 and m < 30:
                        current_load += self.LOADS["vacuum"]
                    
                    # Cooking (Scenarios 5, 6)
                    if scenario_id in [5, 6] and h == 18 and 30 <= m < 60:
                        current_load += self.LOADS["oven"]
                    
                    # Social/Guests (Scenario 7)
                    if scenario_id == 7 and 17 <= h < 21:
                        current_load += self.LOADS["oven"] * 0.5 + self.LOADS["lights"] # Partial oven + extra lights
                    
                    # Big Cleaning (Scenario 8)
                    if scenario_id == 8 and 9 <= h < 12:
                        current_load += self.LOADS["vacuum"] + self.LOADS["steam_cleaner"]
                    
            data[minute] = round(current_load, 2)
        return data

def save_table(name, data):
    # Définition du dossier de destination
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join("data", "scenarios")
    
    # Création du dossier s'il n'existe pas
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    # Construction du chemin complet du fichier
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
        
    }
    for scenario_id, scenario_name in scenarios.items():
        data = manager.generate_day(scenario_id)
        filepath = save_table(scenario_name, data)
        print(f"Scenario '{scenario_name}' saved to {filepath}")