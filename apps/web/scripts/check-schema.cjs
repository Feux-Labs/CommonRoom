const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL }
  }
});

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log('ALL PUBLIC TABLES:', tables.map(t => t.table_name));

  const anonProcs = await prisma.$queryRawUnsafe(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%anon%'"
  );
  console.log('ANON ROUTINES:', anonProcs.map(r => r.routine_name));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
