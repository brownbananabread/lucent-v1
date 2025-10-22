import logging
import sys

def setup(level='INFO'):
    """Set up basic logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s [%(levelname)s] - %(message)s',
        stream=sys.stdout,
        force=True
    )
    return logging.getLogger(__name__)
