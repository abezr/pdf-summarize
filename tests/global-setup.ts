import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export default async (): Promise<void> => {
  console.log('🚀 Setting up test environment...');

  try {
    // Ensure test database and Redis are running
    console.log('📊 Checking Docker services...');
    execSync('docker-compose ps', { stdio: 'inherit' });

    // Create test uploads directory
    const testUploadsDir = path.join(process.cwd(), 'tests', 'fixtures', 'uploads');
    await fs.mkdir(testUploadsDir, { recursive: true });

    // Clean up any existing test files
    const files = await fs.readdir(testUploadsDir);
    await Promise.all(
      files.map(file => fs.unlink(path.join(testUploadsDir, file)))
    );

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
};
