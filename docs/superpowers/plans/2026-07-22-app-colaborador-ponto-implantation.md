# RH Prime â€” Plano Técnico de Implantação do App do Colaborador para Ponto

> **Status (July 22, 2026):** Plano técnico fechado para implantar o app do colaborador dentro do RH Prime, com foco em ponto/jornada.
> - Complementa:
>   - `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`
>   - `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
>   - `docs/superpowers/specs/2026-07-22-v2-backlog-and-cutover-matrix.md`
> - Escopo deste documento:
>   - arquitetura do app;
>   - fases de implantação;
>   - telas;
>   - regras funcionais;
>   - backlog;
>   - critérios de piloto e rollout.
> - Escopo fora deste documento:
>   - copy final de interface;
>   - arte final visual;
>   - publicação em lojas mobile;
>   - folha de pagamento;
>   - sindicalização avançada.

## Objetivo

Implantar o **app do colaborador de ponto** como canal oficial de registro de jornada do RH Prime, sem criar um produto paralelo ao sistema web atual e sem quebrar o legado durante a transição para o Journey V2.

O app deve ser:

- o canal principal do colaborador para `entrada`, `intervalo` e `saída`;
- auditável;
- compatível com elegibilidade por contrato/contexto;
- preparado para operação de pequenas e médias empresas com terceirização logística;
- implantável primeiro como **PWA mobile-first**, com caminho explícito para empacotamento futuro como app nativo.

---

## Decisão de Produto

### Decisão principal

O RH Prime deve implantar primeiro um **App do Colaborador baseado em PWA**, evoluindo a rota atual `/ponto`, e não um app nativo isolado desde o início.

### Motivos

1. O sistema já possui base funcional em `client/src/pages/Timesheet.tsx`.
2. O Journey V2 já define o núcleo correto de elegibilidade, eventos e timeline.
3. Um único frontend reduz divergência entre web e mobile.
4. O PWA acelera piloto e rollout sem depender de loja.
5. O núcleo do ponto continua no backend; o canal pode mudar depois sem reescrever o domínio.

### Decisão complementar de canal

- **Canal oficial do colaborador:** app/PWA.
- **Canal oficial de auditoria:** backend RH Prime + Journey V2.
- **Canal complementar:** notificações internas e push.
- **Canal gerencial:** Slack para líderes, operação e RH, nunca como canal primário de marcação.

---

## Arquitetura Alvo

## 1. Visão geral

O app do colaborador não deve nascer como sistema separado.

Ele deve ser uma **experiência dedicada dentro do monorepo**, apoiada nos módulos já existentes:

- frontend React/Vite em `client/`;
- backend tRPC/Express em `server/`;
- núcleo de jornada V2 em `server/modules/journey-v2/`;
- autenticação atual com vínculo usuário-funcionário;
- feature flags para convivência com o legado.

### Fluxo lógico

`App do colaborador -> UI /ponto-app -> tRPC journeyV2/timesheet -> Journey V2 -> banco -> recibo/auditoria/notificações`

---

## 2. Camadas

### 2.1 Camada de experiência mobile

Responsável por:

- shell do app;
- navegação curta;
- telas otimizadas para celular;
- instalação como PWA;
- estado visual de jornada do dia;
- captura de evidências quando exigidas.

Componentes esperados:

- layout mobile próprio;
- barra inferior simples ou navegação de 3 a 5 entradas;
- componentes de ação grande para bater ponto;
- card de status do dia;
- recibo por evento;
- fluxo offline-controlado apenas para leitura, não para gravação oficial no MVP.

### 2.2 Camada de aplicação

Responsável por:

- montar a visão do dia;
- decidir qual ação mostrar;
- traduzir elegibilidade em UX;
- consolidar timeline, recibo e pendências.

Contratos principais:

- `journeyV2.getTodayStatus`
- `journeyV2.listPunchEvents`
- `journeyV2.getDayTimeline`
- `journeyV2.getDayEvaluation`
- `journeyV2.getLatestReceipt`
- `journeyV2.requestAdjustment`
- `timesheet.uploadSelfie` enquanto o upload ainda estiver no legado

### 2.3 Camada de domínio

Responsável por:

- elegibilidade do colaborador;
- regra de contexto ativo;
- sequência de eventos;
- cálculo preliminar;
- cálculo oficial;
- inconsistências;
- ajustes;
- fechamento de competência.

Esta camada é o **Journey V2**.

### 2.4 Camada de notificação

Responsável por:

- lembretes de entrada;
- lembretes de retorno de intervalo;
- lembretes de saída;
- pendências para gestores;
- avisos de inconsistência.

Ordem recomendada:

1. notificação interna;
2. push do PWA;
3. Slack para supervisão;
4. e-mail apenas para exceções.

### 2.5 Camada de observabilidade

Responsável por:

- registrar falhas de captura;
- acompanhar latência das marcações;
- medir taxa de sucesso de registro;
- detectar colaboradores sem vínculo ou sem elegibilidade configurada;
- medir uso por grupo piloto.

---

## 3. Topologia técnica do app

## 3.1 Estrutura sugerida de frontend

Novos agrupamentos recomendados:

- `client/src/app-mobile/`
- `client/src/app-mobile/components/`
- `client/src/app-mobile/hooks/`
- `client/src/app-mobile/pages/`
- `client/src/app-mobile/services/`

Rotas recomendadas:

- `/app`
- `/app/ponto`
- `/app/ponto/recibos`
- `/app/ponto/ajustes`
- `/app/perfil`

Durante a convivência inicial, `/ponto` pode continuar existindo e encaminhar:

- legado;
- V2 desktop;
- app mobile;

conforme feature flag, viewport e grupo piloto.

## 3.2 PWA

Itens técnicos mínimos:

- `manifest.webmanifest`
- ícones de instalação
- service worker
- estratégia de cache para assets
- fallback controlado para leitura
- versão do app exibida discretamente

O PWA no MVP:

- pode cachear assets;
- pode abrir rápido;
- pode mostrar estado local básico;
- **não deve registrar marcação offline como se fosse oficial**.

Marcações sem conectividade devem resultar em:

- feedback claro;
- tentativa de reenvio opcional futura;
- não confirmação oficial sem resposta do backend.

## 3.3 Empacotamento futuro

Após estabilidade do PWA, o mesmo frontend pode ser empacotado com:

- Capacitor, ou
- solução equivalente

Motivos para só fazer isso depois:

- push nativo avançado;
- distribuição em loja, se houver ganho real;
- acesso mais controlado a câmera, biometria e device APIs.

---

## Telas do App

## 1. MVP obrigatório

### 1.1 Tela de entrada do app

Objetivo:

- identificar rapidamente o colaborador;
- mostrar se ele está apto a usar o ponto;
- encaminhar para o fluxo principal.

Conteúdo:

- branding simples;
- estado da conta;
- vínculo com funcionário;
- status de elegibilidade;
- botão de entrar no ponto.

### 1.2 Tela principal de ponto

Objetivo:

- ser a tela central do app.

Conteúdo:

- relógio atual;
- competência atual;
- nome do colaborador;
- contexto ativo;
- status da jornada de hoje;
- próxima ação recomendada;
- botão principal de ação;
- avisos operacionais.

Estados mínimos:

- apto para entrada;
- jornada em andamento;
- em intervalo;
- apto para saída;
- não elegível;
- período fechado;
- inconsistência detectada.

### 1.3 Timeline do dia

Objetivo:

- mostrar o que já foi registrado.

Conteúdo:

- entrada;
- início de intervalo;
- fim de intervalo;
- saída;
- origem do evento;
- status de consistência;
- recibo do evento.

### 1.4 Recibo do último evento

Objetivo:

- comprovar para o colaborador que a marcação foi aceita.

Conteúdo:

- tipo do evento;
- data/hora;
- NSR/identificador;
- contexto;
- evidências capturadas;
- hash/identificador técnico quando aplicável.

### 1.5 Solicitação de ajuste

Objetivo:

- permitir pedido de correção sem editar o dado bruto.

Conteúdo:

- tipo de solicitação;
- data/hora de referência;
- justificativa;
- anexos futuros;
- status do pedido.

### 1.6 Meu período atual

Objetivo:

- resumir a competência aberta.

Conteúdo:

- período `26 -> 25`;
- horas registradas;
- inconsistências;
- pendências de ajuste;
- dias sem marcação esperada.

---

## 2. Pós-MVP imediato

### 2.1 Central de notificações do app

- lembretes;
- alertas de inconsistência;
- retorno de decisão de ajuste.

### 2.2 Tela de contexto operacional

Para multiposto/intermitente com contexto obrigatório:

- cliente;
- posto;
- contrato ativo;
- seleção explícita quando necessário.

### 2.3 Perfil e preferências

- confirmar telefone e contato;
- preferências de lembrete;
- política de privacidade e consentimentos operacionais.

---

## Regras Funcionais do App

## 1. Regra de elegibilidade

O app nunca deve permitir marcação só porque o usuário está autenticado.

Ele deve perguntar ao backend:

- este usuário está vinculado a um funcionário?
- este funcionário está ativo?
- este funcionário precisa bater ponto hoje?
- existe contrato ativo?
- existe contexto obrigatório faltante?
- a competência está aberta?

Se qualquer resposta crítica falhar, o app:

- bloqueia a ação;
- mostra a razão operacional;
- orienta o próximo passo.

## 2. Regra de sequência

O app só pode oferecer ações compatíveis com a sequência atual:

- sem jornada aberta: `Entrada`
- após entrada: `Início de intervalo` ou `Saída`
- durante intervalo: `Fim de intervalo`
- após fim de intervalo: `Início de intervalo` ou `Saída`

O frontend sugere; o backend valida.

## 3. Regra de competência

O app deve operar pela competência de ponto da empresa:

- início no dia `26`
- fechamento no dia `25`

Consequências:

- resumos e pendências usam essa competência;
- jornada de competência fechada não pode ser alterada pelo app;
- pedidos de ajuste em período fechado dependem de reabertura autorizada.

## 4. Regra de evidências

O app deve suportar política por contexto:

- sem evidência obrigatória;
- geolocalização obrigatória;
- selfie obrigatória;
- fingerprint/dispositivo obrigatório;
- combinação de evidências.

Essas exigências não devem ficar hardcoded no frontend.

## 5. Regra de contexto

Para `clt_alocado`, `clt_multiposto` e `intermitente_com_ponto_condicional`, o app precisa operar sobre contexto válido:

- cliente;
- posto;
- contrato;
- alocação ativa.

Se o contexto estiver faltando:

- o app não registra marcação;
- o app informa a causa;
- o app oferece seleção quando a regra permitir.

## 6. Regra de lembrete

Lembretes são auxiliares, nunca prova de registro.

O lembrete deve existir apenas para colaborador:

- elegível no dia;
- com jornada prevista;
- com canal habilitado;
- sem marcação correspondente até a janela de tolerância.

## 7. Regra de offline

No MVP:

- leitura pode ser cacheada;
- registro oficial exige confirmação online.

Não haverá “batida offline confirmada localmente” no MVP.

---

## Fases de Implantação

## Fase 0 â€” Preparação

Objetivo:

- preparar base técnica sem expor o app novo em produção para todos.

Entregas:

- mapear rotas atuais do colaborador;
- separar componentes reutilizáveis de `Timesheet`;
- definir feature flags do app;
- definir grupo piloto;
- definir política mínima de elegibilidade e contexto.

Critério de saída:

- é possível ativar o app novo por usuário/grupo sem afetar o restante.

## Fase 1 â€” Shell mobile + PWA

Objetivo:

- entregar experiência instalável e navegável.

Entregas:

- layout mobile do app;
- rota dedicada do app;
- manifesto PWA;
- ícones;
- service worker básico;
- experiência de instalação.

Critério de saída:

- o colaborador consegue abrir e instalar o app como atalho no celular.

## Fase 2 â€” Marcação real no Journey V2

Objetivo:

- usar o app como canal operacional verdadeiro de marcação.

Entregas:

- tela principal de ponto;
- timeline do dia;
- botão contextual de ação;
- recibo por evento;
- integração com `registerPunchEvent`;
- estados de erro e bloqueio.

Critério de saída:

- um colaborador elegível consegue registrar jornada completa no app com recibo válido.

## Fase 3 â€” Ajuste, pendência e período atual

Objetivo:

- evitar dependência imediata do RH para toda exceção simples.

Entregas:

- solicitação de ajuste;
- histórico do período atual;
- alerta de inconsistência;
- retorno de decisão no app.

Critério de saída:

- o piloto consegue lidar com esquecimentos simples sem sair do app.

## Fase 4 â€” Notificações e supervisão

Objetivo:

- melhorar adesão operacional.

Entregas:

- lembretes internos;
- push do PWA;
- alerta para gestores;
- Slack para supervisão.

Critério de saída:

- queda mensurável em jornadas sem marcação ou com saída esquecida.

## Fase 5 â€” Contexto avançado e evidências

Objetivo:

- suportar operação alocada e multiposto com maturidade.

Entregas:

- seleção de contexto;
- política por cliente/posto;
- geolocalização por regra;
- selfie por regra;
- regras de bloqueio e exceção.

Critério de saída:

- grupos com operação externa já conseguem usar o app como canal primário.

## Fase 6 â€” Rollout amplo

Objetivo:

- transformar o app em canal padrão do colaborador elegível.

Entregas:

- ativação por unidade/grupo;
- materiais operacionais;
- painéis de adesão;
- rotina de suporte de operação.

Critério de saída:

- o app é o canal padrão do ponto para o escopo definido, com métricas estáveis.

---

## Backlog Técnico de Desenvolvimento

## Bloco A â€” Frontend app shell

- criar rota dedicada do app;
- criar layout mobile-base;
- criar componentes de status do dia;
- criar card de ação principal;
- criar timeline compacta;
- criar banner de elegibilidade;
- criar fluxo de instalação PWA.

## Bloco B â€” Infra PWA

- adicionar `manifest.webmanifest`;
- gerar ícones;
- configurar service worker;
- definir estratégia de cache de assets;
- exibir versão do app;
- validar comportamento em Android Chrome.

## Bloco C â€” Integração com Journey V2

- consolidar hook de `today status`;
- consolidar hook de timeline;
- consolidar hook de avaliação do dia;
- consolidar hook de último recibo;
- encapsular mutation de evento;
- padronizar tratamento de erro de elegibilidade;
- mapear estados do botão principal.

## Bloco D â€” Evidência e contexto

- encapsular captura de localização;
- encapsular captura de selfie;
- exibir status de conectividade;
- exibir status de permissão de câmera/localização;
- suportar contexto ativo obrigatório;
- suportar seleção de contexto quando permitido.

## Bloco E â€” Ajustes

- tela de solicitação de ajuste;
- listagem de pedidos;
- exibir decisão;
- anexar motivo e data/hora de referência;
- vínculo com timeline do dia.

## Bloco F â€” Notificações

- modelar preferências de lembrete;
- criar agendador de lembretes de ponto;
- criar eventos de notificação do app;
- criar push do PWA;
- criar alerta gerencial por Slack.

## Bloco G â€” Operação e suporte

- tela/admin de acompanhamento de adesão do app;
- painel de falhas por colaborador;
- relatório de jornadas sem marcação;
- relatório de inconsistências por grupo piloto;
- material de suporte para RH/operação.

## Bloco H â€” Segurança e observabilidade

- logging de falhas de marcação;
- correlação de evento/recibo/request id;
- monitoramento de erro frontend;
- telemetria de uso do app;
- trilha de evidência capturada;
- revisão de política de sessão mobile.

---

## Critério de Piloto

## 1. Quem entra no piloto

Entram primeiro:

- colaboradores CLT;
- rotina relativamente estável;
- posto fixo ou baixa variação de contexto;
- vínculo usuário-funcionário já correto;
- contrato ativo e política de jornada definida;
- liderança disponível para acompanhar.

Não entram no primeiro piloto:

- intermitente sem contexto maduro;
- grupos com cadastro inconsistente;
- operação com múltiplos postos no mesmo dia sem regra fechada;
- casos que ainda dependem de decisão de elegibilidade.

## 2. Tamanho recomendado do piloto

Recomendação inicial:

- 1 cliente ou unidade;
- 1 liderança operacional;
- 10 a 30 colaboradores;
- duração mínima de 2 competências parciais ou 30 dias corridos.

## 3. Critérios objetivos de aprovação do piloto

Para avançar, o piloto deve atingir:

- vínculo usuário-funcionário correto em pelo menos 98% do grupo;
- taxa de marcação concluída sem suporte manual em pelo menos 90%;
- taxa de erro técnico crítico abaixo de 2%;
- recibo gerado e visível em pelo menos 99% das marcações aceitas;
- nenhuma divergência estrutural grave entre evento, timeline e apuração;
- operação capaz de tratar pendências sem editar banco.

## 4. Sinais de bloqueio do piloto

Bloqueiam avanço:

- elegibilidade mal definida;
- contexto ativo ausente em massa;
- alto volume de colaborador sem login funcional;
- necessidade frequente de correção manual fora do fluxo;
- falha recorrente de conectividade sem estratégia operacional;
- divergência sistêmica entre app e backend.

---

## Critério de Rollout

## 1. Ordem recomendada

1. CLT padrão
2. CLT alocado com contexto simples
3. CLT multiposto controlado
4. intermitente com ponto condicional e contexto maduro

## 2. Estratégia de ativação

Ativação progressiva por:

- empresa/unidade;
- cliente;
- centro de custo;
- liderança;
- grupo piloto;
- categoria operacional.

Nunca ativar por “todos os usuários” de uma vez.

## 3. Gates para cada onda

Cada onda só avança se:

- suporte da onda anterior estabilizou;
- métricas operacionais permaneceram dentro do esperado;
- backlog crítico foi tratado;
- RH/operação concordam com o avanço;
- rollback por grupo continua viável.

## 4. Plano de rollback

Rollback precisa permitir:

- desligar rota/app novo por flag;
- manter backend V2 preservado;
- voltar grupo ao canal anterior sem perda de eventos já gravados;
- continuar usando admin/fluxos de ajuste sem corromper competência.

---

## Dependências antes de produzir valor real

O app não deve ser considerado pronto só por abrir bonito no celular.

Ele depende de:

- elegibilidade V2 confiável;
- contexto ativo quando necessário;
- competência `26 -> 25` estável;
- jornada completa com intervalo;
- recibo por evento;
- ajuste formal;
- fechamento e reabertura controlados;
- observabilidade mínima.

---

## Sequência Recomendada de Execução

1. Consolidar `/ponto` atual em componentes reutilizáveis.
2. Criar shell mobile dedicado do app.
3. Entregar PWA instalável.
4. Ligar o app ao Journey V2 como canal oficial de marcação.
5. Entregar recibo, timeline e período atual.
6. Entregar ajuste pelo app.
7. Implantar lembretes e supervisão.
8. Expandir para contextos mais complexos.
9. Avaliar empacotamento nativo apenas depois da operação estar estável.

---

## Conclusão

O melhor desenho de longo prazo para o RH Prime é:

- **Journey V2 como núcleo oficial**
- **app/PWA do colaborador como canal principal**
- **notificações internas e push como reforço**
- **Slack como canal gerencial**

O app não deve nascer como produto isolado nem como simples “atalho para a página de ponto”.

Ele deve nascer como **camada operacional mobile do Journey V2**, com rollout progressivo, feature flags, critérios objetivos de piloto e preservação do que hoje ainda precisa continuar funcionando.
