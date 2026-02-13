# Segurança - RH Prime

## Política de Segurança

Este documento descreve a estratégia de segurança, autenticação, autorização e conformidade do RH Prime.

## 1. Autenticação & Autorização

### 1.1 JWT (JSON Web Tokens)

**Implementação atual:**
- Biblioteca: `jose` v6.1.0
- Algoritmo: HS256 (HMAC SHA-256)
- TTL padrão: 15 minutos (access token)
- Refresh token: 7 dias

**Ambiente:**
```bash
# .env
JWT_SECRET=<min 32 caracteres, gerado com openssl rand -base64 32>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=production
```

### 1.2 Estratégia de Tokens

```typescript
// Access Token (curta duração)
{
  sub: "user-id",
  email: "user@company.com",
  role: "HR",
  permissions: ["READ_EMPLOYEES", "WRITE_CONTRACTS"],
  iat: 1704067200,
  exp: 1704068100  // 15 min
}

// Refresh Token (longa duração, armazenado em cookie)
{
  sub: "user-id",
  type: "refresh",
  iat: 1704067200,
  exp: 1704672000  // 7 dias
}
```

**Armazenamento:**
- Access Token: Memory (JS) ou localStorage (com cuidado)
- Refresh Token: **HttpOnly Cookie** (protegido contra XSS)
  ```typescript
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: true,  // HTTPS only
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 dias
  });
  ```

### 1.3 Roles & Permissions

**Roles definidas:**
```typescript
enum Role {
  ADMIN = "ADMIN",
  RH = "RH",
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE"
}

// Permissões por role
const rolePermissions = {
  ADMIN: ["*"],  // Acesso total
  RH: [
    "READ_EMPLOYEES",
    "WRITE_EMPLOYEES",
    "READ_CONTRACTS",
    "WRITE_CONTRACTS",
    "READ_VACATIONS",
    "WRITE_VACATIONS",
    "READ_ASO",
    "WRITE_ASO",
    "READ_AUDIT_LOG"
  ],
  MANAGER: [
    "READ_EMPLOYEES",
    "READ_VACATIONS",
    "APPROVE_VACATIONS"
  ],
  EMPLOYEE: [
    "READ_MY_PROFILE",
    "APPLY_VACATION",
    "VIEW_MY_DOCUMENTS"
  ]
};
```

## 2. Proteção de Dados

### 2.1 Senhas

**Algoritmo:** bcrypt (não MD5/SHA1)
```typescript
import bcrypt from 'bcrypt';

// Hash com salt rounds = 12
const hashedPassword = await bcrypt.hash(password, 12);

// Verificação
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Requisitos:**
- Mínimo 12 caracteres
- Deve conter: maiúsculas, minúsculas, números, símbolos
- Nunca registrar/logar senhas em texto plano
- Força mínima: OWASP Medium

### 2.2 Dados Sensíveis em BD

```typescript
// ❌ ERRADO
SELECT * FROM employees;  // Expõe salários, dados médicos

// ✅ CORRETO
SELECT id, name, email, position FROM employees;  // Seleciona apenas necessário

// Para dados sensíveis (PII)
SELECT cpf FROM employees;  // Criptografado em BD
SELECT salary FROM contracts;  // Apenas para RH/ADMIN
SELECT medical_data FROM medical_exams;  // Apenas para RH + auditado
```

**Dados Sensíveis Definidos (PII/PHI):**
- CPF, RG, PIS/PASEP
- Salários, benefícios
- Dados médicos (ASO, atestados)
- Dados bancários
- Endereço completo

### 2.3 Criptografia em Trânsito

- **HTTPS obrigatório** em produção (TLS 1.3+)
- **CORS configurado** para domínios específicos
  ```typescript
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true
  }));
  ```
- **HSTS header** (Strict-Transport-Security)
  ```typescript
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  ```

## 3. Validação & Sanitização

### 3.1 Input Validation com Zod

```typescript
// Schema de criação de funcionário
const createEmployeeSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/),  // 11 dígitos
  salary: z.number().positive().min(1320),  // Salário mínimo BR
  position: z.enum(['DEV', 'MANAGER', 'HR', 'ADMIN']),
  contract_type: z.enum(['CLT', 'PJ', 'TEMP'])
});

// Validação automática em handlers
app.post('/employees', async (req, res) => {
  const data = createEmployeeSchema.parse(req.body);  // Throws ZodError
  // ...
});
```

### 3.2 SQL Injection Prevention

```typescript
// ❌ ERRADO - Concatenação direta
const query = `SELECT * FROM employees WHERE id = ${req.params.id}`;

