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
  console.log('🧪 Testing Phase 5: Assign & Revoke Courses Backend...\n');

  // 0. Ensure a test category exists
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Test Category', description: 'For unit testing' }
    });
  }

  // 1. Create temporary Admin, Student, and 2 Shows
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_course_test_${Date.now()}@example.com`,
      name: 'Course Admin',
      password: await bcrypt.hash('AdminPass123!', 10),
      role: 'ADMIN',
    }
  });

  const studentUser = await prisma.user.create({
    data: {
      email: `student_course_test_${Date.now()}@example.com`,
      name: 'Course Student',
      password: await bcrypt.hash('StudentPass123!', 10),
      role: 'USER',
    }
  });

  const show1 = await prisma.show.create({
    data: {
      title: `Test Course 101 (${Date.now()})`,
      synopsis: 'Test Course Description',
      category_id: category.id,
    }
  });

  const showPurchased = await prisma.show.create({
    data: {
      title: `Purchased Course 202 (${Date.now()})`,
      synopsis: 'Purchased Course Description',
      category_id: category.id,
    }
  });

  console.log(`1️⃣ Created Test Admin (${adminUser.id}), Student (${studentUser.id}), Show 1 (${show1.id}), Show 2 (${showPurchased.id})`);
  const adminToken = generateAccessToken(adminUser);

  // 2. Test POST /api/v1/admin/students/:userId/courses (Assigning Course)
  console.log('\n2️⃣ POST /api/v1/admin/students/:userId/courses (Assigning Course)');
  const resAssign = await request('POST', `/api/v1/admin/students/${studentUser.id}/courses`, { show_ids: [show1.id] }, adminToken);
  console.log(`   Status: ${resAssign.status}`);
  console.log(`   Assigned Shows: ${JSON.stringify(resAssign.body?.data?.assigned_show_ids)}`);

  if (resAssign.status !== 200 || !resAssign.body?.data?.assigned_show_ids?.includes(show1.id)) {
    throw new Error('Course assignment failed');
  }

  // Check DB record
  const access1 = await prisma.showAccess.findFirst({
    where: { user_id: studentUser.id, show_id: show1.id }
  });
  console.log(`   DB Record Access Type: ${access1?.access_type} (expected: ADMIN_GRANTED)`);
  console.log(`   DB Record Coins Spent: ${access1?.coins_spent} (expected: 0)`);
  console.log(`   DB Record Revoked At: ${access1?.revoked_at} (expected: null)`);

  if (!access1 || access1.access_type !== 'ADMIN_GRANTED' || access1.coins_spent !== 0 || access1.revoked_at !== null) {
    throw new Error('DB assertion failed after assignment');
  }

  // 3. Test idempotency (Re-assigning same course)
  console.log('\n3️⃣ POST /api/v1/admin/students/:userId/courses (Idempotency Check)');
  const resAssignAgain = await request('POST', `/api/v1/admin/students/${studentUser.id}/courses`, { show_ids: [show1.id] }, adminToken);
  console.log(`   Status: ${resAssignAgain.status} (expected: 200)`);

  if (resAssignAgain.status !== 200) {
    throw new Error('Idempotent assignment failed');
  }

  // 4. Test DELETE /api/v1/admin/students/:userId/courses/:showId (Revoking Admin Course)
  console.log('\n4️⃣ DELETE /api/v1/admin/students/:userId/courses/:showId (Revoking Admin-Granted Course)');
  const resRevoke = await request('DELETE', `/api/v1/admin/students/${studentUser.id}/courses/${show1.id}`, null, adminToken);
  console.log(`   Status: ${resRevoke.status} (expected: 200)`);

  const accessRevoked = await prisma.showAccess.findFirst({
    where: { user_id: studentUser.id, show_id: show1.id }
  });
  console.log(`   Revoked At Timestamp: ${accessRevoked?.revoked_at}`);

  if (resRevoke.status !== 200 || !accessRevoked?.revoked_at) {
    throw new Error('Course revocation failed');
  }

  // 5. Test Protection Rule (Attempting to revoke a PURCHASED course)
  console.log('\n5️⃣ Protection Check: Attempting to revoke PURCHASED course access');
  await prisma.showAccess.create({
    data: {
      user_id: studentUser.id,
      show_id: showPurchased.id,
      coins_spent: 50,
      access_type: 'PURCHASED',
    }
  });

  const resRevokePurchased = await request('DELETE', `/api/v1/admin/students/${studentUser.id}/courses/${showPurchased.id}`, null, adminToken);
  console.log(`   Status: ${resRevokePurchased.status} (expected: 403)`);
  console.log(`   Message: ${resRevokePurchased.body?.message}`);

  if (resRevokePurchased.status !== 403) {
    throw new Error('Protection rule check failed (allowed revoking PURCHASED course)');
  }

  // 6. Test Re-assignment after revocation (restores revoked_at to null)
  console.log('\n6️⃣ Re-assigning previously revoked course...');
  const resReassign = await request('POST', `/api/v1/admin/students/${studentUser.id}/courses`, { show_ids: [show1.id] }, adminToken);
  console.log(`   Status: ${resReassign.status}`);

  const accessRestored = await prisma.showAccess.findFirst({
    where: { user_id: studentUser.id, show_id: show1.id }
  });
  console.log(`   Restored Revoked At: ${accessRestored?.revoked_at} (expected: null)`);

  if (resReassign.status !== 200 || accessRestored?.revoked_at !== null) {
    throw new Error('Re-assignment after revocation failed');
  }

  // Cleanup test data
  await prisma.showAccess.deleteMany({ where: { user_id: studentUser.id } });
  await prisma.show.deleteMany({ where: { id: { in: [show1.id, showPurchased.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, studentUser.id] } } });

  console.log('\n🧹 Cleaned up test data');
  console.log('✅ ALL PHASE 5 ASSIGN & REVOKE COURSES TESTS PASSED!');
  await prisma.$disconnect();
}

runTests().catch(err => {
  console.error('❌ PHASE 5 TEST FAILED:', err);
  prisma.$disconnect();
  process.exit(1);
});
