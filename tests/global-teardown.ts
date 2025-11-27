import fs from 'fs/promises';
import path from 'path';

export default async (): Promise<void> => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clean up test files
    const testUploadsDir = path.join(process.cwd(), 'tests', 'fixtures', 'uploads');

    try {
      const files = await fs.readdir(testUploadsDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(testUploadsDir, file)))
      );
    } catch (error) {
      // Directory might not exist, ignore
    }

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw error in teardown as it might mask test failures
  }
};
