from typing import Generator
from ..BaseModel import BaseModel
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.preprocessing import OneHotEncoder
import pandas as pd
from ..helpers import get_all_mines_data, get_pair_wise_mines
from ...utils.logging import setup

LOGGER = setup()

DEFAULT_CONFIG = {
        "comparison_source": "data_clean.pairwise_comparisons",
        "data_source": "data_analytics.shaft_summary",
        "numerical_features": [
            "depth",
            "depth_reported",
            "diameter",
            "diameter_reported",
            "grid_connection",
            "grid_connection_reported"
        ],
        "catagorical_features": [],
        "parameters": {
            "epochs": 10,
            "batch_size": 5,
            "shuffle": True
        }
    }



class PairwiseDataset(Dataset):
    def __init__(self, data_source, features: list[str]):

        self.features = features

        # Assuming all numerical at the moment

        self.data = get_pair_wise_mines(features)

        all_columns = self.data.columns

        self.w_feats = [col for col in all_columns if col.endswith("_w")]
        self.l_feats = [col for col in all_columns if col.endswith("_l")]


    def __len__(self):
        return len(self.data)
    
    def get_input_dim(self):
        return len(self.w_feats)
    
    def get_avaliable_features(self):
        return [col.removesuffix("_w") for col in self.w_feats]

    
    def __getitem__(self, idx):
        """
        Returns (x1, x2, y) where:
        x1 -> winner features
        x2 -> loser features
        y  -> target (e.g., 1 if x1 > x2, 0 otherwise)
        """
        row = self.data.iloc[idx]

        # Extract winner and loser features
        x1 = [row[feat] for feat in self.w_feats]
        x2 = [row[feat] for feat in self.l_feats]

        # since we have x1=winner > x2=loser y is always 1
        y = 1.0

        return (
            torch.tensor(x1, dtype=torch.float32),
            torch.tensor(x2, dtype=torch.float32),
            torch.tensor(y, dtype=torch.float32)
        )


class LinearModel(nn.Module):
    def __init__(self, input_dim, output_dim, activation=None):
        super().__init__()

        self.linear_relu_stack = nn.Sequential(
            nn.Linear(input_dim, 20),
            nn.ReLU(),
            nn.Linear(20, 10),
            nn.ReLU(),
            nn.Linear(10, output_dim)
        )

    def predict(self, row):
        """
        Run a prediction on a single DataFrame row.
        """
        # Convert Series -> NumPy -> tensor
        row = row.to_numpy(dtype="float32")
        x = torch.from_numpy(row).unsqueeze(0)  # add batch dimension

        # Move tensor to same device as model
        x = x.to(next(self.parameters()).device)

        # Run forward pass without tracking gradients
        with torch.no_grad():
            y = self.forward(x)

        return y.squeeze()  # remove batch dimension

    def forward(self, x):
        x = self.linear_relu_stack(x)
        return x
    
    def pairwise_loss(self, score_i, score_j, y):
        # y = 1 if x_i > x_j, 0 otherwise
        pred = torch.sigmoid(score_i - score_j)
        loss = nn.BCELoss()(pred, y)
        return loss
    

class LearnToRankModel(BaseModel):
    """defines how a training model is implemented"""

    def __init__(self) -> None:
        """
        Initialise the learn to rank model training class with configuration parameters.

        Args:
            config (dict): Configuration dictionary containing the following keys:
                - 'numerical_features': List of numerical feature column names.
                - 'catagorical_features': List of categorical feature column names.
                - 'parameters': Dictionary of training parameters, e.g., batch_size, shuffle.
                - 'comparison_source': Optional source for pairwise comparisons.
                - 'data_source': Dictionary containing data source information (e.g., Postgres table).

        This method sets up:
            - DataLoader for batch processing
            - Linear model based on dataset input dimensions
        """
        self.config = DEFAULT_CONFIG.copy()
        self.mines_data = None

        self.features = self.config['numerical_features']
        self.catagorical_feats = self.config['catagorical_features']

        self.parameters = self.config['parameters']

        compairison_source = self.config['comparison_source']
        data_source = self.config['data_source']

        dataset = PairwiseDataset(data_source, self.features)

        self.dataloader = DataLoader(
            dataset=dataset,
            batch_size=self.parameters['batch_size'],
            shuffle=self.parameters['shuffle']
        )
        LOGGER.info(f"DataLoader Created with batch size {self.parameters['batch_size']} and shuffle set to {self.parameters['shuffle']}")

        self.model = LinearModel(input_dim=dataset.get_input_dim(), output_dim=1)
        self.avaliable_features = dataset.get_avaliable_features()

        
    def invoke(self) -> Generator[dict, None, None]:
        """Run Linear model with progress updates."""

        yield {'step': 'initialisation', 'status': 'running', 'message': 'Setting up linear training'}

        self._train()

        # Get data if not provided
        if self.mines_data is None:
            yield {'step': 'data_fetch', 'status': 'running', 'message': 'Fetching mine data'}
            self.mines_data = get_all_mines_data()
            self.mines_data = self.mines_data[['mine_id'] + self.avaliable_features]  

        n = len(self.mines_data)

        # Build a minheap
        LOGGER.info(f"Model training completed, starting ranking mines, n:{n}")
        for i in range(n // 2 - 1, -1, -1):
            self.heapify_mines(self.mines_data, n, i)

        # reorder mines
        LOGGER.info("Minheap build, reordering now")
        for i in range(n - 1, 0, -1):
            self.mines_data.iloc[0], self.mines_data.iloc[i] = self.mines_data.iloc[i], self.mines_data.iloc[0]
            self.heapify_mines(self.mines_data, i, 0)
            if i%(n//10) == 0:
                LOGGER.info(f"At {i} of {n}")
        
        LOGGER.info("Ranking completed")


    def _train(self) -> Generator[dict, None, None]:
        """trains the model and yields to stream steps to the UI"""
        optimiser = torch.optim.Adam(self.model.parameters(), lr=0.001)

        return

        total_epochs = self.parameters['epochs']
        for epoch in range(total_epochs):
            total_loss = 0
            for x1, x2, y in self.dataloader:
                optimiser.zero_grad()
                s1 = self.model(x1).squeeze()  # score for x1
                s2 = self.model(x2).squeeze()  # score for x2
                loss = self.model.pairwise_loss(s1, s2, y)
                loss.backward()
                optimiser.step()
                total_loss += loss.item()
            if (epoch+1) % max(1, total_epochs//10) == 0: # Log 10 of the epochs 
                LOGGER.info(f"Epoch {epoch+1}, Loss: {total_loss:.4f}")

        LOGGER.info(f"Final epoch {epoch+1}, Loss: {total_loss:.4f}")


    def heapify_mines(self, mines: pd.DataFrame, n, i):
    
        smallest = i 
        l = 2 * i + 1 
        r = 2 * i + 2  

        small_score = self.model.predict(mines[self.avaliable_features].iloc[smallest])

        # If left child score is less than root
        if l < n and self.model.predict(mines[self.avaliable_features].iloc[l]) < small_score:
            smallest = l

        # If right child score is less than smallest so far
        if r < n and self.model.predict(mines[self.avaliable_features].iloc[r]) < small_score:
            smallest = r

        # If smallest is not root
        if smallest != i:
            mines.iloc[i], mines.iloc[smallest] = mines.iloc[smallest], mines.iloc[i]

            self.heapify_mines(mines, n, smallest)

    def save_model(self) -> list[dict]:
        """saves the model to the database"""
        pass

    def get_results(self) -> dict:
        return self.mines_data.to_dict()


