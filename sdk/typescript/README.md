# @whp/decision-integrity-client

Canonical TypeScript client for the live Decision Integrity service.

```ts
import { createDecisionIntegrityClient } from "@whp/decision-integrity-client";
const dip = createDecisionIntegrityClient(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const result = await dip.evaluateVerified(input);
```

The client is pinned to the canonical live contract: x402 v2 exact payment of exactly 1 USDC on Base mainnet to the published WHP receiver. It rejects unexpected payment requirements before signing.

`evaluateVerified()` performs the x402 retry automatically and verifies the returned Ed25519 compact JWS against the service JWKS. The signed payload is available separately through `verifyDecisionIntegrityAttestation()` when callers need to inspect the exact attested bytes.

No payment is attempted until the service returns a valid 402 challenge and the caller's configured x402 signer authorizes the payment payload.
