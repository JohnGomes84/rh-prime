"""Validadores para dados brasileiros usando brazilian-utils"""
from brutils.cpf import is_valid as cpf_is_valid, format_cpf
from brutils.cnpj import is_valid as cnpj_is_valid, format_cnpj
from brutils.pis import is_valid as pis_is_valid
from datetime import datetime
import re

class BrazilianValidator:
    """Validações específicas para documentos brasileiros"""
    
    @staticmethod
    def validate_cpf(cpf: str) -> tuple[bool, str]:
        """Valida CPF e retorna (é_válido, mensagem)"""
        if not cpf:
            return False, "CPF é obrigatório"
        
        cpf_clean = re.sub(r'\D', '', cpf)
        
        if len(cpf_clean) != 11:
            return False, "CPF deve conter 11 dígitos"
        
        if cpf_is_valid(cpf_clean):
            return True, "CPF válido"
        
        return False, "CPF inválido"
    
    @staticmethod
    def validate_pis(pis: str) -> tuple[bool, str]:
        """Valida PIS/PASEP"""
        if not pis:
            return False, "PIS é obrigatório"
        
        pis_clean = re.sub(r'\D', '', pis)
        
        if len(pis_clean) != 11:
            return False, "PIS deve conter 11 dígitos"
        
        if pis_is_valid(pis_clean):
            return True, "PIS válido"
        
        return False, "PIS inválido"
    
    @staticmethod
    def validate_ctps(numero: str, serie: str) -> tuple[bool, str]:
        """Valida CTPS (regras básicas)"""
        if not numero or not serie:
            return False, "Número e série da CTPS são obrigatórios"
        
        numero_clean = re.sub(r'\D', '', numero)
        serie_clean = re.sub(r'\D', '', serie)
        
        if len(numero_clean) < 5 or len(numero_clean) > 7:
            return False, "Número da CTPS deve ter entre 5 e 7 dígitos"
        
        if len(serie_clean) < 3 or len(serie_clean) > 4:
            return False, "Série da CTPS deve ter entre 3 e 4 dígitos"
        
        return True, "CTPS válida"
    
    @staticmethod
    def validate_date(date_str: str, format: str = "%d/%m/%Y") -> tuple[bool, str]:
        """Valida data no formato brasileiro"""
        if not date_str:
            return False, "Data é obrigatória"
        
        try:
            datetime.strptime(date_str, format)
            return True, "Data válida"
        except ValueError:
            return False, f"Data inválida. Use o formato {format}"
    
    @staticmethod
    def format_cpf_display(cpf: str) -> str:
        """Formata CPF para exibição: 000.000.000-00"""
        cpf_clean = re.sub(r'\D', '', cpf)
        return format_cpf(cpf_clean) if len(cpf_clean) == 11 else cpf
    
    @staticmethod
    def format_pis_display(pis: str) -> str:
        """Formata PIS para exibição: 000.00000.00-0"""
        pis_clean = re.sub(r'\D', '', pis)
        if len(pis_clean) == 11:
            return f"{pis_clean[:3]}.{pis_clean[3:8]}.{pis_clean[8:10]}-{pis_clean[10]}"
        return pis
