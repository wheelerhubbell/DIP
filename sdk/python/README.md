# whp-decision-integrity-client

Canonical Python client for the live Decision Integrity service.

```python
from whp_decision_integrity import DecisionIntegrityClient
client = DecisionIntegrityClient(EVM_PRIVATE_KEY)
result = client.evaluate_verified(payload)
```

The client is pinned to the canonical live contract: x402 v2 exact payment of exactly 1 USDC on Base mainnet to the published WHP receiver. It rejects unexpected payment requirements before signing.

`evaluate_verified()` performs the x402 retry automatically and verifies the returned Ed25519 compact JWS against the service JWKS. The exact decoded signed payload is also available through `verify_decision_integrity_attestation()`.

No payment is attempted until the service returns a valid 402 challenge and the caller's x402 signer authorizes the payment payload.
