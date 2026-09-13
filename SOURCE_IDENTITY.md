# Current service source identity

Canonical service: https://decision-integrity-service.wheelerhubbell.chatgpt.site.

The September 13, 2026 migration recovered Decision_Integrity_Source_Repository_2026-09-13.zip from the existing working Decision Integrity service. The evaluator, validator, payment gate, and attestation implementation were preserved. The only modifications to original modules are canonical-origin and required MCP-route substitutions. The production source is retained with its history in the Sites project repository; deployment source commit: be80c1aae7f783f915ec84fe8a0d50e7f3dbef3b.

The previous Vercel origin now returns method-preserving redirects to this canonical home. Both the current and preceding public Ed25519 keys are published at the canonical JWKS so earlier signatures remain verifiable.

## Historical RC1 source identity

# Source identity

This deployment wrapper calls the compiled evaluator from **Decision Integrity Protocol v1.0.0-rc.1**.

- Protocol release: `1.0.0-rc.1`
- Original release archive: `decision-integrity-protocol-v1.0.0-rc.1.zip`
- Original archive SHA-256: `6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`
- Included compiled evaluator file SHA-256: `28b8341208a3e23fe75b96e629e15083cfc5ff95c49448229b320e7ab59d914b`

The x402/RSL files are a downstream network/payment wrapper. They do not amend the RC1 evaluator, ratify pending source choices, transfer the retained upstream estate, or authorize issuance of a WHP Standing Mark.
