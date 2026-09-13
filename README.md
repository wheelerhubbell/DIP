# Decision Integrity

Canonical commercial service: **[Decision Integrity](https://decision-integrity-service.wheelerhubbell.chatgpt.site)**.

Evaluate whether evidence and represented authority warrant a requested action. Detect unsupported inference, qualifier stripping, erased unknowns, broken provenance, and exceeded decision boundaries. The full service is live: discovery, structured request validation, HTTP, MCP, A2A, x402 v2 payment verification and settlement, the actual evaluator, and Ed25519 result attestation.

Exactly **1 USDC on Base mainnet**, paid to the existing Wheeler Hubbell Publishing receiving address. Payment must be verified and settled before any evaluation is released. Payment buys an evaluation, not an AUTHORIZED outcome.

[Agent instructions](https://decision-integrity-service.wheelerhubbell.chatgpt.site/AGENTS.md) · [Request schema](https://decision-integrity-service.wheelerhubbell.chatgpt.site/schema.json) · [Example](https://decision-integrity-service.wheelerhubbell.chatgpt.site/example.json) · [OpenAPI](https://decision-integrity-service.wheelerhubbell.chatgpt.site/openapi.json) · [x402 discovery](https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/x402) · [MCP](https://decision-integrity-service.wheelerhubbell.chatgpt.site/agent/mcp) · [A2A](https://decision-integrity-service.wheelerhubbell.chatgpt.site/a2a) · [Result schema](https://decision-integrity-service.wheelerhubbell.chatgpt.site/result.schema.json) · [Verification keys](https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/jwks.json)

The recovered existing service was moved whole to ChatGPT Sites / Cloudflare Workers. The evaluator and payment gate were preserved. The required hosting changes are the runtime adapter, canonical origin, and MCP path: Sites reserves /mcp, so the same handler is published at /agent/mcp. The new home uses its own Ed25519 runtime signing key; the USDC receiver and payment terms did not change.

[Independent public verification](https://github.com/wheelerhubbell/DIP/actions/runs/34754223539): **35/35 checks passed** on September 13, 2026. The [live report](https://decision-integrity-service.wheelerhubbell.chatgpt.site/verification) also passes 35/35 public checks and 56/56 isolated regression checks. **A real funded mainnet 1 USDC purchase completing and returning an evaluation has NOT been demonstrated.** A freshly generated zero-USDC payer's correctly signed mainnet authorization was rejected for insufficient balance, and no evaluation was released. No settlement is claimed.

[Service access](SERVICE_ACCESS.md) · [Machine-readable service descriptor](public/service.json) · [Hosting terms](https://openai.com/policies/chatgpt-sites-terms/)

## Preserved protocol history

This repository retains the RC1 protocol archive, historical schemas, receipts, keys, and local verification helpers. Those artifacts remain available for historical verification; the current service's linked request and result schemas are authoritative for new calls. [Archived RC1 repository overview](historical/RC1/README.md). This preserves one Decision Integrity service, with a new commercial home, and does not amend the retained upstream estate or declare an open-source license.
