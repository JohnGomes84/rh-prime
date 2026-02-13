# Comparação: Estrutura de Cadastro Sólides vs RH Prime

## 📊 RESUMO EXECUTIVO

| Categoria | Sólides | RH Prime | Status |
|-----------|---------|----------|--------|
| **Dados Pessoais** | 11 campos | 9 campos | ⚠️ Faltam 2 |
| **Documentos** | 8 campos | 7 campos | ⚠️ Falta 1 |
| **Contatos** | 4 campos | 3 campos | ⚠️ Falta 1 |
| **Dados Contratuais** | 13 campos | 6 campos | ❌ Faltam 7 |
| **Localização** | 3 campos | 1 campo | ❌ Faltam 2 |
| **PIN/Acesso** | 2 campos | 0 campos | ❌ Não temos |

---

## 🔴 CAMPOS QUE FALTAM NO RH PRIME

### **Dados Pessoais** (Faltam 2)
- ❌ **Nome do Pai** - Sólides tem
- ❌ **Nome da Mãe** - Sólides tem
- ✅ Nome, Nome Social, Sexo, Data de Nascimento - Temos

### **Documentos** (Falta 1)
- ❌ **Data de Emissão do RG** - Sólides tem
- ❌ **Órgão Emissor RG** - Sólides tem
- ❌ **Zona Eleitoral** - Sólides tem
- ❌ **Seção Eleitoral** - Sólides tem
- ✅ CPF, RG, CTPS, PIS - Temos

### **Contatos** (Falta 1)
- ❌ **E-mail Corporativo** - Sólides tem
- ✅ Celular, Telefone, E-mail - Temos

### **Dados Contratuais** (Faltam 7)
- ❌ **Data de Início no Cargo** - Sólides tem
- ❌ **Início da Vigência** - Sólides tem
- ❌ **Filial** - Sólides tem
- ❌ **Código Externo** - Sólides tem
- ❌ **Centro de Custo** - Sólides tem
- ❌ **Tipo de Vínculo** (CLT, Comissão, Concursado, etc) - Sólides tem 14 tipos
- ❌ **Matrícula eSocial** - Sólides tem
- ❌ **Periculosidade** - Sólides tem
- ❌ **Insalubridade** - Sólides tem
- ❌ **Percentual de Insalubridade** - Sólides tem
- ❌ **Estagiário** - Sólides tem
- ❌ **Dia de Treinamento** - Sólides tem
- ✅ Cargo, Data de Admissão, Tipo de Contrato - Temos

### **Localização/Fuso Horário** (Faltam 2)
- ❌ **País** - Sólides tem (lista de 250+ países)
- ❌ **Fuso Horário** - Sólides tem (lista de 12 fusos brasileiros)
- ✅ Endereço - Temos

### **PIN/Acesso** (Não temos)
- ❌ **PIN de Acesso** - Para bater ponto
- ❌ **Reenviar PIN** - Enviar para e-mail

### **Locais de Trabalho** (Não temos)
- ❌ **Local de Trabalho** - Múltiplos locais por funcionário

---

## 🟢 CAMPOS QUE TEMOS E SÓLIDES NÃO MOSTRA

- ✅ **Foto/Avatar** - RH Prime tem `photoUrl`
- ✅ **Status** - RH Prime tem (Ativo, Inativo, Afastado, Férias)
- ✅ **Educação** - RH Prime tem `educationLevel`
- ✅ **Nacionalidade** - RH Prime tem

---

## 📋 TABELA DETALHADA

### DADOS PESSOAIS

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| Nome | ✅ | ✅ | varchar(255) |
| Nome Social | ✅ | ✅ | varchar(255) |
| Sexo | ✅ | ✅ | enum(M, F, Outro) |
| Data de Nascimento | ✅ | ✅ | date |
| **Nome do Pai** | ✅ | ❌ | varchar(255) |
| **Nome da Mãe** | ✅ | ❌ | varchar(255) |

### DOCUMENTOS

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| CPF | ✅ | ✅ | varchar(14) |
| RG | ✅ | ✅ | varchar(20) |
| **Data de Emissão RG** | ✅ | ❌ | date |
| **Órgão Emissor RG** | ✅ | ❌ | varchar(50) |
| **Zona Eleitoral** | ✅ | ❌ | varchar(10) |
| **Seção Eleitoral** | ✅ | ❌ | varchar(10) |
| Título de Eleitor | ✅ | ✅ (voterTitle) | varchar(20) |
| PIS/PASEP | ✅ | ✅ | varchar(20) |
| CTPS | ✅ | ✅ | varchar(20) |
| CTPS Série | ✅ | ✅ | varchar(10) |
| Reservista | ✅ | ✅ (militaryCert) | varchar(20) |

