import bcrypt from "bcryptjs";

export * from "./session";

export async function verifyCredentials(username: string, password: string) {
  if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD_HASH) return false;
  if (username !== process.env.AUTH_USERNAME) return false;
  return await bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH);
}
