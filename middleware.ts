import { NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "./lib/auth";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/auth")) return NextResponse.next();
  if (!(await isValidSession(request.cookies.get(SESSION_COOKIE)?.value))) return request.nextUrl.pathname.startsWith("/api/") ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
