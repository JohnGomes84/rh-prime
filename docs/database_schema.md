# Arquitetura do Banco de Dados - RH Prime

## Tabelas Principais

### 1. employees (Funcionários)
- id (PK, auto-increment)
- full_name (VARCHAR 255, NOT NULL)
- social_name (VARCHAR 255, NULL)
- cpf (VARCHAR 14, UNIQUE, NOT NULL)
- rg (VARCHAR 20, NULL)
- birth_date (DATE, NOT NULL)
- gender (ENUM: M, F, Outro)
- marital_status (ENUM: Solteiro, Casado, Divorciado, Viúvo, União Estável)
- nationality (VARCHAR 100)
- education_level (VARCHAR 100)
- email (VARCHAR 255)
- phone (VARCHAR 20)
- address_street (VARCHAR 255)
- address_number (VARCHAR 20)
- address_complement (VARCHAR 100)
- address_neighborhood (VARCHAR 100)
- address_city (VARCHAR 100)
- address_state (VARCHAR 2)
- address_zip (VARCHAR 10)
- ctps_number (VARCHAR 20)
- ctps_series (VARCHAR 10)
- pis_pasep (VARCHAR 20)
- voter_title (VARCHAR 20)
- military_cert (VARCHAR 20)
- cnh_number (VARCHAR 20)
- cnh_category (VARCHAR 5)
- cnh_expiry (DATE)
- bank_name (VARCHAR 100)
- bank_agency (VARCHAR 20)
- bank_account (VARCHAR 30)
- pix_key (VARCHAR 255)
- photo_url (VARCHAR 500)
- status (ENUM: Ativo, Inativo, Afastado, Férias)
- created_at (DATETIME)
- updated_at (DATETIME)

### 2. contracts (Contratos)
- id (PK)
- employee_id (FK -> employees)
- contract_type (ENUM: CLT, Estágio, Temporário, Experiência)
- hire_date (DATE, NOT NULL)
- experience_end_date (DATE) -- 45 ou 90 dias
- experience_renewed (BOOLEAN)
- termination_date (DATE, NULL)
- termination_reason (VARCHAR 255)
- work_schedule (VARCHAR 100) -- ex: "08:00-17:00 seg-sex"
- weekly_hours (DECIMAL 4,2) -- ex: 44.00
- created_at (DATETIME)
- updated_at (DATETIME)

### 3. positions (Cargos)
- id (PK)
- title (VARCHAR 255, NOT NULL)
- cbo_code (VARCHAR 10)
- description (TEXT)
- department (VARCHAR 100)
- base_salary (DECIMAL 10,2)
- hazard_level (ENUM: Nenhum, Insalubridade, Periculosidade)
- created_at (DATETIME)
- updated_at (DATETIME)

### 4. employee_positions (Histórico de Cargos/Salários)
- id (PK)
- employee_id (FK -> employees)
- position_id (FK -> positions)
- salary (DECIMAL 10,2, NOT NULL)
- start_date (DATE, NOT NULL)
- end_date (DATE, NULL)
- change_reason (VARCHAR 255) -- Admissão, Promoção, Dissídio, etc.
- created_at (DATETIME)

### 5. vacations (Férias)
- id (PK)
- employee_id (FK -> employees)
- acquisition_start (DATE, NOT NULL) -- início período aquisitivo
- acquisition_end (DATE, NOT NULL) -- fim período aquisitivo
- concession_limit (DATE, NOT NULL) -- data limite para gozo
- days_entitled (INTEGER, DEFAULT 30)
- days_taken (INTEGER, DEFAULT 0)
- status (ENUM: Pendente, Agendada, Em Gozo, Concluída, Vencida)
- created_at (DATETIME)
- updated_at (DATETIME)

### 6. vacation_periods (Períodos de Férias Gozados)
- id (PK)
- vacation_id (FK -> vacations)
- start_date (DATE, NOT NULL)
- end_date (DATE, NOT NULL)
- days (INTEGER, NOT NULL)
- is_pecuniary_allowance (BOOLEAN, DEFAULT FALSE) -- abono pecuniário (venda 1/3)
- pecuniary_days (INTEGER, DEFAULT 0)
- notice_date (DATE) -- data do aviso (30 dias antes)
- status (ENUM: Agendada, Em Gozo, Concluída, Cancelada)
- created_at (DATETIME)

