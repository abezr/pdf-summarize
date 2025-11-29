#!/usr/bin/env node

/**
 * Simple script to test the metrics endpoint
 * Run with: node scripts/test-metrics.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/metrics',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Metrics response:');
    console.log(body.substring(0, 1000) + '...');
    console.log(`\nTotal response length: ${body.length} characters`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.log('Make sure the server is running on port 3001');
});

req.end();
