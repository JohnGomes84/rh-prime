# FinHub Inteligente v3.1

Sistema de gestao financeira e operacional para a ML Servicos, cobrindo planejamentos, portal do lider, financeiro, dashboard e controle de usuarios.

---

## Modulos principais

### Planejamentos
- Criacao de planejamentos com data, cliente, turno, local, lider e observacoes
- Planejamentos recorrentes com frequencia semanal, quinzenal ou mensal
- Alocacao de funcionarios com valores individuais
- Validacao anti-duplicidade no mesmo dia
- Resumo financeiro por planejamento
- Importacao em lote por CSV

### Portal do lider
- Visualizacao dos planejamentos sob responsabilidade do lider
- Controle de presenca
- Check-in e check-out
- Solicitacao de alteracao de PIX
- Cadastro rapido de funcionario

### Financeiro
- Contas a pagar
- Contas a receber
- Lotes de pagamento
- Exportacoes

### Dashboard
- KPIs mensais com dados reais do banco
- Alertas acionaveis
- Graficos avancados com Chart.js
- Forecast de caixa
- Exportacao CSV, Excel e JSON
- Notificacoes em tempo real via SSE

### Usuarios e permissoes
- Perfis `admin`, `user` e `leader`
- RBAC granular por modulo
- Auditoria de operacoes

---

## Setup local

Instalar dependencias:

```bash
pnpm install
```

Rodar em desenvolvimento:

```bash
pnpm dev
```

Rodar em homologacao local:

```bash
pnpm db:push:homolog
pnpm db:seed:demo:homolog
pnpm dev:homolog
```

Documentacao principal:

- [Guia de deployment](/C:/Finhub/docs/setup/DEPLOYMENT.md)
- [Quick start](/C:/Finhub/docs/setup/README_QUICK_START.md)
- [Indice da documentacao](/C:/Finhub/docs/README.md)

Rodar testes:

```bash
pnpm test
```

---

## Seed demo

Para popular o banco com dados de demonstracao:

```bash
pnpm db:seed:demo
```

Esse seed garante:
- clientes
- funcionarios
- contas a pagar
- contas a receber
- planejamentos base
- dados suficientes para o dashboard sair do zero

---

## Fluxos novos

### Planejamentos recorrentes

Na tela `Planejamentos`, ao criar um novo planejamento:

1. informe a data e o cliente
2. opcionalmente selecione turno, local, lider e observacoes
3. marque `Criar como planejamento recorrente`
4. escolha a frequencia
5. informe o numero de ocorrencias

Frequencias suportadas:
- `Semanal`
- `Quinzenal`
- `Mensal`

Regras:
- a serie e criada a partir da data informada
- duplicidades da mesma combinacao `data + cliente + turno + local` sao ignoradas
- o endpoint usado no backend e `planejamentos.createRecurring`

### Importacao CSV de planejamentos

Na tela `Planejamentos`, use o botao `Importar CSV`.

Voce pode:
- selecionar um arquivo `.csv`
- colar o conteudo diretamente no modal

Delimitadores aceitos:
- `,`
- `;`

Cabecalhos suportados:
- `data` ou `date`
- `cliente` ou `client`
- `turno` ou `shift`
- `unidade`, `local` ou `unit`
- `lider` ou `leader`
- `observacoes`, `observacao` ou `notes`

Campos obrigatorios:
- `data`
- `cliente`

Exemplo:

```csv
data,cliente,turno,unidade,lider,observacoes
2026-04-10,Logistica Aurora,MLT-1,Base Sul,Joao Lider,Operacao especial
2026-04-17,Operacoes Horizonte,MLT-2,,Joao Lider,Reforco de equipe
```

Comportamento:
- cliente, turno, unidade e lider sao resolvidos por nome
- linhas invalidas retornam erro por linha
- registros duplicados sao ignorados
- o endpoint usado no backend e `planejamentos.importCsv`

---

## Estado atual validado

Validado localmente:
- MySQL conectado
- dashboard com dados reais
- health score sem `NaN`
- alertas e botoes do dashboard funcionando
- graficos Chart.js no dashboard
- notificacoes SSE unificadas
- planejamentos recorrentes
- importacao CSV

Suite atual:
- `337` testes passando
- `0` falhas

Observacao:
- ainda existe divida antiga de TypeScript em areas fora do escopo validado; isso nao bloqueou os fluxos acima

---

## Proximos passos recomendados

1. Fechar a divida global de TypeScript e deixar `pnpm check` verde
2. Subir ambiente de homologacao com variaveis por ambiente
3. Adicionar smoke/E2E tests para login, dashboard, recorrencia e CSV
4. Avancar integracao bancaria/PIX
5. Documentar operacao de deploy e troubleshooting

---

## Versao

- Versao: `3.1.0`
- Data: `2026-04-09`
- Status: estavel em ambiente local e pronto para o proximo ciclo
