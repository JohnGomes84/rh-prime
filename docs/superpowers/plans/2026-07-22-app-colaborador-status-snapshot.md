# RH Prime - Snapshot do App do Colaborador

> Data: July 22, 2026
> Objetivo: registrar o estado consolidado da frente de app/PWA do colaborador para ponto

## Escopo consolidado

Esta frente cobre:

- redesenho do ponto com Journey V2
- convivencia com o fluxo legado `/ponto`
- app do colaborador em `PWA`
- piloto controlado
- homologacao operacional e de seguranca

---

## O que ja esta decidido

- o canal principal do colaborador sera `PWA`, nao app nativo neste primeiro momento
- o Journey V2 e o nucleo oficial da jornada
- `/ponto` continua como fallback operacional durante a transicao
- a competencia operacional do ponto e `26 -> 25`
- rollout sera progressivo por piloto, nunca aberto para toda a base de uma vez
- Slack fica como canal gerencial e de supervisao, nao como canal oficial de marcacao

---

## O que ja foi implementado

## Backend

- base do Journey V2 criada
- router `server/routers/journey-v2.ts` publicado
- foundation de schema e migration criada
- timesheet admin aceitando implantacao com jornada completa
- gate de piloto do app criado no backend
- flags e grupo piloto expostos via `system.flags`

## Frontend web atual

- `/ponto` ja contem:
  - bloqueio sem vinculo de funcionario
  - status do dia
  - timeline
  - recibo
  - ajustes V2
  - captura de selfie, geolocalizacao e fingerprint

## Frontend app mobile

- estrutura `client/src/app-mobile/` criada
- rota `/app` criada
- rota `/app/ponto` criada
- atalho para `/privacidade` exposto na navegacao do app
- layout mobile dedicado criado
- home do app criada
- tela de ponto mobile criada
- timeline V2 do dia presente no app
- ajuste de ponto presente no app
- lista de ajustes recentes presente no app
- competencia `26 -> 25` visivel no app
- PWA com manifesto, icones e service worker criado
- prompt de instalacao ja disponivel no Android compativel
- instrucoes visuais de instalacao Android e iPhone ja embutidas na home do app
- CTA operacional para revisar consentimentos em `Privacidade` ja embutido no app

## Observabilidade

- telemetria basica compativel com Umami criada para:
  - abertura da home
  - abertura da tela de ponto
  - clique de instalacao
  - sucesso de entrada
  - sucesso de saida
  - sucesso de evento de jornada
  - criacao de ajuste

## Seguranca e LGPD no app

- sessao de usuario inativo e rejeitada no backend mesmo com cookie ainda presente
- snapshot de seguranca da sessao ja e retornado em `auth.session`
- home e ponto do app ja mostram se o transporte da sessao esta seguro
- captura de selfie depende de consentimento `selfie_capture`
- captura de geolocalizacao depende de consentimento `geo_capture`
- app ja orienta o colaborador a resolver consentimentos pela tela `Privacidade`

---

## O que ja foi documentado

- plano tecnico do app:
  - `docs/superpowers/plans/2026-07-22-app-colaborador-ponto-implantation.md`
- backlog executavel:
  - `docs/superpowers/plans/2026-07-22-app-colaborador-ponto-execution-backlog.md`
- homologacao e seguranca:
  - `docs/superpowers/plans/2026-07-22-app-colaborador-homologacao-e-seguranca.md`
- checklist operacional:
  - `docs/superpowers/plans/2026-07-22-app-colaborador-checklist-operacional.md`
- documentos de redesenho e inventario:
  - `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`
  - `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
  - `docs/superpowers/specs/2026-07-22-ponto-legado-inventory.md`
  - `docs/superpowers/specs/2026-07-22-schema-journey-v2.md`
  - `docs/superpowers/specs/2026-07-22-v2-backlog-and-cutover-matrix.md`

---

## O que ainda falta

## Produto

- visao mais fechada de contexto operacional quando exigido por contrato ou posto
- evolucao do periodo atual da competencia no app

## Seguranca

- revisao final de politicas de retencao de selfie e geolocalizacao
- validacao operacional final de LGPD aplicada ao app

## Piloto e rollout

- checklist operacional manual fechado para Android e Apple
- checklist executado em aparelhos Android reais
- checklist executado em aparelhos Apple reais
- definicao do primeiro grupo piloto real
- medicao de adesao e taxa de falha por grupo
- procedimento operacional de suporte ao colaborador

## Notificacoes

- lembretes de entrada
- lembretes de retorno de intervalo
- lembretes de saida
- alertas gerenciais por pendencia operacional

---

## Proximas etapas recomendadas

1. revisar governanca de retencao de selfie e geolocalizacao
2. executar o checklist operacional em Android real
3. executar o checklist operacional em Apple real
4. escolher e ativar o primeiro grupo piloto
5. medir falhas e adesao da primeira onda

---

## Status geral

Leitura objetiva do momento atual:

- arquitetura: definida
- app shell: implementado
- PWA: implementado
- jornada mobile basica: implementada
- timeline e ajuste: implementados
- piloto controlado: implementado em nivel tecnico
- homologacao operacional: documentada, ainda nao executada
- rollout: ainda nao iniciado
