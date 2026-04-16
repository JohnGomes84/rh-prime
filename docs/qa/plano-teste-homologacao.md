# Plano rápido para colocar o app em teste (Homologação)

## 1) Pré-requisitos

1. Copiar `.env.example` para `.env`.
2. Preencher banco (`DATABASE_URL`, `DB_*`) e credenciais seguras.
3. Rodar migration.

## 2) Comandos (copiar e colar)

```bash
pnpm install
pnpm run db:push
pnpm run check
pnpm run test
pnpm run ops:predeploy
pnpm run ops:testapp
```

## 3) O que o `ops:testapp` faz

- sobe o servidor local
- valida `/health`, `/ready`, `/metrics`
- encerra automaticamente

## 4) Checklist de homologação funcional (CLT/LGPD)

- [ ] Criar planejamento e validar status.
- [ ] Alocar funcionário e bloquear duplicidade.
- [ ] Gerar lote e bloquear pagamento duplicado.
- [ ] Solicitar mudança PIX e aprovar via fluxo formal.
- [ ] Registrar presença (check-in/check-out/falta).
- [ ] Confirmar trilha de auditoria para eventos críticos.

## 5) Critério de pronto para teste usuário

- [ ] `check` verde
- [ ] `test` verde
- [ ] `ops:predeploy` verde
- [ ] `ops:testapp` verde
