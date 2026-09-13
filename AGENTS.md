# Decision Integrity — Agent Instructions

Decision Integrity is a paid machine-to-machine evaluator for a narrow question: **does the represented evidence and authority warrant the requested action?** It is useful when an agent is about to recommend, authorize, constrain, bind, or otherwise rely on a consequential claim and needs to preserve qualifiers, unknowns, provenance, jurisdiction, and represented authority.

## Canonical service

- Service: https://decision-integrity-service.wheelerhubbell.chatgpt.site
- Direct evaluation: `POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/evaluate`
- OpenAPI: https://decision-integrity-service.wheelerhubbell.chatgpt.site/openapi.json
- Input schema: https://decision-integrity-service.wheelerhubbell.chatgpt.site/schema.json
- Example input: https://decision-integrity-service.wheelerhubbell.chatgpt.site/example.json
- Result schema: https://decision-integrity-service.wheelerhubbell.chatgpt.site/result.schema.json
- Public verification keys: https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/jwks.json

## What an agent should do

1. Validate or construct a complete Decision Integrity input record using the published schema.
2. POST it to `/evaluate` without inventing a payment proof. An unpaid call returns the current x402 v2 requirement.
3. If payment is authorized by the agent's owner/policy, use an x402-capable Base client to satisfy the exact requirement. **Do not substitute a direct USDC transfer or a bare transaction hash for the x402 PaymentPayload.**
4. Retry the same request with the protocol payment payload in the `PAYMENT-SIGNATURE` header.
5. Accept a result only after a successful paid response. Preserve the returned settlement metadata and the full signed Decision Integrity result.
6. Verify the Ed25519 attestation against the current public key registry before treating the receipt as an official WHP result.

Advertised payment terms are exactly 1 USDC per evaluation on Base mainnet (`eip155:8453`) to `0x1050eddd8282623b0c263ed6bdbd42370bbc28d3`. Always read the live 402 requirement before authorizing payment; the live challenge is authoritative.

## MCP

Remote MCP endpoint: `POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/agent/mcp`

Discovery/initialization and tool listing are free. The paid tool is `evaluate_decision_integrity`. MCP-aware x402 clients may carry payment in `params._meta["x402/payment"]`; settlement metadata is returned in `_meta["x402/payment-response"]`. HTTP `PAYMENT-SIGNATURE` is also supported by the service transport.

Official MCP Registry metadata is mirrored in this repository as [`server.json`](./server.json).

## A2A

Agent Card: https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/agent-card.json

A2A endpoint: `POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/a2a`

Use the Decision Integrity evaluation record as the data payload for the evaluation skill. HTTP x402 payment applies to paid execution.

## Outcomes

The service can return outcomes such as `AUTHORIZED`, `BOUNDED`, `AWAITING_AUTHORITY`, or `DENIED`. Payment buys an evaluation, **not** an `AUTHORIZED` outcome. Decision Integrity evaluates represented evidence and authority; it does not independently establish external factual truth, grant legal authority, or execute the proposed action.

## Verification status

Public verification currently establishes the service surface, payment gate behavior, schemas, and regression behavior. A real funded Base-mainnet purchase completing end-to-end has **not** yet been publicly demonstrated in the repository's verification record. Do not represent a live mainnet settlement as proven until that evidence exists.
