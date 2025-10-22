import pandas as pd
import numpy as np
from deap import algorithms, base, creator, tools
import random
from typing import Dict, List, Tuple

from src.utils.logging import setup
from src.ml.BaseModel import BaseModel
from src.ml.helpers import get_all_mines_data

logger = setup()

# Optimized scoring configurations - balanced for quality Australian mines
# All factors must be present: Australia, grid, REZ, volume, not coal
TIER_WEIGHTS = {'T1': 0.40, 'T2': 0.25, 'T3': 0.25, 'T4': 0.07, 'T5': 0.03}

COUNTRY_SCORES = {
    'AUSTRALIA': 1.0, 'CANADA': 0.8, 'USA': 0.7,
    'CHILE': 0.6, 'SOUTH AFRICA': 0.5
}

STATUS_SCORES = {
    'CLOSED': 1.0, 'CLOSURE': 1.0, 'ABANDONED': 0.9, 'REHABILITATED': 0.9,
    'MOTHBALLED': 0.7, 'CANCELLED': 0.6, 'SHELVED': 0.5, 'SUSPENDED': 0.5,
    'MAINTENANCE': 0.3, 'OPERATION': 0.1, 'OPERATING': 0.1, 'ACTIVE': 0.0,
    'PROPOSED': 0.0, 'OPENED': 0.0, 'REOPENING': 0.0, 'IN DEVELOPMENT': 0.0
}

# Scoring config - MUST have: Australia (25%), Grid+REZ (25%), Volume (32%), Not Coal (5.5%)
# Missing ANY critical factor (country, grid, REZ, volume) = heavily penalized
SCORING_CONFIG = {
    'T1': {'volume_score_norm': 0.70, 'shaft_count_score_norm': 0.15,
           'depth_score_norm': 0.05, 'reported_shaft_score_norm': 0.05,
           'is_coal_mine_norm': 0.03, 'diameter_score_norm': 0.02},
    'T2': {'country_score_norm': 0.70, 'status_score_norm': 0.20, 'transport_score_norm': 0.10},
    'T3': {'has_grid_connection_norm': 0.55, 'in_rez_zone_norm': 0.45},
    'T4': {'is_coal_mine_norm': 0.50, 'multi_shaft_bonus_norm': 0.30, 'deep_bonus_norm': 0.20},
    'T5': {'has_evaluation_norm': 0.4, 'has_identity_norm': 0.3, 'has_company_norm': 0.3}
}

