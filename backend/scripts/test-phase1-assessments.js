import { PrismaClient } from '@prisma/client';
import * as courseworkService from '../modules/coursework/coursework.service.js';

const prisma = new PrismaClient();

async function runPhase1Tests() {
  console.log('=== STARTING PHASE 1 AUTOMATED VERIFICATION ===\n');

  try {
    // 1. Fetch a test user and test show
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    const show = await prisma.show.findFirst();

    if (!user || !show) {
      throw new Error('Database must have at least one user and one show for testing');
    }

    console.log(`Using Test User: ${user.name} (${user.id})`);
    console.log(`Using Test Show: ${show.title} (${show.id})\n`);

    // ──────────────────────────────────────────
    // TEST 1: Quiz Pass % & Retake Lock Logic
    // ──────────────────────────────────────────
    console.log('--- TEST 1: Quiz Pass Score & Retake Lock ---');
    const quiz = await courseworkService.createQuiz(show.id, {
      title: 'Phase 1 Test Quiz',
      order_index: 0,
      pass_score_percent: 80,
      is_active: true,
    });
    console.log(`✓ Created Quiz with pass_score_percent = 80 (Quiz ID: ${quiz.id})`);

    // Create 2 questions for this quiz
    const q1 = await courseworkService.createQuizQuestion(quiz.id, {
      question_text: 'Question 1',
      order_index: 1,
      options: [
        { option_text: 'Option A (Correct)', is_correct: true, order_index: 1 },
        { option_text: 'Option B', is_correct: false, order_index: 2 },
      ],
    });

    const q2 = await courseworkService.createQuizQuestion(quiz.id, {
      question_text: 'Question 2',
      order_index: 2,
      options: [
        { option_text: 'Option A (Correct)', is_correct: true, order_index: 1 },
        { option_text: 'Option B', is_correct: false, order_index: 2 },
      ],
    });

    const correctOpt1 = q1.options.find((o) => o.is_correct).id;
    const correctOpt2 = q2.options.find((o) => o.is_correct).id;
    const incorrectOpt2 = q2.options.find((o) => !o.is_correct).id;

    // Attempt 1: Score 50% (1/2 correct). Pass threshold is 80%.
    const attempt1 = await courseworkService.submitQuizAttempt(quiz.id, user.id, [
      { question_id: q1.id, option_id: correctOpt1 },
      { question_id: q2.id, option_id: incorrectOpt2 },
    ]);
    console.log(`✓ Attempt 1 Completed: Score ${attempt1.score}/${attempt1.total_questions} (50% < 80% threshold -> Failed)`);

    // Attempt 2: Retake allowed because 50% < 80%. Score 100% (2/2 correct).
    const attempt2 = await courseworkService.submitQuizAttempt(quiz.id, user.id, [
      { question_id: q1.id, option_id: correctOpt1 },
      { question_id: q2.id, option_id: correctOpt2 },
    ]);
    console.log(`✓ Attempt 2 Completed: Score ${attempt2.score}/${attempt2.total_questions} (100% >= 80% threshold -> Passed)`);

    // Attempt 3: Should be BLOCKED because Quiz is already PASSED
    try {
      await courseworkService.submitQuizAttempt(quiz.id, user.id, [
        { question_id: q1.id, option_id: correctOpt1 },
        { question_id: q2.id, option_id: correctOpt2 },
      ]);
      throw new Error('FAIL: Quiz attempt 3 should have been blocked after passing!');
    } catch (err) {
      if (err.message.includes('Quiz has already been passed')) {
        console.log('✓ SUCCESS: Retake 3 blocked cleanly with "Quiz has already been passed"\n');
      } else {
        throw err;
      }
    }

    // ──────────────────────────────────────────
    // TEST 2: Assignment Letter Grade & Revision Logic
    // ──────────────────────────────────────────
    console.log('--- TEST 2: Assignment Letter Grade & Revision Workflow ---');
    const assignment = await courseworkService.createAssignment(show.id, {
      title: 'Phase 1 Test Assignment',
      problem_statement: 'Solve problem 1',
      order_index: 0,
      min_passing_grade: 'GRADE_C',
      is_active: true,
    });
    console.log(`✓ Created Assignment with min_passing_grade = GRADE_C (Assignment ID: ${assignment.id})`);

    // Submit initial assignment
    const submission1 = await courseworkService.submitAssignment(assignment.id, user.id, {
      answer_text: 'Initial Submission Text',
    }, null);
    console.log(`✓ Initial Submission created (Status: ${submission1.status})`);

    // Grade submission with Score 55 (Grade F < Grade C threshold)
    const graded1 = await courseworkService.gradeSubmission(submission1.id, 55, 'Needs revision on question 1');
    console.log(`✓ Graded with Score 55: Letter Grade = ${graded1.letter_grade}, Status = ${graded1.status}`);
    if (graded1.status !== 'NEEDS_REVISION' || graded1.letter_grade !== 'GRADE_F') {
      throw new Error(`FAIL: Expected status NEEDS_REVISION and GRADE_F, got ${graded1.status} and ${graded1.letter_grade}`);
    }

    // Resubmit assignment (Allowed because status is NEEDS_REVISION)
    const resubmission = await courseworkService.submitAssignment(assignment.id, user.id, {
      answer_text: 'Revised Submission Text with Fixes',
    }, null);
    console.log(`✓ Resubmission accepted (Status updated to: ${resubmission.status})`);

    // Grade resubmission with Score 85 (Grade B >= Grade C threshold)
    const graded2 = await courseworkService.gradeSubmission(submission1.id, 85, 'Great job on revision!');
    console.log(`✓ Graded with Score 85: Letter Grade = ${graded2.letter_grade}, Status = ${graded2.status}`);
    if (graded2.status !== 'GRADED_PASSED' || graded2.letter_grade !== 'GRADE_B') {
      throw new Error(`FAIL: Expected status GRADED_PASSED and GRADE_B, got ${graded2.status} and ${graded2.letter_grade}`);
    }

    // Try resubmitting again (Should be BLOCKED because status is GRADED_PASSED)
    try {
      await courseworkService.submitAssignment(assignment.id, user.id, {
        answer_text: 'Attempting 3rd submission after passing',
      }, null);
      throw new Error('FAIL: Resubmission should have been blocked after assignment was approved!');
    } catch (err) {
      if (err.message.includes('Cannot resubmit an approved assignment')) {
        console.log('✓ SUCCESS: Resubmission blocked cleanly with "Cannot resubmit an approved assignment"\n');
      } else {
        throw err;
      }
    }

    // Clean up test data
    await prisma.quiz.delete({ where: { id: quiz.id } });
    await prisma.assignment.delete({ where: { id: assignment.id } });
    console.log('✓ Cleaned up Phase 1 test records');

    console.log('\n==================================================');
    console.log('🎉 PHASE 1 VERIFICATION PASSED 100% SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ PHASE 1 VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1Tests();
