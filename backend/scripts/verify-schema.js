import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND column_name IN ('mobile_no', 'dob', 'gender', 'country', 'state', 'city', 'onboarded_by', 'student_id')
    ORDER BY column_name;
  `;

  const showAccessCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'show_access' 
      AND column_name IN ('access_type', 'revoked_at')
    ORDER BY column_name;
  `;

  console.log('✅ USER NEW COLUMNS:', userCols);
  console.log('✅ SHOW_ACCESS NEW COLUMNS:', showAccessCols);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
