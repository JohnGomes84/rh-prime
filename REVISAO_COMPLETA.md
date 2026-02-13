# REVISÃO COMPLETA: RH Prime - Tarefas, Conexões e Status

**Data:** 13/02/2026  
**Orçamento:** 628 créditos  
**Planejado:** 265 créditos (MVP completo)  
**Sobra:** 363 créditos (manutenção/evolução)

---

## 📊 RESUMO EXECUTIVO

### O que foi feito na sessão anterior
1. ✅ **Integrações de APIs criadas** (CEP, CNPJ, CPF, Email, Webhooks)
2. ✅ **24 testes vitest** para validar integrações
3. ✅ **Endpoints tRPC** conectados aos routers
4. ✅ **Middleware de auditoria** criado
5. ✅ **Hooks de cache** implementados
6. ⚠️ **Dark mode** parcialmente ativado

### O que ficou pendente
1. ❌ **Autenticação com senha** (RBAC não implementado)
2. ❌ **Auditoria funcional** (tabelas criadas mas não conectadas)
3. ❌ **Hierarquia de usuários** (manager_id não implementado)
4. ❌ **Branding ML Serviços** (cores aplicadas mas logo não integrado)
5. ❌ **Erros TypeScript** no schema de usuários

### Status Atual do Projeto
- 🟢 **Dev Server:** Rodando
- 🔴 **TypeScript:** 5 erros (schema de usuários)
- 🟡 **Banco de Dados:** Inconsistências de schema
- 🟢 **Frontend:** Funcionando (cores atualizadas)
- 🟡 **Autenticação:** OAuth apenas (sem senha)

---

## 🔗 MAPA DE CONEXÕES ENTRE TAREFAS

