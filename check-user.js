const { Client } = require('pg');
require('dotenv').config();

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

c.connect()
  .then(() => c.query("UPDATE users SET balance = 999999999 WHERE email = 'malavov70@gmail.com'"))
  .then(() => c.query("SELECT id, email, balance, is_admin FROM users WHERE email = 'malavov70@gmail.com'"))
  .then(r => {
    console.log('Updated:', r.rows);
    c.end();
  })
  .catch(e => {
    console.error(e);
    c.end();
  });
