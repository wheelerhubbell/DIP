# Decision Integrity

Canonical service: https://decision-integrity-service.wheelerhubbell.chatgpt.site

Evaluate whether evidence and represented authority warrant a requested action. Detect unsupported inference, qualifier stripping, erased unknowns, broken provenance, and exceeded decision boundaries.

Read https://decision-integrity-service.wheelerhubbell.chatgpt.site/schema.json and the complete illustrative input at https://decision-integrity-service.wheelerhubbell.chatgpt.site/example.json. Submit a structured record using POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/evaluate. Preserve exact source content, attribution, SHA-256 bindings, qualifiers, unknowns, inference warrants, actor grants, scope, target, jurisdiction, and validity windows. QUOTE requires exact source text; INFERENCE requires a separately represented warrant binding the conclusion and complete premise set. Free-form prose alone is not a valid request.

The unpaid response is HTTP 402 and PAYMENT-REQUIRED (base64 JSON), x402 version 2, exactly 1000000 atomic USDC on eip155:8453, asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, recipient 0x1050eddd8282623b0c263ed6bdbd42370bbc28d3. Use an authorized x402 v2 client; preserve the returned accepted requirement including extra.requestHash. Sign only within the caller's existing spending authority. Retry the same body with PAYMENT-SIGNATURE. No signup, API key, subscription, or checkout. Never treat a payment header as settled funds. No evaluation is released unless the legitimate facilitator verifies and settles payment.

The response contains a service-signed JWS and public verification keys at https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/jwks.json. AUTHORIZED means the supplied record supports this exact represented operation; BOUNDED identifies preserved unresolved limits or conditions; AWAITING_AUTHORITY identifies missing actor authority; DENIED identifies a violated boundary or failed warrant. Only AUTHORIZED sets executionPermitted=true. No result executes an action or certifies external factual truth, issuer identity, legal authority, or an unrepresented fact. Never omit a limit from a result. The complete input record is preserved in the result.

MCP: POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/agent/mcp. Free server/discover, initialize, tools/list, resources/list, resources/read. Paid tool evaluate_decision_integrity uses the same input schema and gate; in-protocol payment uses params._meta["x402/payment"], with payment-required data in structuredContent and settlement in result._meta["x402/payment-response"]. The PAYMENT-SIGNATURE HTTP transport is also accepted. MCP 2026-07-28 stateless and 2025-11-25/2025-06-18 handshake clients are supported.

A2A 1.0: https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/agent-card.json; POST https://decision-integrity-service.wheelerhubbell.chatgpt.site/a2a with SendMessage and exactly one message.parts[0].data containing the evaluation record. HTTP x402 payment applies.

This is a deterministic structured-record audit, not a general factual search or natural-language truth oracle. The request price is 1 USDC regardless of outcome. Structurally invalid requests are rejected before settlement. Requests and evaluation results are not intentionally logged or placed in a public registry. The facilitator receives payment metadata and an input digest, not the private evaluation record. Hosting and facilitator service limits apply; the selected PayAI no-key tier currently provides 1000 free settlements. Exhaustion or outages fail closed.

Discovery: https://decision-integrity-service.wheelerhubbell.chatgpt.site/openapi.json; https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/x402; https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/ard.json; https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/api-catalog.

Live verification: https://decision-integrity-service.wheelerhubbell.chatgpt.site/verification. Independent public verification: https://github.com/wheelerhubbell/DIP/actions/runs/34754223539 (35/35). The existing evaluator regression suite passed 56/56. A real funded mainnet 1 USDC purchase completing and returning an evaluation has NOT been demonstrated.

The historical RC1 schemas and receipt helpers in this repository are preserved for historical records. New requests use the current schema linked above.
