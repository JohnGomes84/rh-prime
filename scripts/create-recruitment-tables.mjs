import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS job_openings (
    id int AUTO_INCREMENT NOT NULL,
    title varchar(255) NOT NULL,
    department varchar(100),
    positionId int,
    description text,
    requirements text,
    salaryMin decimal(10,2),
    salaryMax decimal(10,2),
    vacancies int NOT NULL DEFAULT 1,
    status enum('Aberta','Em Andamento','Fechada','Cancelada') NOT NULL DEFAULT 'Aberta',
    priority enum('Baixa','Normal','Alta','Urgente') NOT NULL DEFAULT 'Normal',
    openedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closedAt timestamp NULL,
    createdBy varchar(36),
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT job_openings_id PRIMARY KEY(id)
  )
`);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS candidates (
    id int AUTO_INCREMENT NOT NULL,
    jobOpeningId int NOT NULL,
    name varchar(255) NOT NULL,
    email varchar(255),
    phone varchar(20),
    resumeUrl varchar(500),
    linkedinUrl varchar(500),
    stage enum('Triagem','Entrevista RH','Entrevista Tecnica','Entrevista Final','Aprovado','Reprovado','Desistiu') NOT NULL DEFAULT 'Triagem',
    notes text,
    rating int,
    appliedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT candidates_id PRIMARY KEY(id)
  )
`);

const [tables] = await conn.execute("SHOW TABLES LIKE 'job%'");
console.log('job tables:', tables);
const [tables2] = await conn.execute("SHOW TABLES LIKE 'cand%'");
console.log('candidates tables:', tables2);
await conn.end();
process.exit(0);
// Already done - tables exist
