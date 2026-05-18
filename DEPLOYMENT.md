# DEPLOYMENT.md — FinHub Inteligente

## Ambientes

| Ambiente | Env file | DB | Porta |
|---|---|---|---|
| Development | `.env.local` | `finhub` | 3000 |
| Homologação | `.env.homolog` | `finhub_homolog` | 3001 |
| Produção | `.env.production` | `finhub` | 3000 |

---

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- MySQL 8+
- Redis (opcional — fallback no-op se ausente)
- Windows (produção) ou Linux (dev/homolog)

---

## Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL=mysql://user:password@host:3306/finhub
JWT_SECRET=<string aleatória longa>
OAUTH_SERVER_URL=https://seu-oauth-server.com
OWNER_OPEN_ID=<open_id do admin inicial>
```

### Variáveis Opcionais

```env
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=senha
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=finhub-docs
AUTH_ALLOWED_DOMAIN=mlservicoseco.com.br
PORT=3000
```

---

## Deploy em Produção (Windows)

### 1. Instalar dependências

```bash
pnpm install --frozen-lockfile
```

### 2. Configurar variáveis de ambiente

Criar `.env.production` com as variáveis acima.

### 3. Aplicar migrations do banco

```bash
DATABASE_URL=mysql://... pnpm db:push
```

### 4. Build da aplicação

```bash
pnpm build
```

Gera:
- `dist/public/` — frontend compilado
- `dist/index.js` — servidor Express

### 5. Instalar supervisor (Windows Scheduled Task)

```bash
pnpm ops:win:install-supervisor
```

Cria Windows Scheduled Task `FinhubSupervisor` que:
- Inicia com o Windows
- Reinicia automaticamente em caso de falha
- Logs em `C:\Finhub\logs\`

### Outros comandos do supervisor

```bash
pnpm ops:win:status-supervisor    # Ver status
pnpm ops:win:uninstall-supervisor # Remover
pnpm start                        # Iniciar manualmente (com auto-restart)
```

---

## Deploy em Homologação

```bash
pnpm dev:homolog                  # Dev server com .env.homolog (porta 3001)
pnpm db:push:homolog              # Migrations no DB finhub_homolog
```

---

## Logs

- Produção: `C:\Finhub\logs\`
- Dev: stdout/stderr no terminal

---

## Banco de Dados

### Migrations

```bash
pnpm db:push          # Gera e aplica migrations (development)
pnpm db:push:homolog  # Homologação
```

### Seed de dados demo

```bash
pnpm db:seed:demo     # Clientes, funcionários, planejamentos, financeiro
```

---

## Checklist pré-deploy

- [ ] `.env.production` criado com todas variáveis obrigatórias
- [ ] `pnpm build` sem erros
- [ ] `pnpm check` sem erros TypeScript
- [ ] `pnpm test -- --run` passando (391+ testes)
- [ ] Migrations aplicadas (`pnpm db:push`)
- [ ] Redis configurado (opcional mas recomendado para performance)
- [ ] S3 configurado para upload de documentos (opcional)
- [ ] Supervisor instalado (`pnpm ops:win:install-supervisor`)

---

## Troubleshooting

### Servidor não inicia
```bash
# Verificar logs
cat C:\Finhub\logs\finhub.log

# Verificar se porta está ocupada
netstat -ano | findstr :3000
```

### Erro de banco de dados
```bash
# Testar conexão
DATABASE_URL=mysql://... node -e "require('mysql2/promise').createConnection(process.env.DATABASE_URL).then(c => c.query('SELECT 1')).then(() => console.log('OK'))"
```

### Migrations com conflito
```bash
# Inspecionar estado atual
DATABASE_URL=mysql://... npx drizzle-kit introspect
```

### Redis não conecta
Redis é opcional — sem `REDIS_URL`, o sistema funciona sem cache. Para habilitar:
```bash
# Windows (via Chocolatey)
choco install redis-64
redis-server
```
