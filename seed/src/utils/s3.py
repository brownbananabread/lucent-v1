import boto3
import json
import os
from typing import List, Dict, Optional
from pathlib import Path
from src.utils.helpers import load_yaml

from src.utils import setup_logging

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))

def download_files_from_s3(
    files: List[Dict] = None,
    download_dir: str = None,
    bucket_name: str = None
) -> List[str]:
    """
    Download files from S3 based on files configuration.

    Args:
        files: List of file configurations from manifest
        download_dir: Directory to save downloaded files
        bucket_name: S3 bucket name (if None, uses S3_BUCKET_NAME env var or extracted from location)

    Returns:
        List of paths to downloaded files
    """

    if not files:
        LOG.info("No files to download from S3")
        return []

    # Set defaults from environment variables
    if download_dir is None:
        download_dir = os.getenv('DOWNLOAD_DIR', 'src/downloads')

    if bucket_name is None:
        bucket_name = os.getenv('S3_BUCKET_NAME')

    # Count files to process
    files_to_process = [f for f in files if f.get('include_resource', False)
                        and f.get('type') != 'embeddings'
                        and f.get('location', '').startswith('s3://')]

    LOG.info(f"Found {len(files_to_process)} file(s) to download from S3 bucket '{bucket_name}'")

    s3_client = boto3.client('s3')

    # Create download directory if it doesn't exist
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    downloaded_files = []
    file_counter = 0

    for data_source in files:
        # Skip if include_resource is False
        if not data_source.get('include_resource', False):
            continue

        # Skip embeddings files - they should only be processed in embeddings pipeline
        if data_source.get('type') == 'embeddings':
            continue

        location = data_source.get('location', '')

        # Skip non-S3 locations (e.g., HTTP URLs)
        if not location.startswith('s3://'):
            continue

        file_counter += 1

        # Parse S3 location
        s3_path = location.replace('s3://', '')

        # If bucket_name is provided, use it; otherwise extract from path
        if bucket_name:
            bucket = bucket_name
            key = s3_path
        else:
            # Assume format: s3://filename or s3://bucket/key
            parts = s3_path.split('/', 1)
            if len(parts) == 2:
                bucket, key = parts
            else:
                # If no bucket specified in location, you'll need to provide bucket_name
                raise ValueError(f"Cannot determine bucket for {location}. Please provide bucket_name parameter.")

        # Use table_name from manifest for the filename, preserving the file extension
        table_name = data_source.get('table_name', 'unknown')
        original_filename = os.path.basename(key)
        file_extension = os.path.splitext(original_filename)[1]  # e.g., '.xlsx'
        filename = f"{table_name}{file_extension}"
        local_path = os.path.join(download_dir, filename)

        try:
            LOG.info(f"  File {file_counter}/{len(files_to_process)}: {data_source.get('title')}")
            LOG.info(f"    Downloading from {location}...")
            s3_client.download_file(bucket, key, local_path)
            downloaded_files.append(local_path)
            LOG.info(f"    Saved to {local_path}")
        except Exception as e:
            LOG.error(f"    Error downloading {location}: {str(e)}")

    LOG.info(f"Downloaded {len(downloaded_files)}/{len(files_to_process)} file(s) successfully")
    return downloaded_files
