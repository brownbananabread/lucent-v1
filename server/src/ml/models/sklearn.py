import pandas as pd
import numpy as np
import json
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.metrics import silhouette_score
from sklearn.cluster import KMeans
from typing import Generator

from ...utils.logging import setup
from ..BaseModel import BaseModel
from ..helpers import get_all_mines_data

logger = setup()

DEFAULT_CONFIG = {
    "source_table": "data_analytics.mine_summary",
    "features": [
        "no_shafts",
        "avg_depth_m",
        "avg_diameter_m",
        "total_shaft_volume",
        "has_grid_connection"
    ],
    "parameters": {
        "n_init": 10,
        "max_iter": 300,
        "tol": 1e-4
    }
}


class ClusteringModel(BaseModel):
    """ML Model using DEAP for mine evaluation and ranking - optimised for deep coal mines near Wollongong/Brisbane

    config for Clustering Model requires a features with column names to cluster e.g.

    {
        "source_table": "data_analytics.mine_summary",
        "features": [
            "total_shafts",
            "avg_shaft_depth",
            "max_shaft_depth",
            "avg_shaft_diameter",
            "max_shaft_diameter",
            "grid_connection"
        ],
        "parameters": {
            "n_init": 10,
            "max_iter": 300,
            "tol": 1e-4
        }
    }
    """
    def __init__(self) -> None:
        self.mines_data = None
        self.config = DEFAULT_CONFIG.copy()

        # Allow user to customize features
        print("\nConfiguring Clustering Algorithm...")
        print("Available features from database:")
        print("  no_shafts, avg_depth_m, avg_diameter_m, total_shaft_volume")
        print("  is_coal_mine, nearest_train_station_km, nearest_airport_km")
        print("  has_grid_connection, has_company, latitude, longitude")
        print("\nPlease specify features to cluster on (comma-separated):")
        print(f"Default: {', '.join(self.config['features'])}")

        features_input = input("Enter features (or press Enter for default): ").strip()
        if features_input:
            self.config['features'] = [f.strip() for f in features_input.split(',')]

        self.features = self.config['features']
        self.parameters = self.config['parameters']
        self.df = None
        self.available = []
        self.unavailable = []
        self.clustered_data = None

    def get_all_mines(self) -> pd.DataFrame:
        """Retrieve all mines with joined T1-T5 data."""
        self.mines_data = get_all_mines_data()
        return self.mines_data

    def run_clustering_analysis(self) -> pd.DataFrame:
        """Run the clustering analysis and return clustered data."""
        logger.info("Starting clustering analysis")

        # Get data if not provided
        if self.mines_data is None:
            logger.info("Fetching mine data from database")
            self.df = get_all_mines_data()
        else:
            self.df = self.mines_data.copy()

        logger.info(f"Processing {len(self.df)} mines for clustering")

        # Separate out features from the dataset
        self.available = [col for col in self.features if col in self.df.columns]
        self.unavailable = [col for col in self.features if col not in self.df.columns]

        if not self.available:
            raise Exception("No valid features found in the dataset")

        logger.info(f"Available features: {self.available}")
        logger.info(f"Unavailable features: {self.unavailable}")

        # Remove columns that aren't in config (keep mine_id and mine_name for identification)
        required_cols = ["mine_id", "mine_name"]
        feature_cols = self.available + [col for col in required_cols if col in self.df.columns]
        self.df = self.df[feature_cols]

        # Better handling of missing data and data quality
        logger.info("Analyzing data quality before preprocessing")

        # Convert to numeric and handle missing values more carefully
        for col in self.available:
            self.df[col] = pd.to_numeric(self.df[col], errors='coerce')

        # Log data quality info
        logger.info("Data quality summary:")
        for col in self.available:
            non_null_count = self.df[col].notna().sum()
            unique_vals = self.df[col].nunique()
            logger.info(f"  {col}: {non_null_count}/{len(self.df)} non-null, {unique_vals} unique values")

        # Remove rows where all features are null
        self.df = self.df.dropna(subset=self.available, how='all')
        logger.info(f"After removing rows with all null features: {len(self.df)} mines remain")

        # Fill remaining NaN values with median for better clustering
        for col in self.available:
            if self.df[col].isna().any():
                median_val = self.df[col].median()
                self.df[col] = self.df[col].fillna(median_val)
                logger.info(f"  Filled {col} NaN values with median: {median_val}")

        # Remove constant columns (no variance)
        constant_cols = []
        for col in self.available:
            if self.df[col].nunique() <= 1:
                constant_cols.append(col)

        if constant_cols:
            logger.warning(f"Removing constant columns: {constant_cols}")
            self.available = [col for col in self.available if col not in constant_cols]

        if not self.available:
            raise Exception("No valid features with variance found in the dataset")

        logger.info("Preprocessing data for clustering")
        preprocessor = ColumnTransformer([
            ('num', StandardScaler(), self.available)
        ])

        df_processed = preprocessor.fit_transform(self.df[self.available])

        # Error handling if preprocessing collapsed to a single value
        if len(np.unique(df_processed, axis=0)) == 1:
            raise Exception("PreprocessingError: Data has no variance (all rows identical). Clustering cannot proceed.")

        k = self._get_best_k(df_processed)
        logger.info(f"Optimal number of clusters determined: {k}")

        # Perform clustering
        kmeans = KMeans(n_clusters=k, **self.parameters)
        clusters = kmeans.fit_predict(df_processed)

        # Add cluster labels to DataFrame
        self.df['cluster'] = clusters
        self.clustered_data = self.df

        logger.info(f"Clustering complete with {k} clusters")
        return self.df

    def invoke(self) -> Generator[dict, None, None]:
        """Run clustering analysis with progress updates."""
        yield {'step': 'initialization', 'status': 'running', 'message': 'Setting up clustering analysis'}

        # Get data if not provided
        if self.mines_data is None:
            yield {'step': 'data_fetch', 'status': 'running', 'message': 'Fetching mine data'}
            self.get_all_mines()

        # Run clustering analysis
        yield {'step': 'clustering', 'status': 'running', 'message': 'Running clustering analysis'}
        self.run_clustering_analysis()

        yield {'step': 'complete', 'status': 'completed', 'message': 'Clustering analysis complete'}

    def get_json_results(self) -> str:
        """Get clustering results as JSON string."""
        results = self.generate_results()
        return json.dumps(results, indent=2, default=str)

    def _get_best_k(self, df_processed) -> int:
        """Find optimal number of clusters using elbow method and silhouette score."""
        from sklearn.metrics import calinski_harabasz_score

        max_k = min(10, len(df_processed) // 2)  # Ensure we don't have more clusters than reasonable
        if max_k < 2:
            return 2

        logger.info(f"Testing cluster counts from 2 to {max_k}")

        silhouette_scores = []
        inertias = []
        calinski_scores = []

        best_score = -1
        best_k = 2

        for k in range(2, max_k + 1):
            kmeans = KMeans(n_clusters=k, **self.parameters, random_state=42).fit(df_processed)

            # Calculate multiple metrics
            sil_score = silhouette_score(df_processed, kmeans.labels_)
            calinski_score = calinski_harabasz_score(df_processed, kmeans.labels_)

            silhouette_scores.append(sil_score)
            inertias.append(kmeans.inertia_)
            calinski_scores.append(calinski_score)

            # Check cluster balance - avoid extremely imbalanced clusters
            cluster_counts = pd.Series(kmeans.labels_).value_counts()
            min_cluster_size = cluster_counts.min()
            max_cluster_size = cluster_counts.max()
            balance_ratio = min_cluster_size / max_cluster_size

            logger.info(f"k={k}, silhouette={sil_score:.3f}, calinski={calinski_score:.1f}, balance={balance_ratio:.3f}")

            # Prefer solutions with better balance (avoid 1-mine clusters)
            adjusted_score = sil_score * (1 + balance_ratio)  # Bonus for balanced clusters

            if adjusted_score > best_score and min_cluster_size >= 2:  # Ensure no tiny clusters
                best_score = adjusted_score
                best_k = k

        logger.info(f"Selected k={best_k} with adjusted score={best_score:.3f}")
        return best_k

    def generate_results(self) -> dict:
        """Generate comprehensive results with cluster assignments and analysis."""
        logger.info("Generating comprehensive clustering results")

        if self.clustered_data is None or "cluster" not in self.clustered_data.columns:
            return {
                "config": {},
                "clusters": {}
            }

        df = self.clustered_data.copy()

        # Add cluster statistics
        cluster_stats = df.groupby('cluster').size().sort_values(ascending=False)
        logger.info(f"Cluster distribution: {cluster_stats.to_dict()}")

        # Generate cluster summary with detailed mine information
        clusters = {}
        for cluster_id in sorted(df['cluster'].unique()):
            cluster_data = df[df['cluster'] == cluster_id]

            # Get detailed mine information for this cluster
            mines_detailed = []
            for _, row in cluster_data.iterrows():
                mine_info = {
                    'mine_id': row['mine_id'],
                    'mine_name': row.get('mine_name', 'Unknown')
                }

                # Add all available features used in clustering
                for feature in self.available:
                    if feature in row:
                        mine_info[feature] = row[feature]

                mines_detailed.append(mine_info)

            clusters[f"cluster_{cluster_id}"] = {
                "size": len(cluster_data),
                "mines": mines_detailed
            }

        # Structured results
        results = {
            "config": {
                "features": self.features,
                "available_features": self.available,
                "unavailable_features": self.unavailable,
                "parameters": self.parameters,
                "total_mines_analyzed": len(df),
                "number_of_clusters": len(df['cluster'].unique())
            },
            "clusters": clusters
        }

        return results

    def print_results(self, results: dict):
        """Write detailed results to clustering_model.log file."""
        log_file = "clustering_model.log"

        with open(log_file, 'w') as f:
            f.write("=" * 80 + "\n")
            f.write("MINE CLUSTERING ANALYSIS RESULTS\n")
            f.write("=" * 80 + "\n")

            config = results['config']
            f.write(f"Total mines analyzed: {config['total_mines_analyzed']}\n")
            f.write(f"Number of clusters: {config['number_of_clusters']}\n")
            f.write(f"Features used: {', '.join(config['available_features'])}\n")

            if config['unavailable_features']:
                f.write(f"Unavailable features: {', '.join(config['unavailable_features'])}\n")

            f.write(f"\nCLUSTER SUMMARY:\n")
            f.write("-" * 40 + "\n")
            for cluster_name, cluster_info in results['clusters'].items():
                f.write(f"{cluster_name}: {cluster_info['size']} mines\n")

            f.write(f"\nDETAILED CLUSTER BREAKDOWN:\n")
            f.write("=" * 80 + "\n")

            for cluster_name, cluster_info in results['clusters'].items():
                f.write(f"\n{cluster_name.upper()} ({cluster_info['size']} mines):\n")
                f.write("-" * 60 + "\n")

                for idx, mine in enumerate(cluster_info['mines'], 1):
                    f.write(f"\n{idx:2d}. {mine['mine_name']} (ID: {mine['mine_id']})\n")

                    # Write feature values
                    feature_values = []
                    for feature in config['available_features']:
                        if feature in mine:
                            feature_values.append(f"{feature}={mine[feature]}")

                    if feature_values:
                        f.write(f"    Features: {', '.join(feature_values)}\n")

        logger.info(f"Detailed results written to {log_file}")
        print(f"Detailed clustering analysis results have been written to {log_file}")

    def print_json_results(self, results: dict):
        """Print results as formatted JSON."""
        print("\n" + "="*80)
        print("CLUSTERING RESULTS (JSON FORMAT)")
        print("="*80)
        print(json.dumps(results, indent=2, default=str))
        print("="*80)

    def save_json_results(self, results: dict, filename: str = "clustering_results.json"):
        """Save results as JSON file."""
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"Results saved to {filename}")
        print(f"Results saved to {filename}")

    def get_results(self) -> dict:
        """Generate results and optionally write log file."""
        results = self.generate_results()
        return results

if __name__ == "__main__":
    try:
        # Example configuration for clustering
        config = {
            "features": [
                "no_shafts",
                "avg_depth_m",
                "avg_diameter_m",
                "total_shaft_volume",
                "has_grid_connection"
            ],
            "parameters": {
                "n_init": 10,
                "max_iter": 300,
                "tol": 1e-4
            }
        }

        clustering_model = ClusteringModel(config, None)

        # Run the analysis
        for progress in clustering_model.invoke():
            step = progress.get('step', 'unknown')
            status = progress.get('status', 'unknown')
            message = progress.get('message', '')
            print(f"[{step.upper()}] {status}: {message}")

        # Generate and print results
        results = clustering_model.get_results()
        clustering_model.print_results(results)
        clustering_model.print_json_results(results)
        clustering_model.save_json_results(results)
        logger.info("Clustering analysis complete")

    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        raise