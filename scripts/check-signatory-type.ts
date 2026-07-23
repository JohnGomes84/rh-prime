import mysql from "mysql2/promise";

const targets = [
  { name: "rh_prime (prod)", url: "mysql://HJ4MopqrRuz9nfD.root:G6A7amlAGzC4E6Gh@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/rh_prime" },
  { name: "rh_prime_dev", url: "mysql://HJ4MopqrRuz9nfD.root:G6A7amlAGzC4E6Gh@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/rh_prime_dev" },
];

for (const t of targets) {
  const conn = await mysql.createConnection({ uri: t.url, ssl: { rejectUnauthorized: true } });
  const [rows] = await conn.query(
    `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'document_signatures'
       AND COLUMN_NAME = 'signatoryType'`,
  );
  console.log(`${t.name}:`, rows);
  await conn.end();
}
