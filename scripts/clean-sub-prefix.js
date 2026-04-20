const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "Conversation" 
    SET title = REPLACE(title, 'Sub: ', '') 
    WHERE title LIKE 'Sub: %'
  `;
  console.log(`✅ Updated ${result} Sub-Chat title(s) — "Sub: " prefix removed.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
