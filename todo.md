# RH Prime - Roadmap Completo (265 Créditos)

## FASE 1: RH Prime Enterprise (65 créditos)

### Sprint 1: RBAC com Autenticação JWT (20 créditos)
- [ ] Criar tabelas: users, roles, permissions
- [ ] Implementar autenticação JWT (login/logout)
- [ ] Middleware de proteção de rotas
- [ ] Criar 3 roles: admin, gestor, colaborador
- [ ] Página de login com formulário
- [ ] Gerenciamento de usuários (CRUD)
- [ ] Testes vitest para autenticação
- [ ] Hash de senha com bcrypt

### Sprint 2: Auditoria Completa (18 créditos)
- [ ] Criar tabela audit_logs
- [ ] Middleware de auditoria global
- [ ] Registrar alterações (before/after)
- [ ] Endpoint de consulta de logs
- [ ] Dashboard de auditoria
- [ ] Retenção automática de logs (90 dias)
- [ ] Testes vitest para auditoria
- [ ] Exportar logs em CSV

### Sprint 3: Hierarquia e Permissões (15 créditos)
- [ ] Adicionar manager_id em employees
- [ ] Criar matriz de permissões por role
- [ ] Middleware de verificação granular
- [ ] Controle de acesso por departamento
- [ ] Testes de permissões
- [ ] Página de hierarquia visual
- [ ] Validação de acesso em endpoints

### Sprint 4: Configurações Avançadas (12 créditos)
- [ ] Bloqueio de usuários após tentativas falhas
- [ ] Política de senha (complexidade, expiração)
- [ ] Gerenciamento de sessão
- [ ] Two-factor authentication (opcional)
- [ ] Logs de login/logout
- [ ] Página de configurações de segurança
- [ ] Testes de segurança

---

## FASE 2: Novos Módulos (150 créditos)

### Módulo 1: Recrutamento e Seleção (50 créditos)
- [ ] Cadastro de vagas (cargo, nível, salário, requisitos)
- [ ] Fluxo de aprovação de vaga (gestor → RH → publicada)
- [ ] Portal de candidatos (cadastro, currículo)
- [ ] Triagem de currículos (filtros, classificação)
- [ ] Agendamento de entrevistas (Google Calendar)
- [ ] Formulário de avaliação por etapa
- [ ] Geração de carta-oferta
- [ ] Assinatura eletrônica de contrato
- [ ] Onboarding checklist
- [ ] Testes vitest para recrutamento

### Módulo 2: Controle de Ponto e Jornada (40 créditos)
- [ ] Registro de entrada/saída (botão toque)
- [ ] Geolocalização (opcional)
- [ ] Intervalo com notificação
- [ ] Ponto atrasado com justificativa
- [ ] Cadastro de jornadas (40h, 44h, 12x36, noturno)
- [ ] Regras de horas extras e banco de horas
- [ ] Escalas por departamento
- [ ] Solicitação de troca de turno
- [ ] Relatório de horas trabalhadas
- [ ] Integração com folha
- [ ] Testes vitest

### Módulo 3: Folha de Pagamento e Benefícios (60 créditos)
- [ ] Estrutura salarial (base, adicionais, comissões)
- [ ] Benefícios (VR, VA, VT, plano saúde, odonto)
- [ ] Regras de desconto conforme legislação
- [ ] Central de pedidos de benefícios
- [ ] Cálculo automático de folha
- [ ] Integração com ponto
- [ ] Geração de holerite (PDF)
- [ ] Acesso do colaborador ao holerite
- [ ] Relatórios de custo (por colaborador, departamento)
- [ ] Exportação para contadores (CSV, XML)
- [ ] Testes vitest

---

## FASE 3: Otimizações e Integrações (50 créditos)

### Integrações Externas
- [ ] Google Calendar (sincronizar férias)
- [ ] Slack (notificações automáticas)
- [ ] SendGrid (emails de notificação)
- [ ] API pública para terceiros

### Performance e Segurança
- [ ] Cache de dados (Redis)
- [ ] Paginação em listagens
- [ ] Índices de banco de dados
- [ ] Compressão de respostas
- [ ] Rate limiting

### Relatórios Avançados
- [ ] Dashboard de People Analytics
- [ ] Turnover por período
- [ ] Absenteísmo
- [ ] Custo por contratação
- [ ] Relatórios customizáveis

