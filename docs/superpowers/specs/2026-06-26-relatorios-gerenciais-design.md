# Módulo: Relatórios Gerenciais — Design

- **Data:** 2026-06-26
- **Status:** Desenho aprovado (estrutura). Sem implementação.
- **Origem:** PDF de modelos de relatório gerencial (RH Administrativo + Financeiro, cadências semanal/mensal).
- **Stack alvo:** Drizzle (MySQL) + tRPC v11 + React/Vite + shadcn/ui + wouter.

## 1. Objetivo

Permitir que os responsáveis de setor (RH Administrativo e Financeiro) registrem relatórios
periódicos estruturados (semanais e mensais), com itens fiéis aos modelos do PDF, e que a
papel validador (gestor / admin) aprove ou devolva. O valor de gestão está no
**meta-relatório**: índice de entrega no prazo por setor e itens recorrentes em atraso ao
longo do tempo.

## 2. Princípio condutor: adoção antes de completude

O maior risco **não é arquitetura, é adoção**. Pedir um formulário de 9–12 itens toda sexta
compete com mandar um áudio no WhatsApp. Se preencher der trabalho, o time abandona e o
módulo morre. Toda decisão abaixo prioriza **redução de atrito** sobre fidelidade exaustiva
ao PDF.

## 3. Decisões de design

| Tema | Decisão | Justificativa |
|---|---|---|
| Estrutura | Itens estruturados (não JSON) | Única forma de viabilizar carry-over item-a-item e o meta-relatório de tendências. Num blob de texto não há como saber *quais* itens seguem abertos para arrastar. |
| Carry-over | Automático | Itens não-concluídos transbordam pré-preenchidos e marcados como "arrastado". Transforma "redação semanal" em "atualizar o que mudou". |
| Materialização | Automática via scheduler | Sistema abre o relatório do período e avisa o autor; cria hábito e permite detectar "nem começou". Usa `notification-scheduler` existente. |
| Variante semanal | Resumido auto-gerado do detalhado | Autor preenche só o detalhado; o resumido é um digest derivado. Zero digitação dupla. |
| 5 seções fixas | 2 derivadas dos itens + 3 de texto livre | "Demandas em atraso" e "Pendências" auto-compõem dos `item_status`; sobra "Resumo geral", "Pontos para validação", "Próximas prioridades". |
| Atraso | Derivado ao vivo + `was_on_time` carimbado no envio | Status em tempo real sem cron; métrica histórica que não muda quando datas mudam. |
| Integração | Módulo separado + notificação no feed do validador | Dados desacoplados do Kanban/Inbox; atenção unificada num feed só. |
| Pós-validação | Lock + snapshot | Artefato de prestação de contas, imutável após aprovação; devolução reabre. |

## 4. Reuso de infraestrutura existente (não reconstruir)

- **`server/utils/business-days.ts`** — `addBusinessDays`, `isBusinessDay`, `countBusinessDays`
  com tabela `holidays`. "3º dia útil do mês seguinte" = `addBusinessDays(primeiroDiaDoMes, 2)`.
- **`server/_core/notification-events.ts` + `notification-scheduler.ts`** — broadcast por
  evento (`broadcastNotification({userId})`, `broadcastToRole('admin')`) + WebSocket +
  scheduler. Molde: `notifyVacationApproval`.
- **`medical_exams` + tabela de alertas/lembretes** (`drizzle/schema.ts`, ~linhas 242 e 517) —
  já controlam vencimento de ASO, treinamentos, documentos, certidões com
  `expiryDate` + status `Válido / Vencido / Próximo do Vencimento`. A aba "Vencimentos"
  apenas **lê e agrega** essas fontes; **não** cria tabela nova.
- **RBAC existente** (`role: admin | gestor | colaborador | user`) + scope do Inbox
  (`mine | team | all`). Mapear responsáveis por `role` + setor, **sem** RBAC paralelo.