### 7. medical_exams (ASO e Exames)
- id (PK)
- employee_id (FK -> employees)
- exam_type (ENUM: Admissional, Periódico, Demissional, Retorno, Mudança de Função)
- exam_date (DATE, NOT NULL)
- expiry_date (DATE, NOT NULL)
- result (ENUM: Apto, Inapto, Apto com Restrições)
- doctor_name (VARCHAR 255)
- crm (VARCHAR 20)
- clinic_name (VARCHAR 255)
- observations (TEXT)
- document_path (VARCHAR 500) -- caminho do arquivo do ASO
- status (ENUM: Válido, Vencido, Próximo do Vencimento)
- created_at (DATETIME)
- updated_at (DATETIME)

### 8. leaves (Afastamentos)
- id (PK)
- employee_id (FK -> employees)
- leave_type (ENUM: Médico, INSS, Maternidade, Paternidade, Acidente de Trabalho, Outros)
- start_date (DATE, NOT NULL)
- expected_return_date (DATE)
- actual_return_date (DATE)
- inss_protocol (VARCHAR 50)
- medical_certificate_path (VARCHAR 500)
- observations (TEXT)
- status (ENUM: Ativo, Encerrado)
- created_at (DATETIME)
- updated_at (DATETIME)

### 9. time_bank (Banco de Horas)
- id (PK)
- employee_id (FK -> employees)
- reference_month (DATE, NOT NULL) -- mês de referência
- hours_balance (DECIMAL 6,2) -- saldo em horas (positivo ou negativo)
- expiry_date (DATE, NOT NULL) -- data de vencimento do banco
- observations (TEXT)
- status (ENUM: Ativo, Compensado, Vencido, Pago)
- created_at (DATETIME)
- updated_at (DATETIME)

