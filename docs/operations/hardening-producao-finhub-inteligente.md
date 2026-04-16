# Hardening de Produção do FinHub Inteligente

> Objetivo: reduzir risco operacional, financeiro, trabalhista (CLT) e de proteção de dados (LGPD) antes de colocar o sistema em produção.

---

## 1) Matriz de Criticidade por Módulo

Escala usada:

- **Impacto**: 1 (baixo) a 5 (muito alto)
- **Probabilidade**: 1 (baixo) a 5 (muito alto)
- **Criticidade = Impacto x Probabilidade**
- **Classe**: Crítica (16-25), Alta (10-15), Média (6-9), Baixa (1-5)

| Módulo                    | Dados Sensíveis                    | Impacto | Probabilidade | Criticidade | Classe      | Risco principal                                       | Controles obrigatórios                                                  |
| ------------------------- | ---------------------------------- | ------: | ------------: | ----------: | ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Auth / Usuários           | Email, perfil de acesso            |       5 |             3 |          15 | Alta        | Escalada de privilégio                                | MFA para admin, sessão curta, auditoria de login                        |
| Funcionários              | CPF, PIX, RG, contato              |       5 |             4 |          20 | **Crítica** | Vazamento de dados pessoais (LGPD)                    | Criptografia em repouso/trânsito, mascaramento de CPF, RBAC rígido      |
| Clientes                  | CNPJ, contatos comerciais          |       4 |             3 |          12 | Alta        | Exposição de dados comerciais                         | RBAC + trilha de alteração                                              |
| Fornecedores              | CNPJ, PIX, contatos                |       4 |             3 |          12 | Alta        | Fraude de pagamento                                   | Dupla validação em alteração de dados bancários                         |
| Planejamentos / Escalas   | Jornada, alocação de equipes       |       5 |             4 |          20 | **Crítica** | Erro em escala/frequência e passivo trabalhista (CLT) | Congelamento de escala validada, trilha de alterações, aprovação formal |
| Pagamento de Funcionários | PIX, valor, dias trabalhados       |       5 |             4 |          20 | **Crítica** | Pagamento indevido / fraude                           | Regra de 4 olhos, lote assinado, bloqueio pós-pagamento                 |
| Recebimento de Clientes   | valores, OS, faturamento           |       5 |             3 |          15 | Alta        | Divergência financeira e fiscal                       | Reconciliação diária, export protegido, auditoria                       |
| Contas a Pagar / Receber  | valores, vencimentos, comprovantes |       5 |             4 |          20 | **Crítica** | perda financeira e inconsistência contábil            | segregação por função, conciliação, versionamento de status             |
| Documentos Fiscais        | notas, comprovantes, anexos        |       4 |             3 |          12 | Alta        | exposição documental / fraude                         | storage seguro, hash do arquivo, controle de acesso                     |
| Permissões (RBAC)         | privilégios por módulo             |       5 |             4 |          20 | **Crítica** | usuário com acesso indevido                           | princípio do menor privilégio + revisão mensal                          |
| Auditoria / Logs          | trilha de ações                    |       5 |             3 |          15 | Alta        | não rastrear fraude/incidente                         | logs imutáveis e retenção definida                                      |
| Analytics / Dashboard     | consolidados financeiros           |       3 |             2 |           6 | Média       | leitura indevida de indicadores                       | perfil somente leitura para liderança                                   |

### Prioridade de implantação (ordem)

1. Funcionários + Pagamentos + RBAC + Auditoria
2. Planejamentos + Contas a pagar/receber
3. Documentos e módulos de apoio

---

## 2) Checklist de Blindagem do Banco de Dados (MySQL/Drizzle)

### 2.1 Segurança de acesso

- [ ] Banco **sem acesso público** (somente rede privada/VPN).
- [ ] Usuário de aplicação com permissões mínimas (`SELECT/INSERT/UPDATE/DELETE` no schema da app; sem `DROP`, sem `GRANT`).
- [ ] Usuário administrativo separado do usuário da aplicação.
- [ ] Senha forte com rotação periódica (90-180 dias).
- [ ] TLS habilitado na conexão com banco.

### 2.2 Estrutura e integridade

- [ ] Aplicar migrations versionadas em pipeline controlado (`drizzle-kit`).
- [ ] Criar índices para consultas críticas (`employees.cpf`, `work_schedules.date`, `payment_batches.status`).
- [ ] Ativar constraints de unicidade para chaves de negócio (CPF, openId, combinações críticas).
- [ ] Definir FKs e política de deleção segura (evitar `cascade` em dados críticos financeiros).
- [ ] Implementar soft delete para entidades sensíveis (quando aplicável).

