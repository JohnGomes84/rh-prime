# Operação Real - Fase 4 (FinHub Inteligente)

## Objetivo

Colocar o sistema em rotina operacional com gates automáticos, backup/restauração e checklist de deploy/homologação.

## 1) Pipeline CI/CD mínimo

Arquivo: `.github/workflows/ci.yml`

Gates obrigatórios por PR/push:

1. Instala dependências com lockfile congelado.
2. Executa type check (`pnpm run check`).
3. Executa testes (`pnpm run test`).

Pipeline complementar:

- `.github/workflows/integration-db.yml`: sobe MySQL, aplica migrations e executa testes com `DATABASE_URL`.

## 2) Backup automatizado (script local/servidor)

Arquivo: `scripts/ops/backup-mysql.sh`

### Exemplo de execução manual

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=finhub DB_USER=finhub DB_PASSWORD='SENHA_FORTE' ./scripts/ops/backup-mysql.sh
```

## Acesso para testers finais (internet)

Para liberar testes finais fora da rede local, suba o servidor ouvindo em interface pública e configure URL externa:

```bash
PORT=3000 SERVER_HOST=0.0.0.0 PUBLIC_BASE_URL='https://SEU-DOMINIO' pnpm run dev
```

> Segurança mínima recomendada antes de liberar internet: HTTPS obrigatório, autenticação ativa e allowlist de IP quando possível (LGPD).

## 3) Teste de restauração

Arquivo: `scripts/ops/restore-mysql.sh`

### Exemplo de restore em homologação

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=finhub_hml DB_USER=finhub DB_PASSWORD='SENHA_FORTE' ./scripts/ops/restore-mysql.sh ./backups/finhub_YYYYMMDDTHHMMSSZ.sql.gz
```

## 4) Checklist de deploy

- [ ] PR aprovado com CI verde.
- [ ] Backup gerado antes do deploy.
- [ ] Migration revisada e aplicada em homologação.
- [ ] Smoke test pós-deploy.
- [ ] Plano de rollback validado.

## 5) Checklist de homologação

- [ ] Fluxo de pagamento sem duplicidade.
- [ ] Fluxo de alteração PIX com aprovação.
- [ ] Bloqueio de edição pós-fechamento funcionando.
- [ ] Logs com correlation id visíveis.
- [ ] Health (`/health`) e readiness (`/ready`) respondendo 200.
- [ ] Metrics (`/metrics`) respondendo 200.

## 6) Status de conclusão (atualizado em 2026-03-30)

- [x] Pipeline CI de quality gates (`check` + `test`) ativo em PR/push.
- [x] Pipeline complementar com MySQL/migrations/testes (`integration-db`) ativo.
- [x] Scripts de backup/restauração documentados para operação.
- [ ] Observabilidade operacional completa (dashboard + alertas automáticos).
- [x] CI/CD com deploy automatizado (hml/prod) e aprovação manual por ambiente (GitHub Environments).


## 7) Deploy automatizado com aprovação por ambiente

Arquivos:

- `.github/workflows/deploy-homolog.yml`
- `.github/workflows/deploy-producao.yml`
- `scripts/ops/deploy.sh`

### Como funciona

1. **Homologação**: roda automaticamente após CI/Integration verdes (ou manual por `workflow_dispatch`), usando environment `homologacao`.
2. **Produção**: somente manual (`workflow_dispatch`) com SHA informado, usando environment `producao`.
3. A aprovação manual é configurada no GitHub em **Settings > Environments** (required reviewers).
4. O comando real de deploy fica em segredo (`DEPLOY_COMMAND_HML` e `DEPLOY_COMMAND_PROD`).

### Variáveis/segredos obrigatórios no GitHub

- `vars.HML_APP_URL`
- `vars.PROD_APP_URL`
- `secrets.DEPLOY_COMMAND_HML`
- `secrets.DEPLOY_COMMAND_PROD`
