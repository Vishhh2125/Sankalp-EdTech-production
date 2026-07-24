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
      'x-client-type': 'web'
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
  console.log('🧪 Testing Phase 4: Student Onboarding Backend...\n');

  // 1. Create temporary Admin user for authentication
  const adminEmail = `admin_onboard_test_${Date.now()}@example.com`;
  const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Main Admin Onboarder',
      password: hashedPassword,
      role: 'ADMIN',
    }
  });

  console.log(`1️⃣ Created test Admin: ${adminUser.email} (ID: ${adminUser.id})`);
  const adminToken = generateAccessToken(adminUser);

  // 2. Test successful student onboarding
  console.log('\n2️⃣ POST /api/v1/admin/students (Onboarding New Student)');
  const studentEmail = `student_onboard_${Date.now()}@example.com`;
  const studentPayload = {
    email: studentEmail,
    name: 'Rahul Verma',
    password: 'StudentPass123!',
    student_id: 'STU-2026-001',
    dob: '2002-08-14',
    gender: 'MALE',
    country: 'India',
    state: 'Maharashtra',
    city: 'Pune',
    mobile_no: '+91 9123456789'
  };

  const resOnboard = await request('POST', '/api/v1/admin/students', studentPayload, adminToken);
  console.log(`   Status: ${resOnboard.status}`);
  console.log(`   Created Student Name: ${resOnboard.body?.data?.student?.name}`);
  console.log(`   Student ID: ${resOnboard.body?.data?.student?.student_id}`);
  console.log(`   Onboarded By: ${resOnboard.body?.data?.student?.onboarded_by}`);

  if (
    resOnboard.status !== 201 ||
    resOnboard.body?.data?.student?.email !== studentEmail ||
    resOnboard.body?.data?.student?.onboarded_by !== adminUser.id
  ) {
    throw new Error('POST /api/v1/admin/students failed');
  }

  const createdStudentId = resOnboard.body.data.student.id;

  // 3. Test duplicate email rejection (HTTP 409 Conflict)
  console.log('\n3️⃣ POST /api/v1/admin/students (Duplicate Email - Rejection Check)');
  const resDuplicate = await request('POST', '/api/v1/admin/students', studentPayload, adminToken);
  console.log(`   Status: ${resDuplicate.status} (expected: 409)`);
  console.log(`   Message: ${resDuplicate.body?.message}`);

  if (resDuplicate.status !== 409) {
    throw new Error('Duplicate email rejection test failed');
  }

  // 4. Test listing & searching students
  console.log('\n4️⃣ GET /api/v1/admin/students?search=STU-2026-001 (Searching Students)');
  const resList = await request('GET', '/api/v1/admin/students?search=STU-2026-001', null, adminToken);
  console.log(`   Status: ${resList.status}`);
  console.log(`   Total Students Found: ${resList.body?.data?.pagination?.total}`);
  console.log(`   Found Student Email: ${resList.body?.data?.students?.[0]?.email}`);

  if (
    resList.status !== 200 ||
    resList.body?.data?.pagination?.total < 1 ||
    resList.body?.data?.students?.[0]?.id !== createdStudentId
  ) {
    throw new Error('GET /api/v1/admin/students search test failed');
  }

  // 5. Verify AdminActivityLog entry
  console.log('\n5️⃣ Verifying AdminActivityLog audit record...');
  const auditLog = await prisma.adminActivityLog.findFirst({
    where: { entity_id: createdStudentId },
    orderBy: { created_at: 'desc' }
  });

  console.log(`   Audit Log Action: "${auditLog?.action}"`);
  if (!auditLog || !auditLog.action.includes('Onboarded student')) {
    throw new Error('Audit log verification failed');
  }

  // Cleanup test users
  await prisma.user.delete({ where: { id: createdStudentId } });
  await prisma.user.delete({ where: { id: adminUser.id } });
  console.log('\n🧹 Cleaned up test student and admin');
  console.log('✅ ALL PHASE 4 STUDENT ONBOARDING TESTS PASSED!');
  await prisma.$disconnect();
}

runTests().catch(err => {
  console.error('❌ PHASE 4 TEST FAILED:', err);
  prisma.$disconnect();
  process.exit(1);
});
