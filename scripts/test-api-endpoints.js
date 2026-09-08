#!/usr/bin/env node

/**
 * Real API Endpoint Testing Script
 * Tests actual API endpoints without mocks
 * 
 * Usage: node scripts/test-api-endpoints.js [baseUrl]
 * Example: node scripts/test-api-endpoints.js http://localhost:5000
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test results storage
const results = {
  passed: [],
  failed: [],
  errors: []
};

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test function
async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`Testing: ${name}...`);
    const response = await makeRequest(url, options);
    
    if (response.status >= 200 && response.status < 300) {
      results.passed.push({ name, url, status: response.status });
      console.log(`✓ PASSED: ${name} (${response.status})`);
      return { success: true, response };
    } else {
      results.failed.push({ name, url, status: response.status, data: response.data });
      console.log(`✗ FAILED: ${name} (${response.status})`);
      console.log(`  Response:`, JSON.stringify(response.data, null, 2));
      return { success: false, response };
    }
  } catch (error) {
    results.errors.push({ name, url, error: error.message });
    console.log(`✗ ERROR: ${name}`);
    console.log(`  Error:`, error.message);
    return { success: false, error };
  }
}

// Main test suite
async function runTests() {
  console.log(`\n=== Testing API Endpoints ===`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test critical endpoints
  console.log('\n--- Critical Endpoints ---\n');
  
  // Note: These tests require authentication, so they may fail without proper setup
  // This script is meant to be run with proper authentication cookies/headers
  
  await testEndpoint('GET /api/roles', `${API_BASE}/roles`);
  await testEndpoint('GET /api/users', `${API_BASE}/users`);
  await testEndpoint('GET /api/projects', `${API_BASE}/projects`);
  await testEndpoint('GET /api/tasks', `${API_BASE}/tasks`);
  
  // Test with specific IDs (will fail if IDs don't exist, but that's expected)
  await testEndpoint('GET /api/users/:id', `${API_BASE}/users/1`);
  await testEndpoint('GET /api/projects/:id', `${API_BASE}/projects/1`);
  await testEndpoint('GET /api/tasks/:id', `${API_BASE}/tasks/1`);
  
  // Test DELETE endpoint (will fail without auth, but shows if endpoint exists)
  await testEndpoint('DELETE /api/users/:id', `${API_BASE}/users/999`, { method: 'DELETE' });
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n--- Failed Tests ---');
    results.failed.forEach(test => {
      console.log(`- ${test.name}: ${test.status}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n--- Errors ---');
    results.errors.forEach(test => {
      console.log(`- ${test.name}: ${test.error}`);
    });
  }
  
  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    'api-test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\nResults saved to api-test-results.json');
}

// Run tests
runTests().catch(console.error);
