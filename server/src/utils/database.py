import os
import psycopg2
from src.utils import logging
from sqlalchemy import URL

logger = logging.setup()

DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT'))
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')

def get_db_url(driver="psycopg2"):
    """Get database URL with specified driver.

    Args:
        driver: Database driver to use. Options: 'psycopg2' (default), 'psycopg'

    Returns:
        SQLAlchemy URL object
    """
    return URL.create(
        f"postgresql+{driver}",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
    )

def get_connection():
    """Get a new database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        logger.info("Database connection established")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