### 2.3 Proteção de dados LGPD

- [ ] Classificação de dados por sensibilidade (Público / Interno / Restrito / Sensível).
- [ ] Criptografia de campos muito sensíveis (ex.: PIX, RG) ou tokenização.
- [ ] Mascaramento em consultas de UI (CPF parcial: `***.***.***-XX`).
- [ ] Política de retenção e descarte seguro definida por tabela.
- [ ] Registro de base legal e finalidade para dados de colaboradores (com jurídico/DP).

### 2.4 Operação e continuidade

- [ ] Backups automáticos diários + teste de restauração mensal.
- [ ] Backup criptografado e replicado em local secundário.
- [ ] Monitorar crescimento e lentidão de consultas (slow query log).
- [ ] Alertas de conexão anômala, erro de autenticação e lock alto.
- [ ] Procedimento de incidentes (quem aciona, prazo, evidências).

---

## 3) Mapa de Permissões (RBAC)

Perfis sugeridos:

- **Admin**: total, incluindo permissões e configurações críticas.
- **Financeiro**: foco em contas, pagamentos, recebimentos e relatórios financeiros.
- **RH/Operações**: foco em funcionários, escalas e validações operacionais.
- **Líder**: atuação restrita no portal do líder e atualização operacional.
- **Auditoria/Compliance**: leitura de trilhas, sem alteração operacional.

Legenda: `V` visualizar, `C` criar, `E` editar, `D` excluir, `A` aprovar.

| Módulo                                                       | Admin     | Financeiro          | RH/Operações              | Líder                        | Auditoria |
| ------------------------------------------------------------ | --------- | ------------------- | ------------------------- | ---------------------------- | --------- |
| Dashboard                                                    | V/C/E/D   | V                   | V                         | V                            | V         |
| Funcionários                                                 | V/C/E/D   | V                   | V/C/E                     | V (limitado)                 | V         |
| Planejamentos/Escalas                                        | V/C/E/D/A | V                   | V/C/E/A                   | V/C/E (somente equipe)       | V         |
| Pagamento de Funcionários                                    | V/C/E/D/A | V/C/E/A             | V (somente conferência)   | V (somente consulta própria) | V         |
| Recebimento de Clientes                                      | V/C/E/D/A | V/C/E/A             | V                         | V (consulta)                 | V         |
| Contas a pagar/receber                                       | V/C/E/D/A | V/C/E/A             | V (sem edição financeira) | -                            | V         |
| Cadastros de apoio (clientes, fornecedores, turnos, funções) | V/C/E/D   | V (consulta)        | V/C/E                     | V (consulta)                 | V         |
| Permissões de Usuário                                        | V/C/E/D   | -                   | -                         | -                            | V         |
| Auditoria/Logs                                               | V         | V (somente leitura) | V (somente leitura)       | -                            | V         |

### Regras de segregação de função (SoD)

1. Quem **aprova pagamento** não pode ser o mesmo que **gera lote** sozinho.
2. Alteração de **PIX/chave bancária** exige segunda aprovação.
3. Exclusão de registros críticos deve ser bloqueada (preferir cancelamento/versionamento).
4. Alteração de permissão de usuário gera evento de auditoria obrigatório.

---

## 4) Plano de Testes Críticos (Go-Live Gate)

### 4.1 Critérios para liberar produção

- Cobertura de fluxos críticos: **100%** (cenários abaixo executados).
- Taxa de sucesso mínima: **>= 95%** sem falha crítica.
- Falha de segurança/privacidade: **0 tolerância** até correção.

### 4.2 Casos de teste prioritários

#### Bloco A — Segurança e acesso

1. Login válido/inválido e bloqueio após tentativas sucessivas.
2. Usuário sem permissão tentando editar módulo restrito.
3. Alteração de perfil para admin sem autorização (deve falhar e auditar).

#### Bloco B — RH / CLT operacional

4. Criação de colaborador com CPF duplicado (deve bloquear).
5. Fechamento de escala validada com trilha de mudanças.
6. Registro de presença (check-in/out) e consistência de jornada.

#### Bloco C — Financeiro

7. Geração de lote de pagamento com total correto por colaborador.
8. Reprocessamento de lote já pago (deve bloquear).
9. Alteração de chave PIX em período de fechamento (deve exigir aprovação).
10. Conciliação de contas pagas/recebidas versus dashboard.

#### Bloco D — Integridade e auditoria

