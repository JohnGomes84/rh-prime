# FinHub Inteligente - Deployment & Infrastructure Guide

## 🚀 Deployment no Manus

### Status Atual

- **URL**: https://finhubapp-bwutngty.manus.space
- **Status**: ✅ Ativo
- **Versão**: 3.9
- **Última Deploy**: 2026-04-05

### Como Fazer Deploy

#### 1. Criar Checkpoint

```bash
# No Manus Management UI, após fazer alterações:
1. Ir para "Dashboard" → "Checkpoints"
2. Clicar "Save Checkpoint"
3. Adicionar descrição das mudanças
4. Confirmar
```

#### 2. Publicar

```bash
# No Manus Management UI:
1. Ir para "Dashboard" → "Checkpoints"
2. Selecionar o checkpoint mais recente
3. Clicar "Publish"
4. Aguardar build (2-3 minutos)
5. Confirmar quando status = "Published"
```

#### 3. Verificar Deploy

```bash
# Acessar URL pública
https://finhubapp-bwutngty.manus.space

# Ou verificar logs
pnpm logs
```

---

## 🗄️ Banco de Dados

### Conexão

```
Host: Gerenciado pelo Manus
Database: finhub_prod
User: Injetado via env
Password: Injetado via env
```

### Variáveis de Ambiente

```env
DATABASE_URL=mysql://user:pass@host/finhub_prod
JWT_SECRET=seu-secret-jwt
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
```

### Backups

- Automáticos: Diários (gerenciado pelo Manus)
- Manual: Solicitar via Management UI

### Migrations

#### Aplicar Migration

```bash
# 1. Editar schema em drizzle/schema.ts
# 2. Gerar migration
pnpm drizzle-kit generate

# 3. Executar via Manus Management UI → Database
# Ou via CLI:
pnpm drizzle-kit migrate
```

#### Exemplo: Adicionar Coluna

```typescript
// drizzle/schema.ts
export const accountsReceivable = mysqlTable('accounts_receivable', {
  id: int().primaryKey().autoincrement(),
  clientId: int().references(() => clients.id),
  amount: decimal({ precision: 15, scale: 2 }).notNull(),
  dueDate: datetime().notNull(),
  status: mysqlEnum('status', ['pendente', 'recebido', 'cancelado']).default('pendente'),
  description: text(),
  // NOVA COLUNA:
  invoiceNumber: varchar({ length: 50 }).unique(), // ← Adicionar aqui
  createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime().onUpdateNow(),
});
```

```bash
# Gerar migration
pnpm drizzle-kit generate

# Arquivo gerado: drizzle/0001_add_invoice_number.sql
# Executar no banco
```

---

## 🔐 Segurança

### Secrets Management

Todas as secrets são gerenciadas via Manus Management UI → Settings → Secrets

**Secrets Obrigatórios**:
- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `BUILT_IN_FORGE_API_KEY`

**Nunca commitar** `.env` ou arquivos com secrets no Git.

### CORS

```typescript
// Configurado automaticamente pelo Manus
// Permite requisições de: https://finhubapp-bwutngty.manus.space
```

### Rate Limiting

Não implementado atualmente. Para adicionar:

```typescript
// server/_core/middleware.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
});

app.use('/api/trpc', limiter);
```

### HTTPS

✅ Automático via Manus (SSL/TLS)

---

## 📊 Monitoramento

### Logs

```bash
# Ver logs em tempo real
pnpm logs

# Ou via Management UI → Dashboard → Logs
```

### Métricas

Via Management UI → Dashboard → Analytics

- **UV** (Unique Visitors)
- **PV** (Page Views)
- **Tempo de Resposta**
- **Taxa de Erro**

### Alertas

Configurar notificações:
1. Management UI → Settings → Notifications
2. Adicionar email/webhook
3. Configurar triggers (erro 500, downtime, etc)

---

## 🌐 Domínios

### Domínio Padrão

```
https://finhubapp-bwutngty.manus.space
```

### Domínio Customizado

#### Adicionar Domínio

1. Management UI → Settings → Domains
2. Clicar "Add Domain"
3. Opções:
   - **Comprar novo**: Pagar via Manus
   - **Usar existente**: Configurar DNS

#### Configurar DNS (Domínio Existente)

```
Tipo: CNAME
Nome: www
Valor: finhubapp-bwutngty.manus.space
TTL: 3600
```

Ou:

```
Tipo: A
Nome: @
Valor: IP fornecido pelo Manus
TTL: 3600
```

---

## 🔄 CI/CD

### GitHub Actions (Opcional)

Para automatizar deploys via GitHub:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Manus

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      
      # Deploy via Manus CLI (se disponível)
      - run: |
          echo "Deploy manual via Management UI"
```

---

## 📈 Performance

### Otimizações Implementadas

- ✅ Vite com tree-shaking
- ✅ Tailwind CSS purge
- ✅ Drizzle ORM com índices
- ✅ Caching de queries (parcial)
- ✅ Code splitting por route

### Melhorias Futuras

- [ ] Redis caching
- [ ] CDN para assets estáticos
- [ ] Database query optimization
- [ ] Image optimization
- [ ] Lazy loading de componentes

### Benchmark Atual

```
Homepage: ~1.2s
Dashboard: ~1.5s
API Response: ~200ms
```

---

## 🐛 Troubleshooting

### Deploy Falha

1. Verificar logs: Management UI → Logs
2. Verificar build: `pnpm build`
3. Verificar TypeScript: `pnpm tsc --noEmit`
4. Rollback para versão anterior: Management UI → Checkpoints → Rollback

### Banco de Dados Indisponível

1. Verificar `DATABASE_URL` em Secrets
2. Verificar conexão: `mysql -u user -p -h host -D db`
3. Contatar suporte Manus

### Usuário Não Consegue Fazer Login

1. Verificar `OAUTH_SERVER_URL`
2. Verificar `VITE_APP_ID`
3. Limpar cookies do browser
4. Testar em navegador privado

### Relatório PDF Não Gera

1. Verificar se KPIs carregam no dashboard
2. Verificar logs de erro
3. Testar endpoint `/api/trpc/reportGeneration.generateMonthlyReport`

---

## 📋 Checklist de Deploy

- [ ] Código testado localmente (`pnpm test`)
- [ ] Build bem-sucedido (`pnpm build`)
- [ ] Sem erros TypeScript (`pnpm tsc --noEmit`)
- [ ] Migrations aplicadas (se houver)
- [ ] Secrets atualizadas (se necessário)
- [ ] Checkpoint criado no Manus
- [ ] Deploy publicado
- [ ] URL pública acessível
- [ ] Dashboard carrega corretamente
- [ ] Alertas funcionando

---

## 🔄 Rollback

Se algo der errado após deploy:

1. Management UI → Dashboard → Checkpoints
2. Selecionar checkpoint anterior
3. Clicar "Rollback"
4. Confirmar
5. Aguardar redeploy (~2 minutos)

---

## 📞 Suporte

- **Manus Docs**: https://help.manus.im
- **GitHub Issues**: https://github.com/JohnGomes84/finhub-inteligente/issues
- **Email**: support@manus.im

---

## 📝 Versioning

### Semântica de Versão

```
MAJOR.MINOR.PATCH

3.9.0
│ │ └─ Patch: Bug fixes
│ └─── Minor: Novas features
└───── Major: Breaking changes
```

### Changelog

Ver `DOCUMENTATION.md` → Changelog

---

**Deployment Guide - FinHub Inteligente v3.9**  
*Última atualização: 2026-04-05*
