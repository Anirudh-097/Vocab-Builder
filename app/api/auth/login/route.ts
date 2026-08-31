import { NextResponse } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  verifyCredentials,
} from "../../../../lib/auth";
export async function POST(request: Request) {
  const { username, password } = await request.json();
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !(await verifyCredentials(username, password))
  )
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSession(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
