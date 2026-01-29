import pandas as pd
import numpy as np
import os
import random
from datetime import datetime, timedelta


def expand_to_6s(csv_path, start_time):
    """
    Expands 1440 minute rows to 14400 6-second rows
    with realistic normal variability.
    """
    df = pd.read_csv(csv_path)

    # Base expansion (1 min -> 6 sec)
    base_values = np.repeat(df['Consumption (W)'].values, 10)

    # 🔹 1. Daily intensity variation (normal behavior)
    daily_variation = np.random.uniform(0.95, 1.05)
    base_values = base_values * daily_variation
    """Same scenario ≠ same energy every day
        Cooking longer, heating stronger, shorter usage
        -Still normal, not anomaly."""

    # 🔹 2. Small multiplicative noise (sensor + usage noise)
    noise = np.random.normal(1.0, 0.02, len(base_values))
    final_consumption = base_values * noise
    """"User stops appliance early
        Interruptions
        Power fluctuation"""

    # 🔹 3. Micro dropouts (still normal life)
    dropout_mask = np.random.rand(len(final_consumption)) < 0.002
    final_consumption[dropout_mask] *= np.random.uniform(0.6, 0.8)

    # 🔹 4. Time jitter (routine not perfectly aligned)
    jitter_seconds = np.random.randint(-300, 300)  # ±5 minutes
    timestamps = pd.date_range(
        start=start_time + timedelta(seconds=jitter_seconds),
        periods=len(final_consumption),
        freq='6s'
    )
    """"Breakfast not exactly 07:00 every day
    Realistic daily routine drift"""

    return pd.DataFrame({
        'timestamp': timestamps,
        'aggregate': np.round(final_consumption, 2)
    })


def generate_month_dataset(start_date_str):
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")

    schedules = [
        {
            0: "table_daily_routine.csv",
            1: "table_routine_+_laundry.csv",
            2: "table_routine_+_cooking.csv",
            3: "table_routine_+_light_cleaning.csv",
            4: "table_social_day.csv",
            5: "table_grandchildren_visit.csv",
            6: "table_rest_and_sick_day.csv"
        },
        {
            0: "table_early_bird_morning.csv",
            1: "table_routine_+_laundry.csv",
            2: "table_computer_hobby_session.csv",
            3: "table_small_maintenance.csv",
            4: "table_social_day.csv",
            5: "table_monthly_steam_cleaning.csv",
            6: "table_daily_routine.csv"
        },
        {
            0: "table_daily_routine.csv",
            1: "table_weekly_laundry.csv",
            2: "table_radio_fan_day.csv",
            3: "table_routine_+_light_cleaning.csv",
            4: "table_winter_tea_day.csv",
            5: "table_traditional_lunch_cooking.csv",
            6: "table_rest_and_sick_day.csv"
        },
        {
            0: "table_extreme_cold_day.csv",
            1: "table_routine_+_laundry.csv",
            2: "table_routine_+_cooking.csv",
            3: "table_routine_+_light_cleaning.csv",
            4: "table_outside_day.csv",
            5: "table_grandchildren_visit.csv",
            6: "table_social_day.csv"
        }
    ]

    # 🔹 5. Randomize week order (still normal month)
    random.shuffle(schedules)

    base_path = "data/scenarios/"
    all_days_dfs = []

    for week_idx, week_schedule in enumerate(schedules):
        week_start = start_date + timedelta(weeks=week_idx)

        for day_offset, scenario_file in week_schedule.items():
            current_day_start = week_start + timedelta(days=day_offset)
            file_path = os.path.join(base_path, scenario_file)

            if not os.path.exists(file_path):
                print(f"⚠ Missing: {file_path}")
                continue

            day_df = expand_to_6s(file_path, current_day_start)
            all_days_dfs.append(day_df)

    full_month_df = pd.concat(all_days_dfs, ignore_index=True)
    return full_month_df


if __name__ == "__main__":
    start_date = "2026-01-01"

    dataset = generate_month_dataset(start_date)

    os.makedirs("data/raw", exist_ok=True)
    output_path = "data/raw/full_month_dataset.csv"

    dataset.to_csv(output_path, index=False)

    print(" Month dataset generated")
    print(f"Samples: {len(dataset)}")
    print(f"Days: {len(dataset) / 14400:.1f}")
