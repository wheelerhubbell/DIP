# Decision Integrity Protocol (DIP)

**[Use DIP in your browser](https://decision-integrity.wheelerhubbell.chatgpt.site/dip)** — illustrative use cases, free receipt verification on your device, and copyable agent instructions.

**DIP is a decision-integrity protocol for evaluating whether a proposed action is authorized under defined standing, authority, warrants, constraints, and requested force. It returns a verifiable decision receipt.**

**DIP does not grant authority. It evaluates whether asserted authority supports a specific proposed transition.**

This repository is the public protocol and verification surface maintained by Wheeler Hubbell Publishing, Inc. It is not the private evaluator repository.

## Call the live service

**[Service access and agent instructions](SERVICE_ACCESS.md)** — endpoint, complete request example, x402 payment flow, and result verification.

`POST https://whp-dip-x402.vercel.app/api/evaluate`

The live payment challenge advertises **1 USDC on Base mainnet**.

Machine-readable: [service descriptor](public/service.json) · [OpenAPI](public/openapi.json) · [agent reading index](public/llms.txt).

## Carry a result into its next use

[Receipt propagation tools](PROPAGATION.md) package an unchanged receipt with verification and service-discovery links. The public agent helper creates this companion automatically when its caller receives a recognizable successful result. Local packaging and verification make no payment or network request.

## Four questions this repository answers

### What does DIP do?

Read [`PROTOCOL.md`](PROTOCOL.md). It states the bounded public promise, evaluation stages, standing dimensions, result vocabulary, halt behavior, non-claims, and RC1 release identity.

### How do I ask it a valid question?

Use [`public/evaluation-input.schema.json`](public/evaluation-input.schema.json) as the machine contract. [`EXAMPLES.md`](EXAMPLES.md) shows the behavior in plain language without publishing the evaluator.

### What will it return?

An official production result uses the envelope defined by [`public/official-result.schema.json`](public/official-result.schema.json). The envelope binds the result to the RC1 release, public terms version, receipt identity, request digest, result digest, issuance time, and WHP signing identity.

### How do I verify that a result is official?

Follow [`OFFICIAL_RESULT_VERIFICATION.md`](OFFICIAL_RESULT_VERIFICATION.md) or use [`verify/verify-official-result.mjs`](verify/verify-official-result.mjs) with the WHP public-key registry at [`public/.well-known/whp-dip-keys.json`](public/.well-known/whp-dip-keys.json).

## Public / private boundary

Public here:

- DIP's public promise and governing contract;
- input and result schemas;
- bounded examples;
- public terms and limits;
- release identity and digest;
- WHP public verification-key registry;
- independent official-result verifier;
- security/authenticity reporting guidance.

Private elsewhere:

- evaluator implementation and canonical executable runtime;
- private signing keys;
- production payment and wallet controls;
- deployment credentials;
- private operational controls, tests, and implementation improvements.

## Release identity

Canonical release: `1.0.0-rc.1`

Canonical sealed archive SHA-256:

`6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`

## Terms, limits, and security

Public terms: [`PUBLIC_TERMS.md`](PUBLIC_TERMS.md)

Security and authenticity: [`SECURITY.md`](SECURITY.md)

Source/release identity: [`SOURCE_IDENTITY.md`](SOURCE_IDENTITY.md)

## Issuance status

WHP verification key `whp-dip-ed25519-8214a0fd67bb70fe` is active in the public key registry for receipts issued on or after `2026-09-09T12:26:26Z`. A result is official only if it satisfies the official-result contract, verifies under the published active key, and identifies the canonical RC1 release and governing public terms version.

This repository does not publish the evaluator implementation and does not itself issue a WHP Standing Mark, legal certification, safety certification, or universal truth verdict.
