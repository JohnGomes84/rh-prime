import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
await conn.execute(`
  CREATE TABLE IF NOT EXISTS digital_signatures (
    id int AUTO_INCREMENT NOT NULL,
    documentId int NOT NULL,
    cpf varchar(14) NOT NULL,
    signerName varchar(255) NOT NULL,
    signerEmail varchar(255),
    documentHash varchar(255) NOT NULL,
    signatureHash varchar(500) NOT NULL,
    signatureTimestamp timestamp NOT NULL,
    signatureMethod varchar(50),
    ipAddress varchar(45),
    userAgent text,
    isValid boolean DEFAULT true,
    validationTimestamp timestamp NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT digital_signatures_id PRIMARY KEY(id)
  )
`);
console.log('digital_signatures table created');
await conn.end();
process.exit(0);
