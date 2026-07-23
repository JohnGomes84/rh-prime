# RH Prime - Homologação do App do Colaborador

> Data: July 22, 2026
> Escopo: app mobile/PWA do colaborador para ponto e jornada
> Objetivo: liberar piloto com controle operacional, segurança e rastreabilidade

## Objetivo

Homologar o app do colaborador do RH Prime como canal operacional de ponto sem expor a operação a risco de:

- batida sem confirmação oficial
- acesso indevido a dados de outro colaborador
- instalação mal orientada
- uso fora do grupo piloto
- coleta de selfie e localização sem governança

---

## Estratégia recomendada

### Fase 1 - PWA homologado

Usar o app como `PWA mobile-first`, acessado por URL segura e instalado na tela inicial.

Objetivo:

- validar adoção real
- validar fluxo de ponto
- validar compatibilidade Android e Apple
- validar segurança, auditoria e suporte

### Fase 2 - Piloto controlado

Liberar somente para grupo autorizado por:

- user id
- email
- role

Objetivo:

- medir adesão
- medir falha por navegador/dispositivo
- validar suporte de campo

### Fase 3 - Avaliação de app nativo

Só evoluir para empacotamento nativo se houver necessidade real de:

- push avançado
- políticas MDM
- distribuição corporativa
- recursos nativos extras
- exigência comercial/contratual

---

## Fluxo de instalação

## Android

### Pré-requisitos

- aparelho Android ativo
- navegador Chrome atualizado
- acesso HTTPS ao RH Prime
- usuário já vinculado a funcionário
- usuário incluído no piloto

### Fluxo de instalação esperado

1. colaborador acessa o link do RH Prime no Chrome
2. faz login
3. entra em `/app`
4. usa o botão `Instalar app agora` ou o menu `Adicionar à tela inicial`
5. o app passa a abrir com ícone próprio e modo app

### Resultado esperado

- ícone visível na tela inicial
- abertura em tela cheia
- acesso direto ao `/app`
- sessão funcionando normalmente

## Apple

### Pré-requisitos

- iPhone ou iPad ativo
- Safari atualizado
- acesso HTTPS ao RH Prime
- usuário já vinculado a funcionário
- usuário incluído no piloto

### Fluxo de instalação esperado

1. colaborador acessa o link do RH Prime no Safari
2. faz login
3. entra em `/app`
4. toca em `Compartilhar`
5. toca em `Adicionar à Tela de Início`
6. confirma o nome do app

### Resultado esperado

- ícone visível na tela inicial
- abertura em modo standalone
- navegação operacional possível

### Observação importante

No iOS, a instalação é mais manual e o navegador não oferece o mesmo fluxo automático do Android. Por isso, a instrução de uso precisa existir no app e no material de rollout.

---

## Checklist de homologação Android

- acesso ao `/app` funciona em Chrome Android
- instalação por prompt do navegador funciona
- instalação por menu manual funciona
- app reabre pela tela inicial
- login persiste conforme política de sessão
- logout funciona
- `/app/ponto` abre corretamente
- entrada funciona
- início de intervalo funciona
- fim de intervalo funciona
- saída funciona
- timeline do dia carrega
- ajuste de ponto pode ser aberto
- usuário fora do piloto é bloqueado
- usuário sem vínculo com funcionário é bloqueado
- perda de conexão não gera falso sucesso
- selfie funciona quando o navegador concede câmera
- geolocalização funciona quando o navegador concede localização

---

## Checklist de homologação Apple

- acesso ao `/app` funciona em Safari iOS
- fluxo `Compartilhar > Adicionar à Tela de Início` funciona
- app reabre pela tela inicial
- login funciona em modo standalone
- logout funciona
- `/app/ponto` abre corretamente
- entrada funciona
- início de intervalo funciona
- fim de intervalo funciona
- saída funciona
- timeline do dia carrega
- ajuste de ponto pode ser aberto
- câmera funciona no Safari com permissão concedida
- geolocalização funciona no Safari com permissão concedida
- bloqueio de usuário fora do piloto funciona
- bloqueio de usuário sem vínculo funciona
- mensagens de indisponibilidade ficam claras

