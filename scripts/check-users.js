const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { email: true, role: true, isActive: true, passwordHash: true },
  });
  console.log("Total users:", users.length);
  for (const u of users) {
    console.log(
      u.email,
      "| role:", u.role,
      "| active:", u.isActive,
      "| hash:", u.passwordHash ? u.passwordHash.substring(0, 15) + "..." : "NULL"
    );
  }

  // Test password comparison
  if (users.length > 0) {
    const bcrypt = require("bcryptjs");
    const admin = users.find((u) => u.email === "admin@finpulse.io");
    if (admin) {
      const match = await bcrypt.compare("admin123", admin.passwordHash);
      console.log("\nadmin@finpulse.io password check (admin123):", match);
    }
    const cfo = users.find((u) => u.email === "cfo@acme.io");
    if (cfo) {
      const match = await bcrypt.compare("demo123", cfo.passwordHash);
      console.log("cfo@acme.io password check (demo123):", match);
    }
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  p.$disconnect();
});
