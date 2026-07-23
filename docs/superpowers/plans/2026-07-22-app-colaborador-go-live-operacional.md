# RH Prime - Go-Live Operacional do App de Ponto

> Data: July 22, 2026
> Escopo: entrada em uso real do app/PWA de ponto
> Objetivo: colocar o ponto em operacao real com risco controlado

## Objetivo

Este plano organiza a virada do app de ponto do estado de preparacao para uso real.

A prioridade aqui nao e "liberar para todos".

A prioridade e:

- colocar para funcionar de verdade
- evitar erro de cadastro e de vinculo
- evitar falso sucesso de batida
- garantir suporte no primeiro dia
- expandir por ondas sem perder controle

---

## Regra de implantacao

O app entra em uso real por fases:

1. saneamento da base
2. piloto controlado
3. producao assistida
4. ampliacao por ondas
5. canal padrao

Nao liberar toda a base de uma vez.

---

## Fase 1 - Saneamento da base

Antes de qualquer batida real, revisar a base do grupo piloto.

## Checklist de cadastro

Cada colaborador do piloto precisa ter:

- usuario de acesso valido
- vinculo correto entre usuario e funcionario
- nome e documento conferidos
- situacao ativa
- elegibilidade para ponto definida
- jornada esperada definida
- regra de intervalo definida
- contrato ou contexto operacional identificado

## Checklist de acesso

Confirmar:

- login funcionando
- acesso ao `/app`
- acesso ao `/app/ponto`
- bloqueio funcionando para usuario sem vinculo
- bloqueio funcionando para usuario fora do piloto

## Resultado minimo da fase

Nenhum colaborador entra no piloto sem:

- usuario funcional
- vinculo correto
- jornada minimamente configurada

---

## Fase 2 - Implantacao do mes corrente

Como o ponto vai comecar no sistema agora, o mes corrente precisa entrar com base controlada.

## Regra operacional

Usar o fluxo de lancamento manual de implantacao para registrar o que for necessario no periodo atual, sempre com justificativa obrigatoria.

Competencia operacional:

- inicia no dia `26`
- encerra no dia `25`

## Quando usar

Usar para:

- ajustar inicio do uso do sistema
- registrar jornada retroativa validada pelo RH
- corrigir situacoes do mes em que o app ainda nao estava sendo usado

## Regras obrigatorias

- todo lancamento manual precisa de justificativa
- justificativa deve citar implantacao do sistema
- o RH precisa validar quem recebeu lancamento manual
- nao misturar implantacao com ajuste comum sem rastreabilidade

## Modelo de justificativa

`Implantacao do sistema de ponto no periodo atual. Registro retroativo validado pelo RH para inicio controlado da operacao.`

## Resultado minimo da fase

Ao iniciar o uso real:

- o colaborador nao pode aparecer com jornada aberta antiga
- o painel nao pode mostrar tempo correndo herdado de periodo inconsistente
- o mes atual precisa estar coerente para a primeira batida real

---

## Fase 3 - Piloto controlado

## Tamanho recomendado

Comecar com:

- 5 a 15 colaboradores

## Perfil recomendado do primeiro grupo

Priorizar:

- CLT
- intermitentes mais estaveis
- pessoas com smartphone proprio em bom estado
- pessoas com melhor suporte operacional

Evitar no primeiro lote:

- casos muito excepcionais
- cenarios com alta variacao contratual
- usuarios sem familiaridade minima com celular

## Diversidade minima do grupo

O piloto precisa incluir:

- pelo menos 2 Android
- pelo menos 2 iPhone
- mais de um contexto operacional se possivel

## Liberacao tecnica

Usar o gate de piloto ja implementado para liberar por:

- email
- user id
- role

## Resultado minimo da fase

O piloto so comeca quando:

- grupo estiver fechado
- grupo estiver cadastrado corretamente
- grupo estiver liberado no gate
- checklist operacional estiver pronto para execucao