// ✅ CORRETO - Prepared Statements (Drizzle ORM)
import { eq } from 'drizzle-orm';
const employee = await db
  .select()
  .from(employees)
  .where(eq(employees.id, req.params.id));
```

### 3.3 XSS Prevention

```typescript
// ❌ ERRADO
res.send(`<div>${userInput}</div>`);  // User pode injetar <script>

// ✅ CORRETO - React escapa automaticamente
export function Profile({ user }) {
  return <div>{user.name}</div>;  // Seguro por padrão
}

// Se precisar de HTML:
import DOMPurify from 'dompurify';
const safe = DOMPurify.sanitize(userHtml);
```

## 4. Auditoria & Logging

### 4.1 Audit Log

```typescript
// Registrar TODAS as ações em dados sensíveis
await db.insert(auditLog).values({
  user_id: userId,
  action: 'UPDATE_EMPLOYEE',
  resource: 'employees',
  resource_id: employeeId,
  old_values: oldData,
  new_values: newData,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  timestamp: new Date()
});
```

**Ações auditadas:**
- CREATE/UPDATE/DELETE de funcionários
- Mudanças de salário
- Acesso a dados médicos
- Mudanças de role/permissões
- Falhas de autenticação (3+ = bloqueio temporário)

### 4.2 Logging Estruturado

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Nunca logar senhas/tokens
logger.info('User login', { userId, email, timestamp: new Date() });
```

## 5. AWS S3 (Uploads de Documentos)

### 5.1 Presigned URLs com TTL

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Gerar URL para UPLOAD (5 minutos de validade)
const uploadUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: `documents/${employeeId}/${fileName}`,
    ContentType: 'application/pdf'
  }),
  { expiresIn: 300 }  // 5 minutos
);

// Gerar URL para DOWNLOAD (1 hora)
const downloadUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: `documents/${employeeId}/${fileName}`
  }),
  { expiresIn: 3600 }
);
```

**Validações:**
- Arquivo máximo: 50MB
- Tipos permitidos: PDF, DOCX, PNG, JPG
- Antivírus scan (integração com ClamAV)

## 6. Rate Limiting & DDoS

```typescript
import rateLimit from 'express-rate-limit';

// Limitar login (5 tentativas em 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/login', loginLimiter, async (req, res) => {
  // ...
});

// Limitar API geral (100 req/min por IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

app.use('/api/', apiLimiter);
```

## 7. Variáveis de Ambiente (Checklist)

```bash
# .env.example (NUNCA commit .env real)
JWT_SECRET=<generate>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=production

# Database
DATABASE_URL=mysql://user:pass@host:3306/rh_prime

# AWS S3
AWS_ACCESS_KEY_ID=<>
AWS_SECRET_ACCESS_KEY=<>
AWS_BUCKET=rh-prime-docs
AWS_REGION=us-east-1

# CORS
ALLOWED_ORIGINS=https://rh-prime.example.com,https://admin.rh-prime.example.com

# Logging
LOG_LEVEL=info

# Email (notificações)
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASS=<>
```

## 8. Responsabilidades por Role

| Role | Pode Ver | Pode Editar | Pode Deletar | Auditado |
|------|----------|-------------|-------------|----------|
| ADMIN | Tudo | Tudo | Tudo | ✅ |
| RH | Tudo | Employees, Contracts, Vacations, ASO | Não | ✅ |
| MANAGER | Seu departamento | Nada (read-only) | Nada | ❌ |
| EMPLOYEE | Meus dados | Meu perfil (nome, telefone) | Nada | ✅ |

## 9. Processo de Incidente

**Se detectar breach:**
1. Isolar servidor (offline)
2. Coletar evidências (logs, dumps)
3. Notificar usuários afetados (em até 48h, conforme LGPD)
4. Resetar senhas de admin
5. Auditar acesso anormal
6. Post-mortem documentado

## 10. Testes de Segurança

```bash
# Verificar dependências vulneráveis
npm audit
npm audit fix

# Linting de segurança
npm install --save-dev eslint-plugin-security

# Teste de penetração
# Usar: OWASP ZAP, Burp Suite (anual)
```

## 11. Compliance Verificação

- [ ] Senhas com bcrypt
- [ ] JWT com HttpOnly cookies
- [ ] HTTPS em produção
- [ ] Audit log implementado
- [ ] Validação Zod em todos endpoints
- [ ] SQL injection prevention (Drizzle)
- [ ] XSS prevention (React default)
- [ ] Rate limiting ativo
- [ ] .env nunca committed
- [ ] Dependencies atualizadas (npm audit)

## 12. Referências

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- bcrypt: https://github.com/kelektiv/node.bcrypt.js

---

**Última atualização:** 2026-02-13
**Mantido por:** Equipe de Segurança RH Prime
