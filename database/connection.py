"""Gerenciamento de conexão com banco SQLite"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from config import Config
import shutil
from datetime import datetime

class Database:
    """Singleton para gerenciar conexão SQLite"""
    
    _instance = None
    _connection = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._connection is None:
            self.db_path = Config.get_db_path()
            self._initialize_database()
    
    def _initialize_database(self):
        """Inicializa banco de dados se não existir"""
        if not self.db_path.exists():
            self._connection = sqlite3.connect(str(self.db_path))
            self._connection.row_factory = sqlite3.Row
            self._create_tables()
        else:
            self._connection = sqlite3.connect(str(self.db_path))
            self._connection.row_factory = sqlite3.Row
    
    def _create_tables(self):
        """Cria estrutura de tabelas"""
        schema_path = Path(__file__).parent / "schema.sql"
        if schema_path.exists():
            with open(schema_path, 'r', encoding='utf-8') as f:
                self._connection.executescript(f.read())
            self._connection.commit()
    
    @contextmanager
    def get_connection(self):
        """Context manager para conexão"""
        try:
            yield self._connection
        except Exception as e:
            self._connection.rollback()
            raise e
    
    def backup(self) -> Path:
        """Cria backup do banco de dados"""
        backup_dir = self.db_path.parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"rh_prime_backup_{timestamp}.db"
        
        shutil.copy2(self.db_path, backup_path)
        return backup_path
    
    def close(self):
        """Fecha conexão"""
        if self._connection:
            self._connection.close()
            self._connection = None
