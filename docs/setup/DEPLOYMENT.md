# Deployment e Homologacao

## Ambientes

- Local: usa `.env.local` e banco `finhub`
- Homologacao local: usa `.env.homolog` e banco `finhub_homolog`

## Arquivos de ambiente

- `.env.local`
- `.env.homolog`

O ambiente de homologacao local ja esta configurado para:

- `NODE_ENV=homologation`
- `PORT=3001`
- `DATABASE_URL=mysql://root:password@127.0.0.1:3306/finhub_homolog`

## Provisionar homologacao local

1. Criar o banco MySQL `finhub_homolog`
2. Aplicar schema:

```bash
pnpm db:push:homolog
```

3. Popular com seed demo:

```bash
pnpm db:seed:demo:homolog
```

4. Subir a aplicacao:

```bash
pnpm dev:homolog
```

Para validar build publicada em homologacao local:

```bash
pnpm build
pnpm start:homolog
```

Para execucao publicada com reinicio automatico simples do processo:

```bash
pnpm build
pnpm start
```

## Supervisor nativo no Windows

Para manter a aplicacao subindo no boot do Windows com restart automatico por `Scheduled Task`:

```bash
pnpm build
pnpm ops:win:install-supervisor
```

Consultar status:

```bash
pnpm ops:win:status-supervisor
```

Remover supervisor:

```bash
pnpm ops:win:uninstall-supervisor
```

Observacoes:

- o task criado chama `pnpm start`, entao reutiliza o supervisor interno do projeto
- o nome da task e `FinhubSupervisor`
- os logs ficam em `C:\Finhub\logs\finhub-supervisor.log`
- a instalacao precisa de PowerShell com permissao para registrar `Scheduled Task` como `SYSTEM`

Variaveis opcionais do supervisor:

- `MAX_RESTARTS` (padrao `5`)
- `RESTART_DELAY_MS` (padrao `2000`)
- `STABLE_UPTIME_MS` (padrao `15000`)

## Acesso

- App: `http://127.0.0.1:3001`
- Healthcheck: `http://127.0.0.1:3001/health`

## Validacao recomendada

- abrir `/dashboard`
- confirmar cards com dados reais
- confirmar resposta `ok` em `/health`
- confirmar que o banco ativo e `finhub_homolog`

## Observacoes

- O seed de homologacao usa o mesmo conjunto demo do ambiente local, mas em banco separado.
- O ambiente de homologacao local nao substitui um servidor remoto; ele existe para validar schema, seed e comportamento da app com isolamento de dados.
