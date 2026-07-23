# RH Prime â€” Backlog Executável do App do Colaborador para Ponto

> **Status (July 22, 2026):** Backlog técnico executável do app do colaborador de ponto.
> - Derivado de:
>   - `docs/superpowers/plans/2026-07-22-app-colaborador-ponto-implantation.md`
>   - `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`
>   - `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
>   - `docs/superpowers/specs/2026-07-22-v2-backlog-and-cutover-matrix.md`
> - Objetivo deste documento:
>   - quebrar o plano em épicos e tarefas executáveis;
>   - explicitar dependências;
>   - definir critérios de aceite;
>   - indicar ordem recomendada de implementação.

## Objetivo

Executar a implantação do app do colaborador de ponto dentro do RH Prime sem criar uma frente paralela desconectada do Journey V2.

O backlog abaixo parte destas premissas:

- o app nasce como `PWA mobile-first`;
- o Journey V2 é o núcleo oficial de jornada;
- `/ponto` atual é base de reaproveitamento, não solução final;
- rollout será progressivo por grupo piloto;
- o legado continua vivo enquanto o app e o V2 amadurecem.

---

## Regras de execução

1. Não começar pela estética do app.
2. Não criar app separado do monorepo.
3. Não publicar experiência mobile antes de fechar elegibilidade mínima.
4. Não prometer offline oficial de batida no MVP.
5. Não misturar lembrete com registro oficial.
6. Toda entrega deve nascer atrás de feature flag.

---

## Legenda de status

- `feito` â€” já existe no código atual em nível utilizável
- `parcial` â€” existe base importante, mas não no formato final do app
- `não iniciado` â€” ainda não há implementação relevante encontrada

---

## Consolidação do estado atual

Esta seção cruza o backlog com o estado real do repositório em **July 22, 2026**.

Referências principais usadas nesta consolidação:

- `client/src/pages/Timesheet.tsx`
- `client/src/App.tsx`
- `server/routers/journey-v2.ts`
- `server/routers/timesheet.ts`
- `server/_core/feature-flags.ts`
- `server/_core/notification-scheduler.ts`

---

## Ordem macro recomendada

1. Épico A â€” Fundação do app mobile
2. Épico B â€” PWA e infraestrutura de instalação
3. Épico C â€” Orquestração do ponto do dia
4. Épico D â€” Registro real de jornada no app
5. Épico E â€” Recibo, timeline e período atual
6. Épico F â€” Ajuste de ponto pelo app
7. Épico G â€” Notificações e lembretes
8. Épico H â€” Observabilidade, piloto e rollout

---

## Épico A â€” Fundação do app mobile

### Objetivo

Criar a base estrutural do app dentro do frontend atual.

### Dependências

- nenhuma dependência de UI pública;
- acesso às rotas e componentes atuais de `Timesheet`;
- feature flags disponíveis.

### Tarefas

#### A1. Criar agrupamento de código do app mobile

- criar `client/src/app-mobile/`
- criar `components/`, `hooks/`, `pages/`, `services/`
- definir convenção de import e organização

Aceite:

- estrutura existe;
- build continua funcionando;
- não há regressão nas rotas existentes.

#### A2. Definir feature flags do app

- criar flag de shell mobile
- criar flag de rota do app
- criar flag de piloto por usuário/grupo

Aceite:

- é possível ativar/desativar o app sem mexer em código de negócio;
- desligar a flag não quebra `/ponto` atual.

#### A3. Criar rota base do app

- criar `/app`
- criar `/app/ponto`
- criar placeholder protegido por autenticação

Aceite:

- usuário autenticado acessa;
- usuário sem autenticação é redirecionado;
- a rota está isolada do layout administrativo.

#### A4. Criar layout mobile dedicado

- header enxuto
- safe-area
- conteúdo de tela cheia
- suporte a viewport mobile

Aceite:

- layout funciona bem em 360px a 430px;
- não herda navegação lateral administrativa.

### Critério de saída do épico

- existe rota dedicada do app;
- o app está isolado visualmente do backoffice;
- tudo ainda está atrás de flag.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| A1. Criar agrupamento de código do app mobile | `feito` | estrutura criada em `client/src/app-mobile/` com `components`, `hooks`, `pages` e `services` |
| A2. Definir feature flags do app | `parcial` | criada flag cliente `VITE_COLLABORATOR_APP_ENABLED`; ainda falta desenho de ativação granular por grupo piloto |
| A3. Criar rota base do app | `feito` | rotas `/app` e `/app/ponto` criadas em `client/src/App.tsx` com proteção por autenticação |
| A4. Criar layout mobile dedicado | `feito` | layout próprio criado em `client/src/app-mobile/components/MobileAppLayout.tsx` |

---

## Épico B â€” PWA e infraestrutura de instalação

### Objetivo

Transformar a experiência mobile em app instalável.

### Dependências

- Épico A concluído.

### Tarefas

#### B1. Criar manifesto do app

- `manifest.webmanifest`
- nome curto e nome completo
- tema
- cores
- ícones

Aceite:

- navegador reconhece o manifesto;
- app é instalável no Android Chrome.

#### B2. Criar ícones e assets do app

- ícone 192
- ícone 512
- máscaras mínimas

Aceite:

- instalação mostra branding correto;
- ícones carregam sem fallback quebrado.

#### B3. Configurar service worker

- cache de assets estáticos
- atualização de versão
- política de invalidação segura

Aceite:

- app reabre rápido após primeira carga;
- atualização não deixa frontend preso em bundle inconsistente.

#### B4. Implementar banner/guia de instalação

- detectar instalabilidade
- orientar instalação
- ocultar quando já instalado

Aceite:

- usuário elegível vê instrução simples;
- fluxo não atrapalha uso do app.

#### B5. Exibir versão do app

- adicionar identificador discreto de versão

Aceite:

- operação consegue identificar rapidamente qual versão o colaborador está usando.

### Critério de saída do épico

- app é instalável como PWA;
- assets possuem cache controlado;
- operação consegue testar a instalação real.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| B1. Criar manifesto do app | `feito` | criado `client/public/manifest.webmanifest` |
| B2. Criar ícones e assets do app | `feito` | criados `client/public/app-icon.svg` e `client/public/app-icon-maskable.svg` |
| B3. Configurar service worker | `feito` | criado `client/public/sw.js` e registro no `client/src/main.tsx` |
| B4. Implementar banner/guia de instalação | `feito` | hook `useInstallPrompt` e card de instalação adicionados em `/app` |
| B5. Exibir versão do app | `não iniciado` | não há identificador visível de versão do app mobile |

---

## Épico C â€” Orquestração do ponto do dia

### Objetivo

Montar a visão correta do “agora” do colaborador.

### Dependências

- Épicos A e B;
- contratos do Journey V2 já disponíveis.

### Tarefas

#### C1. Consolidar hook de sessão e vínculo

- consumir `auth.session`
- resolver funcionário vinculado
- tratar ausência de vínculo

Aceite:

- app informa claramente quando não há vínculo com funcionário;
- ação de bater ponto fica bloqueada.

#### C2. Consolidar hook de elegibilidade

- integrar `journeyV2.getTodayStatus`
- mapear reason codes para UX

Aceite:

- app informa se o colaborador pode ou não registrar;
- motivo operacional aparece de forma compreensível.

#### C3. Consolidar hook de contexto ativo

- exibir cliente/posto/contrato aplicável
- bloquear quando contexto obrigatório faltar

Aceite:

- colaborador entende o contexto em que está registrando;
- bloqueio por contexto faltante é explícito.

#### C4. Criar card de status da jornada de hoje

- relógio
- competência
- status da jornada
- próxima ação

Aceite:

- tela principal responde sem precisar abrir outras abas;
- estado da jornada reflete o backend.

#### C5. Criar mapeamento do botão principal

- `Entrada`
- `Início de intervalo`
- `Fim de intervalo`
- `Saída`
- estados bloqueados

Aceite:

- só uma ação principal é exibida por vez;
- sequência segue o Journey V2.

### Critério de saída do épico

- app consegue decidir corretamente o que mostrar ao colaborador;
- estado visual do dia está conectado ao backend.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| C1. Consolidar hook de sessão e vínculo | `feito` | `Timesheet.tsx` já usa `auth.session` e bloqueia uso sem funcionário vinculado |
| C2. Consolidar hook de elegibilidade | `feito` | `Timesheet.tsx` já consome `journeyV2.getTodayStatus` e traduz `reasonCode` |
| C3. Consolidar hook de contexto ativo | `parcial` | já exibe política, contrato e reason codes, mas ainda não há experiência própria de contexto ativo/seleção de contexto |
| C4. Criar card de status da jornada de hoje | `feito` | o shell mobile em `client/src/app-mobile/pages/AppTimesheetHome.tsx` já mostra relógio, referência do dia, status e próxima ação |
| C5. Criar mapeamento do botão principal | `feito` | o app mobile já alterna entrada, saída e controle de intervalo conforme o estado operacional do dia |

---

## Épico D â€” Registro real de jornada no app

### Objetivo

Usar o app como canal operacional de marcação.

### Dependências

- Épico C;
- captura de eventos do Journey V2 funcional.

### Tarefas

#### D1. Encapsular mutation de marcação

- registrar evento por tipo
- tratar loading
- tratar sucesso
- tratar erro

Aceite:

- mutation é reutilizável e não espalhada pela UI;
- erros de regra aparecem corretamente.

#### D2. Implementar entrada

- fluxo de `clock_in`
- feedback imediato

Aceite:

- colaborador elegível consegue registrar entrada e ver confirmação.

#### D3. Implementar intervalo

- `break_start`
- `break_end`

Aceite:

- intervalo aparece como parte nativa do app;
- sequência inválida é impedida pelo backend e refletida na UI.

#### D4. Implementar saída

- `clock_out`
- atualização de estado após sucesso

Aceite:

- colaborador encerra a jornada e vê recibo do evento.

#### D5. Implementar estados de conectividade

- online
- offline
- tentativa durante indisponibilidade

Aceite:

- usuário não recebe falso positivo de batida;
- ausência de conectividade fica clara.

### Critério de saída do épico

- app registra jornada completa com confirmação oficial do backend.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| D1. Encapsular mutation de marcação | `parcial` | `Timesheet.tsx` já usa `registerJourneyPunchEvent`, `clockIn`, `clockOut`, mas ainda sem camada isolada de app service/hook |
| D2. Implementar entrada | `feito` | o shell mobile já registra entrada usando o backend real e atualiza o estado local após sucesso |
| D3. Implementar intervalo | `feito` | o shell mobile já executa `break_start` e `break_end` no Journey V2 |
| D4. Implementar saída | `feito` | o shell mobile já registra saída e atualiza recibo, timeline e estado do dia |
| D5. Implementar estados de conectividade | `parcial` | a página já detecta `navigator.onLine`, mas ainda não há UX fechada de app/PWA para indisponibilidade |

---

## Épico E â€” Recibo, timeline e período atual

### Objetivo

Dar segurança operacional ao colaborador e visibilidade do que já ocorreu.

### Dependências

- Épico D.

### Tarefas

#### E1. Exibir último recibo

- tipo do evento
- horário
- identificador/NSR
- contexto

Aceite:

- último recibo é visível imediatamente após a marcação.

#### E2. Exibir timeline do dia

- eventos já registrados
- ordem cronológica
- status

Aceite:

- colaborador consegue validar o dia sem depender do RH.

#### E3. Exibir avaliação do dia

- jornada em andamento
- inconsistência
- tempo trabalhado preliminar

Aceite:

- tela mostra visão operacional coerente do dia.

#### E4. Exibir período atual da competência

- competência 26->25
- pendências
- ajustes em aberto

Aceite:

- colaborador entende que o ponto é controlado por competência e não por mês civil simples.

### Critério de saída do épico

- colaborador tem confirmação e contexto suficientes para confiar no app.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| E1. Exibir último recibo | `feito` | o shell mobile já usa `journeyV2.getLatestReceipt` e mantém fallback local de recibo |
| E2. Exibir timeline do dia | `feito` | o shell mobile já lista a timeline V2 de hoje com origem e NSR |
| E3. Exibir avaliação do dia | `feito` | `Timesheet.tsx` já mostra apuração V2 diária |
| E4. Exibir período atual da competência | `parcial` | há resumo mensal e histórico, mas a visão explícita da competência `26 -> 25` ainda não está fechada no app |

---

## Épico F â€” Ajuste de ponto pelo app

### Objetivo

Permitir que exceções sejam tratadas sem editar dados brutos.

### Dependências

- Épico E;
- workflow de ajuste Journey V2 disponível.

### Tarefas

#### F1. Criar tela de solicitação de ajuste

- tipo de ajuste
- data/hora
- justificativa

Aceite:

- colaborador envia pedido sem sair do app.

#### F2. Criar listagem dos meus ajustes

- pendente
- aprovado
- rejeitado

Aceite:

- colaborador acompanha o status das próprias solicitações.

#### F3. Vincular timeline e ajuste

- atalho da timeline para “pedir correção”

Aceite:

- a jornada do dia e o ajuste ficam conectados operacionalmente.

### Critério de saída do épico

- exceções simples de ponto já podem ser tratadas pelo próprio colaborador.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| F1. Criar tela de solicitação de ajuste | `feito` | o shell mobile já permite abrir solicitação V2 com tipo, data/hora e justificativa |
| F2. Criar listagem dos meus ajustes | `feito` | o shell mobile já lista as solicitações recentes do colaborador com status |
| F3. Vincular timeline e ajuste | `parcial` | existe atalho geral para ajuste, mas ainda não por item da timeline |

---

## Épico G â€” Notificações e lembretes

### Objetivo

Melhorar adesão sem transformar notificação em canal oficial de registro.

### Dependências

- Épico D no mínimo;
- scheduler e camada de notificações existentes.

### Tarefas

#### G1. Modelar preferências de lembrete

- receber push
- receber lembrete interno
- receber lembrete por perfil/grupo

Aceite:

- preferências são configuráveis ou defaultáveis por política.

#### G2. Criar lembrete de entrada

- janela de tolerância
- só para elegíveis do dia

Aceite:

- lembretes não disparam para quem não precisa bater ponto.

#### G3. Criar lembrete de retorno de intervalo

Aceite:

- retorno de intervalo segue política e jornada prevista.

#### G4. Criar lembrete de saída

Aceite:

- colaboradores sem saída registrada podem ser lembrados corretamente.

#### G5. Criar alerta gerencial

- pendências por equipe
- canal Slack para supervisão

Aceite:

- líderes recebem visão operacional sem substituir a ação do colaborador no app.

### Critério de saída do épico

- lembretes ajudam a operação sem corromper a lógica oficial do ponto.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| G1. Modelar preferências de lembrete | `não iniciado` | não foi encontrada modelagem específica de preferência de lembrete de ponto |
| G2. Criar lembrete de entrada | `não iniciado` | scheduler existe, mas ainda não com regra de ponto para colaborador |
| G3. Criar lembrete de retorno de intervalo | `não iniciado` | não há lembrete operacional de intervalo |
| G4. Criar lembrete de saída | `não iniciado` | não há lembrete operacional de saída |
| G5. Criar alerta gerencial | `parcial` | já há infraestrutura de notificações internas, websocket e discussão de Slack, mas não há fluxo pronto de pendência de ponto |

---

## Épico H â€” Observabilidade, piloto e rollout

### Objetivo

Garantir implantação controlada e mensurável.

### Dependências

- Épicos anteriores em nível suficiente para piloto.

### Tarefas

#### H1. Instrumentar erros do app

- falha de carregamento
- falha de mutation
- falha de permissão

Aceite:

- operação técnica consegue identificar erro recorrente por tipo.

#### H2. Medir uso do app

- acessos
- instalações
- marcações concluídas
- abandonos

Aceite:

- há indicadores mínimos por grupo piloto.

#### H3. Criar relatório de adesão do piloto

- % de colaboradores ativos
- % de jornadas concluídas
- % de erros

Aceite:

- avanço ou bloqueio do rollout pode ser decidido com dados.

#### H4. Criar mecanismo de ativação por grupo

- por usuário
- por cliente
- por centro de custo
- por categoria operacional

Aceite:

- rollout pode ser progressivo e rollback também.

#### H5. Criar procedimento de rollback

- desligar rota nova
- manter eventos já capturados
- voltar grupo ao fluxo anterior

Aceite:

- rollback é operacionalmente viável em uma onda de rollout.

### Critério de saída do épico

- o app pode entrar em piloto e rollout com controle real de risco.

### Status consolidado

| Tarefa | Status | Observação |
| --- | --- | --- |
| H1. Instrumentar erros do app | `parcial` | há logs de erro e camada básica de analytics em `client/src/main.tsx`, mas não telemetria específica do app de ponto |
| H2. Medir uso do app | `não iniciado` | não há métricas dedicadas do app/PWA de ponto |
| H3. Criar relatório de adesão do piloto | `não iniciado` | não foi encontrado painel/relatório de adesão do app |
| H4. Criar mecanismo de ativação por grupo | `parcial` | já existe base de feature flags, mas não ativação granular por cliente/grupo/categoria operacional para o app |
| H5. Criar procedimento de rollback | `não iniciado` | há estratégia de flags no plano, mas não procedimento operacional implementado/documentado para o app |

---

## Backlog de curto prazo recomendado

### Sprint/onda 1

- A1
- A2
- A3
- A4
- C1
- C2

Resultado esperado:

- estrutura do app existe;
- rota protegida existe;
- elegibilidade e vínculo já aparecem no app.

Status real em July 22, 2026:

- `C1` já existe e foi reaproveitado;
- `C2` já existe e foi reaproveitado;
- `A1`, `A3` e `A4` já foram implementados;
- `A2` ficou parcial, aguardando ativação mais granular.

### Sprint/onda 2

- B1
- B2
- B3
- C3
- C4
- C5

Resultado esperado:

- app instalável;
- tela principal já comunica corretamente o estado do dia.

Status real em July 22, 2026:

- `C3`, `C4` e `C5` já possuem base parcial em `Timesheet.tsx`;
- `B1` a `B4` já foram implementados como base mínima do PWA;
- `B5` segue pendente.

### Sprint/onda 3

- D1
- D2
- D3
- D4
- D5

Resultado esperado:

- jornada completa pode ser registrada no app.

Status real em July 22, 2026:

- `D2`, `D3` e `D4` já têm base funcional relevante;
- o principal trabalho desta onda é isolar, simplificar e tornar mobile-first o fluxo existente.

### Sprint/onda 4

- E1
- E2
- E3
- E4
- F1
- F2
- F3

Resultado esperado:

- colaborador passa a ter autonomia operacional mínima.

Status real em July 22, 2026:

- boa parte do valor já existe de forma parcial em `/ponto`;
- esta onda tende a ser mais de reorganização de UX e fechamento de lacunas do que de construção do zero.

### Sprint/onda 5

- G1
- G2
- G3
- G4
- G5
- H1
- H2
- H3
- H4
- H5

Resultado esperado:

- piloto e rollout podem começar com supervisão.

Status real em July 22, 2026:

- esta é a onda com maior volume ainda não iniciado;
- lembretes, adesão, piloto e rollout ainda dependem de desenho e implementação específicos.

---

## Conclusão da consolidação

O estado atual do RH Prime mostra este cenário:

- **forte base já existente** em elegibilidade, timeline, recibo, ajuste e marcação V2 dentro de `Timesheet.tsx`
- **lacuna principal** na camada de produto mobile:
  - rota própria
  - layout próprio
  - PWA
  - instalação
  - rollout controlado
- **lacuna secundária importante** em lembretes, notificações do app e telemetria operacional

Isto muda a leitura do backlog:

- a primeira execução não deve começar “criando o ponto do zero”
- ela deve começar **extraindo e reorganizando** o que já existe em `/ponto` para virar o app do colaborador

Por isso, a melhor próxima etapa técnica continua sendo:

1. implementar `A1` a `A4`
2. reaproveitar `C1` e `C2`
3. transformar a Onda 1 em código real dentro do monorepo

---

## Gates de liberação

## Gate 1 â€” pronto para demo interna

Exige:

- shell mobile funcional;
- elegibilidade visível;
- rota protegida;
- build estável.

## Gate 2 â€” pronto para homologação operacional

Exige:

- PWA instalável;
- registro de jornada completo;
- recibo visível;
- timeline do dia.

## Gate 3 â€” pronto para piloto real

Exige:

- ajuste funcional;
- tratamento claro de erros;
- métricas mínimas;
- ativação por grupo.

## Gate 4 â€” pronto para rollout controlado

Exige:

- lembretes ativos;
- painel de adesão;
- rollback testado;
- suporte operacional alinhado.

---

## Riscos principais

### R1. Elegibilidade incompleta

Impacto:

- colaborador entra no app, mas não pode agir de forma consistente.

Mitigação:

- bloquear rollout sem critérios mínimos de contrato/contexto.

### R2. App bonito, domínio fraco

Impacto:

- falsa percepção de prontidão.

Mitigação:

- seguir ordem do backlog e não inverter prioridades.

### R3. Slack virar substituto do app

Impacto:

- confusão operacional e perda de rastreabilidade.

Mitigação:

- limitar Slack a canal gerencial desde o início.

### R4. Offline mal resolvido

Impacto:

- sensação de batida confirmada sem confirmação oficial.

Mitigação:

- não suportar batida offline oficial no MVP.

### R5. Rollout amplo cedo demais

Impacto:

- suporte explode e a confiança cai.

Mitigação:

- liberar só por ondas e grupos.

---

## Conclusão operacional

Este backlog fecha a trilha prática para implantar o app do colaborador de ponto dentro do RH Prime.

Ele transforma a estratégia em ordem de execução:

- primeiro estrutura;
- depois instalação;
- depois orquestração;
- depois marcação real;
- depois autonomia do colaborador;
- depois lembretes e rollout.

Se o time seguir esta ordem, o app nasce conectado ao Journey V2 e com risco controlado, em vez de virar uma segunda implementação solta do ponto.
