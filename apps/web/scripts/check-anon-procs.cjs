const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL }
  }
});

async function main() {
  const procs = await prisma.$queryRawUnsafe(
    "SELECT p.proname, pg_get_functiondef(p.oid) as def FROM pg_proc p WHERE p.proname LIKE '%anonymous_post%'"
  );
  for (const p of procs) {
    console.log('=== ROUTINE:', p.proname, '===');
    console.log(p.def);
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
