import { PrismaClient } from '@prisma/client';
import http from 'http';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../modules/auth/auth.service.js';

const prisma = new PrismaClient();

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'x-client-type': 'mobile'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Phase 3: My Details (PATCH /api/v1/auth/me)...\n');

  // 1. Create a dummy user directly in DB for testing
  const testEmail = `test_mydetails_${Date.now()}@example.com`;
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const testUser = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'My Details Test User',
      password: hashedPassword,
      role: 'USER',
    }
  });

  console.log(`1️⃣ Created test user: ${testUser.email} (ID: ${testUser.id})`);

  // Generate valid accessToken using auth.service helper
  const token = generateAccessToken(testUser);

  // 2. GET /api/v1/auth/me
  console.log('\n2️⃣ GET /api/v1/auth/me (Initial Fetch)');
  const resGet1 = await request('GET', '/api/v1/auth/me', null, token);
  console.log(`   Status: ${resGet1.status}`);
  console.log(`   Name: ${resGet1.body?.data?.name}`);
  console.log(`   Mobile No: ${resGet1.body?.data?.mobile_no} (expected: null)`);
  console.log(`   Gender: ${resGet1.body?.data?.gender} (expected: null)`);

  if (resGet1.status !== 200 || resGet1.body?.data?.mobile_no !== null) {
    throw new Error(`Initial GET /api/v1/auth/me failed with status ${resGet1.status}`);
  }

  // 3. PATCH /api/v1/auth/me with valid profile details
  console.log('\n3️⃣ PATCH /api/v1/auth/me (Updating Profile)');
  const updatePayload = {
    mobile_no: '+91 9876543210',
    dob: '2000-05-20',
    gender: 'MALE',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai'
  };

  const resPatch = await request('PATCH', '/api/v1/auth/me', updatePayload, token);
  console.log(`   Status: ${resPatch.status}`);
  console.log(`   Updated Mobile No: ${resPatch.body?.data?.mobile_no}`);
  console.log(`   Updated Gender: ${resPatch.body?.data?.gender}`);
  console.log(`   Updated Location: ${resPatch.body?.data?.city}, ${resPatch.body?.data?.state}, ${resPatch.body?.data?.country}`);

  if (
    resPatch.status !== 200 ||
    resPatch.body?.data?.mobile_no !== '+91 9876543210' ||
    resPatch.body?.data?.gender !== 'MALE' ||
    resPatch.body?.data?.city !== 'Mumbai'
  ) {
    throw new Error('PATCH /api/v1/auth/me failed');
  }

  // 4. GET /api/v1/auth/me to verify persistence
  console.log('\n4️⃣ GET /api/v1/auth/me (Verifying Persistence)');
  const resGet2 = await request('GET', '/api/v1/auth/me', null, token);
  console.log(`   Status: ${resGet2.status}`);
  console.log(`   Persisted Mobile No: ${resGet2.body?.data?.mobile_no}`);
  console.log(`   Persisted DOB: ${resGet2.body?.data?.dob}`);

  if (resGet2.status !== 200 || resGet2.body?.data?.mobile_no !== '+91 9876543210') {
    throw new Error('Persistence verification failed');
  }

  // 5. Test invalid gender validation (should return 400)
  console.log('\n5️⃣ PATCH /api/v1/auth/me (Validation Check - Invalid Gender)');
  const resInvalid = await request('PATCH', '/api/v1/auth/me', { gender: 'INVALID_GENDER' }, token);
  console.log(`   Status: ${resInvalid.status} (expected: 400)`);
  console.log(`   Message: ${resInvalid.body?.message}`);

  if (resInvalid.status !== 400) {
    throw new Error('Invalid gender validation failed');
  }

  // Cleanup test user
  await prisma.user.delete({ where: { id: testUser.id } });
  console.log('\n🧹 Cleaned up test user');
  console.log('✅ ALL PHASE 3 MY DETAILS ENDPOINT TESTS PASSED!');
  await prisma.$disconnect();
}

runTests().catch(err => {
  console.error('❌ PHASE 3 TEST FAILED:', err);
  prisma.$disconnect();
  process.exit(1);
});
