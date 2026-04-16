# Análise do Sistema Atual - ML Serviços

## Empresa
- **Nome:** ML Serviços - Mão de obra terceirizada
- **URL atual:** mlservicoseco.com.br
- **Segmento:** Terceirização de mão de obra para logística
- **Sócios:** 2 (um cuida de pagamentos de diaristas, outro do financeiro geral)

---

## Estrutura do Menu (Sidebar)

### Menu Principal
1. Dashboard
2. Analytics
3. Planejamentos
4. Pagamentos
5. Contas
6. Cadastros (submenu expandível)
   - Funcionários
   - Pré-Cadastros
   - Funções
   - Clientes
   - Turnos
   - Centros de Custo
   - Fornecedores

---

## Tela 1: Dashboard Analítico
- **KPIs:** Faturamento Total (R$ 725.290,50), Custos Operacionais (R$ 390.541,05), Margem de Lucro (R$ 334.749,45), Total de Trabalhos (2905)
- **Comparativo:** vs mês anterior com percentuais (71.5%, 69.9%, 73.5%, 52.3%)
- **Gráfico:** Evolução Financeira diária (Março 2026) - linhas de Margem, Faturamento, Custos
- **Navegação por mês:** setas < > com seletor de mês

## Tela 2: Analytics
- **Filtros de período:** Mês Atual, Últimos 3 meses, Últimos 6 meses, Último ano, Data personalizada
- **Abas:** Financeiro Consolidado | Produtividade da Equipe
- **KPIs:** Receita Total (R$ 1.308.677,68), Despesas Totais (R$ 1.378.792,99), Lucro Líquido (-R$ 70.115,31), Margem de Lucro (-5.4%)
- **Gráfico Evolução Mensal:** Barras (Receita verde, Despesas vermelho) + Linha de Lucro
- **Composição de Despesas:** Barras horizontais por categoria (Lote de Pagamento é o maior, depois RT, PRO LABORE, REEMBOLSO, BANCO, CAIXA OPERACIONAL, etc.)

## Tela 3: Planejamentos (Listagem)
- **Título:** "Gerencie os planejamentos e escalas de trabalho"
- **Abas:** Todos | Pendentes de Validação | Validados
- **Filtros:** Data Início, Data Fim, Cliente, Turno, Local, Funcionário
- **Colunas:** Data, Turno (ex: MLT-3 08:00-17:00), Status (Validado), Cliente (nome + local), Pessoas, Valor Total, Ações (editar, copiar, deletar)
- **Botões:** Importar Planilha, + Novo Planejamento
- **Dados exemplo:** 1394 planejamentos, empresas como ENGAGE ELETRO, BRASIL WEB TRANSPORTES, DOMINALOG EXPRESS

## Tela 4: Planejamentos (Editar/Criar)
- **Modal "Editar Planejamento"**
- **Campos:** Data, Turno (dropdown), Cliente (+ Novo), Local (dropdown)
- **Seção "Funções":** + Adicionar Função
  - Função: "Aux. Carga e Descarga" com badge "11 pessoas alocadas"
  - **Valores por função:** Paga: R$ 110,00 | Recebe: R$ 180,00
  - **Lista de diaristas alocados:** cada um com campos individuais:
    - Paga: 110 | Recebe: 180 | Marmita: 0 | Vale: 0 | Bônus: 0
  - **Status:** Badge "Lote Pago" (vermelho) por diarista
  - **Botão:** + Alocar (para adicionar mais diaristas)

## Tela 5: Pagamentos - Pagamento de Funcionários
- **Abas:** Pagamento de Funcionários | Recebimento de Clientes
- **Filtros:** Funcionário (busca), Cliente, Data Início/Fim, Local, Turno, Status, Marmita, Vale, Bônus
- **KPIs:** Total a Pagar (R$ 625,00), Funcionários (408), Dias Trabalhados (2880), Sem PIX (0)
- **Modos:** Analítico | Sintético
- **Resumo por Funcionário:** Nome, Chave PIX, Dias, Valor Total
- **Indicador verde:** funcionários já incluídos em lote de pagamento marcado como "pago"
- **Botões:** Exportar para Pagamento, Gerar Pagamento

## Tela 6: Pagamentos - Recebimento de Clientes
- **Filtros:** Cliente, Data Início/Fim, Funcionário, Função, Turno, Local
- **Colunas visíveis (toggles):** Data, Funcionário, CPF, Função, Turno, Local, Valor
- **KPIs:** Total a Receber (R$ 725.290,50), Funcionários (548), Diárias (2905)
- **Modos:** Analítico | Sintético
- **Relatório Analítico:** Data, Cliente, Funcionário, CPF, Função, Valor
- **Botões:** Exportar Recebimento, Gerar Ordem de Serviço

## Tela 7: Contas (Contas a Pagar)
- **Abas:** Contas a Pagar | Contas a Receber
- **Navegação por mês:** Março 2026 com botão Exportar
- **KPIs:** Total a Pagar Pendente (R$ 9.340,80), Total Pago no mês (R$ 581.485,21), Total a Receber Pendente (R$ 41.580,00), Total Recebido no mês (R$ 308.341,73), Saldo Previsto (R$ 32.239,20)
- **Lotes de Pagamento de Funcionários:** Cards com mês, período, nº funcionários, valor, status (Pago), data pagamento
- **Filtros de contas:** Descrição, Fornecedor, Cliente, Categoria, Status, Banco, Valor (min/max), Vencimento, Pagamento
- **Tabela:** Descrição, Fornecedor, Cliente, Categoria, Valor, Vencimento, Pagamento, Status, Banco, Ações
- **Botão:** + Nova Conta a Pagar

