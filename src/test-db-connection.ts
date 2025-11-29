// Test database client connection
import { db } from './database/client';

async function testDatabaseClient() {
  try {
    console.log('🧪 Testing database client connection...');

    // Test basic query
    const result = await db.query('SELECT COUNT(*) as count FROM documents');
    console.log(
      `✅ Database client working! Documents table has ${result.rows[0].count} rows`
    );

    // Test transaction
    await db.transaction(async (client) => {
      const testResult = await client.query('SELECT 1 as test');
      console.log(
        `✅ Transaction working! Test query returned: ${testResult.rows[0].test}`
      );
    });

    console.log('✅ All database client tests passed!');
  } catch (error) {
    console.error('❌ Database client test failed:', error);
    process.exit(1);
  }
}

testDatabaseClient();
