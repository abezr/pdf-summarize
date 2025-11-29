console.log('Testing LLM Provider Manager...');
try {
  const { llmProviderManager } = require('./dist/services/llm/index.js');
  console.log('LLM Provider Manager imported successfully');
  const config = llmProviderManager.getConfig();
  console.log('Config:', JSON.stringify(config, null, 2));
} catch(e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
