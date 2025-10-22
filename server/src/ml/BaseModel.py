from abc import ABC, abstractmethod
from typing import Generator, Union


class BaseModel(ABC):
    """defines how a model is implemented"""

    @abstractmethod
    def __init__(self, config: dict, mines_data) -> None:
        """Force subclasses to define their own init to handle the config differently"""
        pass

    @abstractmethod
    def invoke(self) -> Union[None, Generator[dict, None, None]]:
        """invokes the model to produce its output. May yield progress updates or return None"""
        pass

    @abstractmethod
    def get_results(self) -> dict:
        """gets the results to be displayed in the UI"""
        pass

def model_factory(model_type: str) -> BaseModel:
    """model_factory creates the correct Model Object using model type"""
    model = None

    if model_type == "genetic_algorithm":
        from .models.deap import EvolutionaryModel
        model = EvolutionaryModel()

    if model_type == "clustering_algorithm":
        from .models.sklearn import ClusteringModel
        model = ClusteringModel()

    if model_type == "linear_model":
        from .models.pytorch import LearnToRankModel
        model = LearnToRankModel()

    return model