import "dotenv/config";
import { Pool } from "pg";
import crypto from "node:crypto";

// PASSWORD hashing function (same as in the app)
function hashPassword(password) {
  const salt = crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256");
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // Check if super admin already exists
    const result = await pool.query(
      'SELECT id FROM "SuperAdmin" WHERE email = $1',
      [process.env.SUPER_ADMIN_EMAIL || "admin@pos-shop.local"]
    );

    if (result.rows.length > 0) {
      console.log("✅ Super admin already exists. Skipping creation.");
      await pool.end();
      return;
    }

    // Create super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "sameerraja1186@gmail.com";
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "@Admin@1186";
    const superAdminName = process.env.SUPER_ADMIN_NAME || "Platform Admin";

    const passwordHash = hashPassword(superAdminPassword);
    const id = crypto.randomBytes(12).toString("base64url");

    const now = new Date();
    await pool.query(
      `INSERT INTO "SuperAdmin" (id, email, "passwordHash", "fullName", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, superAdminEmail, passwordHash, superAdminName, true, now, now]
    );

    console.log("✅ Super admin created successfully!");
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Name: ${superAdminName}`);
    console.log("\n⚠️  Please change the default password after first login!");
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
    console.log("\n✨ Seed completed!");
  }
}

main();
