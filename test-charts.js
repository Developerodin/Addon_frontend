// Simple test script to verify chart API endpoints
const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, description) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    console.log(`✅ ${description}:`, data);
    return true;
  } catch (error) {
    console.error(`❌ ${description}:`, error.message);
    return false;
  }
}

async function testAllEndpoints() {
  console.log('Testing Chart API Endpoints...\n');
  
  const tests = [
    {
      endpoint: '/api/analytics/trends?startMonth=2024-01&endMonth=2024-12',
      description: 'Enhanced Trends API'
    },
    {
      endpoint: '/api/analytics/accuracy-distribution',
      description: 'Accuracy Distribution API'
    },
    {
      endpoint: '/api/analytics/performance?type=store&limit=10',
      description: 'Performance Analytics API (Store)'
    },
    {
      endpoint: '/api/analytics/performance?type=product&limit=10',
      description: 'Performance Analytics API (Product)'
    },
    {
      endpoint: '/api/analytics/replenishment',
      description: 'Replenishment Analytics API'
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    const success = await testAPI(test.endpoint, test.description);
    if (success) passed++;
    console.log(''); // Empty line for readability
  }

  console.log(`\n📊 Test Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All chart APIs are working correctly!');
  } else {
    console.log('⚠️  Some APIs need attention');
  }
}

// Run tests
testAllEndpoints().catch(console.error); 