## 5. Modelo de dados — `drizzle/schema-managerial-reports.ts`

```
mr_reports
  id, sector enum(rh_admin, financeiro), cadence enum(semanal, mensal),
  period_ref varchar(10),            -- "2026-W26" (semana ISO) | "2026-06" (mês)
  due_date date,                     -- sexta 18h da semana ISO | 3º dia útil do mês seguinte
  author_id FK→users,
  status enum(rascunho, enviado, validado, devolvido),
  was_on_time boolean,               -- carimbado no submit (submitted_at <= due_date)
  summary, points_for_validator, next_priorities text, -- 3 seções de texto livre
  submitted_at, validated_at, validated_by, rejection_note,
  locked_snapshot json,              -- congelado ao validar
  created_at, updated_at
  UNIQUE(sector, cadence, period_ref)

mr_report_items
  id, report_id FK, label, expected_content,
  value text, item_status enum(pendente, em_andamento, concluido),
  carried_over boolean,              -- nasceu arrastado do período anterior
  sort_order
```

Notas:
- "Demandas em atraso" e "Pendências" são **derivadas** de `item_status` na leitura, não colunas.
- Templates (catálogo das pág. 3–6) ficam em **config TS**
  (`server/modules/managerial-reports/templates.ts`), não em tabela.
- Vencimentos: leitura de `medical_exams` + alertas; sem tabela nova.

## 6. Catálogo de templates (config TS — extraído do PDF)

6 templates por `(setor, cadência, variante)`. `variante = detalhado | resumido` (resumido
só semanal, e auto-gerado do detalhado). Os itens abaixo são copiados para `mr_report_items`
na criação do relatório.

### 6.1 RH Administrativo — Semanal detalhado (pág. 3)
- Admissões da semana — Nome, função, cliente/local, data de início e status da documentação
- Rescisões/desligamentos — Nome, motivo, data, pendências e documentos necessários
- Contratos pendentes — Contratos a emitir, assinar, atualizar ou regularizar
- Documentação pendente — Colaboradores/prestadores com documentos faltando ou incompletos
- Controle de ponto/assinaturas — Faltas de assinatura, divergências, dias pendentes, info aguardando líder/operacional
- Demandas administrativas recebidas — Demandas da semana, status, responsável e prazo de retorno
- Pendências com líderes — Info, assinaturas, documentos ou confirmações que dependem dos líderes operacionais
- Problemas da semana — Atrasos, falhas, retrabalho, falta de info, documentos incorretos
- Prioridade da próxima semana — O que precisa ser resolvido primeiro na semana seguinte

### 6.2 RH Administrativo — Semanal resumido (pág. 3) — auto-gerado
- Admissões realizadas — Quantidade e nomes principais
- Desligamentos realizados — Quantidade e nomes principais
- Contratos pendentes — Quantidade e motivo da pendência
- Documentos pendentes — Quantidade, nomes e prazo para regularização
- Demandas concluídas — Quantidade e resumo das principais entregas
- Demandas em atraso — Quantidade, motivo do atraso e ação necessária

### 6.3 RH Administrativo — Mensal (pág. 4)
- Admissões do mês — Quantidade total, nomes, funções, clientes/locais e datas de início
- Desligamentos do mês — Quantidade total, nomes, motivos, clientes/locais e pendências finais
- Colaboradores/prestadores ativos — Quantidade por cliente, setor ou operação
- Contratos emitidos — Qtd. emitida, qtd. assinada e contratos pendentes de assinatura/ajuste
- Pendências documentais — Quem está irregular/incompleto, com prazo de regularização
- Vencimento de documentos — Documentos a vencer no mês: ASO, exames, certificados, treinamentos, integrações
- Controle de vencimentos de certidões — Certidões da empresa com validade, status, responsável e prazo
- Atestados, faltas e ausências — Quantidade, principais ocorrências e situações que exigem acompanhamento
- Demandas concluídas no mês — Total finalizado e resumo das principais entregas
- Demandas pendentes p/ próximo mês — Demandas em aberto, motivo, responsável e prazo previsto
- Problemas recorrentes — Falha de documentos, atrasos, erros de info, falhas de comunicação, retrabalho
- Plano de melhoria — Ações sugeridas para corrigir falhas e melhorar o processo