class EvolutionaryModel(BaseModel):
    """Highly optimized mine evaluation model using vectorized operations and efficient DEAP."""

    def __init__(self) -> None:
        self.mines_data = None
        self.scored_data = None
        self.fitness_array = None

    def get_all_mines(self) -> pd.DataFrame:
        """Retrieve all mines data."""
        return pd.DataFrame(get_all_mines_data())

    def _normalize_vectorized(self, series: pd.Series, inverse: bool = False) -> pd.Series:
        """Fast vectorized normalization with negative value handling."""
        series = pd.to_numeric(series, errors='coerce').fillna(0)
        # Clamp negative values to zero - negative dimensions don't make sense
        series = series.clip(lower=0)
        max_val = series.max()
        if max_val == 0:
            return series * 0
        normalized = series / max_val
        return (1 - normalized) if inverse else normalized

    def _score_strings(self, series: pd.Series, mapping: Dict) -> pd.Series:
        """Fast string scoring with vectorized mapping."""
        # Ensure series is string type and handle NaN values
        series_str = series.astype(str).str.upper()
        return series_str.map(mapping).fillna(0.0)

    def calculate_tier_scores(self) -> pd.DataFrame:
        """Optimized tier scoring with vectorized operations."""
        logger.info("Calculating optimized tier scores")
        if self.mines_data is None:
            self.mines_data = self.get_all_mines()
        df = self.mines_data.copy()

        # T1 Technical - vectorized normalization with _norm suffix
        df['depth_score_norm'] = self._normalize_vectorized(df['avg_depth_m'])
        df['diameter_score_norm'] = self._normalize_vectorized(df['avg_diameter_m'])
        df['shaft_count_score_norm'] = self._normalize_vectorized(df['no_shafts'])
        df['reported_shaft_score_norm'] = self._normalize_vectorized(df['reported_no_shafts'])
        df['volume_score_norm'] = self._normalize_vectorized(df['total_shaft_volume'])
        # Invert coal mine score: 0 for coal mines (worse), 1 for non-coal mines (better)
        df['is_coal_mine_norm'] = 1.0 - pd.to_numeric(df['is_coal_mine'], errors='coerce').fillna(0).astype(float)

        # T2 Site Conditions - vectorized scoring with _norm suffix
        df['country_score_norm'] = self._score_strings(df['country'], COUNTRY_SCORES)
        df['status_score_norm'] = self._score_strings(df['status'], STATUS_SCORES)

        # Transport scoring - combined and inverted
        airport_norm = self._normalize_vectorized(df['nearest_airport_km'], inverse=True)
        train_norm = self._normalize_vectorized(df['nearest_train_station_km'], inverse=True)
        df['transport_score_norm'] = (airport_norm + train_norm) / 2

        # T3 Grid Integration - safe boolean conversion with _norm suffix
        df['has_grid_connection_norm'] = pd.to_numeric(df['has_grid_connection'], errors='coerce').fillna(0).astype(float)
        df['in_rez_zone_norm'] = pd.to_numeric(df['in_rez_zone'], errors='coerce').fillna(0).astype(float)

        # T4 Technical bonuses - prioritize many shafts (not coal mines)
        df['deep_bonus_norm'] = (pd.to_numeric(df['avg_depth_m'], errors='coerce').fillna(0).clip(lower=0) > 200).astype(float)
        df['multi_shaft_bonus_norm'] = (pd.to_numeric(df['no_shafts'], errors='coerce').fillna(0).clip(lower=0) >= 3).astype(float)

        # T5 Investment - safe boolean conversion with _norm suffix
        df['has_evaluation_norm'] = pd.to_numeric(df['has_evaluation'], errors='coerce').fillna(0).astype(float)
        df['has_identity_norm'] = pd.to_numeric(df['has_identity'], errors='coerce').fillna(0).astype(float)
        df['has_company_norm'] = pd.to_numeric(df['has_company'], errors='coerce').fillna(0).astype(float)

        # Calculate tier scores using matrix operations
        for tier, weights in SCORING_CONFIG.items():
            tier_score = 0
            for col, weight in weights.items():
                if col in df.columns:
                    tier_score += df[col].fillna(0) * weight
            df[f'{tier}_score'] = tier_score.clip(0, 1)

        # Overall fitness calculation
        df['overall_fitness'] = sum(
            df[f'T{i}_score'] * TIER_WEIGHTS[f'T{i}'] for i in range(1, 6)
        )

        # CRITICAL REQUIREMENTS: Must have Australia, grid connection, REZ zone, and volume
        # Apply multiplicative penalty - if ANY critical field is missing/null, fitness = 0
        df['has_required_data'] = (
            (df['country'].notna()) &
            (df['country'].str.upper() == 'AUSTRALIA') &
            (df['has_grid_connection'].notna()) &
            (df['has_grid_connection'] == True) &
            (df['in_rez_zone'].notna()) &
            (df['in_rez_zone'] == True) &
            (df['total_shaft_volume'].notna()) &
            (df['total_shaft_volume'] > 0)
        ).astype(float)

        # Apply the hard requirement filter
        df['overall_fitness'] = df['overall_fitness'] * df['has_required_data']

        # Pre-calculate fitness array for faster access
        self.fitness_array = df['overall_fitness'].values

        logger.info(f"Tier scoring complete. Top fitness: {df['overall_fitness'].max():.3f}")
        return df

    def invoke(self) -> None:
        """Optimized DEAP genetic algorithm."""
        logger.info('Running optimized DEAP genetic algorithm')

        self.get_all_mines()
        self.scored_data = self.calculate_tier_scores()

        # Clean DEAP creators
        for attr in ["FitnessMax", "Individual"]:
            if hasattr(creator, attr):
                delattr(creator, attr)

        # Setup DEAP with optimized parameters
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
        creator.create("Individual", list, fitness=creator.FitnessMax)

        toolbox = base.Toolbox()
        n_mines = len(self.scored_data)

        # Optimized individual creation
        toolbox.register("mine_index", random.randrange, n_mines)
        toolbox.register("individual", tools.initRepeat, creator.Individual, toolbox.mine_index, n=50)
        toolbox.register("population", tools.initRepeat, list, toolbox.individual)

        def evaluate_fast(individual: List[int]) -> Tuple[float]:
            """Ultra-fast fitness evaluation using pre-calculated arrays."""
            unique_indices = np.unique(individual)
            if len(unique_indices) < 25:  # Reduced threshold for speed
                return (0.0,)

            # Direct array access for maximum speed
            fitness_values = self.fitness_array[unique_indices]
            mean_fitness = np.mean(fitness_values)
            diversity_bonus = len(unique_indices) / 50.0

            return (mean_fitness * diversity_bonus,)

        def mutate_fast(individual: List[int], indpb: float = 0.1) -> Tuple[List[int]]:
            """Fast mutation with vectorized operations."""
            mask = np.random.random(len(individual)) < indpb
            mutations = np.random.randint(0, n_mines, size=np.sum(mask))
            individual_array = np.array(individual)
            individual_array[mask] = mutations
            individual[:] = individual_array.tolist()
            return (individual,)

        # Register optimized operators
        toolbox.register("evaluate", evaluate_fast)
        toolbox.register("mate", tools.cxTwoPoint)
        toolbox.register("mutate", mutate_fast)
        toolbox.register("select", tools.selTournament, tournsize=3)

        # Run with optimized parameters
        population = toolbox.population(n=50)  # Reduced population for speed
        algorithms.eaSimple(
            population, toolbox,
            cxpb=0.7, mutpb=0.3, ngen=20,  # Reduced generations for speed
            verbose=False
        )

        best_individual = tools.selBest(population, k=1)[0]
        best_indices = np.unique(best_individual)
        logger.info(f'Optimization complete. Selected {len(best_indices)} unique mines')

    def get_results(self) -> Dict:
        """Generate optimized results with top performers."""
        if self.scored_data is None:
            return {"config": {}, "top_20_detailed": [], "top_100": []}

        # Single sort operation
        ranked = self.scored_data.nlargest(100, 'overall_fitness').reset_index(drop=True)

        # Convert NaN to None for proper JSON serialization
        top_20_data = ranked.head(20).replace({np.nan: None}).to_dict('records')

        # Check if mine_id column exists and handle the case where it doesn't
        if 'mine_id' in ranked.columns:
            top_100_ids = ranked['mine_id'].tolist()
        else:
            # Use index if mine_id column is missing
            logger.warning("mine_id column not found, using index instead")
            top_100_ids = ranked.index.tolist()

        return {
            "config": {
                "population_size": 50,
                "generations": 20,
                "total_mines_analyzed": len(self.scored_data)
            },
            "top_20_detailed": top_20_data,
            "top_100": top_100_ids
        }