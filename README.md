# WHP DIP x402 execution surface

A thin network/payment wrapper around the sealed Decision Integrity Protocol v1.0.0-rc.1 compiled evaluator.

## Current state

- `POST /api/evaluate` executes the RC1 deterministic evaluator.
- x402 is configured on **Base Sepolia testnet** at `$0.001` test value per successful evaluation.
- Invalid requests return `400`; the paid wrapper settles only successful responses.
- RSL terms are published at `/rsl.xml`.
- Bazaar discovery metadata is attached to the paid route.

## Mainnet gate

Mainnet is deliberately not enabled by source control. Production settlement requires explicit values for `X402_PAY_TO`, `X402_NETWORK`, `X402_FACILITATOR_URL`, and `X402_PRICE`.

No private key belongs in this repository.

The x402/RSL layer is downstream infrastructure. It does not transfer or rewrite the retained upstream estate, alter RC1, or authorize issuance of a WHP Standing Mark.