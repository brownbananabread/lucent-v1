import pandas as pd
import re
import uuid
import json
import os
import requests
import time
import yaml
from typing import List, Tuple, Dict, Optional
import hashlib

with open('./src/config/column_mappings.json', 'r') as f: COLUMN_MAPPINGS = json.load(f)
with open('./src/config/value_overrides.json', 'r') as f: VALUE_OVERRIDES = json.load(f)


def check_db_connection(_=None):
    """Check database connection"""
    from src.utils import setup_logging, get_db_connection, close_db_connection

    LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))
    LOG.info("Checking database connection")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        LOG.info("Database connection successful")
    finally:
        close_db_connection()
    return None


def commit_logs_to_db(_=None):
    """Commit all collected logs to the database"""
    from src.utils import setup_logging

    LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))
    LOG.info("Committing logs to database")
    LOG.commit_logs_to_db()
    return None


def load_yaml(yaml_path: str) -> Dict:
    """Load a YAML file."""
    with open(yaml_path, 'r') as f:
        return yaml.safe_load(f)

def generate_mine_id(lat, lng):
    """Generate deterministic UUID from coordinates"""
    if lat is None or lng is None:
        return None
    coord_string = f"{round(lat, 3):.3f},{round(lng, 3):.3f}"
    hash_hex = hashlib.md5(coord_string.encode()).hexdigest()
    return f"{hash_hex[0:8]}-{hash_hex[8:12]}-{hash_hex[12:16]}-{hash_hex[16:20]}-{hash_hex[20:32]}"


def clean_value(value, value_type='text'):
    """Clean and validate values based on type"""
    if pd.isna(value) or value in ['', None, 'nan', 'null', 'none', 'n/a']:
        return None
    
    if value_type == 'numeric':
        try:
            if isinstance(value, str):
                value = re.sub(r'[^\d.-]', '', value.strip())
            result = float(value) if value and value not in ['.', '-', '-.'] else None
            return result
        except (ValueError, TypeError):
            return None
    elif value_type == 'latitude':
        try:
            if isinstance(value, str):
                value = re.sub(r'[^\d.-]', '', value.strip())
            result = float(value) if value and value not in ['.', '-', '-.'] else None
            # Validate latitude range (-90 to 90)
            if result is not None and (-90 <= result <= 90):
                return result
            return None
        except (ValueError, TypeError):
            return None
    elif value_type == 'longitude':
        try:
            if isinstance(value, str):
                value = re.sub(r'[^\d.-]', '', value.strip())
            result = float(value) if value and value not in ['.', '-', '-.'] else None
            # Validate longitude range (-180 to 180)
            if result is not None and (-180 <= result <= 180):
                return result
            return None
        except (ValueError, TypeError):
            return None
    elif value_type == 'boolean':
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower().strip() in ['true', 'yes', 'y', '1', 'on', 'connected']
        try:
            return bool(float(value))
        except:
            return None
    elif value_type == 'integer':
        if pd.isna(value) or str(value).strip().lower() in ['', 'nan', 'tbd', 'unknown', 'n/a', 'na']:
            return None
        val = clean_value(value, 'numeric')
        return int(val) if val is not None else None
    else:  # text
        return str(value).strip()[:255] if value else None

def find_column(df_columns, candidates):
    """Find matching column from candidates list"""
    # Exact match first
    for col in df_columns:
        if col in candidates:
            return col
    # Partial match
    for col in df_columns:
        for candidate in candidates:
            if candidate in str(col):
                return col
    return None

