import os
from pathlib import Path
import platform

class Config:
    """Configuração centralizada do RH Prime"""
    
    # Versão
    VERSION = "1.0.0"
    APP_NAME = "RH Prime"
    
    # Banco de dados
    DB_NAME = "rh_prime.db"
    
    @staticmethod
    def get_onedrive_path():
        """Detecta automaticamente o caminho do OneDrive"""
        system = platform.system()
        
        if system == "Windows":
            # OneDrive pessoal
            onedrive = Path(os.environ.get('OneDrive', ''))
            if onedrive.exists():
                return onedrive / "RH_Prime"
            
            # OneDrive Business
            userprofile = Path(os.environ.get('USERPROFILE', ''))
            onedrive_business = userprofile / "OneDrive - Master Log Serviços LTDA"
            if onedrive_business.exists():
                return onedrive_business / "RH_Prime"
        
        # Fallback: pasta local
        return Path.home() / "Documents" / "RH_Prime"
    
    @staticmethod
    def get_db_path():
        """Retorna caminho completo do banco de dados"""
        base_path = Config.get_onedrive_path()
        base_path.mkdir(parents=True, exist_ok=True)
        return base_path / Config.DB_NAME
    
    # UI Settings
    WINDOW_WIDTH = 1400
    WINDOW_HEIGHT = 900
    THEME = "dark_blue.xml"  # qt-material theme