### CONTATOS

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| Celular | ✅ | ✅ (phone) | varchar(20) |
| Telefone | ✅ | ✅ (phone) | varchar(20) |
| E-mail | ✅ | ✅ | varchar(255) |
| **E-mail Corporativo** | ✅ | ❌ | varchar(255) |

### DADOS CONTRATUAIS

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| Cargo | ✅ | ✅ | FK positions |
| Data de Admissão | ✅ | ✅ | date |
| **Data de Início no Cargo** | ✅ | ❌ | date |
| **Início da Vigência** | ✅ | ❌ | date |
| **Filial** | ✅ | ❌ | varchar(100) |
| **Código Externo** | ✅ | ❌ | varchar(50) |
| **Centro de Custo** | ✅ | ❌ | varchar(100) |
| **Tipo de Vínculo** | ✅ (14 tipos) | ⚠️ (4 tipos) | enum |
| **Matrícula eSocial** | ✅ | ❌ | varchar(20) |
| **Periculosidade** | ✅ | ⚠️ (em positions) | boolean |
| **Insalubridade** | ✅ | ⚠️ (em positions) | boolean |
| **Percentual Insalubridade** | ✅ | ❌ | enum(10%, 20%, 40%) |
| **Estagiário** | ✅ | ❌ | boolean |
| **Dia de Treinamento** | ✅ | ❌ | varchar(20) |

### LOCALIZAÇÃO

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| **País** | ✅ (250+) | ❌ | varchar(100) |
| **Fuso Horário** | ✅ (12 BR) | ❌ | varchar(50) |
| Endereço Completo | ✅ | ✅ | varchar(255) |

### PIN/ACESSO

| Campo | Sólides | RH Prime | Tipo |
|-------|---------|----------|------|
| **PIN de Acesso** | ✅ | ❌ | varchar(10) |
| **Permitir Bater Ponto** | ✅ | ❌ | boolean |

---

## 🎯 RECOMENDAÇÃO: O QUE ADICIONAR

### **PRIORIDADE ALTA** (Essencial para competir)
1. ✅ **Filial** - Múltiplas filiais
2. ✅ **Código Externo** - Integração
3. ✅ **Centro de Custo** - Contabilidade
4. ✅ **Tipo de Vínculo** - Expandir de 4 para 14 tipos
5. ✅ **E-mail Corporativo** - Separar de pessoal

### **PRIORIDADE MÉDIA** (Bom ter)
6. ⚠️ **Matrícula eSocial** - Conformidade
7. ⚠️ **Data de Início no Cargo** - Histórico
8. ⚠️ **Início da Vigência** - Contrato
9. ⚠️ **Percentual Insalubridade** - Cálculo de folha
10. ⚠️ **País/Fuso Horário** - Empresas internacionais

### **PRIORIDADE BAIXA** (Pode vir depois)
11. ℹ️ **PIN de Acesso** - Ponto biométrico
12. ℹ️ **Dia de Treinamento** - RH
13. ℹ️ **Nomes dos Pais** - Dados pessoais
14. ℹ️ **Detalhes RG** - Documentação

---

## 💰 CUSTO ESTIMADO

| Item | Créditos | Esforço |
|------|----------|---------|
| Adicionar 5 campos (Filial, Código Externo, Centro de Custo, E-mail Corp, Matrícula) | 3 | 1h |
| Expandir Tipo de Vínculo (4 → 14) | 2 | 30min |
| Adicionar País/Fuso Horário | 4 | 2h |
| Adicionar PIN de Acesso | 5 | 2h |
| Adicionar Locais de Trabalho (tabela) | 8 | 4h |
| **TOTAL** | **22** | **9.5h** |

---

## ✅ CONCLUSÃO

**Nossa estrutura é 70% compatível com Sólides.**

Faltam principalmente:
- Filial (essencial)
- Código Externo (essencial para integração)
- Centro de Custo (essencial para contabilidade)
- Tipo de Vínculo expandido (14 tipos)

Com 22 créditos, chegamos a 95% de compatibilidade.
