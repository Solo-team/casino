const { Client } = require('pg');
require('dotenv').config();

async function checkAllTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  // Get all tables
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  
  console.log('=== ALL TABLES ===');
  console.log(tables.rows.map(x => x.table_name));
  
  // Check each table for user data
  for (const row of tables.rows) {
    const tableName = row.table_name;
    try {
      const cols = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [tableName]
      );
      const colNames = cols.rows.map(c => c.column_name);
      
      // If table has email or user_id column
      if (colNames.includes('email') || colNames.includes('user_id') || colNames.includes('balance')) {
        console.log(`\n=== ${tableName} ===`);
        console.log('Columns:', colNames.join(', '));
        
        let query = `SELECT * FROM "${tableName}"`;
        if (colNames.includes('email')) {
          query += ` WHERE email = 'malavov70@gmail.com'`;
        }
        query += ' LIMIT 5';
        
        const data = await client.query(query);
        console.log('Data:', data.rows);
      }
    } catch (e) {
      console.log(`Error reading ${tableName}:`, e.message);
    }
  }
  
  await client.end();
}

checkAllTables().catch(console.error);
