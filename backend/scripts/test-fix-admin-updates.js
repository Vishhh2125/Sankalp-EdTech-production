import { PrismaClient } from '@prisma/client';
import * as courseworkService from '../modules/coursework/coursework.service.js';

const prisma = new PrismaClient();

async function runFixVerification() {
  console.log('=== VERIFYING ADMIN UPDATE FIXES (MIN GRADE & PASS SCORE %) ===\n');

  try {
    const show = await prisma.show.findFirst();
    if (!show) throw new Error('Test show required');

    // 1. Create Quiz with pass_score_percent = 90
    console.log('1. Creating Quiz with pass_score_percent = 90...');
    const qz = await courseworkService.createQuiz(show.id, {
      title: 'Fix Test Quiz',
      order_index: 1,
      pass_score_percent: 90,
    });
    console.log(`✓ Created Quiz: pass_score_percent = ${qz.pass_score_percent}`);

    // 2. Fetch Quizzes (simulating GET /api/content/shows/:showId/quizzes)
    console.log('2. Fetching Quizzes list via getQuizzes...');
    const quizzesList = await courseworkService.getQuizzes(show.id, null, false);
    const fetchedQz = quizzesList.find(q => q.id === qz.id);
    console.log(`✓ getQuizzes returned pass_score_percent = ${fetchedQz.pass_score_percent}`);
    if (fetchedQz.pass_score_percent !== 90) throw new Error('FAIL: getQuizzes did not include pass_score_percent 90');

    // 3. Update Quiz pass_score_percent to 85
    console.log('3. Updating Quiz pass_score_percent to 85...');
    const updatedQz = await courseworkService.updateQuiz(qz.id, {
      pass_score_percent: 85,
    });
    console.log(`✓ Updated Quiz: pass_score_percent = ${updatedQz.pass_score_percent}`);

    const quizzesList2 = await courseworkService.getQuizzes(show.id, null, false);
    const fetchedQz2 = quizzesList2.find(q => q.id === qz.id);
    console.log(`✓ getQuizzes after update returned pass_score_percent = ${fetchedQz2.pass_score_percent}`);
    if (fetchedQz2.pass_score_percent !== 85) throw new Error('FAIL: getQuizzes did not reflect updated pass_score_percent 85');

    // 4. Create Assignment with min_passing_grade = GRADE_A
    console.log('\n4. Creating Assignment with min_passing_grade = GRADE_A...');
    const asg = await courseworkService.createAssignment(show.id, {
      title: 'Fix Test Assignment',
      problem_statement: 'Solve problem',
      order_index: 1,
      min_passing_grade: 'GRADE_A',
    });
    console.log(`✓ Created Assignment: min_passing_grade = ${asg.min_passing_grade}`);

    // 5. Fetch Assignments (simulating GET /api/content/shows/:showId/assignments)
    console.log('5. Fetching Assignments list via getAssignments...');
    const asgList = await courseworkService.getAssignments(show.id, null, false);
    const fetchedAsg = asgList.find(a => a.id === asg.id);
    console.log(`✓ getAssignments returned min_passing_grade = ${fetchedAsg.min_passing_grade}`);
    if (fetchedAsg.min_passing_grade !== 'GRADE_A') throw new Error('FAIL: getAssignments did not include min_passing_grade GRADE_A');

    // 6. Update Assignment min_passing_grade to GRADE_B
    console.log('6. Updating Assignment min_passing_grade to GRADE_B...');
    const updatedAsg = await courseworkService.updateAssignment(asg.id, {
      min_passing_grade: 'GRADE_B',
    });
    console.log(`✓ Updated Assignment: min_passing_grade = ${updatedAsg.min_passing_grade}`);

    const asgList2 = await courseworkService.getAssignments(show.id, null, false);
    const fetchedAsg2 = asgList2.find(a => a.id === asg.id);
    console.log(`✓ getAssignments after update returned min_passing_grade = ${fetchedAsg2.min_passing_grade}`);
    if (fetchedAsg2.min_passing_grade !== 'GRADE_B') throw new Error('FAIL: getAssignments did not reflect updated min_passing_grade GRADE_B');

    // Clean up test items
    await prisma.quiz.delete({ where: { id: qz.id } });
    await prisma.assignment.delete({ where: { id: asg.id } });
    console.log('\n✓ Cleaned up test items');

    console.log('\n==================================================');
    console.log('🎉 ALL ADMIN UPDATE FIXES VERIFIED 100% SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ FIX VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFixVerification();
