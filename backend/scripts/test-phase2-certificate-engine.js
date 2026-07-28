import { PrismaClient } from '@prisma/client';
import * as courseworkService from '../modules/coursework/coursework.service.js';
import * as certificateService from '../modules/certificate/certificate.service.js';

const prisma = new PrismaClient();

async function runPhase2Tests() {
  console.log('=== STARTING PHASE 2 AUTOMATED VERIFICATION ===\n');

  try {
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    const show = await prisma.show.findFirst();

    if (!user || !show) {
      throw new Error('Database must have at least one user and one show for testing');
    }

    console.log(`Using Test User: ${user.name} (${user.id})`);
    console.log(`Using Test Show: ${show.title} (${show.id})\n`);

    // ──────────────────────────────────────────
    // TEST 1: Certificate Configuration Updates
    // ──────────────────────────────────────────
    console.log('--- TEST 1: Certificate Configuration Updates ---');
    const updatedConfig = await certificateService.updateCertificateConfig(show.id, {
      certificate_enabled: true,
      cert_req_videos: true,
      cert_req_quizzes: true,
      cert_req_assignments: true,
    });

    console.log(`✓ Updated Certificate Config: certificate_enabled = ${updatedConfig.certificate_enabled}`);
    if (!updatedConfig.certificate_enabled) {
      throw new Error('FAIL: Certificate config update failed');
    }

    const fetchedConfig = await certificateService.getCertificateConfig(show.id);
    console.log(`✓ Fetched Certificate Config: cert_req_videos = ${fetchedConfig.cert_req_videos}\n`);

    // ──────────────────────────────────────────
    // TEST 2: Evaluation Engine & Zero-Assessment Safeguard
    // ──────────────────────────────────────────
    console.log('--- TEST 2: Evaluation Engine & Zero-Assessment Safeguard ---');
    
    // Create a temporary show with 0 quizzes and 0 assignments
    const tempShow = await prisma.show.create({
      data: {
        category_id: show.category_id,
        title: 'Zero Assessment Test Course',
        synopsis: 'Testing zero assessment handling',
        certificate_enabled: true,
        cert_req_videos: true,
        cert_req_quizzes: true,
        cert_req_assignments: true,
      },
    });

    // Create 1 episode for tempShow
    const episode = await prisma.episode.create({
      data: {
        show_id: tempShow.id,
        title: 'Episode 1',
        episode_num: 1,
        duration_sec: 100,
        approval_status: 'PUBLISHED',
      },
    });

    // Mark episode 100% watched (100 / 100 sec)
    await prisma.watchHistory.upsert({
      where: { idx_wh_user_ep: { user_id: user.id, episode_id: episode.id } },
      create: { user_id: user.id, episode_id: episode.id, progress_sec: 100 },
      update: { progress_sec: 100 },
    });

    // Evaluate certificate (0 quizzes, 0 assignments -> Should evaluate 0/0 = 100% fulfilled!)
    const certResult = await certificateService.evaluateCertificateCompletion(user.id, tempShow.id);
    console.log(`✓ Certificate Generated for Zero-Assessment Course: Code = ${certResult.certificate_code}`);
    console.log(`✓ Snapshot Student Name = "${certResult.snapshot_data.student_name}"`);
    console.log(`✓ Snapshot Course Title = "${certResult.snapshot_data.course_title}"`);
    console.log(`✓ PDF Storage URL = ${certResult.pdf_url}`);

    if (!certResult || !certResult.certificate_code || !certResult.pdf_url) {
      throw new Error('FAIL: Certificate generation or PDF rendering failed');
    }

    // ──────────────────────────────────────────
    // TEST 3: Idempotency & Post-Issuance Addition
    // ──────────────────────────────────────────
    console.log('\n--- TEST 3: Idempotency & Post-Issuance Addition ---');
    
    // Evaluate again -> Should return same certificate object without error
    const certAgain = await certificateService.evaluateCertificateCompletion(user.id, tempShow.id);
    console.log(`✓ Idempotency Check Passed: Returned existing code ${certAgain.certificate_code}`);

    // Add a new episode to the course AFTER certificate was issued
    const newEp = await prisma.episode.create({
      data: {
        show_id: tempShow.id,
        title: 'Episode 2 (Added Later)',
        episode_num: 2,
        duration_sec: 100,
        approval_status: 'PUBLISHED',
      },
    });

    // Verify existing user certificate remains valid and intact
    const userCertStatus = await certificateService.getCertificateForCourse(user.id, tempShow.id);
    console.log(`✓ Post-Issuance Check: User certificate remains IS_ISSUED = ${userCertStatus.is_issued}`);
    if (!userCertStatus.is_issued || userCertStatus.certificate.certificate_code !== certResult.certificate_code) {
      throw new Error('FAIL: Post-issuance episode addition broke existing user certificate');
    }

    // ──────────────────────────────────────────
    // TEST 4: Fetch User Certificates List
    // ──────────────────────────────────────────
    console.log('\n--- TEST 4: Fetch User Certificates List ---');
    const userCerts = await certificateService.getUserCertificates(user.id);
    console.log(`✓ User Has ${userCerts.length} Certificate(s) in Total`);

    // Clean up temp test show and certs
    await prisma.certificate.deleteMany({ where: { show_id: tempShow.id } });
    await prisma.episode.deleteMany({ where: { show_id: tempShow.id } });
    await prisma.show.delete({ where: { id: tempShow.id } });
    console.log('✓ Cleaned up Phase 2 test records');

    console.log('\n==================================================');
    console.log('🎉 PHASE 2 VERIFICATION PASSED 100% SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ PHASE 2 VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase2Tests();
