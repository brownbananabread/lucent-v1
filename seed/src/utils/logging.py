import logging
import sys
from datetime import datetime

# Global logger instance
_global_logger = None

class PipelineLogger:
    """Custom logger that prints to console and collects logs for database storage"""
    
    def __init__(self, level="INFO"):
        self.console_logger = logging.getLogger(__name__)
        self.console_logger.setLevel(getattr(logging, level.upper()))
        
        # Setup console handler if not already configured
        if not self.console_logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] - %(message)s'
            )
            formatter.datefmt = '%Y-%m-%d %H:%M:%S'
            handler.setFormatter(formatter)
            self.console_logger.addHandler(handler)
        
        # Array to collect logs for database storage
        self.log_entries = []
    
    def _log(self, level, message, thread_id=None, file_name=None):
        """Internal logging method"""
        # Print to console
        getattr(self.console_logger, level.lower())(message)
        
        # Add to collection for database storage
        self.log_entries.append({
            'timestamp': datetime.now(),
            'level': level.upper(),
            'message': message,
            'thread_id': thread_id,
            'file_name': file_name
        })
    
    def debug(self, message, thread_id=None, file_name=None):
        self._log('DEBUG', message, thread_id, file_name)

    def info(self, message, thread_id=None, file_name=None):
        self._log('INFO', message, thread_id, file_name)

    def error(self, message, thread_id=None, file_name=None):
        self._log('ERROR', message, thread_id, file_name)

    def warning(self, message, thread_id=None, file_name=None):
        self._log('WARNING', message, thread_id, file_name)
    
    def commit_logs_to_db(self):
        """Commit all collected logs to database"""
        if not self.log_entries:
            return
        
        try:
            from .database import get_db_connection, close_db_connection
            conn = get_db_connection()
            with conn.cursor() as cur:
                # Bulk insert all logs
                cur.executemany("""
                    INSERT INTO public.pipeline_logs (timestamp, level, message, thread_id, file_name)
                    VALUES (%s, %s, %s, %s, %s)
                """, [
                    (entry['timestamp'], entry['level'], entry['message'], 
                     entry['thread_id'], entry['file_name'])
                    for entry in self.log_entries
                ])
            conn.commit()
            close_db_connection()
            
            log_count = len(self.log_entries)
            # Clear the collected logs
            self.log_entries.clear()
            print(f"Successfully committed {log_count} log entries to database")
            
        except Exception as e:
            print(f"Failed to commit logs to database: {e}")

def setup_logging(level='INFO'):
    """
    Set up logging that works in both local and Lambda environments
    """
    global _global_logger

    if _global_logger is None:
        # Create single global PipelineLogger instance
        # This will handle all logging, no need for separate root logger setup
        _global_logger = PipelineLogger(level)

    return _global_logger