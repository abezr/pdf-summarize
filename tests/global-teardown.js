"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
exports.default = async () => {
    console.log('🧹 Cleaning up test environment...');
    try {
        // Clean up test files
        const testUploadsDir = path_1.default.join(process.cwd(), 'tests', 'fixtures', 'uploads');
        try {
            const files = await promises_1.default.readdir(testUploadsDir);
            await Promise.all(files.map(file => promises_1.default.unlink(path_1.default.join(testUploadsDir, file))));
        }
        catch (error) {
            // Directory might not exist, ignore
        }
        console.log('✅ Test environment cleanup complete');
    }
    catch (error) {
        console.error('❌ Failed to cleanup test environment:', error);
        // Don't throw error in teardown as it might mask test failures
    }
};
