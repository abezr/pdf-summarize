// Simple database connection test
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://pdfai:pdfai_dev@localhost:5432/pdfai'
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Database connection successful');

    const result = await client.query('SELECT COUNT(*) as count FROM documents');
    console.log(`📊 Documents table has ${result.rows[0].count} rows`);

    await client.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();