### 10. benefits (Benefícios)
- id (PK)
- employee_id (FK -> employees)
- benefit_type (ENUM: Vale Transporte, Vale Alimentação, Vale Refeição, Plano de Saúde, Plano Odontológico, Seguro de Vida, Outros)
- provider (VARCHAR 255) -- operadora/fornecedor
- plan_name (VARCHAR 255) -- nome do plano
- value (DECIMAL 10,2)
- employee_contribution (DECIMAL 10,2) -- desconto do funcionário
- opted_out (BOOLEAN, DEFAULT FALSE) -- renúncia (ex: VT)
- opt_out_date (DATE)
- start_date (DATE, NOT NULL)
- end_date (DATE, NULL)
- status (ENUM: Ativo, Inativo, Suspenso)
- observations (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### 11. documents (Dossiê Digital / GED)
- id (PK)
- employee_id (FK -> employees)
- category (ENUM: Pessoal, Contratual, Saúde e Segurança, Benefícios, Termos, Treinamentos, Outros)
- document_name (VARCHAR 255, NOT NULL)
- file_path (VARCHAR 500, NOT NULL)
- file_type (VARCHAR 10) -- pdf, docx, jpg, png
- file_size (INTEGER) -- em bytes
- expiry_date (DATE, NULL) -- para documentos com validade
- uploaded_at (DATETIME)
- observations (TEXT)

### 12. checklist_items (Checklist de Admissão/Rescisão)
- id (PK)
- employee_id (FK -> employees)
- checklist_type (ENUM: Admissão, Rescisão)
- category (VARCHAR 100) -- ex: "Documentos Pessoais", "Saúde e Segurança"
- item_description (VARCHAR 255, NOT NULL)
- is_completed (BOOLEAN, DEFAULT FALSE)
- completed_date (DATE)
- completed_by (VARCHAR 255)
- document_id (FK -> documents, NULL) -- link para o documento no GED
- observations (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### 13. equipment (Equipamentos)
- id (PK)
- equipment_type (VARCHAR 100) -- Notebook, Celular, etc.
- brand (VARCHAR 100)
- model (VARCHAR 255)
- serial_number (VARCHAR 100)
- imei (VARCHAR 50)
- patrimony_code (VARCHAR 50)
- status (ENUM: Disponível, Emprestado, Em Manutenção, Baixado)
- observations (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### 14. equipment_loans (Empréstimo de Equipamentos)
- id (PK)
- equipment_id (FK -> equipment)
- employee_id (FK -> employees)
- loan_date (DATE, NOT NULL)
- return_date (DATE, NULL)
- term_document_id (FK -> documents, NULL) -- link para o termo assinado no GED
- condition_at_loan (VARCHAR 255)
- condition_at_return (VARCHAR 255)
- status (ENUM: Ativo, Devolvido)
- created_at (DATETIME)
- updated_at (DATETIME)

### 15. ppe_deliveries (Entrega de EPIs)
- id (PK)
- employee_id (FK -> employees)
- ppe_description (VARCHAR 255, NOT NULL)
- ca_number (VARCHAR 20) -- Certificado de Aprovação
- quantity (INTEGER, NOT NULL)
- delivery_date (DATE, NOT NULL)
- return_date (DATE, NULL)
- reason (VARCHAR 255) -- Admissão, Substituição, Desgaste
- employee_signature (BOOLEAN, DEFAULT FALSE)
- document_id (FK -> documents, NULL) -- link para ficha assinada
- created_at (DATETIME)

### 16. trainings (Treinamentos)
- id (PK)
- employee_id (FK -> employees)
- training_name (VARCHAR 255, NOT NULL)
- nr_reference (VARCHAR 20) -- ex: NR-11, NR-35
- training_date (DATE, NOT NULL)
- expiry_date (DATE, NULL) -- validade do treinamento
- hours (DECIMAL 4,2)
- provider (VARCHAR 255)
- certificate_path (VARCHAR 500)
- status (ENUM: Válido, Vencido, Próximo do Vencimento)
- created_at (DATETIME)
- updated_at (DATETIME)

### 17. service_orders (Ordens de Serviço)
- id (PK)
- employee_id (FK -> employees)
- position_id (FK -> positions)
- nr_reference (VARCHAR 20) -- NR aplicável
- activities (TEXT) -- atividades desenvolvidas
- risks (TEXT) -- riscos da operação
- recommended_ppe (TEXT) -- EPIs recomendados
- preventive_measures (TEXT) -- medidas preventivas
- required_trainings (TEXT) -- treinamentos necessários
- issue_date (DATE, NOT NULL)
- employee_signature (BOOLEAN, DEFAULT FALSE)
- document_id (FK -> documents, NULL)
- created_at (DATETIME)

### 18. document_templates (Modelos de Documentos)
- id (PK)
- template_name (VARCHAR 255, NOT NULL)
- template_type (ENUM: Termo de Responsabilidade, Declaração de Pendência, Ficha de EPI, Ordem de Serviço, Aviso de Férias, Outros)
- content (TEXT, NOT NULL) -- conteúdo com placeholders
- placeholders (TEXT) -- lista de campos dinâmicos
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (DATETIME)
- updated_at (DATETIME)

### 19. notifications (Notificações)
- id (PK)
- type (ENUM: Férias, ASO, Banco de Horas, Contrato Experiência, Treinamento, Documento, EPI)
- title (VARCHAR 255, NOT NULL)
- message (TEXT, NOT NULL)
- severity (ENUM: Info, Aviso, Crítico)
- related_employee_id (FK -> employees, NULL)
- is_read (BOOLEAN, DEFAULT FALSE)
- due_date (DATE)
- created_at (DATETIME)

### 20. holidays (Feriados)
- id (PK)
- name (VARCHAR 255, NOT NULL)
- date (DATE, NOT NULL)
- type (ENUM: Nacional, Estadual, Municipal)
- recurring (BOOLEAN, DEFAULT TRUE) -- se repete todo ano
- created_at (DATETIME)

### 21. settings (Configurações)
- id (PK)
- key (VARCHAR 100, UNIQUE, NOT NULL)
- value (TEXT, NOT NULL)
- description (VARCHAR 255)
- updated_at (DATETIME)

### 22. audit_log (Log de Auditoria)
- id (PK)
- user_action (VARCHAR 100) -- CREATE, UPDATE, DELETE
- table_name (VARCHAR 100)
- record_id (INTEGER)
- old_values (TEXT) -- JSON com valores anteriores
- new_values (TEXT) -- JSON com novos valores
- performed_by (VARCHAR 255)
- performed_at (DATETIME)

## Configurações Padrão (settings)
- company_name: "MASTER LOG SERVIÇOS"
- company_cnpj: "52.062.895/0001-92"
- company_logo: "" (caminho do logo)
- theme: "light" (light/dark)
- vacation_alert_days: "60" (dias antes do vencimento)
- aso_alert_days: "30"
- experience_alert_days: "10"
- time_bank_validity_months: "6"
- training_alert_days: "30"
- notification_email: ""
- data_path: "" (caminho do OneDrive)
