"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fieldStyle = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--ink-primary)",
} as const;

// Must match the MEMBER_USERNAMES allowlist set on the server (lib/auth.ts checkMemberCredentials)
// — this list only drives the dropdown, the server is what actually enforces who can sign in.
const MEMBER_NAMES = ["Omar", "Ayman", "Nadeen", "Omaima"];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [adminMode, setAdminMode] = useState(false);
  const [name, setName] = useState(MEMBER_NAMES[0]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminMode ? { mode: "admin", username, password } : { mode: "member", name, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/input");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
        {adminMode ? "Admin sign in" : "Team sign in"}
      </h1>
      <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
        {adminMode ? "Enter the admin username and password." : "Pick your name and enter the team password."}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {adminMode ? (
          <input
            type="text"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Admin username"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={fieldStyle}
          />
        ) : (
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={fieldStyle}
          >
            {MEMBER_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-md border px-3 py-2 text-sm outline-none"
          style={fieldStyle}
        />
        {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password || (adminMode && !username)}
          className="rounded-md bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setAdminMode((v) => !v);
          setError(null);
        }}
        className="self-start text-xs underline"
        style={{ color: "var(--ink-muted)" }}
      >
        {adminMode ? "Sign in as team member instead" : "Sign in as admin"}
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