11. Cada ação crítica gera log com usuário, ação, entidade e timestamp.
12. Falha proposital de gravação em fluxo crítico: sistema não pode “confirmar” sucesso falso.
13. Exportações com dados mascarados conforme perfil.

### 4.3 Evidências obrigatórias

- Vídeo curto por fluxo crítico executado.
- Print de log/auditoria do evento correspondente.
- Relatório final com: cenário, resultado, responsável e data/hora.

---

## 5) Plano de Observabilidade e Auditoria

### 5.1 O que monitorar (mínimo)

- **Aplicação**: erro por endpoint, latência, taxa de sucesso de operações críticas.
- **Banco**: conexões, locks, slow queries, falhas de autenticação.
- **Segurança**: tentativas de acesso negadas, alterações de permissões, eventos administrativos.
- **Negócio**: número de pagamentos gerados, divergência de valores, escalas validadas/dia.

### 5.2 Logs obrigatórios por evento crítico

Cada evento precisa conter:

- `timestamp` (UTC), `userId`, `action`, `entityType`, `entityId`, `status`, `ipAddress`.
- `oldValues/newValues` em alterações sensíveis (com mascaramento quando necessário).
- `correlationId` para rastrear uma operação ponta a ponta.

### 5.3 Política de retenção (sugestão inicial)

- Logs de aplicação: 90 dias online.
- Auditoria de ações críticas: 5 anos (ou conforme política jurídica/contábil interna).
- Evidências de incidentes: manter até encerramento formal + prazo legal.

### 5.4 Alertas em tempo real

- 5+ falhas de login no mesmo usuário em 10 min.
- Alteração de permissão para admin.
- Mudança de PIX/chave bancária.
- Picos de erro acima do baseline.
- Queda de job de backup.

### 5.5 Governança (RACI simplificado)

- **Responsável técnico**: operação de logs e alertas.
- **Financeiro**: valida eventos de pagamento/recebimento.
- **RH/DP**: valida eventos de dados de colaboradores.
- **Compliance/Jurídico**: define retenção e uso legal de dados (LGPD/CLT).

---

## 6) Plano de Deploy / Backup / Rollback

### 6.1 Estratégia de deploy

1. **Pré-produção (staging)** espelhada da produção.
2. Janela de deploy fora do horário de fechamento financeiro.
3. Checklist de pré-deploy:
   - migrations revisadas
   - backup validado
   - variáveis de ambiente conferidas
   - testes críticos aprovados
4. Deploy em etapas:
   - aplicar migrations compatíveis
   - subir backend
   - validar smoke tests
   - liberar usuários por grupo (canary interno)

### 6.2 Backup (RPO/RTO)

- **RPO alvo**: até 24h (perda máxima de dados aceitável).
- **RTO alvo**: até 4h (tempo máximo para retorno do sistema).
- Rotina:
  - backup full diário
  - backup incremental durante o dia (se disponível)
  - criptografia e cópia externa
  - teste de restore mensal documentado

### 6.3 Rollback técnico

**Cenário de rollback imediato:** erro crítico em pagamento, perda de integridade, indisponibilidade relevante.

Passo a passo:

1. Congelar operações críticas (pagamentos/edições sensíveis).
2. Redirecionar tráfego para versão estável anterior.
3. Reverter migration apenas se segura (evitar perda; preferir migration corretiva quando necessário).
4. Restaurar backup se houver corrupção de dados.
5. Executar testes de fumaça pós-rollback.
6. Comunicar stakeholders com horário, impacto e plano de normalização.

### 6.4 Plano de comunicação de incidente

- Canal único de crise (ex.: grupo interno + ticket).
- Atualização a cada 30 minutos até estabilizar.
- Pós-incidente em até 48h: causa raiz, impacto, ações preventivas.

---

## Checklist final de prontidão (resumo executivo)

- [ ] RBAC aplicado com segregação de função e revisão mensal.
- [ ] Logs de auditoria completos e testados.
- [ ] Backup/restore testado no último mês.
- [ ] Testes críticos aprovados com evidências.
- [ ] Mapa de risco por módulo validado com gestores.
- [ ] Aprovação jurídico/contábil para pontos CLT/LGPD sensíveis.

## Observações de compliance (Brasil)

- Em fluxos de jornada, frequência, pagamento e dados pessoais, validar regras internas com **DP/contabilidade/jurídico** para aderência CLT e LGPD.
- Este documento é técnico-operacional e não substitui parecer jurídico formal.

---

## 7) O que falta para virar produto confiável de verdade (plano de execução)

### 7.1 Congelar o core de negócio (regra de ouro)