### 6.4 Financeiro — Semanal detalhado (pág. 5)
- Notas fiscais emitidas — Cliente, competência, valor, vencimento e status de envio
- Boletos emitidos — Cliente, valor, vencimento, data de envio e confirmação
- Contas a receber — Valores recebidos, a vencer, vencidos e pendentes de baixa
- Cobranças realizadas — Cliente, data, forma de contato e retorno recebido
- Contas a pagar — Pagamentos feitos, pendentes e vencimentos próximos
- Conciliação bancária — O que foi conciliado e o que ficou pendente de identificação/baixa
- Medições em andamento — Cliente, período, valor previsto, status de conferência e pendências
- Fechamento quinzenal de medição — Medições fechadas, conferidas, enviadas, aguardando aprovação ou pendentes
- Pendências financeiras — Valores sem baixa, boletos vencidos, comprovantes faltantes, divergências
- Prioridades da próxima semana — Cobranças, emissões, pagamentos, conferências ou ajustes urgentes

### 6.5 Financeiro — Semanal resumido (pág. 5) — auto-gerado
- Total faturado na semana — Valor total e principais clientes faturados
- Total recebido na semana — Valor total recebido, clientes e datas
- Total em aberto — A receber, separado entre a vencer e vencidos
- Notas e boletos emitidos — Quantidade e principais emissões da semana
- Cobranças realizadas — Quantidade e clientes cobrados
- Medições fechadas e pendentes — Quantidade, cliente, período e status

### 6.6 Financeiro — Mensal (pág. 6)
- Faturamento do mês — Cliente, competência, valor, vencimento e status de envio
- Recebimentos do mês — Cliente, valor, data, forma de pagamento e baixa realizada
- Valores em aberto — Clientes que não pagaram, valor, vencimento e situação
- Valores vencidos — Cliente, valor, dias em atraso, histórico de cobrança e próximos passos
- Contas pagas — Principais pagamentos do mês, por categoria/fornecedor
- Contas pendentes — Pagamentos adiados para o próximo mês e motivo
- Conciliação bancária — Status geral e pendências de identificação/baixa
- Medições fechadas — Cliente, período, valor, status de conferência, envio e aprovação
- Medições pendentes — O que ainda não foi fechado, aprovado ou ajustado
- Notas/boletos cancelados ou corrigidos — Motivo, cliente, valor e nova emissão
- Problemas recorrentes — Atraso de cliente, falta de comprovante, divergência, erro em boleto/nota, retrabalho
- Prioridades do próximo mês — Cobranças, conferências, emissões, pagamentos, ajustes de medição

## 7. Máquina de estados

```
rascunho ──(autor envia)──> enviado
enviado  ──(validador aprova)──> validado   [snapshot + lock]
enviado  ──(validador devolve + rejection_note)──> devolvido
devolvido ──(autor reedita e reenvia)──> enviado

Atraso = derivado: (now > due_date && status != validado). Não é estado persistido.
was_on_time = carimbado no envio (submitted_at <= due_date).
```

| de → para | quem |
|---|---|
| rascunho → enviado | autor (responsável do setor) |
| enviado → validado | validador (gestor / admin) |
| enviado → devolvido | validador |
| devolvido → enviado | autor |

## 8. Backend — `server/routers/managerial-reports.ts` (registrar como `managerialReports`)

```
listReports({ sector?, cadence?, status?, periodRef? })
getReport({ id })                       -- relatório + itens (derivados de atraso/pendência)
dashboard({ periodRef? })               -- por setor: contagens + % entrega no prazo
updateReport({ id, summary?, pointsForValidator?, nextPriorities? })  -- bloqueado se validado
updateItem({ itemId, value?, itemStatus? })                       -- bloqueado se validado
submitForValidation({ id })             -- carimba was_on_time, notifica validador
validate({ id, approve, rejectionNote? })  -- só validador; approve→snapshot+lock
```

