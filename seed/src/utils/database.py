import os
import psycopg2
import threading
import json
import pandas as pd
from typing import List, Dict
from pathlib import Path
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from .logging import setup_logging

logger = setup_logging()
LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))
_thread_local = threading.local()

def get_db_connection():
    """Get thread-local database connection"""
    if not hasattr(_thread_local, 'connection') or _thread_local.connection is None or _thread_local.connection.closed:
        try:
            _thread_local.connection = psycopg2.connect(
                host=os.getenv('DB_HOST', 'db_host_not_set'),
                port=int(os.getenv('DB_PORT', 'db_port_not_set')),
                database=os.getenv('DB_NAME', 'db_name_not_set'),
                user=os.getenv('DB_USER', 'db_user_not_set'),
                password=os.getenv('DB_PASSWORD', 'db_password_not_set')
            )
            # Use debug level to avoid cluttering main pipeline logs
            # logger.debug(f"Database connection established for thread {threading.current_thread().ident}")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    return _thread_local.connection

def close_db_connection():
    """Close thread-local database connection"""
    if hasattr(_thread_local, 'connection') and _thread_local.connection:
        try:
            if not _thread_local.connection.closed:
                _thread_local.connection.close()
            _thread_local.connection = None
            # Use debug level to avoid cluttering main pipeline logs
            # logger.debug(f"Database connection closed for thread {threading.current_thread().ident}")
        except Exception as e:
            logger.error(f"Error closing database connection: {e}")
            _thread_local.connection = None

def download_database_data(
    databases: List[Dict] = None,
    download_dir: str = None
) -> List[str]:
    """
    Download data from external database sources based on database configuration.

    Args:
        databases: List of database configurations from manifest
        download_dir: Directory to save downloaded files

    Returns:
        List of paths to downloaded files
    """
    if not databases:
        LOG.info("No databases to download")
        return []

    # Set default from environment variable
    if download_dir is None:
        download_dir = os.getenv('DOWNLOAD_DIR', 'src/downloads')

    # Create download directory if it doesn't exist
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    # Count databases to process
    databases_to_process = [db for db in databases if db.get('include_resource', False)
                            and db.get('type') != 'embeddings']

    LOG.info(f"Found {len(databases_to_process)} database source(s) to download")

    downloaded_files = []
    db_counter = 0

    for data_source in databases:
        # Skip if include_resource is False
        if not data_source.get('include_resource', False):
            continue

        # Skip embeddings files - they should only be processed in embeddings pipeline
        if data_source.get('type') == 'embeddings':
            continue

        db_counter += 1

        title = data_source.get('title', 'Unknown Database')
        table_name = data_source.get('table_name', 'unknown')
        config = data_source.get('configuration', {})

        # Extract database connection parameters
        db_host = config.get('host')
        db_port = config.get('port', 5432)
        db_name = config.get('database')
        db_user = config.get('username')
        db_password = config.get('password')
        query = config.get('query')

        if not all([db_host, db_name, db_user, query]):
            LOG.error(f"Missing required configuration for {title}")
            continue

        # Determine output file path - use CSV format
        filename = f"{table_name}.csv"
        local_path = os.path.join(download_dir, filename)

        try:
            LOG.info(f"  Database {db_counter}/{len(databases_to_process)}: {title}")
            LOG.info(f"    Connecting to {db_host}:{db_port}/{db_name}...")

            # Create SQLAlchemy engine for better pandas compatibility
            connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            engine = create_engine(connection_string)

            # Execute query and fetch results using pandas with SQLAlchemy engine
            df = pd.read_sql_query(query, engine)

            # Save results to CSV file
            df.to_csv(local_path, index=False)

            downloaded_files.append(local_path)
            LOG.info(f"    Downloaded {len(df)} rows and saved to {local_path}")

            # Close the engine
            engine.dispose()

        except Exception as e:
            LOG.error(f"    Error downloading from {title}: {str(e)}")

    LOG.info(f"Downloaded {len(downloaded_files)}/{len(databases_to_process)} database source(s) successfully")
    return downloaded_files
