# Requisitos Extraídos dos Documentos da Empresa

## Empresa: MASTER LOG SERVIÇOS (CNPJ: 52.062.895/0001-92)

---

## 1. CheckList de Admissão (Pasta do Colaborador)

### Categorias e Itens:

**DOCUMENTOS PESSOAIS:**
- Cópia do RG
- Cópia do CPF
- Cópia do comprovante de residência
- Certidão de nascimento ou casamento
- CTPS (física ou comprovante CTPS Digital)
- Título de eleitor

**ADMISSÃO E REGISTRO CLT:**
- Ficha cadastral preenchida e assinada
- Contrato de trabalho CLT assinado
- Ficha de registro de empregado
- Cadastro no eSocial
- Número do PIS/PASEP
- Termo de opção ou renúncia de vale-transporte
- Dados bancários / chave PIX

**SAÚDE E SEGURANÇA DO TRABALHO:**
- ASO Admissional
- Ordem de Serviço (NR-1) assinada
- Ficha de entrega de EPI assinada
- Treinamentos obrigatórios (NRs aplicáveis)

**TERMOS E CIÊNCIA:**
- Regulamento interno (ciência e assinatura)
- Código de conduta / ética
- Termo de confidencialidade
- Termo de responsabilidade por equipamentos/materiais

**DURANTE O CONTRATO:**
- Advertências
- Suspensões
- ASO Periódico / Mudança de Função
- Atualização cadastral

**RESCISÃO:**
- ASO Demissional
- Termo de rescisão do contrato
- Comprovante de devolução de EPI e materiais
- Baixa no eSocial

---

## 2. Termo de Responsabilidade para Empréstimo de Equipamentos

### Campos Dinâmicos:
- Nome da empresa (CONCEDENTE)
- CNPJ da empresa
- Nome do colaborador (RECEBEDOR)
- CPF do colaborador
- Lista de equipamentos emprestados (nome, modelo, IMEI se aplicável)
- Data do termo
- Local

### Cláusulas Padrão:
- Recebimento em plenas condições
- Uso exclusivo profissional
- Zelo e custódia
- Responsabilidade integral
- Devolução ao término ou desligamento

---

## 3. Declaração de Pendência Documental

### Campos Dinâmicos:
- Nome do colaborador
- CPF
- RG
- Nome da empresa
- CNPJ
- Lista de documentos pendentes (checkbox)
- Prazo para regularização (em dias)
- Local e data

### Documentos Possíveis Pendentes:
- Certificado de Reservista
- Título de Eleitor
- (Outros conforme necessidade)

---

## 4. Ficha de EPI (FM-002)

### Campos do Cabeçalho:
- Nome do funcionário
- Data de admissão
- Função
- Matrícula

### Campos da Tabela de EPIs:
- Quantidade
- Descrição do EPI
- Nº C.A. (Certificado de Aprovação)
- Data de entrega
- Assinatura do funcionário
- Conferência de devolução (data e assinatura)

### EPIs Identificados (exemplo operador empilhadeira):
- Camisa operacional
- Óculos de proteção incolor (CA 11268)
- Botina de segurança
- Capacete de segurança c/ carneira (CA 34414)
- Protetor auricular plug (CA 39068)
- Luva de segurança (CA 34491)
- Máscara PFF2 (CA 38944)
- Colete refletivo

---

## 5. Ordem de Serviço (NR-11) - Operador de Empilhadeira

### Campos Dinâmicos:
- CBO
- Nome do funcionário
- Data de admissão
- Função

### Seções do Documento:
- Atividades desenvolvidas
- Riscos da operação
- EPIs recomendados
- Medidas preventivas
- Treinamentos necessários

---

## Impacto no Sistema RH Prime

### Módulo de Onboarding:
- Checklist digital baseado exatamente no CheckList.docx
- Status visual (pendente/concluído) para cada item
- Integração com Dossiê Digital

### Módulo de Geração de Documentos:
- Template: Termo de Responsabilidade de Equipamentos
- Template: Declaração de Pendência Documental
- Template: Ficha de EPI
- Template: Ordem de Serviço (por função/NR)

### Módulo de Saúde e Segurança:
- Controle de entrega de EPIs por funcionário
- Registro de Ordens de Serviço por função
- Controle de treinamentos obrigatórios (NRs)

### Módulo de Equipamentos:
- Cadastro de equipamentos emprestados
- Vinculação equipamento-funcionário
- Controle de devolução
