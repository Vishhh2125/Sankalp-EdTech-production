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
      path: '/api/v1' + path,
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
  console.log('🧪 Testing Lecture Approval Logic & Admin Edge Case...\n');

  let category, teacherUser, adminUser, teacherToken, adminToken, teacherShow, ep1, ep2;

  try {
    // 0. Ensure category
    category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Test Category', description: 'Testing' }
      });
    }

    // 1. Create Teacher & Admin users
    const timestamp = Date.now();
    teacherUser = await prisma.user.create({
      data: {
        email: `teacher_${timestamp}@test.com`,
        name: 'Test Teacher',
        password: await bcrypt.hash('Pass123!', 10),
        role: 'TEACHER'
      }
    });

    await prisma.teacherProfile.create({
      data: {
        user_id: teacherUser.id,
        full_name: 'Test Teacher',
        title: 'Prof',
        bio: 'Bio',
        is_completed: true
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@test.com`,
        name: 'Test Admin',
        password: await bcrypt.hash('Pass123!', 10),
        role: 'ADMIN'
      }
    });

    teacherToken = generateAccessToken(teacherUser);
    adminToken = generateAccessToken(adminUser);

    console.log('✅ Created test accounts (Teacher & Admin)');

    // 2. Teacher creates a Show (Course)
    const showRes = await request('POST', '/content/shows', {
      title: `Teacher Course ${timestamp}`,
      description: 'Test course created by teacher',
      category_id: category.id,
      is_free: true
    }, teacherToken);

    if (showRes.status !== 201) {
      throw new Error(`Failed to create teacher show: ${JSON.stringify(showRes.body)}`);
    }
    teacherShow = showRes.body;
    console.log('✅ Teacher created course:', teacherShow.id, '(Approval status:', teacherShow.approval_status, ')');

    // Admin approves the show
    const approveShowRes = await request('POST', `/admin/approvals/shows/${teacherShow.id}`, { action: 'approve' }, adminToken);
    console.log('✅ Admin approved course:', approveShowRes.body?.message || approveShowRes.status);

    // 3. Test Case 1: Teacher adds a YouTube Lecture (Normal Case)
    console.log('\n--- Test Case 1: Teacher adds YouTube lecture ---');
    const ep1Res = await request('POST', '/content/episodes', {
      show_id: teacherShow.id,
      title: 'Lecture 1 by Teacher',
      video_source: 'YOUTUBE',
      youtube_video_id: 'dQw4w9WgXcQ'
    }, teacherToken);

    ep1 = ep1Res.body;
    console.log('Lecture 1 approval_status:', ep1.approval_status);
    if (ep1.approval_status !== 'DRAFT') {
      throw new Error(`Expected DRAFT for teacher lecture, got ${ep1.approval_status}`);
    }
    console.log('✅ PASS: Teacher-created lecture defaults to DRAFT');

    // Teacher submits for review
    const submitEpRes = await request('PUT', `/content/episodes/${ep1.id}`, {
      approval_status: 'PENDING_REVIEW'
    }, teacherToken);

    console.log('Lecture 1 after submit status:', submitEpRes.body.approval_status);
    if (submitEpRes.body.approval_status !== 'PENDING_REVIEW') {
      throw new Error(`Expected PENDING_REVIEW after teacher submission, got ${submitEpRes.body.approval_status}`);
    }
    console.log('✅ PASS: Teacher submitted lecture for review');

    // Admin approves lecture
    const approveEpRes = await request('POST', `/admin/approvals/episodes/${ep1.id}`, { action: 'approve' }, adminToken);
    console.log('Lecture 1 after admin approval:', approveEpRes.body?.data?.approval_status);
    if (approveEpRes.body?.data?.approval_status !== 'PUBLISHED') {
      throw new Error(`Expected PUBLISHED after admin approval, got ${approveEpRes.body?.data?.approval_status}`);
    }
    console.log('✅ PASS: Admin approved teacher lecture -> PUBLISHED');

    // 4. Test Case 2: Admin adds YouTube Lecture to Teacher Course (EDGE CASE)
    console.log('\n--- Test Case 2 (EDGE CASE): Admin adds YouTube lecture to Teacher Course ---');
    const ep2Res = await request('POST', '/content/episodes', {
      show_id: teacherShow.id,
      title: 'Lecture 2 by Admin',
      video_source: 'YOUTUBE',
      youtube_video_id: 'dQw4w9WgXcQ'
    }, adminToken);

    ep2 = ep2Res.body;
    console.log('Lecture 2 approval_status:', ep2.approval_status);
    if (ep2.approval_status !== 'PUBLISHED') {
      throw new Error(`Expected PUBLISHED for admin-added lecture, got ${ep2.approval_status}`);
    }
    console.log('✅ PASS: Admin-added lecture to Teacher Course is auto-PUBLISHED!');

    // 5. Test Case 3: Admin direct toggle (Publish / Unpublish in Dramas.jsx API)
    console.log('\n--- Test Case 3: Admin direct status toggle ---');
    const unpublishRes = await request('PUT', `/content/episodes/${ep2.id}`, {
      approval_status: 'DRAFT'
    }, adminToken);
    console.log('Lecture 2 after Admin unpublish toggle:', unpublishRes.body.approval_status);
    if (unpublishRes.body.approval_status !== 'DRAFT') {
      throw new Error(`Expected DRAFT after Admin unpublish, got ${unpublishRes.body.approval_status}`);
    }
    console.log('✅ PASS: Admin can unpublish lecture to DRAFT');

    const republishRes = await request('PUT', `/content/episodes/${ep2.id}`, {
      approval_status: 'PUBLISHED'
    }, adminToken);
    console.log('Lecture 2 after Admin republish toggle:', republishRes.body.approval_status);
    if (republishRes.body.approval_status !== 'PUBLISHED') {
      throw new Error(`Expected PUBLISHED after Admin republish, got ${republishRes.body.approval_status}`);
    }
    console.log('✅ PASS: Admin can publish lecture back to PUBLISHED');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup test data
    console.log('\nCleaning up test data...');
    if (ep1?.id) await prisma.episode.deleteMany({ where: { id: { in: [ep1.id, ep2?.id].filter(Boolean) } } });
    if (teacherShow?.id) await prisma.show.delete({ where: { id: teacherShow.id } }).catch(() => {});
    if (teacherUser?.id) {
      await prisma.teacherProfile.deleteMany({ where: { user_id: teacherUser.id } });
      await prisma.user.delete({ where: { id: teacherUser.id } }).catch(() => {});
    }
    if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runTests();
