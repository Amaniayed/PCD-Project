import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
"""""  lit des profils journaliers minute par minute
    les transforme en résolution 6 secondes (comme UK-DALE)
    ajoute du bruit réaliste
    concatène 7 jours
    sauvegarde un signal continu hebdomadaire"""
def expand_to_6s(csv_path, start_time):
    """Expands 1440 minute rows to 14400 6-second rows."""
    df = pd.read_csv(csv_path)
    # Each minute row is repeated 10 times (60s / 6s = 10)
    base_values = np.repeat(df['Consumption (W)'].values, 10)
    
    # Generate 6s timestamps
    timestamps = pd.date_range(start=start_time, periods=len(base_values), freq='6s')
    
    # Add noise: random fluctuation +/- 2%
    noise = np.random.normal(1.0, 0.02, len(base_values))
    final_consumption = base_values * noise
    
    return pd.DataFrame({
        'timestamp': timestamps,
        'aggregate': np.round(final_consumption, 2)
    })

def generate_week(start_date_str):
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    schedule = {
        0: "table_daily_routine.csv",              # Monday
        1: "table_routine_+_laundry.csv",           # Tuesday
        2: "table_routine_+_cooking.csv",           # Wednesday
        3: "table_routine_+_light_cleaning.csv",    # Thursday
        4: "table_social_day.csv",                  # Friday
        5: "table_grandchildren_visit.csv",         # Saturday
        6: "table_rest_and_sick_day.csv"            # Sunday
    }
    
    base_path = "data/scenarios/"
    week_dfs = []
    """Pour chaque jour :calcul de la date
                        lecture du scénario
                        expansion à 6 s
                        stockage du résultat"""
    for day_offset, scenario_file in schedule.items():
        current_time = start_date + timedelta(days=day_offset)
        print(f"Processing {current_time.strftime('%A, %Y-%m-%d')} using {scenario_file}...")
        day_df = expand_to_6s(os.path.join(base_path, scenario_file), current_time)
        week_dfs.append(day_df)
    
    full_week_df = pd.concat(week_dfs, ignore_index=True)
    return full_week_df

if __name__ == "__main__":
    # Start on a Monday
    start_monday = "2026-01-01"
    full_dataset = generate_week(start_monday)
    os.makedirs("data/raw", exist_ok=True)

    output_path = os.path.join("data", "raw", "full_week_dataset.csv")
    full_dataset.to_csv(output_path, index=False)

    print(f"\nSuccess! Full week dataset saved to {output_path}")
    print(f"Total samples: {len(full_dataset)}")