### Mobile
- [ ] App React Native (ponto, férias, holerite)
- [ ] Notificações push
- [ ] Offline mode

### Documentação
- [ ] API documentation (Swagger)
- [ ] Guia de usuário
- [ ] Guia de administrador
- [ ] Troubleshooting

---

## FASE 4: Validação e Entrega

- [ ] Testes end-to-end (E2E)
- [ ] Teste de carga
- [ ] Auditoria de segurança
- [ ] Compliance LGPD/CLT
- [ ] Treinamento de usuários
- [ ] Deploy em produção
- [ ] Monitoramento
- [ ] Suporte pós-lançamento

---

## Módulos Já Implementados (Mantém-se)

### Banco de Dados
- [x] Tabela employees (funcionários)
- [x] Tabela contracts (contratos)
- [x] Tabela positions (cargos)
- [x] Tabela employee_positions (histórico cargos/salários)
- [x] Tabela vacations (férias - períodos aquisitivos)
- [x] Tabela vacation_periods (períodos de férias gozados)
- [x] Tabela medical_exams (ASO e exames)
- [x] Tabela leaves (afastamentos)
- [x] Tabela time_bank (banco de horas)
- [x] Tabela benefits (benefícios)
- [x] Tabela documents (dossiê digital/GED)
- [x] Tabela checklist_items (checklist admissão/rescisão)
- [x] Tabela equipment (equipamentos)
- [x] Tabela equipment_loans (empréstimo equipamentos)
- [x] Tabela ppe_deliveries (entrega EPIs)
- [x] Tabela trainings (treinamentos)
- [x] Tabela service_orders (ordens de serviço)
- [x] Tabela document_templates (modelos de documentos)
- [x] Tabela notifications (notificações)
- [x] Tabela holidays (feriados)
- [x] Tabela settings (configurações)
- [x] Tabela audit_log (log de auditoria)

### Back-end API
- [x] CRUD Funcionários
- [x] CRUD Contratos
- [x] CRUD Cargos e Funções
- [x] CRUD Histórico de Cargos/Salários
- [x] Lógica de Férias (CLT completa)
- [x] CRUD ASO e Exames Médicos
- [x] CRUD Afastamentos
- [x] CRUD Banco de Horas
- [x] CRUD Benefícios
- [x] CRUD Documentos (GED)
- [x] CRUD Checklist Admissão/Rescisão
- [x] CRUD Equipamentos e Empréstimos
- [x] CRUD EPIs
- [x] CRUD Treinamentos
- [x] CRUD Ordens de Serviço
- [x] CRUD Templates de Documentos
- [x] Gerador de Documentos (preenchimento automático)
- [x] Dashboard (indicadores e alertas)
- [x] Sistema de Notificações
- [x] Configurações do sistema

### Front-end
- [x] Layout Dashboard com sidebar
- [x] Página Dashboard (indicadores, alertas, visão geral)
- [x] Página Cadastro de Funcionários (listagem + formulário)
- [x] Página Detalhes do Funcionário (perfil completo)
- [x] Página Cargos e Funções
- [x] Página Controle de Férias (painel + agendamento)
- [x] Página Saúde e Segurança (ASO, EPI, Treinamentos)
- [x] Página Banco de Horas
- [x] Página Dossiê Digital (GED)
- [x] Página Gerador de Documentos
- [x] Página Integração (exportação Sólides/Flash)
- [x] Página Notificações
- [x] Página Configurações (feriados, alertas, empresa)
- [x] Tema visual profissional (cores, tipografia)

### Integrações de APIs
- [x] Endpoints tRPC para CEP (fetchAddressByCEP)
- [x] Endpoints tRPC para CNPJ (validateCNPJ)
- [x] Endpoints tRPC para CPF (validateCPF)
- [x] Endpoints tRPC para Email (sendEmail)
- [x] Endpoints tRPC para Webhooks (register, trigger, list, unregister)
- [x] Testes vitest para integração de CEP
- [x] Testes vitest para validação de CNPJ
- [x] Testes vitest para validação de CPF
- [x] Testes vitest para email service
- [x] Testes vitest para webhooks

---

## Estatísticas

**Total de Créditos:** 265
**Tempo Estimado:** 6-8 semanas
**Módulos:** 7 (Autenticação, Auditoria, Recrutamento, Ponto, Folha, Otimizações, Integrações)
**Funcionalidades:** 100+
**Testes:** 200+ casos de teste vitest
