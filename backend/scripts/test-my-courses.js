import { PrismaClient } from '@prisma/client';
import http from 'http';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../modules/auth/auth.service.js';
import { getMyCoursesForUser } from '../modules/user/my-courses.service.js';

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
  console.log('🧪 Testing GET /api/v1/user/my-courses & getMyCoursesForUser Service...\n');

  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Test Category' }
    });
  }

  // Create temporary student
  const student = await prisma.user.create({
    data: {
      email: `student_mycourses_${Date.now()}@example.com`,
      name: 'Test Student',
      password: await bcrypt.hash('StudentPass123!', 10),
      role: 'USER',
    }
  });

  const studentToken = generateAccessToken(student);

  // Create 3 Test Shows
  const show1 = await prisma.show.create({
    data: {
      title: `Show Direct Purchased (${Date.now()})`,
      synopsis: 'Test show 1 synopsis',
      category_id: category.id,
      is_active: true,
      approval_status: 'PUBLISHED',
    }
  });

  const show2 = await prisma.show.create({
    data: {
      title: `Show Episode Purchased (${Date.now()})`,
      synopsis: 'Test show 2 synopsis',
      category_id: category.id,
      is_active: true,
      approval_status: 'PUBLISHED',
    }
  });

  const ep2 = await prisma.episode.create({
    data: {
      show_id: show2.id,
      episode_num: 1,
      title: 'Episode 1 of Show 2',
      approval_status: 'PUBLISHED',
    }
  });

  // Grant Show 1 direct access
  await prisma.showAccess.create({
    data: {
      user_id: student.id,
      show_id: show1.id,
      coins_spent: 100,
      access_type: 'PURCHASED',
    }
  });

  // Grant Episode access for Show 2
  await prisma.episodeAccess.create({
    data: {
      user_id: student.id,
      episode_id: ep2.id,
      coins_spent: 10,
    }
  });

  try {
    // 1. Direct Service Call Test
    console.log('1️⃣ Testing service getMyCoursesForUser...');
    const courses = await getMyCoursesForUser(student.id);
    console.log(`   Fetched ${courses.length} courses (expected 2)`);
    if (courses.length !== 2) {
      throw new Error(`Expected 2 courses, got ${courses.length}`);
    }
    const show1Item = courses.find(c => c.show_id === show1.id);
    const show2Item = courses.find(c => c.show_id === show2.id);

    if (!show1Item || show1Item.access_type !== 'FULL_COURSE') {
      throw new Error('Show 1 direct access verification failed');
    }
    if (!show2Item || show2Item.access_type !== 'EPISODE' || show2Item.unlocked_episodes !== 1) {
      throw new Error('Show 2 episode access verification failed');
    }
    console.log('   ✅ Service getMyCoursesForUser passed!');

    // 2. HTTP Endpoint Test
    console.log('\n2️⃣ Testing HTTP GET /api/v1/user/my-courses...');
    const httpRes = await request('GET', '/api/v1/user/my-courses', null, studentToken);
    console.log(`   Status Code: ${httpRes.status}`);
    console.log(`   Response Message: ${httpRes.body?.message}`);
    console.log(`   Item Count: ${httpRes.body?.data?.items?.length}`);

    if (httpRes.status !== 200 || !httpRes.body?.data?.items) {
      throw new Error(`HTTP Endpoint failed with status ${httpRes.status}`);
    }
    if (httpRes.body.data.items.length !== 2) {
      throw new Error(`Expected 2 items from API, got ${httpRes.body.data.items.length}`);
    }
    console.log('   ✅ HTTP Endpoint passed!');

    console.log('\n🎉 ALL MY-COURSES TESTS PASSED SUCCESSFULLY!');

  } finally {
    // Cleanup
    await prisma.showAccess.deleteMany({ where: { user_id: student.id } });
    await prisma.episodeAccess.deleteMany({ where: { user_id: student.id } });
    await prisma.episode.delete({ where: { id: ep2.id } });
    await prisma.show.deleteMany({ where: { id: { in: [show1.id, show2.id] } } });
    await prisma.user.delete({ where: { id: student.id } });
    await prisma.$disconnect();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