def extract_data(row_dict, table_mapping, table_name):
    """Generic data extractor using column mappings"""
    result = {}
    for field, candidates in table_mapping.items():
        col = find_column(list(row_dict.keys()), candidates)
        if col:
            value = row_dict.get(col)
            # Determine value type
            if field == 'latitude':
                result[field] = clean_value(value, 'latitude')
            elif field == 'longitude':
                result[field] = clean_value(value, 'longitude')
            elif field in ['shaft_depth', 'shaft_diameter']:
                result[field] = clean_value(value, 'numeric')
            elif field == 'grid_connection':
                result[field] = clean_value(value, 'boolean')
            elif field in ['closure_year', 'opening_year', 'no_shafts']:
                result[field] = clean_value(value, 'integer')
            else:
                cleaned_value = clean_value(value, 'text')
                # Apply value overrides if configured
                if table_name in VALUE_OVERRIDES and field in VALUE_OVERRIDES[table_name]:
                    overrides = VALUE_OVERRIDES[table_name][field]
                    if cleaned_value in overrides:
                        cleaned_value = overrides[cleaned_value]
                # Lowercase status values
                if field == 'status' and cleaned_value:
                    cleaned_value = cleaned_value.lower()
                result[field] = cleaned_value
    
    # Special handling for fact tables with multiple values
    if table_name == 'fact_documentation' and result.get('reference'):
        refs = result['reference'].replace(',', ';').replace('|', ';').split(';')
        return [{'reference': ref.strip()} for ref in refs if ref.strip()]
    elif table_name == 'fact_commodities' and result.get('commodity'):
        commodities = result['commodity'].replace(',', ';').replace('|', ';').replace('&', ';').split(';')
        return [{'commodity': com.strip().lower()} for com in commodities if com.strip()]
    
    # For fact tables, only return if has values
    if table_name.startswith('fact_'):
        return result if any(result.values()) else None
    # For dimension tables, always return (even if all null) to ensure record exists
    return result

def upsert_data(conn, table_name, data, mine_id):
    """Generic upsert for dimension and fact tables"""
    # For fact tables, skip if no data
    if table_name.startswith('fact_') and not data:
        return
    # For dimension tables, allow empty data (will create record with just mine_id)
    
    with conn.cursor() as cur:
        # Handle fact tables (multiple records allowed)
        if table_name.startswith('fact_'):
            if table_name == 'fact_shafts':
                # Get the next shaft number for this mine_id
                cur.execute("""
                    SELECT COALESCE(MAX(shaft_number), 0) + 1 
                    FROM data_clean.fact_shafts 
                    WHERE mine_id = %s
                """, (mine_id,))
                next_shaft_number = cur.fetchone()[0]
                
                data['shaft_id'] = str(uuid.uuid4())
                data['shaft_number'] = next_shaft_number
                cur.execute(f"""
                    INSERT INTO data_clean.{table_name} 
                    ({', '.join(data.keys())}, mine_id, created_at, updated_at)
                    VALUES ({', '.join(['%s'] * len(data))}, %s, NOW(), NOW())
                """, tuple(data.values()) + (mine_id,))
            else:  # fact_documentation, fact_commodities
                if isinstance(data, list):
                    for item in data:
                        cur.execute(f"""
                            INSERT INTO data_clean.{table_name}
                            (mine_id, {', '.join(item.keys())}, created_at, updated_at)
                            VALUES (%s, {', '.join(['%s'] * len(item))}, NOW(), NOW())
                            ON CONFLICT (mine_id, {', '.join(item.keys())}) DO NOTHING
                        """, (mine_id,) + tuple(item.values()))
        # Handle dimension tables (check for duplicates)
        else:
            cur.execute(f"SELECT 1 FROM data_clean.{table_name} WHERE mine_id = %s", (mine_id,))
            if not cur.fetchone():
                if data:
                    # Insert with data fields
                    fields = ', '.join(data.keys())
                    values = ', '.join(['%s'] * len(data))
                    cur.execute(f"""
                        INSERT INTO data_clean.{table_name} 
                        (mine_id, {fields}, created_at, updated_at)
                        VALUES (%s, {values}, NOW(), NOW())
                    """, (mine_id,) + tuple(data.values()))
                else:
                    # Insert with just mine_id (no additional fields)
                    cur.execute(f"""
                        INSERT INTO data_clean.{table_name} 
                        (mine_id, created_at, updated_at)
                        VALUES (%s, NOW(), NOW())
                    """, (mine_id,))
            else:
                # Duplicate mine_id found, log to pipeline_duplicates table
                import json
                cur.execute("""
                    INSERT INTO public.pipeline_duplicates (mine_id, table_name, row_data, created_at, updated_at)
                    VALUES (%s, %s, %s::jsonb, NOW(), NOW())
                """, (mine_id, table_name, json.dumps(data, default=str)))

