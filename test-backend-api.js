// Test script to verify backend API endpoints
const API_BASE_URL = 'http://localhost:3002/v1';

async function testBackendAPI(endpoint, description) {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`URL: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${description}`);
      console.log(`Data structure:`, {
        hasData: !!data,
        keys: Object.keys(data || {}),
        dataType: typeof data,
        isArray: Array.isArray(data)
      });
      
      if (data && typeof data === 'object') {
        // Log first few items for arrays
        if (Array.isArray(data)) {
          console.log(`Array length: ${data.length}`);
          if (data.length > 0) {
            console.log(`First item:`, data[0]);
          }
        } else {
          // For objects, log key structure
          Object.keys(data).forEach(key => {
            const value = data[key];
            console.log(`${key}:`, {
              type: typeof value,
              isArray: Array.isArray(value),
              length: Array.isArray(value) ? value.length : 'N/A'
            });
          });
        }
      }
    } else {
      console.log(`❌ Failed: ${description}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }
    
    return response.ok;
  } catch (error) {
    console.log(`❌ Error: ${description}`);
    console.log(`Error message: ${error.message}`);
    return false;
  }
}

async function testAllBackendEndpoints() {
  console.log('🚀 Testing Backend API Endpoints...\n');
  console.log(`Base URL: ${API_BASE_URL}\n`);
  
  const tests = [
    {
      endpoint: '/analytics/trends?startMonth=2024-01&endMonth=2024-12',
      description: 'Analytics Trends API'
    },
    {
      endpoint: '/analytics/accuracy-distribution',
      description: 'Analytics Accuracy Distribution API'
    },
    {
      endpoint: '/analytics/performance?type=store&limit=10',
      description: 'Analytics Performance API (Store)'
    },
    {
      endpoint: '/analytics/performance?type=product&limit=10',
      description: 'Analytics Performance API (Product)'
    },
    {
      endpoint: '/analytics/replenishment',
      description: 'Analytics Replenishment API'
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    const success = await testBackendAPI(test.endpoint, test.description);
    if (success) passed++;
  }

  console.log(`\n📊 Backend API Test Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All backend APIs are working correctly!');
  } else {
    console.log('⚠️  Some backend APIs need attention');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your backend server is running on port 3002');
    console.log('2. Check if the API endpoints are implemented in your backend');
    console.log('3. Verify the API routes are correctly configured');
    console.log('4. Check backend logs for any errors');
  }
}

// Run tests
testAllBackendEndpoints().catch(console.error); 