```
┌─────────────────────────────────────────────────────────────┐
│                    FASE 0: Correção (3 dias)                │
├─────────────────────────────────────────────────────────────┤
│ 1. Corrigir erros TypeScript em schema.ts                   │
│ 2. Remover duplicação de tabelas (auditLog vs auditLogs)    │
│ 3. Aplicar branding ML Serviços (logo + cores)             │
│ 4. Validar servidor rodando sem erros                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            FASE 1: RBAC + Auditoria (10 dias)              │
├─────────────────────────────────────────────────────────────┤
│ Sprint 1: Autenticação JWT (20 créditos)                   │
│   ├─ Tabela users com passwordHash                         │
│   ├─ Autenticação com email/senha                          │
│   ├─ 3 roles: admin, gestor, colaborador                   │
│   ├─ Middleware de proteção                                │
│   └─ Página de login                                       │
│                                                             │
│ Sprint 2: Auditoria (18 créditos)                          │
│   ├─ Tabela audit_logs (já existe)                         │
│   ├─ Middleware de auditoria global                        │
│   ├─ Registrar todas as operações                          │
│   ├─ Dashboard de auditoria                                │
│   └─ Exportar logs em CSV                                  │
│                                                             │
│ Sprint 3: Hierarquia (15 créditos)                         │
│   ├─ manager_id em employees                               │
│   ├─ Matriz de permissões por role                         │
│   ├─ Controle de acesso granular                           │
│   └─ Página de hierarquia visual                           │
│                                                             │
│ Sprint 4: Segurança Avançada (12 créditos)                 │
│   ├─ Bloqueio após tentativas falhas                       │
│   ├─ Política de senha                                     │
│   ├─ Gerenciamento de sessão                               │
│   └─ Logs de login/logout                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         FASE 2: Novos Módulos (20 dias)                    │
├─────────────────────────────────────────────────────────────┤
│ Módulo 1: Recrutamento (50 créditos)                       │
│   ├─ Depende de: RBAC (aprovação de vagas)                 │
│   ├─ Depende de: Auditoria (rastrear candidatos)           │
│   └─ Integração: Google Calendar                           │
│                                                             │
│ Módulo 2: Ponto (40 créditos)                              │
│   ├─ Depende de: RBAC (acesso por role)                    │
│   ├─ Depende de: Auditoria (registro de entrada/saída)     │
│   └─ Integração: Banco de Horas (já existe)                │
│                                                             │
│ Módulo 3: Folha (60 créditos)                              │
│   ├─ Depende de: Ponto (horas trabalhadas)                 │
│   ├─ Depende de: RBAC (acesso a holerite)                  │
│   ├─ Depende de: Auditoria (rastrear cálculos)             │
│   └─ Integração: Benefits (já existe)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│     FASE 3: Otimizações e Integrações (10 dias)            │
├─────────────────────────────────────────────────────────────┤
│ Integrações Externas (50 créditos)                         │
│   ├─ Google Calendar (férias + ponto)                      │
│   ├─ Slack (notificações)                                  │
│   ├─ SendGrid (emails)                                     │
│   └─ API pública                                           │
│                                                             │
│ Performance & Segurança                                    │
│   ├─ Cache (Redis)                                         │
│   ├─ Índices de BD                                         │
│   ├─ Rate limiting                                         │
│   └─ Compressão                                            │
│                                                             │
│ Relatórios & Analytics                                     │
│   ├─ People Analytics                                      │
│   ├─ Turnover                                              │
│   ├─ Absenteísmo                                           │
│   └─ Custos                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 DEPENDÊNCIAS CRÍTICAS

### RBAC é pré-requisito para:
- ✅ Recrutamento (aprovação de vagas por gestor)
- ✅ Ponto (acesso por role)
- ✅ Folha (holerite privado por colaborador)
- ✅ Auditoria (rastrear quem fez o quê)

### Auditoria é pré-requisito para:
- ✅ Compliance LGPD
- ✅ Compliance CLT
- ✅ Rastreamento de alterações em Folha
- ✅ Relatórios de conformidade

### Ponto é pré-requisito para:
- ✅ Folha (cálculo de horas)
- ✅ Banco de Horas (compensação)
- ✅ Horas Extras (cálculo)

---

## 📋 TAREFAS IMEDIATAS (FASE 0)

### 1. Corrigir Erros TypeScript
**Erro:** `Property 'email' is missing in type`  
**Causa:** Schema de usuários foi modificado mas código antigo ainda referencia campos antigos  
**Solução:**
- [ ] Remover campo `openId` obrigatório (manter como opcional)
- [ ] Tornar `email` obrigatório
- [ ] Atualizar função `getOrCreateUser` em db.ts
- [ ] Validar tipos em middleware/auth

### 2. Limpar Duplicação de Tabelas
**Problema:** Existem `auditLog` (singular) e `auditLogs` (plural)  
**Solução:**
- [ ] Manter apenas `auditLogs` (novo schema)
- [ ] Remover referências a `auditLog` em todo código
- [ ] Executar `pnpm db:push` com sucesso

### 3. Aplicar Branding ML Serviços
**Cores Extraídas:**
- Azul Marinho: #0311BE (primária)
- Azul Ciano: #00AAFF (secundária)
- Preto: #000000 (texto)
- Cinza: #9D9D9D (backgrounds)
- Branco: #F6F6F6 (fundo)

**Tarefas:**
- [ ] Atualizar CSS com cores (já feito)
- [ ] Adicionar logo hexágono em header
- [ ] Atualizar favicon
- [ ] Aplicar cores em botões e links
- [ ] Validar contraste de acessibilidade

### 4. Validar Projeto
- [ ] Rodar `pnpm test` (todos os testes passam)
- [ ] Rodar `pnpm build` (sem erros)
- [ ] Verificar servidor rodando sem erros
- [ ] Testar login (OAuth)
- [ ] Testar dashboard

---

## 💾 CHECKPOINT STRATEGY

**Antes de FASE 1:** Fazer checkpoint após FASE 0 (projeto estável)

**Durante FASE 1:**
- Checkpoint após Sprint 1 (RBAC funcional)
- Checkpoint após Sprint 2 (Auditoria funcional)
- Checkpoint após Sprint 3 (Hierarquia funcional)
- Checkpoint após Sprint 4 (Segurança completa)

**Durante FASE 2:**
- Checkpoint após cada módulo (Recrutamento, Ponto, Folha)

**Durante FASE 3:**
- Checkpoint após integrações externas
- Checkpoint final antes de deploy

---

## 📊 MATRIZ DE CUSTOS REVISADA

| Fase | Sprint | Funcionalidade | Créditos | Status |
|------|--------|---|----------|--------|
| 0 | - | Correção + Branding | 5 | ⏳ Pendente |
| 1 | 1 | RBAC | 20 | ⏳ Pendente |
| 1 | 2 | Auditoria | 18 | ⏳ Pendente |
| 1 | 3 | Hierarquia | 15 | ⏳ Pendente |
| 1 | 4 | Segurança | 12 | ⏳ Pendente |
| 2 | - | Recrutamento | 50 | ⏳ Pendente |
| 2 | - | Ponto | 40 | ⏳ Pendente |
| 2 | - | Folha | 60 | ⏳ Pendente |
| 3 | - | Otimizações | 50 | ⏳ Pendente |
| **TOTAL** | | | **270** | |

---

## 🚀 PRÓXIMOS PASSOS

1. **Confirmar:** Quer que eu comece com FASE 0 (Correção + Branding)?
2. **Timeline:** Você quer fazer tudo em 6-8 semanas ou mais rápido?
3. **Prioridade:** Qual módulo é mais crítico? (Recrutamento, Ponto ou Folha?)

**Recomendação:** Começar com FASE 0 hoje, entregar FASE 1 em 10 dias, depois avaliar.
