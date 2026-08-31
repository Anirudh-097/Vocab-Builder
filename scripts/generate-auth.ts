import bcrypt from "bcryptjs";
import crypto from "node:crypto";

async function main() {
  const password = process.argv[2] || "password123";
  const hash = await bcrypt.hash(password, 10);
  const sessionSecret = crypto.randomBytes(32).toString("hex");

  console.log("\n=== Generated Authentication Credentials ===");
  console.log(`Password: ${password}`);
  console.log(`AUTH_PASSWORD_HASH="${hash}"`);
  console.log(`SESSION_SECRET="${sessionSecret}"`);
  console.log("============================================\n");
}

main().catch(console.error);
