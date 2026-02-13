-- RH Prime Database Schema
-- SQLite 3 | CLT Brazilian Labor Law

-- Empresas
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funcionários
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    data_nascimento DATE NOT NULL,
    sexo TEXT CHECK(sexo IN ('M', 'F', 'Outro')),
    estado_civil TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    pis TEXT UNIQUE NOT NULL,
    ctps_numero TEXT NOT NULL,
    ctps_serie TEXT NOT NULL,
    ctps_uf TEXT,
    rg TEXT,
    rg_orgao_emissor TEXT,
    foto_path TEXT,
    status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo', 'afastado', 'demitido', 'ferias')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Contratos de Trabalho
CREATE TABLE IF NOT EXISTS employment_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    tipo_contrato TEXT NOT NULL CHECK(tipo_contrato IN ('CLT', 'PJ', 'Estagiário', 'Temporário')),
    data_admissao DATE NOT NULL,
    data_demissao DATE,
    cargo TEXT NOT NULL,
    departamento TEXT,
    salario_base REAL NOT NULL,
    jornada_trabalho TEXT DEFAULT '44h semanais',
    tipo_jornada TEXT CHECK(tipo_jornada IN ('Integral', 'Parcial', 'Escala')),
    banco TEXT,
    agencia TEXT,
    conta TEXT,
    tipo_conta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Férias
CREATE TABLE IF NOT EXISTS vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    periodo_aquisitivo_inicio DATE NOT NULL,
    periodo_aquisitivo_fim DATE NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dias_totais INTEGER NOT NULL,
    dias_gozados INTEGER DEFAULT 0,
    abono_pecuniario BOOLEAN DEFAULT 0,
    dias_abono INTEGER DEFAULT 0,
    terco_constitucional REAL,
    status TEXT DEFAULT 'programadas' CHECK(status IN ('programadas', 'em_gozo', 'concluidas', 'canceladas')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Afastamentos
CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Atestado Médico', 'Licença Maternidade', 'Licença Paternidade', 'Acidente Trabalho', 'INSS', 'Outros')),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_totais INTEGER,
    motivo TEXT,
    cid TEXT,
    documento_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Exames Médicos (ASO)
CREATE TABLE IF NOT EXISTS medical_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    tipo_exame TEXT NOT NULL CHECK(tipo_exame IN ('Admissional', 'Periódico', 'Retorno ao Trabalho', 'Mudança de Função', 'Demissional')),
    data_exame DATE NOT NULL,
    data_validade DATE NOT NULL,
    resultado TEXT CHECK(resultado IN ('Apto', 'Inapto', 'Apto com Restrições')),
    medico_responsavel TEXT,
    crm TEXT,
    observacoes TEXT,
    documento_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Treinamentos
CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT CHECK(tipo IN ('Integração', 'Segurança', 'Técnico', 'Comportamental', 'Reciclagem')),
    carga_horaria INTEGER,
    validade_meses INTEGER,
    obrigatorio BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Treinamentos de Funcionários
CREATE TABLE IF NOT EXISTS employee_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    training_id INTEGER NOT NULL,
    data_realizacao DATE NOT NULL,
    data_validade DATE,
    instrutor TEXT,
    nota REAL,
    aprovado BOOLEAN,
    certificado_path TEXT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (training_id) REFERENCES trainings(id)
);

-- EPIs (Equipamentos de Proteção Individual)
CREATE TABLE IF NOT EXISTS epis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ca TEXT UNIQUE NOT NULL,
    descricao TEXT,
    validade_meses INTEGER,
    estoque_minimo INTEGER DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entrega de EPIs
CREATE TABLE IF NOT EXISTS epi_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    epi_id INTEGER NOT NULL,
    data_entrega DATE NOT NULL,
    data_devolucao DATE,
    quantidade INTEGER DEFAULT 1,
    motivo_entrega TEXT,
    assinatura_recebimento TEXT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (epi_id) REFERENCES epis(id)
);

-- Benefícios
CREATE TABLE IF NOT EXISTS benefits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('Vale Transporte', 'Vale Refeição', 'Vale Alimentação', 'Plano Saúde', 'Plano Odontológico', 'Seguro Vida', 'Outros')),
    valor_empresa REAL,
    valor_funcionario REAL,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefícios de Funcionários
CREATE TABLE IF NOT EXISTS employee_benefits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    benefit_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    valor_customizado REAL,
    ativo BOOLEAN DEFAULT 1,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (benefit_id) REFERENCES benefits(id)
);

-- Dependentes
CREATE TABLE IF NOT EXISTS dependents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    nome_completo TEXT NOT NULL,
    parentesco TEXT NOT NULL CHECK(parentesco IN ('Cônjuge', 'Filho(a)', 'Enteado(a)', 'Pai', 'Mãe', 'Outros')),
    cpf TEXT,
    data_nascimento DATE NOT NULL,
    dependente_irrf BOOLEAN DEFAULT 0,
    dependente_salario_familia BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Documentos
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    file_path TEXT NOT NULL,
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Advertencias e Suspensões
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Advertência Verbal', 'Advertência Escrita', 'Suspensão')),
    data_ocorrencia DATE NOT NULL,
    motivo TEXT NOT NULL,
    dias_suspensao INTEGER DEFAULT 0,
    observacoes TEXT,
    documento_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Histórico Salarial
CREATE TABLE IF NOT EXISTS salary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    contract_id INTEGER NOT NULL,
    salario_anterior REAL NOT NULL,
    salario_novo REAL NOT NULL,
    data_vigencia DATE NOT NULL,
    motivo TEXT,
    percentual_reajuste REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (contract_id) REFERENCES employment_contracts(id)
);

-- Auditoria (Logs)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tabela TEXT NOT NULL,
    registro_id INTEGER,
    acao TEXT NOT NULL CHECK(acao IN ('INSERT', 'UPDATE', 'DELETE')),
    dados_anteriores TEXT,
    dados_novos TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON employment_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_employee ON vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacations(status);
CREATE INDEX IF NOT EXISTS idx_medical_exams_employee ON medical_exams(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_exams_validade ON medical_exams(data_validade);
