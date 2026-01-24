import matplotlib.pyplot as plt
from day_manager_simulator import MasterDayManager

def visualize_all():
    manager = MasterDayManager()
    scenarios = {
        1: "Daily Routine",
        4: "Laundry + Cleaning",
        6: "Laundry + Cooking + Guests",
        8: "Big Cleaning",
        9: "Outside Day",
    }
    
    plt.figure(figsize=(16, 9))
    
    for sid, name in scenarios.items():
        data = manager.generate_day(sid)
        plt.plot(list(data.keys()), list(data.values()), label=name, alpha=0.7)
    
    plt.title("Master Comparison: Key Electricity Consumption Scenarios", fontsize=18)
    plt.xlabel("Minute (1-1440)", fontsize=12)
    plt.ylabel("Watts", fontsize=12)
    plt.legend(loc='upper left', bbox_to_anchor=(1, 1))
    plt.grid(True, linestyle=':', alpha=0.4)
    
    plt.tight_layout()
    plt.savefig("reports/figures/master_scenarios_comparison.png")
    print("Master comparison plot saved to master_scenarios_comparison.png")

if __name__ == "__main__":
    visualize_all()