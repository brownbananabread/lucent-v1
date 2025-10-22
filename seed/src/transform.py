
import os
import pandas as pd
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from src.utils import (
    setup_logging,
    get_db_connection,
    close_db_connection,
    generate_mine_id,
    extract_data,
    upsert_data
)

# Configuration
LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))

with open('./src/config/column_mappings.json', 'r') as f:
    COLUMN_MAPPINGS = json.load(f)

# Thread-safe lock for database commits
db_lock = Lock()

def process_table(table_name):
    """Process a single raw data table"""
    conn = get_db_connection()
    try:
        LOG.info(f"Processing raw table: {table_name}")

        # Get all data from raw table
        with conn.cursor() as cur:
            cur.execute(f'SELECT * FROM data_raw."{table_name}"')
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

        # Convert to dataframe
        df = pd.DataFrame(rows, columns=columns)

        # Use full table name as source (includes sheet info)
        source_table = table_name

        # Process each row
        for idx, row in df.iterrows():
            row_dict = row.to_dict()

            # Try to find latitude and longitude columns (case-insensitive)
            lat = None
            lng = None
            for key, value in row_dict.items():
                key_lower = str(key).lower()
                if key_lower in ['latitude', 'lat']:
                    lat = value
                elif key_lower in ['longitude', 'longtitude', 'lng', 'lon']:
                    lng = value

            # Convert to float
            try:
                lat = float(lat) if lat and not pd.isna(lat) else None
                lng = float(lng) if lng and not pd.isna(lng) else None
            except (ValueError, TypeError):
                lat = None
                lng = None

            # Generate mine_id
            mine_id = generate_mine_id(lat, lng)

            if mine_id:
                # Insert into dim_raw
                try:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO data_clean.dim_raw (mine_id, source_table, created_at, updated_at)
                            VALUES (%s, %s, NOW(), NOW())
                            ON CONFLICT (mine_id) DO NOTHING
                        """, (mine_id, source_table))

                    # Process all tables using mappings
                    for table_name_clean, mapping in COLUMN_MAPPINGS.items():
                        data = extract_data(row_dict, mapping, table_name_clean)

                        # Validate data before upserting - ensure no dict/list values in dict
                        if isinstance(data, dict):
                            for key, value in list(data.items()):
                                if isinstance(value, (dict, list)):
                                    LOG.warning(f"Removing invalid dict/list value for {key} in {table_name_clean}: {value}")
                                    data[key] = None

                        upsert_data(conn, table_name_clean, data, mine_id)

                except Exception as e:
                    LOG.warning(f"Failed to process row {idx} from {table_name}: {e}")
            else:
                # No valid coordinates - add to pipeline_exclusions
                try:
                    with conn.cursor() as cur:
                        # Convert NaN to None for JSON serialization
                        json_safe_dict = {k: (None if pd.isna(v) else v) for k, v in row_dict.items()}
                        cur.execute("""
                            INSERT INTO public.pipeline_exclusions (source_name, row_data)
                            VALUES (%s, %s::jsonb)
                        """, (source_table, json.dumps(json_safe_dict, default=str)))
                except Exception as e:
                    LOG.warning(f"Failed to insert row {idx} into pipeline_exclusions: {e}")

        conn.commit()
        LOG.info(f"Processed {len(df)} rows from {table_name}")
        return (table_name, len(df), None)

    except Exception as e:
        conn.rollback()
        error_message = f"Error processing table {table_name}: {e}"
        LOG.error(error_message)
        return (table_name, 0, error_message)
    finally:
        close_db_connection()

def process_raw_to_clean(_=None):
    """Process all raw data tables starting with p_ and populate data_clean tables using threading"""
    conn = get_db_connection()
    try:
        # Get all raw data tables starting with p_
        with conn.cursor() as cur:
            cur.execute("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'data_raw' AND tablename LIKE 'p_%'
            """)
            raw_tables = [row[0] for row in cur.fetchall()]

        LOG.info(f"Found {len(raw_tables)} raw data tables to process")

        if len(raw_tables) == 0:
            LOG.info("No raw data tables to process")
            return []

        # Process tables in parallel using ThreadPoolExecutor
        max_workers = min(len(raw_tables), os.cpu_count() or 4)
        LOG.info(f"Using {max_workers} worker threads")

        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_table = {executor.submit(process_table, table): table for table in raw_tables}

            # Collect results as they complete
            for future in as_completed(future_to_table):
                table_name, rows_processed, error = future.result()
                results.append((table_name, rows_processed, error))

        # Log summary
        total_rows = sum(r[1] for r in results)
        failed_tables = [r[0] for r in results if r[2] is not None]

        if failed_tables:
            LOG.warning(f"Failed to process {len(failed_tables)} tables: {', '.join(failed_tables)}")

        LOG.info(f"Completed processing all raw data into clean tables. Total rows processed: {total_rows}")

    except Exception as e:
        error_message = f"Error processing raw data to clean: {e}"
        LOG.error(error_message)
        raise
    finally:
        close_db_connection()
