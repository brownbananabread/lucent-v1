import os
from src.utils import setup_logging, get_db_connection, close_db_connection

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))


def execute_sql(sql_file_path: str):
    """Execute SQL script to initialize the database"""
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor, open(sql_file_path, 'r') as file:
            sql_script = file.read()
            cursor.execute(sql_script)
        connection.commit()
        LOG.info("Pre-seed SQL script executed successfully")
    except Exception as e:
        connection.rollback()
        LOG.error(f"Error executing SQL script: {e}")
        raise


def execute_pre_seed_sql(_=None):
    execute_sql(sql_file_path="src/sql/pre-seed.sql")

def execute_post_seed_sql(_=None):
    execute_sql(sql_file_path="src/sql/post-seed.sql")