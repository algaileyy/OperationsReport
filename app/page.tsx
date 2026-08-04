import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-primary)" }}>
        Operations Report
      </h1>
      <p style={{ color: "var(--ink-secondary)" }}>
        View the published monthly report, or sign in to enter this month&apos;s numbers.
      </p>
      <div className="flex gap-3">
        <Link
          href="/report"
          className="rounded-md bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          View Report
        </Link>
        <Link
          href="/input"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--ink-primary)" }}
        >
          Enter Data
        </Link>
      </div>
    </main>
  );
}
