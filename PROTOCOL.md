# Decision Integrity Protocol v1.0.0-rc.1 — Public Protocol Contract

## Promise

DIP evaluates whether a proposed information-to-action transition is supported by the source object, its carried standing and qualifiers, the cited warrants, the actor's authority, the target and jurisdiction, temporal validity, and any supplied domain gate.

The protocol returns a bounded result. It does not expand the force of the supplied record merely because an evaluation was requested.

## Evaluation stages

An RC1 evaluation proceeds through these public stages:

1. **Source admission** — the source must exist and be explicitly admitted.
2. **Object identity** — the evaluated object must remain bound to its admitted source and exact-content digest.
3. **Proposition admissibility** — the proposition must remain attached to the same object and preserve binding qualifiers; unsupported totalization is not authorized.
4. **Relation join audit** — asserted joins require an independently identified, non-revoked warrant.
5. **Authority transition** — material changes in standing require cited warrants whose policy, jurisdiction, target, authorized dimension, revocation state, and temporal validity actually support the change.
6. **Authorized force** — actor permission and informational standing are independent. Actor permission alone cannot create informational authority; informational standing alone cannot create actor permission.
7. **Domain gate** — when a domain-specific gate is supplied, a failed gate halts the transition.

The protocol is fail-closed at a stage whose required support is absent or invalid.

## Standing dimensions

RC1 represents standing across the dimensions:

`P E A O Q T V J`

where the public interface carries provenance/position, epistemic status, authority, operation-specific capability, qualifiers, temporal validity, version/correction state, and jurisdiction/target information as defined by the public schemas.

## Result classes

The public result vocabulary includes:

- `AUTHORIZED`
- `BOUNDED`
- `AWAITING_AUTHORITY`
- `DENIED`

RC1's current evaluator may return a narrower subset on the single evaluation path. The wider vocabulary remains part of the public protocol family and must not be inferred to mean that every class is produced by every operation.

## Public halt vocabulary

RC1 may identify reasons including missing, invalid, expired, revoked, or policy-mismatched warrants; unauthorized standing-dimension changes; scope, target, or jurisdiction transfer; qualifier stripping; force exceeding standing; missing actor permission; unsupported joins or totalization; loss of source identity; coherent substitution; temporal expiration; use of superseded authority; failed domain gates; and related bounded failures enumerated in the public result schema.

A halt establishes only the failure of the evaluated transition under the supplied configuration. It is not a universal judgment about the source object, actor, target, or all possible transitions.

## What DIP does not promise

An evaluation does not by itself:

- establish universal truth;
- certify legal compliance, safety, security, or professional adequacy;
- create a warrant, authority grant, jurisdiction, payment right, or external obligation that was not otherwise present;
- issue a WHP Standing Mark;
- authorize a real-world execution unless a separate execution boundary actually grants that force.

## Release identity

Canonical release: `1.0.0-rc.1`

Canonical sealed archive SHA-256:

`6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`

A result claiming to be official must identify its release and be verifiable under `OFFICIAL_RESULT_VERIFICATION.md`. Possession of output text without the required official-result envelope does not establish that WHP issued it.

## Implementation boundary

This document specifies the observable contract and governing rules. It does not publish the evaluator implementation, private runtime, signing private key, payment configuration, or private operational controls.