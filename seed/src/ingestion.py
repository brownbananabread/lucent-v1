from typing import Callable, List, Any
import os
from src.utils import setup_logging

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))


class Pipeline:
    """Simple pipeline class that stores and executes steps sequentially."""

    def __init__(self, name: str = "Pipeline"):
        self.name = name
        self.steps: List[tuple[str, Callable]] = []

    def add_step(self, name: str, func: Callable) -> "Pipeline":
        """Add a step to the pipeline.

        Args:
            name: Name of the step
            func: Function to execute for this step

        Returns:
            Self for method chaining
        """
        self.steps.append((name, func))
        return self

    def run(self, data: Any = None, verbose: bool = True) -> Any:
        """Execute all steps in the pipeline sequentially.

        Args:
            data: Initial data to pass to the first step
            verbose: Whether to print step execution info

        Returns:
            Output from the final step
        """
        result = data

        if verbose:
            LOG.info("=" * 80)
            LOG.info(f"[{self.name}] Starting pipeline with {len(self.steps)} steps")
            LOG.info("=" * 80)
            for i, (step_name, _) in enumerate(self.steps, 1):
                LOG.info(f"  Step {i}/{len(self.steps)}: {step_name}")
            LOG.info("=" * 80)

        for i, (step_name, func) in enumerate(self.steps, 1):
            if verbose:
                LOG.info("")
                LOG.info(f">>> Step {i}/{len(self.steps)}: {step_name}")

            try:
                result = func(result)
            except Exception as e:
                LOG.error(f"!!! Error in step '{step_name}': {e}")
                raise

        if verbose:
            LOG.info("")
            LOG.info("=" * 80)
            LOG.info(f"[{self.name}] Pipeline completed successfully - {len(self.steps)}/{len(self.steps)} steps done")
            LOG.info("=" * 80)

        return result