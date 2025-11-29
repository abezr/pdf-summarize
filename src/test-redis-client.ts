// Test Redis client functionality
import { redis } from './database/redis';

async function testRedisClient() {
  try {
    console.log('🧪 Testing Redis client connection...');

    // Connect to Redis
    await redis.connect();
    console.log('✅ Redis client connected');

    // Test basic operations
    const testKey = 'test:key';
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };

    // Test SET
    await redis.set(testKey, testValue, 300); // 5 minutes TTL
    console.log('✅ SET operation successful');

    // Test GET
    const retrieved = await redis.get(testKey);
    console.log('✅ GET operation successful:', retrieved);

    // Test EXISTS
    const exists = await redis.exists(testKey);
    console.log('✅ EXISTS operation successful:', exists === 1);

    // Test TTL
    const ttl = await redis.ttl(testKey);
    console.log('✅ TTL operation successful:', ttl, 'seconds remaining');

    // Test DEL
    const deleted = await redis.del(testKey);
    console.log('✅ DEL operation successful:', deleted, 'keys deleted');

    console.log('✅ All Redis client tests passed!');
  } catch (error) {
    console.error('❌ Redis client test failed:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

testRedisClient();