Escopo que deve ser congelado antes de novas telas:

- contas a pagar
- contas a receber
- lotes de pagamento
- planejamentos
- PIX
- presença/check-in/check-out
- permissões por módulo

Controles mínimos obrigatórios:

1. Definir estados válidos e transições válidas por entidade crítica.
2. Regras imutáveis de pagamento após fechamento.
3. Snapshot de dados sensíveis no fechamento (PIX, valor, jornada, responsável).
4. Bloqueio de edição livre após fechamento financeiro.
5. Auditoria obrigatória para qualquer alteração de dinheiro, presença ou PIX.

### 7.2 Integridade de banco (endurecimento técnico)

Implementações obrigatórias no schema/migrations:

1. Foreign keys reais para relações críticas.
2. Índices para rotas de leitura pesada e validações de duplicidade.
3. Unique constraints de negócio.
4. Checks lógicos para impedir estados inválidos.
5. `NOT NULL` onde campo é obrigatório operacionalmente.
6. Soft delete/arquivamento para trilha histórica.
7. Campos de versionamento e auditoria por registro crítico.

Regras críticas a blindar no banco e backend:

- impedir duplicidade da mesma alocação (`employeeId` + `scheduleId`)
- impedir pagamento duplicado da mesma alocação
- impedir alteração de PIX sem fluxo formal (`pix_change_requests`)
- impedir lote “pago” sem itens consistentes
- impedir edição de registro fechado sem permissão elevada + log obrigatório

### 7.3 Arquitetura de estados (state machine no backend)

Cada entidade crítica deve ter máquina de estados com guarda de transição:

- `work_schedules`: `pendente -> validado -> cancelado`
- `payment_batches`: `pendente -> pago -> cancelado`
- `pix_change_requests`: `pendente -> aprovado/rejeitado`
- `accounts_payable`: `pendente -> pago/vencido/cancelado`
- `accounts_receivable`: `pendente -> recebido/vencido/cancelado`

Regra: transição só no backend com validação de permissão, consistência e auditoria.

### 7.4 Backend como fonte única da verdade

Padrão obrigatório para fluxos sensíveis:

1. Frontend envia intenção (não envia totais finais como verdade).
2. Backend valida entrada, permissão e escopo do usuário.
3. Backend recalcula totais financeiros e de presença.
4. Backend decide status final.
5. Backend grava auditoria antes/depois.
6. Backend devolve resultado consolidado.

### 7.5 Testes sérios (unitário + integração + E2E + regressão)

Estratégia mínima:

- **Unitários**: cálculo, status, permissão, PIX, presença, lote.
- **Integração**:
  - planejamento -> alocação -> validação -> lote
  - alteração PIX -> aprovação -> efeito futuro
  - pagamento -> bloqueio de duplicidade
  - contas pagas/recebidas -> saldo correto
- **E2E**: login, fluxo admin, líder, financeiro, bloqueio por permissão.
- **Regressão**: todo bug resolvido vira teste automático fixo.

### 7.6 Observabilidade e diagnóstico

Implementar:

1. logs estruturados (JSON)
2. `correlationId` por requisição
3. logs de autenticação e autorização
4. logs de erro com contexto funcional
5. logs de eventos financeiros
6. healthcheck e readiness check
7. métricas básicas (latência, erro, throughput)
8. painel de erros e alertas

### 7.7 Auditoria forte

Política obrigatória:

- o que auditar
- quem visualiza
- quais campos mascarar
- retenção
- before/after de alterações
- justificativa obrigatória em ação crítica

Mínimo auditável:

- alteração de permissões
- criação/edição/exclusão financeira
- fechamento/cancelamento de lote
- mudança de PIX
- alteração de presença
- alteração pós-fechamento

### 7.8 Segurança real (negação por padrão)

Controles mínimos:

1. validação de input em 100% das mutações (schema validation)
2. sanitização de dados textuais
3. autorização por recurso (não só por módulo)
4. rate limit por IP/usuário
5. headers de segurança
6. upload com limite de tamanho/tipo + varredura
7. storage seguro para documentos
8. rotação de segredos
9. separação de ambientes (dev/hml/prod)
10. sessão/autenticação com política clara

Regras de confiança zero:

- negar por padrão
- permitir só explicitamente
- validar escopo/ownership no portal do líder
- nunca confiar em role enviada pelo cliente

### 7.9 Fluxos irreversíveis e fechamento operacional

Criar o conceito formal de fechamento:

- competência/mês fechado
- lote fechado
- planejamento validado e congelado
- ajuste excepcional só com justificativa e auditoria

