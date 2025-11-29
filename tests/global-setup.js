"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
exports.default = async () => {
    console.log('🚀 Setting up test environment...');
    try {
        // Ensure test database and Redis are running
        console.log('📊 Checking Docker services...');
        (0, child_process_1.execSync)('docker-compose ps', { stdio: 'inherit' });
        // Create test uploads directory
        const testUploadsDir = path_1.default.join(process.cwd(), 'tests', 'fixtures', 'uploads');
        await promises_1.default.mkdir(testUploadsDir, { recursive: true });
        // Clean up any existing test files
        const files = await promises_1.default.readdir(testUploadsDir);
        await Promise.all(files.map(file => promises_1.default.unlink(path_1.default.join(testUploadsDir, file))));
        console.log('✅ Test environment setup complete');
    }
    catch (error) {
        console.error('❌ Failed to setup test environment:', error);
        throw error;
    }
};