---

## Checklist de segurança

## Autenticação

- login exige credencial válida
- sessão inválida redireciona para `/login`
- usuário inativo não acessa
- troca de senha mantém comportamento esperado

## Autorização

- colaborador só consulta o próprio ponto
- colaborador só cria ajuste do próprio ponto
- consultas de timeline e recibo respeitam escopo
- backend decide escopo, não o frontend

## Proteção de canal

- todo acesso em produção ocorre via HTTPS
- cookies/sessão são enviados de forma segura
- app não depende de parâmetros inseguros para autenticação
- app expõe visualmente quando o transporte da sessão estiver inseguro
- usuário inativo perde acesso mesmo com cookie ainda presente

## Antifraude operacional

- fingerprint do dispositivo é enviado nas batidas
- localização é associada quando disponível e consentida
- selfie é enviada quando disponível e consentida
- saída não acontece durante intervalo aberto
- sequência inválida de eventos é rejeitada
- recibo do evento fica disponível após registro

## Controle de rollout

- feature flag global do app funciona
- gate por piloto funciona
- admin consegue testar sem liberar toda a base
- usuário fora do piloto cai no fluxo atual

## Observabilidade

- falhas de query são logadas
- falhas de mutation são logadas
- eventos de uso do app são capturados
- abertura da home e da tela de ponto são medidas
- sucesso de entrada, saída, intervalo e ajuste são medidos

---

## Checklist LGPD e evidências

- base legal do uso de localização definida
- base legal do uso de selfie definida
- política de privacidade atualizada
- consentimento ou ciência operacional documentada quando aplicável
- app oferece atalho operacional para `Privacidade`
- app não tenta capturar selfie sem consentimento ativo
- app não tenta capturar geolocalização sem consentimento ativo
- retenção de selfie definida
- retenção de geolocalização definida
- acesso administrativo às evidências é restrito
- exportação indevida de selfie/localização é bloqueada
- trilha de auditoria de batidas e ajustes existe

---

## Critérios de aceite para piloto

O piloto só deve iniciar quando todos os itens abaixo estiverem ok:

- app instalado e validado em pelo menos 2 aparelhos Android
- app instalado e validado em pelo menos 2 aparelhos Apple
- fluxo de entrada, intervalo e saída validado ponta a ponta
- ajuste de ponto validado ponta a ponta
- gate de piloto funcionando
- vínculo de usuário com funcionário validado
- recibo e timeline validados
- evidência de logs e telemetria disponível
- material simples de instrução ao colaborador pronto
- RH e operação sabem como tratar falhas

---

## Critérios de rollout

## Onda 1

- 5 a 20 usuários
- somente equipe muito próxima da operação
- foco em compatibilidade e suporte

## Onda 2

- 20 a 100 usuários
- incluir diferentes perfis de aparelho
- incluir mais de um contrato/contexto operacional

## Onda 3

- expandir por cliente, unidade ou categoria
- só avançar com taxa baixa de falha e suporte controlado

---

## Regras de bloqueio do rollout

O rollout deve parar se acontecer qualquer uma destas situações:

- batida confirmada visualmente sem confirmação real do backend
- usuário vendo ponto de outro colaborador
- falha recorrente de login em modo app
- selfie ou localização com comportamento inconsistente sem aviso claro
- falha relevante na trilha de auditoria
- taxa de erro operacional acima do tolerável no piloto

---

## Operação de suporte

O time de suporte precisa ter resposta pronta para:

- como instalar no Android
- como instalar no iPhone
- como reentrar após logout
- o que fazer sem vínculo de funcionário
- o que fazer quando a câmera não estiver autorizada
- o que fazer quando a localização não estiver autorizada
- o que fazer quando o usuário não estiver liberado no piloto
- como abrir ajuste de ponto

---

## Decisão de longo prazo

A recomendação atual é:

- manter PWA como caminho principal do MVP e do piloto
- homologar Android primeiro
- homologar Apple na sequência imediata
- reavaliar app nativo só após piloto real

Isto reduz custo, acelera implantação e preserva a arquitetura atual do RH Prime sem criar uma segunda plataforma cedo demais.
