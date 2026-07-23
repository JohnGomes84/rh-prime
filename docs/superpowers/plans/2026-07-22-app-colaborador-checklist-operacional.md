# RH Prime - Checklist Operacional do App do Colaborador

> Data: July 22, 2026
> Escopo: homologacao manual do app/PWA de ponto
> Objetivo: executar o piloto com criterio claro de aceite, evidencia e bloqueio

## Como usar este documento

Use este checklist em aparelho real, nunca apenas em emulador.

Cada execucao deve registrar:

- aparelho
- sistema operacional e versao
- navegador
- usuario testado
- data e hora
- resultado
- evidencia coletada

---

## Pre-condicoes

Antes do teste, confirmar:

- ambiente publicado em HTTPS
- usuario com login valido
- usuario vinculado a funcionario
- usuario elegivel para ponto
- usuario liberado no piloto
- consentimentos revisados em `Privacidade`
- jornada do colaborador configurada

---

## Roteiro Android

Executar no Chrome Android:

1. abrir a URL do RH Prime
2. fazer login
3. entrar em `/app`
4. validar se a home mostra:
   - nome do colaborador
   - status de elegibilidade
   - competencia `26 -> 25`
   - status de seguranca da sessao
5. instalar o app pelo botao ou pelo menu do Chrome
6. fechar o navegador
7. abrir o app pelo icone da tela inicial
8. entrar em `/app/ponto`
9. registrar `entrada`
10. registrar `inicio de intervalo`
11. registrar `fim de intervalo`
12. registrar `saida`
13. abrir o comprovante ou recibo mais recente
14. validar timeline do dia
15. abrir ajuste e criar uma solicitacao
16. confirmar que a solicitacao apareceu na lista recente
17. fazer logout
18. confirmar retorno controlado para login

Resultado esperado:

- app abre como aplicativo instalado
- nenhuma etapa mostra falso sucesso
- todos os eventos aparecem na sequencia correta
- recibo e timeline ficam coerentes com as marcacoes

---

## Roteiro iPhone e iPad

Executar no Safari:

1. abrir a URL do RH Prime
2. fazer login
3. entrar em `/app`
4. validar se a home mostra:
   - nome do colaborador
   - status de elegibilidade
   - competencia `26 -> 25`
   - status de seguranca da sessao
5. usar `Compartilhar > Adicionar a Tela de Inicio`
6. abrir o app pelo icone instalado
7. entrar em `/app/ponto`
8. registrar `entrada`
9. registrar `inicio de intervalo`
10. registrar `fim de intervalo`
11. registrar `saida`
12. abrir o recibo mais recente
13. validar timeline do dia
14. criar um ajuste
15. confirmar a exibicao do ajuste recente
16. fazer logout
17. confirmar retorno controlado para login

Resultado esperado:

- app abre em modo standalone
- navegacao continua estavel apos reinstalar e reabrir
- fluxo completo de jornada funciona sem depender do RH

---

## Testes negativos obrigatorios

Executar tambem:

1. usuario fora do piloto tenta acessar `/app`
2. usuario sem vinculo com funcionario tenta acessar `/app/ponto`
3. usuario inativo tenta manter sessao aberta
4. usuario sem consentimento de selfie tenta registrar ponto
5. usuario sem consentimento de geolocalizacao tenta registrar ponto
6. aparelho sem internet tenta concluir uma marcacao

Resultado esperado:

- acesso bloqueado quando devido
- mensagem operacional clara
- nenhum evento fica registrado como sucesso sem backend confirmar
- app nao tenta coletar evidencia sem consentimento ativo

---

## Evidencias minimas por execucao

Guardar:

- screenshot da home do app
- screenshot da tela de ponto
- screenshot do recibo final
- screenshot da timeline do dia
- screenshot do ajuste criado
- identificacao do aparelho e navegador
- observacao de erro se houver

---

## Classificacao de falhas

## Critica

- ponto parece confirmado mas nao foi salvo
- usuario acessa dado de outro colaborador
- login quebra em modo app
- sequencia de jornada permite estado invalido

## Alta

- app nao instala em aparelho compativel
- recibo nao aparece apos marcacao
- timeline nao reflete o evento salvo
- ajuste nao pode ser criado

## Media

- mensagens pouco claras
- status de seguranca ou consentimento confuso
- instrucao de instalacao insuficiente

## Baixa

- detalhe visual
- texto operacional improvavel de gerar erro real

---

## Criterio de aceite do piloto

O piloto pode iniciar quando:

- 2 aparelhos Android reais passarem no roteiro completo
- 2 aparelhos Apple reais passarem no roteiro completo
- todos os testes negativos obrigatorios passarem
- nenhuma falha critica permanecer aberta
- falhas altas tiverem plano e prazo definido
- RH souber orientar instalacao, login, permissao e ajuste

---

## Criterio de pausa do rollout

Parar imediatamente se ocorrer:

- falso positivo de batida
- vazamento de escopo entre colaboradores
- falha recorrente de login em modo instalado
- evidencia inconsistente sem aviso claro
- erro operacional repetido acima do toleravel no grupo piloto

---

## Encerramento da rodada

Ao final de cada rodada, registrar:

- quantidade de aparelhos aprovados
- falhas abertas por severidade
- decisao: `aprovado`, `aprovado com ressalvas` ou `bloqueado`
- responsavel pelo proximo passo
