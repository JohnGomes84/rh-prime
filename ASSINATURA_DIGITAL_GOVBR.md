# Integração de Assinatura Digital Gov.br

## Resumo Executivo

A API de Assinatura Eletrônica do Governo Brasileiro permite assinar documentos digitalmente com certificados avançados gov.br, com presunção legal de veracidade.

## Fluxo de Integração

### 1. Pré-requisitos
- Conta gov.br nível **Prata** ou **Ouro** (Bronze não permite assinatura avançada)
- Credenciais de acesso (client_id, client_secret)
- Domínio oficial do governo (.gov.br, .mil.br, .edu.br, etc.)

### 2. Endpoints da API

**Ambiente de Homologação:**
- OAuth Token: `https://cas.staging.iti.br/oauth2.0/token`
- Certificado Público: `https://assinatura-api.staging.iti.br/externo/v2/certificadoPublico`
- Assinar PKCS#7: `https://assinatura-api.staging.iti.br/externo/v2/assinarPKCS7`
- Validador: `https://h-validar.iti.gov.br/index.html`

**Ambiente de Produção:**
- OAuth Token: `https://cas.iti.br/oauth2.0/token`
- Certificado Público: `https://assinatura-api.iti.br/externo/v2/certificadoPublico`
- Assinar PKCS#7: `https://assinatura-api.iti.br/externo/v2/assinarPKCS7`
- Validador: `https://validar.iti.gov.br`

### 3. Fluxo de Assinatura

1. **Autenticação do usuário** via Login Único Gov.br
2. **Geração de code** via OAuth 2.0
3. **Obtenção do token de acesso**
4. **Recuperação do certificado público** do usuário
5. **Cálculo do hash SHA-256** do documento
6. **Assinatura do hash** em PKCS#7
7. **Validação da assinatura**

### 4. Formato de Assinatura

- **Padrão:** PKCS#7 (CMS - Cryptographic Message Syntax)
- **Hash:** SHA-256
- **Aplicável em:** PDF, documentos genéricos

### 5. Requisitos Legais

- Presunção legal de veracidade (Lei nº 14.063/2020)
- Rastreabilidade completa (quem, quando, onde)
- Imutabilidade do documento assinado
- Certificado ICP-Brasil

## Implementação Recomendada

### Fase 1: Integração com Gov.br
- [ ] Registrar aplicação no portal de integração
- [ ] Obter credenciais (client_id, client_secret)
- [ ] Implementar fluxo OAuth 2.0
- [ ] Integrar com Login Único Gov.br

### Fase 2: Serviço de Assinatura
- [ ] Criar endpoint para assinar documentos
- [ ] Implementar cálculo de hash SHA-256
- [ ] Integrar com API de assinatura Gov.br
- [ ] Armazenar certificado público do usuário

### Fase 3: Validação e Auditoria
- [ ] Implementar validação de assinaturas
- [ ] Registrar em auditoria (CPF, timestamp, IP)
- [ ] Exportar para LGPD
- [ ] Integrar com GED

## Prazos

- **Homologação:** até 3 dias úteis
- **Produção:** até 5 dias úteis

## Contato

- Email: integracaoid@economia.gov.br
- Portal: https://www.gov.br/governodigital/pt-br/estrategias-e-governanca-digital/transformacao-digital/servico-de-integracao-aos-produtos-de-identidade-digital-gov.br

## Referências

- Manual: https://manual-integracao-assinatura-eletronica.servicos.gov.br/
- Lei nº 14.063/2020 (Assinatura Eletrônica)
- ICP-Brasil: https://www.gov.br/iti/pt-br
