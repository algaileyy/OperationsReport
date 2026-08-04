"use client";

export default function ExportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-md px-4 py-2 text-sm font-semibold"
      style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}
    >
      Export PDF
    </button>
  );
}