## Tela 8: Contas (com Cadastros expandido)
- Mesma tela de Contas mas mostrando o submenu Cadastros expandido na sidebar

## Tela 9: Funcionários
- **Título:** "Gerencie os funcionários terceirizados"
- **Busca:** por nome, CPF, email ou telefone
- **Filtros:** Cidade, Status, Documentos
- **Colunas:** Nome, CPF, Cidade, Status (Diarista/Inativo), Data Admissão, Ações
- **988 funcionários cadastrados**
- **Botões:** Importar, + Novo Funcionário

## Tela 10: Pré-Cadastros de Funcionários
- **Link universal** para compartilhar com candidatos
- **QR Code** para acesso ao formulário de pré-cadastro
- **Lista:** Nome, Email, Telefone, Cidade, Status (Pendente), Data de Envio
- **Botões:** Importar, Compartilhar Link

## Tela 11: Funções e Salários
- **Lista de funções:** Aux. Adm, Aux. Carga e Descarga, Aux. Carga e Descarga ESPECIAL, Aux. Carga e Descarga NOITE (2x), Aux. Logístico, Aux. Serviços Gerais, Conferente, Líder (2x), Operador de empilhadeira (2x), Supervisor de Operações
- **Ações:** Editar, Deletar
- **Botão:** + Nova Função

## Tela 12: Clientes
- **Colunas:** Nome, Cidade, Funções (badge com quantidade), Endereço, Ações
- **Empresas:** ARPOADOR, BRAMETAL, BRASIL WEB TRANSPORTES, COBATA, COMLOG, CONVERTIDO MARKETING, DOMINALOG EXPRESS, ENGAGE ELETRO, LOJAS SIPOLATTI, MÁSTER LOG, REFRIGELO, SUPERIOR TRANSPORTES, UNNO OPERADOR
- **Cada cliente tem N funções** associadas (1 a 5 funções)
- **Botão:** + Novo Cliente

## Tela 13: Turnos
- **Colunas:** Nome, Início, Fim, Ações
- **Turnos:** MLT-1 a MLT-13 com horários variados (06:00-15:00, 22:00-07:20, 17:00-02:00, etc.)
- **Botão:** + Cadastrar Turno

## Tela 14: Centros de Custo
- **Lista:** ALIMENTAÇÃO, ALUGUEL, BANCO, BRINDES, CAIXA OPERACIONAL, COMBUSTÍVEL GESTÃO, COMBUSTÍVEL OPERACIONAL, COMISSÃO, CONTABILIDADE, CONTENCIOSO TRABALHISTA, DESPESAS ADMINISTRATIVAS, ENERGIA, IMOBILIZADO, INFORMÁTICA, JURÍDICO...
- **Botão:** + Novo Centro de Custo

## Tela 15: Fornecedores
- **Colunas:** Nome, CNPJ, Cidade, Chave PIX, Ações
- **Busca:** por nome ou CNPJ
- **Botão:** + Novo Fornecedor

---

## Fluxo Principal do Negócio (extraído das telas)

1. **Cadastros base:** Clientes (empresas de logística) → Funções → Turnos → Funcionários (diaristas)
2. **Planejamento diário:** Selecionar Data + Turno + Cliente + Local → Adicionar Funções → Alocar Diaristas com valores individuais (Paga/Recebe/Marmita/Vale/Bônus)
3. **Pagamento de Funcionários:** Filtrar por período → Ver resumo por funcionário (dias + valor) → Gerar lote de pagamento → Exportar para pagamento (PIX)
4. **Recebimento de Clientes:** Filtrar por período/cliente → Ver relatório analítico/sintético → Gerar Ordem de Serviço → Exportar recebimento
5. **Contas:** Gerenciar contas a pagar/receber gerais + lotes de pagamento de funcionários
6. **Dashboard/Analytics:** Visão consolidada com KPIs, gráficos de evolução e composição de despesas

## Entidades Principais

| Entidade | Campos-chave |
|:---|:---|
| Funcionário | Nome, CPF, Cidade, Status (Diarista/Inativo), Data Admissão, Chave PIX |
| Cliente | Nome, Cidade, Endereço, Funções associadas |
| Função | Nome (ex: Aux. Carga e Descarga), valores padrão Paga/Recebe |
| Turno | Nome (MLT-1 a MLT-13), Hora Início, Hora Fim |
| Centro de Custo | Nome |
| Fornecedor | Nome, CNPJ, Cidade, Chave PIX |
| Planejamento | Data, Turno, Cliente, Local, Funções com diaristas alocados |
| Alocação (dentro do planejamento) | Funcionário, Paga, Recebe, Marmita, Vale, Bônus |
| Lote de Pagamento | Mês, Período, Funcionários, Valor, Status (Pago/Pendente) |
| Conta a Pagar/Receber | Descrição, Fornecedor, Cliente, Categoria, Valor, Vencimento, Status, Banco |
