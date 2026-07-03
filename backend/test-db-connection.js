import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

console.log('Attempting connection to:', process.env.DATABASE_URL);

try {
  await client.connect();
  console.log('✓ Connected successfully!');
  
  const res = await client.query('SELECT NOW()');
  console.log('✓ Query successful, current time:', res.rows[0]);
  
  await client.end();
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('Full error:', err);
  process.exit(1);
}
