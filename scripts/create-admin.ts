// Generates the ADMIN_PASSWORD_HASH value for your .env file.
// Usage: pnpm run create-admin -- "your-password-here"

import { hashPassword } from "../server/_core/auth";

const password = process.argv[2];

if (!password) {
  console.error('Usage: pnpm run create-admin -- "your-password-here"');
  process.exit(1);
}

console.log("\nAdd these to your .env:\n");
console.log(`ADMIN_EMAIL=you@example.com`);
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);
