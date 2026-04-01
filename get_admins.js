import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const superAdmins = await prisma.superAdmin.findMany();
  console.log(JSON.stringify(superAdmins, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
