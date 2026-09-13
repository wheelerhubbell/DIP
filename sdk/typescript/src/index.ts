import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { compactVerify, importJWK, type JWK } from "jose";
import { privateKeyToAccount } from "viem/accounts";

export const DEFAULT_ENDPOINT = "https://decision-integrity-service.wheelerhubbell.chatgpt.site/evaluate";
export const DEFAULT_JWKS = "https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/jwks.json";
export const NETWORK = "eip155:8453";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const PAY_TO = "0x1050eddd8282623b0c263ed6bdbd42370bbc28d3";
export const AMOUNT = "1000000";

export type DecisionIntegrityInput = Record<string, unknown>;
export type DecisionIntegrityResult = {
  service: string;
  serviceVersion: string;
  issuedAt: string;
  evaluation: unknown;
  payment: unknown;
  attestation: {
    type: "JWS";
    algorithm: "EdDSA";
    keyId: string;
    jwks: string;
    jws: string;
  };
  [key: string]: unknown;
};

export type VerifiedAttestation = {
  keyId: string;
  protectedHeader: Record<string, unknown>;
  signedPayload: unknown;
};

export type DecisionIntegrityClientOptions = {
  endpoint?: string;
  jwksUrl?: string;
  fetch?: typeof globalThis.fetch;
};

function selectCanonicalRequirement(_version: number, accepts: any[]) {
  const match = accepts.find((r) =>
    r?.scheme === "exact" &&
    r?.network === NETWORK &&
    String(r?.amount) === AMOUNT &&
    String(r?.asset).toLowerCase() === USDC.toLowerCase() &&
    String(r?.payTo).toLowerCase() === PAY_TO.toLowerCase(),
  );
  if (!match) {
    throw new Error("Decision Integrity returned an unexpected x402 payment requirement");
  }
  return match;
}

export class DecisionIntegrityClient {
  readonly endpoint: string;
  readonly jwksUrl: string;
  private readonly paidFetch: typeof globalThis.fetch;
  private readonly plainFetch: typeof globalThis.fetch;

  constructor(privateKey: `0x${string}`, options: DecisionIntegrityClientOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.jwksUrl = options.jwksUrl ?? DEFAULT_JWKS;
    this.plainFetch = options.fetch ?? globalThis.fetch;

    const account = privateKeyToAccount(privateKey);
    this.paidFetch = wrapFetchWithPaymentFromConfig(this.plainFetch, {
      schemes: [
        {
          network: NETWORK,
          client: new ExactEvmScheme(account),
        },
      ],
      spendControls: { maxAmountPerPayment: "$1" },
      paymentRequirementsSelector: selectCanonicalRequirement,
    });
  }

  async evaluate(input: DecisionIntegrityInput): Promise<DecisionIntegrityResult> {
    const response = await this.paidFetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(input),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Decision Integrity request failed (${response.status}): ${JSON.stringify(body)}`);
    }
    return body as DecisionIntegrityResult;
  }

  async evaluateVerified(input: DecisionIntegrityInput): Promise<DecisionIntegrityResult> {
    const result = await this.evaluate(input);
    await verifyDecisionIntegrityAttestation(result, this.plainFetch);
    return result;
  }
}

export async function verifyDecisionIntegrityAttestation(
  result: DecisionIntegrityResult,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<VerifiedAttestation> {
  const attestation = result?.attestation;
  if (!attestation || attestation.type !== "JWS" || attestation.algorithm !== "EdDSA") {
    throw new Error("Result does not contain a supported Decision Integrity JWS attestation");
  }

  const jwksResponse = await fetchImpl(attestation.jwks || DEFAULT_JWKS, { headers: { accept: "application/json" } });
  if (!jwksResponse.ok) throw new Error(`Unable to fetch Decision Integrity JWKS (${jwksResponse.status})`);
  const jwks = await jwksResponse.json() as { keys?: JWK[] };
  const jwk = jwks.keys?.find((key) => key.kid === attestation.keyId);
  if (!jwk) throw new Error(`Decision Integrity signing key not found: ${attestation.keyId}`);

  const publicKey = await importJWK(jwk, "EdDSA");
  const verified = await compactVerify(attestation.jws, publicKey);
  const text = new TextDecoder().decode(verified.payload);
  let signedPayload: unknown = text;
  try { signedPayload = JSON.parse(text); } catch { /* retain text */ }

  return {
    keyId: attestation.keyId,
    protectedHeader: verified.protectedHeader as Record<string, unknown>,
    signedPayload,
  };
}

export function createDecisionIntegrityClient(privateKey: `0x${string}`, options?: DecisionIntegrityClientOptions) {
  return new DecisionIntegrityClient(privateKey, options);
}
