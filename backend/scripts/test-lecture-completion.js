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
  console.log('🧪 Testing Lecture Completion Tracking Logic...\n');

  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({ data: { name: 'Completion Test Category' } });
  }

  // Create student user
  const student = await prisma.user.create({
    data: {
      email: `completion_test_${Date.now()}@example.com`,
      name: 'Completion Student',
      password: await bcrypt.hash('StudentPass123!', 10),
      role: 'USER',
    }
  });
  const studentToken = generateAccessToken(student);

  // Create Show
  const show = await prisma.show.create({
    data: {
      title: `Completion Test Course (${Date.now()})`,
      category_id: category.id,
      is_active: true,
      approval_status: 'PUBLISHED',
      is_free: true,
    }
  });

  // Episode 1: HLS video (100 sec duration) -> user watches 95 sec (95% -> COMPLETED)
  const ep1 = await prisma.episode.create({
    data: {
      show_id: show.id,
      episode_num: 1,
      title: 'Lecture 1 - Completed HLS',
      duration_sec: 100,
      is_free: true,
      approval_status: 'PUBLISHED',
      video_source: 'UPLOAD',
    }
  });

  // Episode 2: HLS video (100 sec duration) -> user watches 40 sec (40% -> IN-PROGRESS, NOT COMPLETED)
  const ep2 = await prisma.episode.create({
    data: {
      show_id: show.id,
      episode_num: 2,
      title: 'Lecture 2 - In Progress HLS',
      duration_sec: 100,
      is_free: true,
      approval_status: 'PUBLISHED',
      video_source: 'UPLOAD',
    }
  });

  // Episode 3: YouTube video -> user has watch history entry (COMPLETED)
  const ep3 = await prisma.episode.create({
    data: {
      show_id: show.id,
      episode_num: 3,
      title: 'Lecture 3 - YouTube Video',
      duration_sec: 0,
      is_free: true,
      approval_status: 'PUBLISHED',
      video_source: 'YOUTUBE',
      youtube_video_id: 'dQw4w9WgXcQ',
    }
  });

  // Episode 4: HLS video -> unstarted (0% -> UNSTARTED)
  const ep4 = await prisma.episode.create({
    data: {
      show_id: show.id,
      episode_num: 4,
      title: 'Lecture 4 - Unstarted HLS',
      duration_sec: 100,
      is_free: true,
      approval_status: 'PUBLISHED',
      video_source: 'UPLOAD',
    }
  });

  // Episode 5: Locked YouTube video (is_free = false) -> MUST stay NOT COMPLETED even if watch history exists
  const ep5 = await prisma.episode.create({
    data: {
      show_id: show.id,
      episode_num: 5,
      title: 'Lecture 5 - Locked YouTube Video',
      duration_sec: 0,
      is_free: false,
      approval_status: 'PUBLISHED',
      video_source: 'YOUTUBE',
      youtube_video_id: 'dQw4w9WgXcQ',
    }
  });

  // Insert Watch History
  await prisma.watchHistory.createMany({
    data: [
      { user_id: student.id, episode_id: ep1.id, progress_sec: 95 },
      { user_id: student.id, episode_id: ep2.id, progress_sec: 40 },
      { user_id: student.id, episode_id: ep3.id, progress_sec: 0 },
      { user_id: student.id, episode_id: ep5.id, progress_sec: 0 },
    ]
  });

  try {
    console.log('1️⃣ Requesting GET /api/feed/show/' + show.id);
    const res = await request('GET', `/api/feed/show/${show.id}`, null, studentToken);

    console.log(`   Status Code: ${res.status}`);
    console.log(`   Total Episodes: ${res.body?.total_episodes}`);
    console.log(`   Completed Count: ${res.body?.completed_count}`);

    if (res.status !== 200 || !res.body?.episodes) {
      throw new Error(`Failed to fetch show detail (status: ${res.status})`);
    }

    const episodes = res.body.episodes;
    const ep1Res = episodes.find(e => e.episode_id === ep1.id);
    const ep2Res = episodes.find(e => e.episode_id === ep2.id);
    const ep3Res = episodes.find(e => e.episode_id === ep3.id);
    const ep4Res = episodes.find(e => e.episode_id === ep4.id);
    const ep5Res = episodes.find(e => e.episode_id === ep5.id);

    console.log(`   Ep 1 (95% HLS): progress_sec=${ep1Res.progress_sec}, is_completed=${ep1Res.is_completed}`);
    console.log(`   Ep 2 (40% HLS): progress_sec=${ep2Res.progress_sec}, is_completed=${ep2Res.is_completed}`);
    console.log(`   Ep 3 (Unlocked YouTube): progress_sec=${ep3Res.progress_sec}, is_completed=${ep3Res.is_completed}`);
    console.log(`   Ep 4 (Unstarted HLS): progress_sec=${ep4Res.progress_sec}, is_completed=${ep4Res.is_completed}`);
    console.log(`   Ep 5 (Locked YouTube): progress_sec=${ep5Res.progress_sec}, is_completed=${ep5Res.is_completed}`);

    if (ep1Res.is_completed !== true) throw new Error('Ep 1 should be completed (95% >= 90%)');
    if (ep2Res.is_completed !== false) throw new Error('Ep 2 should NOT be completed (40% < 90%)');
    if (ep3Res.is_completed !== true) throw new Error('Ep 3 (YouTube) should be completed when in watch history');
    if (ep4Res.is_completed !== false) throw new Error('Ep 4 (Unstarted) should NOT be completed');
    if (ep5Res.is_completed !== false) throw new Error('Ep 5 (Locked YouTube) should NEVER be completed');

    if (res.body.completed_count !== 2) throw new Error(`Expected completed_count = 2, got ${res.body.completed_count}`);

    console.log('\n2️⃣ Testing Re-watching completed Ep 1 for 15s midway...');
    await request('POST', '/api/user/watch-history', { episode_id: ep1.id, progress_sec: 15 }, studentToken);

    const res2 = await request('GET', `/api/feed/show/${show.id}`, null, studentToken);
    const ep1Res2 = res2.body.episodes.find(e => e.episode_id === ep1.id);

    console.log(`   After re-watching Ep 1 for 15s: progress_sec=${ep1Res2.progress_sec}, is_completed=${ep1Res2.is_completed}`);
    if (ep1Res2.progress_sec !== 95 || ep1Res2.is_completed !== true) {
      throw new Error(`Ep 1 completion lost! expected progress_sec=95 and is_completed=true, got progress_sec=${ep1Res2.progress_sec}, is_completed=${ep1Res2.is_completed}`);
    }

    console.log('\n🎉 ALL LECTURE COMPLETION BACKEND TESTS PASSED!');

  } finally {
    // Cleanup
    await prisma.watchHistory.deleteMany({ where: { user_id: student.id } });
    await prisma.episode.deleteMany({ where: { id: { in: [ep1.id, ep2.id, ep3.id, ep4.id, ep5.id] } } });
    await prisma.show.delete({ where: { id: show.id } });
    await prisma.user.delete({ where: { id: student.id } });
    await prisma.$disconnect();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
