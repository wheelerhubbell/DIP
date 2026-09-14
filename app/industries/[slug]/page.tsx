import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EVALUATE_URL, getVertical, verticalDescriptor, verticals } from "@/lib/verticals";

export function generateStaticParams() {
  return verticals.map((vertical) => ({ slug: vertical.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) return {};
  return {
    title: `Decision Integrity for ${vertical.name}`,
    description: `${vertical.core_decision} Domain-specific discovery for the canonical Decision Integrity x402 evaluation service.`,
    keywords: vertical.discovery_terms,
  };
}

export default async function VerticalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) notFound();

  const descriptor = verticalDescriptor(vertical);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Decision Integrity for ${vertical.name}`,
    serviceType: "Decision integrity evaluation",
    description: vertical.core_decision,
    provider: {
      "@type": "Organization",
      name: "Wheeler Hubbell Publishing, Inc.",
    },
    areaServed: vertical.name,
    url: `https://github.com/wheelerhubbell/DIP/tree/main/app/industries/${vertical.slug}`,
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px", fontFamily: "Georgia, serif", lineHeight: 1.55 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, letterSpacing: ".12em" }}>
        DECISION INTEGRITY / {vertical.slug.toUpperCase()}
      </p>
      <h1 style={{ fontSize: 44, lineHeight: 1.08 }}>Decision Integrity for {vertical.name}</h1>
      <p style={{ fontSize: 22 }}><strong>{vertical.core_decision}</strong></p>
      <p>
        This doorway translates the Decision Integrity Protocol into {vertical.name} terminology. The underlying evaluator, payment contract, and verification semantics remain unchanged.
      </p>

      <h2>Domain vocabulary</h2>
      <ul>
        <li><strong>Primary actor:</strong> {vertical.vocabulary.primary_actor}</li>
        <li><strong>Artifact:</strong> {vertical.vocabulary.artifact}</li>
        <li><strong>Validation event:</strong> {vertical.vocabulary.validation_event}</li>
      </ul>

      <h2>Common evidence</h2>
      <ul>{vertical.evidence_types.map((item) => <li key={item}>{item}</li>)}</ul>

      <h2>Authority relationships</h2>
      <ul>{vertical.authority_roles.map((item) => <li key={item}>{item}</li>)}</ul>

      <h2>Example decision request</h2>
      <p>{vertical.example_request}</p>

      <h2>Machine discovery</h2>
      <p>
        Machine-readable descriptor: <a href={`/industries/${vertical.slug}/mcp.json`}>/industries/{vertical.slug}/mcp.json</a>
      </p>
      <p>
        Canonical paid endpoint: <a href={EVALUATE_URL}>{EVALUATE_URL}</a>
      </p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        {JSON.stringify(descriptor, null, 2)}
      </pre>

      <p style={{ marginTop: 32 }}>
        <strong>Important:</strong> Decision Integrity does not grant authority. It evaluates whether asserted authority, evidence, warrants, qualifiers, unknowns, and conditions support a proposed action.
      </p>
    </main>
  );
}
