import pandas as pd

from src.utils.database import get_connection
from src.utils.logging import setup
from src.ml import helpers
import json

logger = setup()

def get_all_mines_data() -> pd.DataFrame:
    """Retrieve all mines with joined T1-T5 data using the standard query."""
    logger.info("Fetching all mines with T1-T5 analytics data")

    connection = get_connection()
    query = helpers.get_features()

    try:
        mines_data = pd.read_sql_query(query, connection)
        logger.info(f"Retrieved {len(mines_data)} mines")
        return mines_data

    except Exception as e:
        logger.error(f"Error fetching mine data: {e}")
        raise



def get_pair_wise_mines(features: list[str]) -> pd.DataFrame:
    logger.info("Fetching pairwise comparisons with T1-T5 analytics data")

    engine = get_connection()

    try:

        queries = []
        # We are going to query twice once for the winners data and second for the losers data.
        with open("src/config/get_winner_data.sql", "r") as f:
            queries.append(f.read())
        with open("src/config/get_loser_data.sql", "r") as f:
            queries.append(f.read())
        
        results = {}

        for key, query in zip(['w', 'l'], queries): 

            results[key] = pd.read_sql_query(query, engine)

            # Only keep features that actually exist in database
            available_features = [f for f in features if f in results[key].columns]

            results[key] = results[key][["comparison_id"] + available_features]

        # merging the 2 datasets so we end up with one dataset with labels for both
        pairwise_data = results['w'].merge(results['l'], on="comparison_id", suffixes=("_w", "_l"))

        logger.info(f"Retrieved {len(pairwise_data)} mines")
        return pairwise_data

    except Exception as e:
        logger.error(f"Error fetching mine data: {e}")
        raise

def get_features() -> str:
    return """
SELECT DISTINCT
    t0.mine_id,
    t0.latitude,
    t0.longitude,
    t0.country,
    t0.state,
    t0.mine_name,
    t0.status,
    t1.no_shafts,
    t1.reported_no_shafts,
    t1.total_shaft_volume,
    t1.avg_diameter_m,
    t1.avg_depth_m,
    t1.is_coal_mine,
    t2.nearest_train_station_km,
    t2.nearest_airport_km,
    t3.has_grid_connection,
    t3.in_rez_zone,
    t3.installations,
    t4.has_company,
    t5.has_evaluation,
    t5.has_identity
FROM data_analytics.t0_overview t0
LEFT JOIN data_analytics.t1_technical_parameters t1 ON t0.mine_id = t1.mine_id
LEFT JOIN data_analytics.t2_site_specific_conditions t2 ON t0.mine_id = t2.mine_id
LEFT JOIN data_analytics.t3_grid_integration t3 ON t0.mine_id = t3.mine_id
LEFT JOIN data_analytics.t4_financial_analysis t4 ON t0.mine_id = t4.mine_id
LEFT JOIN data_analytics.t5_investment_analysis t5 ON t0.mine_id = t5.mine_id
WHERE t0.mine_id IS NOT NULL
ORDER BY t0.mine_id
"""


def save_ml_results(model_name: str, results: dict):
    try:

        query = """
            INSERT INTO public.model_results (ml_name, results)
            VALUES (%s, %s);
        """

        with get_connection() as conn:
            with conn.cursor() as cursor:
                # Get rows
                cursor.execute(query, [model_name, json.dumps(results)])

        logger.info(f"Saved results to public.model_results")

    except Exception as e:
        logger.error(f"Error saving results: {e}")