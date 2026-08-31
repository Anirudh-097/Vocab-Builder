import Link from "next/link";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value)))
    redirect("/login");
  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/dashboard" className="brand">
          Vocab Builder
        </Link>
        <div className="navlinks">
          <Link href="/daily-words">Today’s words</Link>
          <Link href="/daily-test">Test</Link>
          <form action="/api/auth/logout" method="post">
            <button className="plain">Sign out</button>
          </form>
        </div>
      </nav>
      {children}
    </main>
  );
}
