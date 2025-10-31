from flask import Blueprint, jsonify, request
from psycopg2.extras import RealDictCursor
from src.utils.database import get_connection
from src.ml.BaseModel import model_factory, BaseModel
import json
from ..ml.helpers import save_ml_results

bp = Blueprint('model', __name__, url_prefix='/api/v1')


def invoke_model(model: BaseModel, model_name: str):
    try:
        # Run the model - may return progress updates or None
        result = model.invoke()

        if result is not None:
            # Handle models that yield progress updates
            for progress in result:
                step = progress.get('step', 'unknown')
                status = progress.get('status', 'unknown')
                message = progress.get('message', '')
                #print(f"[{step.upper()}] {status}: {message}")
        else:
            # Handle models that don't yield progress updates
            print("Model execution completed.")

        results = model.get_results()

        save_ml_results(model_name, results)

        return results

    except Exception as e:
        print(f"Error: {e}")
        return {}



@bp.route('/run/<model_id>', methods=['GET'])
def run_model(model_id: str):

    if str(model_id) == '1':
        print(f"\nCreating Genetic Algorithm model...")
        model = model_factory("genetic_algorithm")
        run_model(model, "Genetic Algorithm")

    elif str(model_id) == '2':
        print(f"\nCreating Clustering model...")
        model = model_factory("clustering_algorithm")
        run_model(model, "Clustering Algorithm")

    elif str(model_id) == '3':
        print(f"\nCreating Linear model...")
        model = model_factory("linear_model")
        run_model(model, "Linear Model")

    else:
        print("Invalid choice. Please select 1, 2, or 3.")


@bp.route('/train/<model_id>', methods=['POST'])
def train_model(model_id: str):

    if str(model_id) == '1':
    
        model = model_factory("genetic_algorithm")
        results = invoke_model(model, "Genetic Algorithm")

    elif str(model_id) == '2':
    
        model = model_factory("clustering_algorithm")
        results = invoke_model(model, "Clustering Algorithm")

    elif str(model_id) == '3':
    
        model = model_factory("linear_model")
        results = json.dumps(invoke_model(model, "Linear Model"))
        print(results)

    else:
        return jsonify({"error": "Invalid model ID"}), 400
    
    return jsonify({"message": "Model training initiated successfully", "model_name": model_id, "results": results}), 200


@bp.route('/models', methods=['GET'])
def get_models():

    return jsonify({"message": "Model training initiated successfully"}), 501