Com isso:

- dado operacional vira financeiro
- financeiro vira histórico
- histórico não pode ser alterado livremente

### 7.10 Backup, restore e contingência

Obrigatório para operação real:

1. backup automático de banco
2. teste de restauração periódico
3. política de retenção documentada
4. exportação de dados críticos
5. rollback de deploy testado
6. ambiente de homologação
7. migrations versionadas
8. rotina mínima de disaster recovery

### 7.11 Padronização de ambiente e entrega

Padronizar:

- versão de Node
- versão de pnpm
- `.env.example`
- scripts de setup/migração
- gates `lint/check/test` antes de deploy
- pipeline CI/CD com bloqueio em falha

### 7.12 Documentação operacional obrigatória

Além deste plano, manter:

1. documento de arquitetura
2. documento de regras de negócio
3. matriz de permissões oficial
4. política de status/transições
5. catálogo de APIs
6. playbook de incidentes
7. checklist de deploy
8. checklist de homologação
9. checklist de fechamento financeiro

---

## 8) Ordem certa de execução (roadmap prático)

### Fase 1 — Blindagem do core

1. revisar schema
2. adicionar constraints/índices/FKs
3. travar transições de estado
4. recalcular dados críticos no backend
5. endurecer RBAC

### Fase 2 — Confiabilidade funcional

1. testes unitários
2. testes de integração
3. testes E2E
4. regressão de fluxos críticos

### Fase 3 — Segurança e rastreabilidade

1. auditoria completa
2. logs estruturados
3. rate limit
4. uploads seguros
5. revisão autenticação/autorização

### Fase 4 — Operação real

1. backups
2. restore testado
3. CI/CD
4. homologação
5. monitoramento
6. checklist de deploy

### Fase 5 — Fechamento de produto

1. documentação final
2. aceite funcional
3. aceite técnico
4. aceite operacional

---

## 9) Definição prática de “produto confiável” (critérios de aceite)

O FinHub só deve ser considerado pronto para uso sério quando cumprir **todos** os critérios abaixo:

- nenhum pagamento duplicado possível
- nenhuma alteração de PIX sem trilha e aprovação
- nenhuma alocação duplicada sem bloqueio ou exceção auditada
- nenhum usuário acessa módulo/ação fora do escopo
- todo cálculo financeiro é reproduzível
- toda mudança relevante deixa rastro
- qualquer incidente pode ser investigado ponta a ponta
- qualquer deploy pode ser revertido
- qualquer base pode ser restaurada
- todo fluxo crítico tem teste automatizado

---

## 10) Execução do roadmap (status desta entrega)

### Fase 1 — Blindagem do core (executado nesta sprint)

- [x] Trava de transição de estados no backend (planejamento, contas e lotes).
- [x] Bloqueio de edição de entidades fechadas (`pago`, `recebido`, `cancelado`).
- [x] Bloqueio de duplicidade em alocações e itens de lote (backend + migration).
- [x] Fluxo formal de PIX reforçado (solicitação pendente única + revisão única).
- [x] Migração SQL de hardening com constraints e índices críticos.

### Fase 2 em diante (próximas sprints)

- [x] Regras críticas extraídas para funções testáveis (cálculo de lote, bloqueios e deduplicação).
- [x] Testes unitários adicionais de fase 2 para fluxos críticos.
- [x] Integração com banco em CI dedicada (`Integration DB`) para validar fluxo com `DATABASE_URL`.
- [ ] Integrações fim a fim dos fluxos críticos (em progresso).
- [ ] E2E de perfis (admin/líder/financeiro) com cenários de negação (pendente).
- [x] Início da fase 3: middleware de correlation id + logs estruturados.
- [x] Início da fase 3: rate limit básico em `/api` e endpoints `/health` e `/ready`.
- [x] Início da fase 3: endpoint de métricas básico (`/metrics`).
- [ ] Observabilidade operacional completa (alertas + dashboard).
- [x] Início da fase 4: pipeline CI com gates (`check` + `test`).
- [x] Início da fase 4: scripts de backup/restore operacional.
- [x] Início da fase 4: playbook de incidentes e checklist de pré-deploy.
- [x] Início da fase 4: script de validação local para liberar homologação (`ops:testapp`).
- [x] CI/CD com workflows de deploy para homologação/produção e gate de aprovação por ambiente (via GitHub Environments).
- [x] Início da fase 5: documento formal de aceite funcional/técnico/operacional.
- [ ] Fase 5 concluída com assinaturas de aceite e aprovação CLT/LGPD.
