import { PrismaClient } from '@prisma/client';
import * as courseworkService from '../modules/coursework/coursework.service.js';

const prisma = new PrismaClient();

async function verifyLetterGradeSubmission() {
  console.log('=== VERIFYING LETTER GRADE SUBMISSION API ===\n');

  try {
    const show = await prisma.show.findFirst();
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    if (!show || !user) throw new Error('Test show and user required');

    // Create assignment
    const asg = await courseworkService.createAssignment(show.id, {
      title: 'Letter Grade Test Assignment',
      problem_statement: 'Solve this',
      order_index: 99,
      min_passing_grade: 'GRADE_B',
    });

    // Create submission directly via Prisma
    const sub = await prisma.assignmentSubmission.create({
      data: {
        assignment_id: asg.id,
        user_id: user.id,
        answer_text: 'My submission answer',
        status: 'SUBMITTED',
      },
    });

    // Grade submission with Letter Grade B
    console.log('1. Grading submission with letter_grade = GRADE_B...');
    const gradedSub = await courseworkService.gradeSubmission(sub.id, undefined, 'Good work!', 'GRADE_B');
    console.log(`✓ Graded: Score=${gradedSub.score}, LetterGrade=${gradedSub.letter_grade}, Status=${gradedSub.status}`);
    if (gradedSub.letter_grade !== 'GRADE_B' || gradedSub.status !== 'GRADED_PASSED') {
      throw new Error('FAIL: Grade B evaluation failed');
    }

    // Grade submission with Letter Grade F
    console.log('\n2. Regrading submission with letter_grade = GRADE_F...');
    const gradedSubF = await courseworkService.gradeSubmission(sub.id, undefined, 'Needs work!', 'GRADE_F');
    console.log(`✓ Graded: Score=${gradedSubF.score}, LetterGrade=${gradedSubF.letter_grade}, Status=${gradedSubF.status}`);
    if (gradedSubF.letter_grade !== 'GRADE_F' || gradedSubF.status !== 'NEEDS_REVISION') {
      throw new Error('FAIL: Grade F evaluation failed');
    }

    // Clean up
    await prisma.assignmentSubmission.delete({ where: { id: sub.id } });
    await prisma.assignment.delete({ where: { id: asg.id } });
    console.log('\n✓ Cleaned up test items');

    console.log('\n==================================================');
    console.log('🎉 LETTER GRADE SUBMISSION VERIFIED 100% SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLetterGradeSubmission();
