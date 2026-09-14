import registry from "@/data/verticals.json";

export const SERVICE_ORIGIN = "https://decision-integrity-service.wheelerhubbell.chatgpt.site";
export const EVALUATE_URL = `${SERVICE_ORIGIN}/evaluate`;

export type VerticalVocabulary = {
  primary_actor: string;
  artifact: string;
  validation_event: string;
};

export type Vertical = {
  slug: string;
  name: string;
  core_decision: string;
  vocabulary: VerticalVocabulary;
  evidence_types: string[];
  authority_roles: string[];
  example_request: string;
  discovery_terms: string[];
};

export const verticals = registry.verticals as Vertical[];

export function getVertical(slug: string): Vertical | undefined {
  return verticals.find((vertical) => vertical.slug === slug);
}

export function verticalDescriptor(vertical: Vertical) {
  return {
    protocol: "Decision Integrity Protocol",
    vertical: vertical.slug,
    name: vertical.name,
    description: `Decision Integrity for ${vertical.name}: ${vertical.core_decision}`,
    discoveryTerms: vertical.discovery_terms,
    decision: {
      question: vertical.core_decision,
      example: vertical.example_request,
      vocabulary: vertical.vocabulary,
      evidenceTypes: vertical.evidence_types,
      authorityRoles: vertical.authority_roles,
    },
    service: {
      endpoint: EVALUATE_URL,
      method: "POST",
      paymentProtocol: "x402 v2",
      network: "eip155:8453",
      currency: "USDC",
      price: "1 USDC",
      requestSchema: `${SERVICE_ORIGIN}/schema.json`,
      resultSchema: `${SERVICE_ORIGIN}/result.schema.json`,
      jwks: `${SERVICE_ORIGIN}/.well-known/jwks.json`,
      agentCard: `${SERVICE_ORIGIN}/.well-known/agent-card.json`,
    },
    constraints: {
      grantsAuthority: false,
      note: "This vertical changes discovery language and examples only. It does not alter the Decision Integrity evaluator, payment contract, or verification semantics.",
    },
  };
}
