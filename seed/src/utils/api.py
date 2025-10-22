import requests
import json
import os
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from psycopg2.extras import RealDictCursor
from src.utils.helpers import load_yaml
from src.utils import setup_logging

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))

def download_api_data(
    apis: List[Dict] = None,
    download_dir: str = None
) -> List[str]:
    """
    Download data from API endpoints based on APIs configuration.

    Args:
        apis: List of API endpoint configurations from manifest
        download_dir: Directory to save downloaded files

    Returns:
        List of paths to downloaded files
    """
    if not apis:
        LOG.info("No APIs to download")
        return []

    # Set default from environment variable
    if download_dir is None:
        download_dir = os.getenv('DOWNLOAD_DIR', 'src/downloads')

    # Create download directory if it doesn't exist
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    # Count APIs to process
    apis_to_process = [a for a in apis if a.get('include_resource', False)
                       and a.get('type') != 'embeddings'
                       and (a.get('location', '').startswith('http://') or a.get('location', '').startswith('https://'))]

    LOG.info(f"Found {len(apis_to_process)} API endpoint(s) to download")

    downloaded_files = []
    api_counter = 0

    for data_source in apis:
        # Skip if include_resource is False
        if not data_source.get('include_resource', False):
            continue

        # Skip embeddings files - they should only be processed in embeddings pipeline
        if data_source.get('type') == 'embeddings':
            continue

        location = data_source.get('location', '')

        # Only process HTTP/HTTPS URLs
        if not (location.startswith('http://') or location.startswith('https://')):
            continue

        api_counter += 1

        table_name = data_source.get('table_name', 'unknown')
        title = data_source.get('title', table_name)

        # Determine file extension based on response type or default to .json
        filename = f"{table_name}.json"
        local_path = os.path.join(download_dir, filename)

        try:
            LOG.info(f"  API {api_counter}/{len(apis_to_process)}: {title}")
            LOG.info(f"    Downloading from {location}...")
            response = requests.get(location, timeout=30)
            response.raise_for_status()

            # Save the response
            with open(local_path, 'w') as f:
                if response.headers.get('content-type', '').startswith('application/json'):
                    json.dump(response.json(), f, indent=2)
                else:
                    f.write(response.text)

            downloaded_files.append(local_path)
            LOG.info(f"    Saved to {local_path}")
        except Exception as e:
            LOG.error(f"    Error downloading from {location}: {str(e)}")

    LOG.info(f"Downloaded {len(downloaded_files)}/{len(apis_to_process)} API endpoint(s) successfully")
    return downloaded_files
