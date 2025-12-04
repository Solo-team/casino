const { Client } = require('pg');
require('dotenv').config();

async function updateBalance() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const result = await client.query(
    `UPDATE users SET balance = 999999999 WHERE email = 'malavov70@gmail.com' RETURNING id, email, balance, is_admin`
  );
  
  console.log('Updated:', result.rows[0]);
  
  await client.end();
}

updateBalance().catch(console.error);
