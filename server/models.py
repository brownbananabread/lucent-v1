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
                model = model_factory("genetic_algorithm")
                run_model(model, "Genetic Algorithm")

            elif choice == '2':
                print(f"\nCreating Clustering model...")
                model = model_factory("clustering_algorithm")
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