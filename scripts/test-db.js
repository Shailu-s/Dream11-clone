
const { PrismaClient } = require('@prisma/client');

async function test() {
  console.log("Connecting using environment DATABASE_URL...");
  
  const prisma = new PrismaClient();

  try {
    const userCount = await prisma.user.count();
    console.log("Success! User count:", userCount);
  } catch (e) {
    console.error("Connection failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
