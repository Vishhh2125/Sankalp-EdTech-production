import http from 'http';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000, // standard backend port inside container
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Geo Endpoints...\n');

  // Test 1: Countries
  console.log('1️⃣ GET /api/geo/countries');
  const resCountries = await makeRequest('/api/geo/countries');
  console.log(`   Status: ${resCountries.status}`);
  console.log(`   Success: ${resCountries.body?.success}`);
  console.log(`   Total Countries: ${resCountries.body?.data?.length}`);
  console.log(`   Sample Country [India]:`, resCountries.body?.data?.find(c => c.code === 'IN'));

  if (resCountries.status !== 200 || !Array.isArray(resCountries.body?.data)) {
    throw new Error('Countries test failed!');
  }

  // Test 2: States
  console.log('\n2️⃣ GET /api/geo/states?country=IN');
  const resStates = await makeRequest('/api/geo/states?country=IN');
  console.log(`   Status: ${resStates.status}`);
  console.log(`   Success: ${resStates.body?.success}`);
  console.log(`   Total States in India: ${resStates.body?.data?.length}`);
  console.log(`   Sample State [Maharashtra]:`, resStates.body?.data?.find(s => s.code === 'MH'));

  if (resStates.status !== 200 || !Array.isArray(resStates.body?.data)) {
    throw new Error('States test failed!');
  }

  // Test 3: Cities
  console.log('\n3️⃣ GET /api/geo/cities?country=IN&state=MH');
  const resCities = await makeRequest('/api/geo/cities?country=IN&state=MH');
  console.log(`   Status: ${resCities.status}`);
  console.log(`   Success: ${resCities.body?.success}`);
  console.log(`   Total Cities in Maharashtra: ${resCities.body?.data?.length}`);
  console.log(`   Sample City [Mumbai]:`, resCities.body?.data?.find(c => c.name === 'Mumbai'));

  if (resCities.status !== 200 || !Array.isArray(resCities.body?.data)) {
    throw new Error('Cities test failed!');
  }

  console.log('\n✅ ALL GEO ENDPOINTS PASSED AUTOMATED VERIFICATION!');
}

runTests().catch((err) => {
  console.error('❌ GEO ENDPOINTS TEST FAILED:', err);
  process.exit(1);
});
