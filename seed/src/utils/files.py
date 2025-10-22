import os
import shutil
from typing import List, Dict
from pathlib import Path
from src.utils import setup_logging

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))

def copy_local_files(
    files: List[Dict] = None,
    download_dir: str = None
) -> List[str]:
    """
    Copy local files to the downloads directory based on files configuration.

    Args:
        files: List of local file configurations from manifest
        download_dir: Directory to copy files to

    Returns:
        List of paths to copied files
    """
    if not files:
        LOG.info("No local files to copy")
        return []

    # Set default from environment variable
    if download_dir is None:
        download_dir = os.getenv('DOWNLOAD_DIR', 'src/downloads')

    # Create download directory if it doesn't exist
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    # Count files to process
    files_to_process = [f for f in files if f.get('include_resource', False)
                        and f.get('type') != 'embeddings']

    LOG.info(f"Found {len(files_to_process)} local file(s) to copy")

    copied_files = []
    file_counter = 0

    for data_source in files:
        # Skip if include_resource is False
        if not data_source.get('include_resource', False):
            continue

        # Skip embeddings files - they should only be processed in embeddings pipeline
        if data_source.get('type') == 'embeddings':
            continue

        file_counter += 1

        location = data_source.get('location', '')
        table_name = data_source.get('table_name', 'unknown')
        title = data_source.get('title', table_name)

        # Check if the source file exists
        if not os.path.exists(location):
            LOG.error(f"  Source file not found: {location}")
            continue

        # Determine destination filename with correct extension
        file_extension = os.path.splitext(location)[1]
        filename = f"{table_name}{file_extension}"
        destination_path = os.path.join(download_dir, filename)

        try:
            LOG.info(f"  File {file_counter}/{len(files_to_process)}: {title}")
            LOG.info(f"    Copying from {location}...")
            shutil.copy2(location, destination_path)
            copied_files.append(destination_path)
            LOG.info(f"    Copied to {destination_path}")
        except Exception as e:
            LOG.error(f"    Error copying {location}: {str(e)}")

    LOG.info(f"Copied {len(copied_files)}/{len(files_to_process)} file(s) successfully")
    return copied_files