---

## Fase 4 - Homologacao real antes do primeiro dia

Antes da abertura oficial do uso, executar o checklist em aparelho real.

Documento de referencia:

- [2026-07-22-app-colaborador-checklist-operacional.md](C:/Finhub/docs/superpowers/plans/2026-07-22-app-colaborador-checklist-operacional.md)

## Minimo exigido

- 2 Android aprovados
- 2 iPhone aprovados
- testes negativos executados
- nenhuma falha critica em aberto

---

## Fase 5 - Primeiro dia de operacao assistida

O primeiro dia nao deve ser tratado como operacao normal.

Ele precisa de acompanhamento dedicado.

## Time minimo do dia 1

Definir responsaveis para:

- RH
- operacao
- suporte funcional do sistema

## Janela de acompanhamento

Monitorar principalmente:

- inicio da jornada
- horario de intervalo
- encerramento da jornada

## Checklist do dia 1

Antes do inicio:

- confirmar que o grupo piloto esta liberado
- confirmar que o RH sabe quem esta no piloto
- confirmar que os links de acesso foram enviados
- confirmar que as instrucoes de instalacao foram repassadas

Durante a entrada:

- validar quem conseguiu instalar
- validar quem conseguiu fazer login
- validar quem registrou entrada com recibo
- registrar quem falhou e por qual motivo

Durante o intervalo:

- validar marcacao de inicio de intervalo
- validar retorno
- verificar se houve sequencia invalida

Durante a saida:

- validar encerramento com recibo
- validar timeline do dia
- validar pedidos de ajuste abertos

Ao fim do dia:

- consolidar falhas
- classificar por severidade
- decidir se o grupo continua no dia seguinte sem restricao

---

## Fase 6 - Suporte operacional

O RH e a operacao precisam ter resposta pronta para os casos mais comuns.

## Casos obrigatorios

- como instalar no Android
- como instalar no iPhone
- como fazer login novamente
- o que significa estar fora do piloto
- o que fazer sem vinculo com funcionario
- o que fazer sem permissao de camera
- o que fazer sem permissao de localizacao
- como abrir ajuste
- quando acionar o RH
- quando acionar o suporte do sistema

## Regra de atendimento

Toda falha do primeiro piloto deve ser registrada com:

- usuario
- aparelho
- horario
- etapa em que falhou
- mensagem apresentada
- acao tomada

---

## Fase 7 - Criterio de expansao

So expandir apos alguns dias de estabilidade do piloto.

## Pode expandir quando

- nao houve falso sucesso de batida
- login esta estavel
- recibo e timeline estao coerentes
- ajustes funcionam
- RH consegue orientar os casos comuns
- taxa de falha esta sob controle

## Nao pode expandir quando

- ha falha critica aberta
- o RH ainda depende de tratamento manual excessivo
- o piloto ainda gera duvida operacional frequente
- iPhone ou Android ainda tem comportamento instavel

---

## Sequencia pratica recomendada

## Hoje

- fechar lista do grupo piloto
- revisar cadastro e vinculo
- revisar elegibilidade e jornada

## Proxima execucao operacional

- preparar implantacao do mes corrente
- executar checklist Android e iPhone
- corrigir falhas bloqueadoras

## Abertura do piloto

- liberar grupo no gate
- enviar orientacoes
- acompanhar primeiro dia

## Depois do piloto

- consolidar falhas
- corrigir o que for necessario
- decidir a segunda onda

---

## Decisao recomendada

Para sair do planejamento e entrar em uso real, o melhor caminho agora e:

1. fechar o grupo piloto
2. sanear cadastro e vinculos
3. preparar a implantacao do mes atual
4. executar homologacao em aparelhos reais
5. abrir o primeiro dia de operacao assistida

Essa e a trilha mais segura para colocar o ponto em funcionamento sem perder controle do que ja foi construido.
