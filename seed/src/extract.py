import os
import json
import pandas as pd
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from src.utils.database import get_db_connection
from src.utils import setup_logging
from src.utils.helpers import load_yaml

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))
DOWNLOAD_DIR = os.getenv('DOWNLOAD_DIR', 'src/downloads')
MANIFEST_PATH = os.getenv('MANIFEST_PATH', 'manifest.yaml')


def clean_name(name: str) -> str:
    """Clean name for SQL compatibility"""
    return str(name).lower().replace(' ', '_').replace('-', '_').replace('.', '_').replace(':', '_').replace('(', '_').replace(')', '_').replace('[', '_').replace(']', '_').replace('/', '_').replace('\\', '_').replace('#', '_').replace('&', '_')


def get_file_type(file_stem: str) -> str:
    """Get file type (primary/supplementary) from manifest"""
    manifest = load_yaml(MANIFEST_PATH)
    if not manifest or 'resources' not in manifest:
        return 'primary'

    for source_type in ['local-files', 'remote-files', 'apis', 'scripts', 'databases']:
        items = manifest.get('resources', {}).get(source_type, [])
        for item in items:
            if item.get('table_name') == file_stem:
                return item.get('type', 'primary')
    return 'primary'


def load_file_to_dataframes(file_path: Path) -> list[tuple[str, pd.DataFrame]]:
    """Load file and return list of (table_name, dataframe) tuples"""
    results = []
    source_type = file_path.suffix[1:]  # Remove the leading dot

    if file_path.suffix == '.json':
        with open(file_path, 'r') as f:
            data = json.load(f)

        # Handle GeoJSON
        if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
            data = data.get('features', [])

        # Normalize to flat dataframe
        if isinstance(data, list):
            df = pd.json_normalize(data) if data else pd.DataFrame()
        else:
            df = pd.json_normalize([data])

        results.append((f"{file_path.stem}_{source_type}_1", df))

    elif file_path.suffix == '.csv':
        df = pd.read_csv(file_path)
        results.append((f"{file_path.stem}_{source_type}_1", df))

    elif file_path.suffix == '.xlsx':
        excel_file = pd.ExcelFile(file_path)
        for idx, sheet_name in enumerate(excel_file.sheet_names, 1):
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            table_name = f"{file_path.stem}_{source_type}_{idx}"
            results.append((table_name, df))

    return results


def insert_to_db(conn, table_name: str, df: pd.DataFrame, file_stem: str):
    """Insert dataframe into database table"""
    if df.empty:
        LOG.info(f"  Skipping empty dataframe for {table_name}")
        return

    # Get prefix from manifest
    file_type = get_file_type(file_stem)
    prefix = 'p_' if file_type == 'primary' else 's_'

    # Build full table name: prefix_cleanname_number
    clean_table = clean_name(table_name)
    full_table_name = f"{prefix}{clean_table}"

    # If too long, truncate and keep the number suffix
    if len(full_table_name) > 63:
        raise ValueError(f"Table name too long: {full_table_name}")

    LOG.info(f"  Inserting {len(df)} rows into data_raw.{full_table_name}")

    with conn.cursor() as cur:
        # Get column names and handle 'id' conflict
        col_names = []
        for col in df.columns:
            # Keep original column name, only handle 'id' conflict
            col_name = str(col)
            if col_name.lower() == 'id':
                col_name = 'source_id'
            col_names.append(col_name)

        # Create table
        columns_def = ', '.join([f'"{col}" TEXT' for col in col_names])
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS data_raw.{full_table_name} (
                id SERIAL PRIMARY KEY,
                {columns_def},
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert rows
        for _, row in df.iterrows():
            values = []
            for val in row.values:
                # Check type first to avoid ambiguous array comparison
                if isinstance(val, (list, dict)):
                    values.append(json.dumps(val))
                elif pd.isna(val):
                    values.append(None)
                else:
                    values.append(str(val))

            placeholders = ', '.join(['%s'] * len(values))
            columns_str = ', '.join([f'"{col}"' for col in col_names])

            cur.execute(f"""
                INSERT INTO data_raw.{full_table_name} ({columns_str})
                VALUES ({placeholders})
            """, values)

    LOG.info(f"  Completed data_raw.{full_table_name}")


def process_table(table_data: tuple):
    """Process a single table (for threading)"""
    file_path, table_name, df, file_stem = table_data

    conn = get_db_connection()
    try:
        LOG.info(f"Processing table {table_name} from {file_path.name}", str(threading.current_thread().ident), file_path.name)
        insert_to_db(conn, table_name, df, file_stem)
        conn.commit()
        LOG.info(f"Completed table {table_name}", str(threading.current_thread().ident), file_path.name)
        return table_name
    except Exception as e:
        conn.rollback()
        LOG.error(f"Error processing table {table_name}: {e}", str(threading.current_thread().ident), file_path.name)
        raise
    finally:
        conn.close()


def process_file(file_path: Path):
    """Process a single file - extract all tables from it"""
    LOG.info(f"Processing {file_path.name}")

    try:
        dataframes = load_file_to_dataframes(file_path)

        # Create table data tuples for threading
        table_tasks = [
            (file_path, table_name, df, file_path.stem)
            for table_name, df in dataframes
        ]

        return table_tasks
    except Exception as e:
        LOG.error(f"Error loading {file_path.name}: {e}")
        raise


def process_downloads_to_db(_=None):
    """Process all files from downloads directory into data_raw schema with threading per table"""
    LOG.info(f"Processing files from {DOWNLOAD_DIR}")

    downloads_path = Path(DOWNLOAD_DIR)
    if not downloads_path.exists():
        LOG.warning(f"Downloads directory does not exist: {DOWNLOAD_DIR}")
        return None

    # Get all files
    files = (
        list(downloads_path.glob('*.json')) +
        list(downloads_path.glob('*.csv')) +
        list(downloads_path.glob('*.xlsx'))
    )

    if not files:
        LOG.info("No files found to process")
        return None

    LOG.info(f"Found {len(files)} files to process")

    # First, extract all tables from all files
    all_table_tasks = []
    for file_path in files:
        try:
            table_tasks = process_file(file_path)
            all_table_tasks.extend(table_tasks)
        except Exception as e:
            LOG.error(f"Failed to load {file_path.name}: {e}")

    LOG.info(f"Found {len(all_table_tasks)} tables to process across all files")

    # Process all tables with threading (one thread per table)
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(process_table, table_data) for table_data in all_table_tasks]

        for future in as_completed(futures):
            try:
                result = future.result()
                if result is not None:
                    LOG.info(f"Successfully processed table: {result}", None, result)
            except Exception as e:
                LOG.error(f"Failed to process table: {e}")

    LOG.info("All files processed")
    return None
