import Link from "next/link";
import { verticals } from "@/lib/verticals";

export const metadata = {
  title: "Decision Integrity by Industry",
  description: "Industry-specific discovery doors into the canonical Decision Integrity x402 evaluation service.",
};

export default function IndustriesPage() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "64px 24px", fontFamily: "Georgia, serif", lineHeight: 1.55 }}>
      <p style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, letterSpacing: ".12em" }}>
        DECISION INTEGRITY / INDUSTRY DOORS
      </p>
      <h1 style={{ fontSize: 44, lineHeight: 1.08 }}>One engine. Many domain-specific doors.</h1>
      <p style={{ fontSize: 20 }}>
        Each industry page uses native vocabulary, evidence types, authority roles, and examples while routing to the same canonical Decision Integrity evaluator.
      </p>
      <p>
        These pages do not create new authority or alter evaluation semantics. They are discovery and translation layers for the same paid x402 service.
      </p>
      <div style={{ display: "grid", gap: 18, marginTop: 36 }}>
        {verticals.map((vertical) => (
          <article key={vertical.slug} style={{ border: "1px solid #bbb", borderRadius: 10, padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/industries/${vertical.slug}`}>Decision Integrity for {vertical.name}</Link>
            </h2>
            <p>{vertical.core_decision}</p>
            <p style={{ marginBottom: 0 }}><strong>Example:</strong> {vertical.example_request}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
