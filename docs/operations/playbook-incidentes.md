# Playbook de Incidentes (FinHub Inteligente)

## Objetivo

Padronizar resposta a incidentes críticos (financeiro, RH, segurança e disponibilidade), com rastreabilidade para LGPD/CLT.

## Severidade

- **SEV1**: indisponibilidade total, risco de pagamento indevido, vazamento de dados.
- **SEV2**: indisponibilidade parcial, degradação crítica, risco operacional alto.
- **SEV3**: falha contornável sem impacto financeiro imediato.

## Fluxo de resposta (0 a 60 min)

1. Abrir incidente e registrar hora inicial.
2. Classificar severidade (SEV1/2/3).
3. Acionar responsáveis (técnico + financeiro + RH/DP se aplicável).
4. Congelar operações críticas (pagamento/PIX/edição sensível) quando necessário.
5. Coletar evidências: correlationId, logs, usuário, endpoint, entidade afetada.
6. Definir contenção temporária.

## Fluxo de estabilização (até 4h)

1. Aplicar correção ou rollback.
2. Validar `/health` e `/ready`.
3. Rodar checklist mínimo pós-incidente:
   - fluxos críticos intactos
   - sem duplicidade de pagamento
   - permissões íntegras
4. Comunicar status a cada 30 min para stakeholders.

## Pós-incidente (até 48h)

1. RCA (causa raiz) com linha do tempo.
2. Ações corretivas e preventivas (CAPA).
3. Atualização de testes de regressão.
4. Atualização documental e lições aprendidas.

## Campos obrigatórios no relatório

- Data/hora de início e término.
- Impacto (financeiro, RH, dados).
- Módulos afetados.
- Usuários afetados.
- Evidências técnicas.
- Decisão de rollback (sim/não).
- Aprovações (técnico + negócio + compliance).
