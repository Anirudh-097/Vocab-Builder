"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) router.push("/dashboard");
    else setError("Those credentials were not accepted.");
  }
  return (
    <main className="shell">
      <section className="card login">
        <div className="eyebrow">Vocab Builder</div>
        <h1>Learn a little. Remember a lot.</h1>
        <p className="muted">
          Sign in to continue your daily vocabulary practice.
        </p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={submit}>
          <label className="field">
            Username
            <input name="username" required autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input
              name="password"
              required
              type="password"
              autoComplete="current-password"
            />
          </label>
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
