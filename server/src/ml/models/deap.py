import pandas as pd
import numpy as np
from deap import algorithms, base, creator, tools
import random
from typing import Dict, List, Tuple

from src.utils.logging import setup
from src.ml.BaseModel import BaseModel
from src.ml.helpers import get_all_mines_data

logger = setup()

TIER_WEIGHTS = {'T1': 0.50, 'T2': 0.25, 'T3': 0.15, 'T4': 0.07, 'T5': 0.03}

COUNTRY_SCORES = {
    'AUSTRALIA': 1.0, 'CANADA': 0.8, 'USA': 0.7,
    'CHILE': 0.6, 'SOUTH AFRICA': 0.5
}

STATUS_SCORES = {
    'CLOSED': 1.0, 'CLOSURE': 1.0, 'ABANDONED': 0.9, 'REHABILITATED': 0.9,
    'MOTHBALLED': 0.7, 'CANCELLED': 0.6, 'SHELVED': 0.5, 'SUSPENDED': 0.5,
    'MAINTENANCE': 0.3, 'OPERATION': 0.0, 'OPERATING': 0.0, 'ACTIVE': 0.0,
    'PROPOSED': 0.0, 'OPENED': 0.0, 'REOPENING': 0.0, 'IN DEVELOPMENT': 0.0
}

SCORING_CONFIG = {
    'T1': {'volume_score_norm': 0.80, 'shaft_count_score_norm': 0.10,
           'reported_shaft_score_norm': 0.05, 'depth_score_norm': 0.03,
           'diameter_score_norm': 0.02},
    'T2': {'country_score_norm': 0.50, 'status_score_norm': 0.30, 'transport_score_norm': 0.20},
    'T3': {'has_grid_connection_norm': 0.50, 'in_rez_zone_norm': 0.50},
    'T4': {'is_not_coal_mine_norm': 0.60, 'multi_shaft_bonus_norm': 0.25, 'deep_bonus_norm': 0.15},
    'T5': {'has_evaluation_norm': 0.4, 'has_identity_norm': 0.3, 'has_company_norm': 0.3}
}

