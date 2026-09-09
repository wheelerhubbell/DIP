# Decision Integrity Protocol (DIP)

Public protocol and verification surface for **Decision Integrity Protocol v1.0.0-rc.1**, stewarded by Wheeler Hubbell Publishing, Inc. (WHP).

This repository tells callers what DIP promises to do, what a caller may submit, what DIP may return, what rules govern an evaluation, how releases are identified, and how an official WHP result is verified.

It does **not** publish the evaluator implementation, private operational materials, payment configuration, signing keys, or future private evaluator improvements.

## RC1 identity

Canonical release: `1.0.0-rc.1`

Canonical sealed archive SHA-256:

`6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`

## What DIP does

DIP evaluates a proposed information-to-action transition against supplied source identity, standing, qualifiers, warrants, authority, jurisdiction, temporal validity, requested force, and any supplied domain gate. It returns a bounded disposition and audit trace.

DIP does not issue a universal truth verdict, legal certification, safety certification, or WHP Standing Mark merely by running an evaluation.

## Public surface

- `PROTOCOL.md` — promise, stages, governing invariants, and limits.
- `public/dip-v1.schema.json` — public structural vocabulary.
- `public/evaluation-input.schema.json` — callable evaluation input contract.
- `public/official-result.schema.json` — official signed-result envelope contract.
- `OFFICIAL_RESULT_VERIFICATION.md` — independent verification procedure.
- `verify/verify-official-result.mjs` — verifier that checks result integrity and WHP signature without containing the evaluator.
- `public/.well-known/whp-dip-keys.json` — WHP public verification-key registry. Until an active key is published, no result should be represented as an official signed WHP result.

## Private surface

The canonical evaluator executable, its internal implementation, private runtime, signing private key, payment settlement configuration, and operational controls are not part of this repository.

## Execution status

The production paid execution service is **not represented as active by this public repository until the private runtime, signing key, settlement configuration, and endpoint are actually provisioned and verified.**

The public contract is intentionally useful without exposing the machine itself.