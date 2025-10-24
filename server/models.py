#!/usr/bin/env python3
"""
Interactive CLI for running different ML models on mine data.
"""

import sys
import json

from src.ml.BaseModel import model_factory, BaseModel
from src.utils.logging import setup

logger = setup()


def display_menu():
    """Display the main menu options."""
    print("\n" + "="*60)
    print("LUCENT MINE ANALYSIS - MODEL SELECTION")
    print("="*60)
    print("1. Genetic Algorithm (DEAP) - Multi-criteria mine evaluation")
    print("2. Clustering Algorithm (K-Means) - Group mines by characteristics")
    print("3. Linear Model (Pytorch) - Train on labeled dataset and then rank mines")
    print("4. Exit")
    print("="*60)


def get_deap_config():
    """Prompt user for DEAP configuration parameters."""
    print("\n" + "-"*60)
    print("DEAP Configuration (press Enter for defaults)")
    print("-"*60)

    config = {}

    try:
        population_size = input("Population size [50]: ").strip()
        config['population_size'] = int(population_size) if population_size else 50

        generations = input("Generations [20]: ").strip()
        config['generations'] = int(generations) if generations else 20

        crossover_prob = input("Crossover probability [0.7]: ").strip()
        config['crossover_prob'] = float(crossover_prob) if crossover_prob else 0.7

        mutation_prob = input("Mutation probability [0.3]: ").strip()
        config['mutation_prob'] = float(mutation_prob) if mutation_prob else 0.3

        tournament_size = input("Tournament size [3]: ").strip()
        config['tournament_size'] = int(tournament_size) if tournament_size else 3

        individual_size = input("Individual size [50]: ").strip()
        config['individual_size'] = int(individual_size) if individual_size else 50

        diversity_threshold = input("Diversity threshold [25]: ").strip()
        config['diversity_threshold'] = int(diversity_threshold) if diversity_threshold else 25

        print("-"*60)
        return config

    except ValueError as e:
        print(f"Invalid input: {e}. Using default values.")
        return {
            'population_size': 50,
            'generations': 20,
            'crossover_prob': 0.7,
            'mutation_prob': 0.3,
            'tournament_size': 3,
            'individual_size': 50,
            'diversity_threshold': 25
        }


def get_clustering_config():
    """Prompt user for Clustering configuration parameters."""
    print("\n" + "-"*60)
    print("Clustering Configuration (press Enter for defaults)")
    print("-"*60)

    config = {}

    try:
        n_clusters = input("Number of clusters (leave empty for auto-detect): ").strip()
        if n_clusters:
            config['n_clusters'] = int(n_clusters)
        else:
            config['n_clusters'] = None  # Auto-detect

        print("-"*60)
        return config

    except ValueError as e:
        print(f"Invalid input: {e}. Using auto-detect.")
        return {'n_clusters': None}


def run_model(model: BaseModel, model_name: str):
    """Run the selected model and display progress."""
    print(f"\nRunning {model_name}...")
    print("-" * 40)

    try:
        # Run the model - may return progress updates or None
        result = model.invoke()

        if result is not None:
            # Handle models that yield progress updates
            for progress in result:
                step = progress.get('step', 'unknown')
                status = progress.get('status', 'unknown')
                message = progress.get('message', '')
                print(f"[{step.upper()}] {status}: {message}")
        else:
            # Handle models that don't yield progress updates
            print("Model execution completed.")

        # Get and display results
        print("\nGetting results...")
        results = model.get_results()

        if results and any(results.values()):
            print(f"\nModel completed successfully!")

            # Ask if user wants to save results
            save_choice = input("\nSave results to file? (y/n): ").strip().lower()
            if save_choice == 'y':
                filename = input("Enter filename (without extension): ").strip()
                if not filename:
                    filename = f"{model_name.lower().replace(' ', '_')}_results"

                with open(f"{filename}.json", 'w') as f:
                    json.dump(results, f, indent=2, default=str)
                print(f"Results saved to {filename}.json")
        else:
            print("No results generated. Check model configuration and data.")

    except Exception as e:
        logger.error(f"Error running {model_name}: {e}")
        print(f"Error: {e}")


def main():
    """Main CLI loop."""
    print("Welcome to the Lucent Mine Analysis Model Runner!")

    while True:
        display_menu()

        try:
            choice = input("\nSelect an option (1-4): ").strip()

            if choice == '1':
                print(f"\nCreating Genetic Algorithm model...")
                config = get_deap_config()
                model = model_factory("genetic_algorithm", config=config)
                run_model(model, "Genetic Algorithm")

            elif choice == '2':
                print(f"\nCreating Clustering model...")
                config = get_clustering_config()
                model = model_factory("clustering_algorithm", config=config)
                run_model(model, "Clustering Algorithm")

            elif choice == '3':
                # Linear Model
                print(f"\nCreating Linear model...")

                model = model_factory("linear_model")
                run_model(model, "Linear Model")

            elif choice == '4':
                print("\nExiting... Goodbye!")
                sys.exit(0)

            else:
                print("Invalid choice. Please select 1, 2, or 3.")

        except KeyboardInterrupt:
            print("\n\nExiting... Goodbye!")
            sys.exit(0)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()