class EvolutionaryModel(BaseModel):

    def __init__(
        self,
        population_size: int = 50,
        generations: int = 20,
        crossover_prob: float = 0.7,
        mutation_prob: float = 0.3,
        tournament_size: int = 3,
        individual_size: int = 50,
        diversity_threshold: int = 25
    ) -> None:
        self.mines_data = None
        self.scored_data = None
        self.fitness_array = None
        self.population_size = population_size
        self.generations = generations
        self.crossover_prob = crossover_prob
        self.mutation_prob = mutation_prob
        self.tournament_size = tournament_size
        self.individual_size = individual_size
        self.diversity_threshold = diversity_threshold

    def get_all_mines(self) -> pd.DataFrame:
        return pd.DataFrame(get_all_mines_data())

    def _normalize_vectorized(self, series: pd.Series, inverse: bool = False) -> pd.Series:
        series = pd.to_numeric(series, errors='coerce').fillna(0)
        series = series.clip(lower=0)
        max_val = series.max()
        if max_val == 0:
            return series * 0
        normalized = series / max_val
        return (1 - normalized) if inverse else normalized

    def _score_strings(self, series: pd.Series, mapping: Dict) -> pd.Series:
        series_str = series.astype(str).str.upper()
        return series_str.map(mapping).fillna(0.0)

    def calculate_tier_scores(self) -> pd.DataFrame:
        logger.info("Calculating optimized tier scores")
        if self.mines_data is None:
            self.mines_data = self.get_all_mines()
        df = self.mines_data.copy()

        df['depth_score_norm'] = self._normalize_vectorized(df['avg_depth_m'])
        df['diameter_score_norm'] = self._normalize_vectorized(df['avg_diameter_m'])
        df['shaft_count_score_norm'] = self._normalize_vectorized(df['no_shafts'])
        df['reported_shaft_score_norm'] = self._normalize_vectorized(df['reported_no_shafts'])
        df['volume_score_norm'] = self._normalize_vectorized(df['total_shaft_volume'])

        df['country_score_norm'] = self._score_strings(df['country'], COUNTRY_SCORES)
        df['status_score_norm'] = self._score_strings(df['status'], STATUS_SCORES)

        airport_series = pd.to_numeric(df['nearest_airport_km'], errors='coerce')
        train_series = pd.to_numeric(df['nearest_train_station_km'], errors='coerce')

        airport_max = airport_series.max()
        train_max = train_series.max()
        
        if airport_max > 0:
            airport_norm = airport_series.apply(
                lambda x: (1 - (x / airport_max)) if pd.notna(x) and x > 0 else 0.0
            )
        else:
            airport_norm = pd.Series(0.0, index=df.index)

        if train_max > 0:
            train_norm = train_series.apply(
                lambda x: (1 - (x / train_max)) if pd.notna(x) and x > 0 else 0.0
            )
        else:
            train_norm = pd.Series(0.0, index=df.index)

        has_airport = airport_series.notna() & (airport_series > 0)
        has_train = train_series.notna() & (train_series > 0)

        transport_base = pd.Series(0.0, index=df.index)
        transport_base[has_airport] += airport_norm[has_airport] * 0.5
        transport_base[has_train] += train_norm[has_train] * 0.5
        transport_base[has_airport & has_train] += 0.2
        
        df['transport_score_norm'] = transport_base.clip(0, 1)

        df['has_grid_connection_norm'] = pd.to_numeric(df['has_grid_connection'], errors='coerce').fillna(0).astype(float)
        df['in_rez_zone_norm'] = pd.to_numeric(df['in_rez_zone'], errors='coerce').fillna(0).astype(float)

        df['is_not_coal_mine_norm'] = 1.0 - pd.to_numeric(df['is_coal_mine'], errors='coerce').fillna(0).astype(float)
        df['deep_bonus_norm'] = (pd.to_numeric(df['avg_depth_m'], errors='coerce').fillna(0).clip(lower=0) > 200).astype(float)
        df['multi_shaft_bonus_norm'] = (pd.to_numeric(df['no_shafts'], errors='coerce').fillna(0).clip(lower=0) >= 3).astype(float)

        df['has_evaluation_norm'] = pd.to_numeric(df['has_evaluation'], errors='coerce').fillna(0).astype(float)
        df['has_identity_norm'] = pd.to_numeric(df['has_identity'], errors='coerce').fillna(0).astype(float)
        df['has_company_norm'] = pd.to_numeric(df['has_company'], errors='coerce').fillna(0).astype(float)

        for tier, weights in SCORING_CONFIG.items():
            tier_score = 0
            for col, weight in weights.items():
                if col in df.columns:
                    tier_score += df[col].fillna(0) * weight
            df[f'{tier}_score'] = tier_score.clip(0, 1)

        df['base_fitness'] = sum(
            df[f'T{i}_score'] * TIER_WEIGHTS[f'T{i}'] for i in range(1, 6)
        )

        df['bonus_score'] = 0.0

        volume_series = pd.to_numeric(df['total_shaft_volume'], errors='coerce')
        has_volume_data = volume_series.notna() & (volume_series > 0)

        if volume_series.max() > 0:
            df['bonus_score'] += has_volume_data.astype(float) * 0.10
            volume_bonus = (volume_series.fillna(0) / volume_series.max()) * 0.50
            df['bonus_score'] += volume_bonus

        is_australia = (df['country'].notna()) & (df['country'].str.upper() == 'AUSTRALIA')
        df['bonus_score'] += is_australia.astype(float) * 0.25

        not_operating = (df['status'].notna()) & (df['status'].str.upper().isin(['CLOSED', 'CLOSURE', 'ABANDONED', 'REHABILITATED', 'MOTHBALLED']))
        df['bonus_score'] += not_operating.astype(float) * 0.10

        has_grid = (df['has_grid_connection'].notna()) & (df['has_grid_connection'] == True)
        df['bonus_score'] += has_grid.astype(float) * 0.05

        in_rez = (df['in_rez_zone'].notna()) & (df['in_rez_zone'] == True)
        df['bonus_score'] += in_rez.astype(float) * 0.05

        has_transport = has_airport | has_train
        df['bonus_score'] += has_transport.astype(float) * 0.05

        not_coal = (df['is_coal_mine'].notna()) & (df['is_coal_mine'] == False)
        df['bonus_score'] += not_coal.astype(float) * 0.05

        shaft_series = pd.to_numeric(df['reported_no_shafts'], errors='coerce').fillna(0)
        if shaft_series.max() > 0:
            shaft_bonus = (shaft_series / shaft_series.max()) * 0.03
            df['bonus_score'] += shaft_bonus

        df['overall_fitness'] = (df['base_fitness'] * 0.3) + (df['bonus_score'] * 0.7)

        has_volume = volume_series.notna() & (volume_series > 0)
        no_volume_penalty = 0.01
        df.loc[~has_volume, 'overall_fitness'] *= no_volume_penalty

        is_operating = (df['status'].notna()) & (df['status'].str.upper().isin(['OPERATING', 'OPERATION', 'ACTIVE', 'OPENED', 'REOPENING']))
        operating_penalty = 0.05
        df.loc[is_operating, 'overall_fitness'] *= operating_penalty

        max_fitness = df['overall_fitness'].max()
        if max_fitness > 1:
            df['overall_fitness'] = df['overall_fitness'] / max_fitness

        df['critical_factors_count'] = (
            is_australia.astype(int) +
            not_operating.astype(int) +
            not_coal.astype(int) +
            has_grid.astype(int) +
            in_rez.astype(int) +
            has_volume.astype(int) +
            has_transport.astype(int) +
            (shaft_series > 0).astype(int)
        )

        high_quality_bonus = (df['critical_factors_count'] >= 6) & has_volume
        df.loc[high_quality_bonus, 'overall_fitness'] *= 1.2

        self.fitness_array = df['overall_fitness'].values

        logger.info(f"Tier scoring complete. Top fitness: {df['overall_fitness'].max():.3f}")
        logger.info(f"Mines with fitness > 0.5: {(df['overall_fitness'] > 0.5).sum()}")
        logger.info(f"Mines with all 8 critical factors: {(df['critical_factors_count'] == 8).sum()}")
        
        return df

    def invoke(self) -> None:
        logger.info('Running optimized DEAP genetic algorithm')

        self.get_all_mines()
        self.scored_data = self.calculate_tier_scores()

        for attr in ["FitnessMax", "Individual"]:
            if hasattr(creator, attr):
                delattr(creator, attr)

        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
        creator.create("Individual", list, fitness=creator.FitnessMax)

        toolbox = base.Toolbox()
        n_mines = len(self.scored_data)

        toolbox.register("mine_index", random.randrange, n_mines)
        toolbox.register("individual", tools.initRepeat, creator.Individual, toolbox.mine_index, n=self.individual_size)
        toolbox.register("population", tools.initRepeat, list, toolbox.individual)

        def evaluate_fast(individual: List[int]) -> Tuple[float]:
            unique_indices = np.unique(individual)
            if len(unique_indices) < self.diversity_threshold:
                return (0.0,)

            fitness_values = self.fitness_array[unique_indices]
            mean_fitness = np.mean(fitness_values)
            diversity_bonus = len(unique_indices) / float(self.individual_size)

            return (mean_fitness * diversity_bonus,)

        def mutate_fast(individual: List[int], indpb: float = 0.1) -> Tuple[List[int]]:
            mask = np.random.random(len(individual)) < indpb
            mutations = np.random.randint(0, n_mines, size=np.sum(mask))
            individual_array = np.array(individual)
            individual_array[mask] = mutations
            individual[:] = individual_array.tolist()
            return (individual,)

        toolbox.register("evaluate", evaluate_fast)
        toolbox.register("mate", tools.cxTwoPoint)
        toolbox.register("mutate", mutate_fast)
        toolbox.register("select", tools.selTournament, tournsize=self.tournament_size)

        population = toolbox.population(n=self.population_size)
        algorithms.eaSimple(
            population, toolbox,
            cxpb=self.crossover_prob, mutpb=self.mutation_prob, ngen=self.generations,
            verbose=False
        )

        best_individual = tools.selBest(population, k=1)[0]
        best_indices = np.unique(best_individual)
        logger.info(f'Optimization complete. Selected {len(best_indices)} unique mines')

    def get_results(self) -> Dict:
        if self.scored_data is None:
            return {"config": {}, "top_20_detailed": [], "top_100": []}

        ranked = self.scored_data.nlargest(100, 'overall_fitness').reset_index(drop=True)

        top_20_data = ranked.head(20).replace({np.nan: None}).to_dict('records')

        if 'mine_id' in ranked.columns:
            top_100_ids = ranked['mine_id'].tolist()
        else:
            logger.warning("mine_id column not found, using index instead")
            top_100_ids = ranked.index.tolist()

        top_5 = ranked.head(5)
        logger.info("\nTop 5 mines characteristics:")
        for idx, row in top_5.iterrows():
            logger.info(f"Rank {idx+1}: Country={row.get('country', 'N/A')}, "
                       f"Status={row.get('status', 'N/A')}, "
                       f"Coal={row.get('is_coal_mine', 'N/A')}, "
                       f"Grid={row.get('has_grid_connection', 'N/A')}, "
                       f"REZ={row.get('in_rez_zone', 'N/A')}, "
                       f"Volume={row.get('total_shaft_volume', 0):.0f}, "
                       f"Fitness={row['overall_fitness']:.3f}, "
                       f"Factors={row.get('critical_factors_count', 0)}/8")

        return {
            "config": {
                "population_size": self.population_size,
                "generations": self.generations,
                "crossover_prob": self.crossover_prob,
                "mutation_prob": self.mutation_prob,
                "tournament_size": self.tournament_size,
                "individual_size": self.individual_size,
                "diversity_threshold": self.diversity_threshold,
                "total_mines_analyzed": len(self.scored_data)
            },
            "top_20_detailed": top_20_data,
            "top_100": top_100_ids
        }