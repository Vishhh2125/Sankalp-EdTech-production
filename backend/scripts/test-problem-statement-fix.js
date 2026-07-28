import { PrismaClient } from '@prisma/client';
import * as courseworkService from '../modules/coursework/coursework.service.js';

const prisma = new PrismaClient();

async function verifyProblemStatementFix() {
  console.log('=== VERIFYING PROBLEM STATEMENT NULL/EMPTY ALLOWANCE ===\n');

  try {
    const show = await prisma.show.findFirst();
    if (!show) throw new Error('Test show required');

    // 1. Create Assignment with empty problem statement
    console.log('1. Creating Assignment with empty problem_statement & min_passing_grade = GRADE_B...');
    const asg = await courseworkService.createAssignment(show.id, {
      title: 'Blank Problem Assignment',
      problem_statement: '',
      order_index: 1,
      min_passing_grade: 'GRADE_B',
    });
    console.log(`✓ Created Assignment: ID=${asg.id}, min_passing_grade=${asg.min_passing_grade}`);

    // 2. Update Assignment with problem_statement = null & min_passing_grade = GRADE_A
    console.log('2. Updating Assignment with problem_statement = null & min_passing_grade = GRADE_A...');
    const updatedAsg = await courseworkService.updateAssignment(asg.id, {
      title: 'Blank Problem Assignment Updated',
      problem_statement: null,
      min_passing_grade: 'GRADE_A',
    });
    console.log(`✓ Updated Assignment: ID=${updatedAsg.id}, min_passing_grade=${updatedAsg.min_passing_grade}`);

    // 3. Clean up
    await prisma.assignment.delete({ where: { id: asg.id } });
    console.log('✓ Cleaned up test assignment');

    console.log('\n==================================================');
    console.log('🎉 PROBLEM STATEMENT FIX VERIFIED 100% SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProblemStatementFix();