Módulos de apoio:
- `server/modules/managerial-reports/templates.ts` — catálogo (seção 6).
- `server/modules/managerial-reports/period.ts` — helpers `period_ref` ↔ datas (reusa `business-days.ts`).
- `server/modules/managerial-reports/scheduler.ts` — materialização automática do período +
  carry-over + notificação ao autor (via `notification-scheduler`).

Regras de prazo:
- Semanal: `due_date` = sexta-feira da semana ISO de `period_ref`, 18h.
- Mensal: `due_date` = 3º dia útil do mês seguinte (`addBusinessDays(primeiroDiaDoMesSeguinte, 2)`).

Carry-over (na materialização):
- Ao criar o relatório do período N, copiar do período N-1 (mesmo template) os itens com
  `item_status != concluido`, preenchendo `value` anterior e `carried_over = true`.

## 9. Matriz de permissões (reuso de role + setor)

| ação | responsável (autor) | validador (gestor) | admin |
|---|---|---|---|
| criar/editar/enviar relatório do seu setor | ✅ | ❌ | ✅ |
| ver relatórios | só do seu setor | todos | todos |
| validar / devolver | ❌ | ✅ | ✅ |
| configurar setores/responsáveis | ❌ | ❌ | ✅ |
| ver/editar vencimentos | ✅ (responsável do doc) | ✅ | ✅ |

## 10. Frontend — `client/src/pages/ManagerialReports.tsx` (`/relatorios-gerenciais`)

```
/relatorios-gerenciais  (ManagerialReports.tsx, link no DashboardLayout)
├─ StatusDashboard       cards por setor (status × contagem + % no prazo)
├─ ReportFilters         setor, cadência, período, status
├─ ReportList            linhas + badge de status colorido (paleta pág. 7)
├─ NewReportDialog       escolhe template + período (fallback manual; padrão é automático)
├─ ReportEditor          rota /relatorios-gerenciais/:id
│   ├─ FreeSections      Resumo geral, Pontos para validação, Próximas prioridades
│   ├─ ItemsTable        label | o que deve conter | valor | status | badge "arrastado"
│   └─ ValidationBar     enviar | (validador) aprovar/devolver
└─ RenewalsTab           leitura de medical_exams + alertas (sem tabela nova)
```

Badges (pág. 7): vermelho = atraso, azul = em andamento/enviado, âmbar = aguardando, verde = validado.

## 11. Notificações (reuso do padrão `notifyVacationApproval`)

- Materialização: "Seu relatório da semana/mês está aberto, vence em <due_date>" → autor.
- Envio: "Relatório <setor> <período> aguardando validação" → validador (feed do validador).
- Devolução: "Relatório devolvido: <rejection_note>" → autor.
- Lembrete: due_date se aproximando e ainda em rascunho → autor.
- Escalonamento: passou do prazo sem validar → validador/admin.

## 12. Rollout em 3 fases (mitiga risco de adoção)

1. **MVP:** 1 setor (RH), semanal, editor + envio + validação manual. Objetivo: provar que preenchem.
2. **Hábito:** materialização automática + carry-over + notificações + cadência mensal.
3. **Gestão:** dashboard de tendências + índice no prazo + setor Financeiro + aba Vencimentos.

## 13. Fora de escopo (YAGNI por ora)

- RBAC próprio por setor (usar role + setor existentes).
- Tabela própria de vencimentos (`mr_doc_renewals`) — usar `medical_exams` + alertas.
- Tabelas de template no banco — usar config TS.
- Estado `aguardando_retorno` e cron de `recomputeOverdue` — atraso é derivado.
- Integração direta com Kanban/Inbox — apenas notificação no feed compartilhado.
