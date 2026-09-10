# Verifying an Official WHP DIP Result

An output is not an official WHP result merely because it contains DIP-shaped JSON or names the Decision Integrity Protocol.

For `1.0.0-rc.1`, officiality requires an **official-result envelope**, an intact RC1 result digest, and a valid WHP Ed25519 signature under an active public key published by Wheeler Hubbell Publishing, Inc.

## Required envelope

Validate the object against `public/official-result.schema.json`.

The envelope must identify:

- `envelopeVersion = WHP-DIP-OFFICIAL-RESULT-v1`
- `release = 1.0.0-rc.1`
- `releaseSha256 = 6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`
- `termsVersion = WHP-DIP-PUBLIC-TERMS-v1`
- a unique receipt ID;
- the result ID;
- the RC1 input digest;
- the RC1 result digest;
- issuance time;
- WHP verification-key ID;
- the result body; and
- an Ed25519 signature encoded as base64.

## Integrity check

RC1's public result-integrity rule is:

```text
sha256(JSON.stringify({
  resultClass: result.resultClass,
  halts: result.halts,
  granted: result.grantedForce
}))
```

The computed hexadecimal SHA-256 must equal all of:

1. `envelope.resultDigest`
2. `envelope.result.auditTrace.resultDigest`

The envelope's `inputDigest` must equal `envelope.result.auditTrace.inputDigest`.

These checks authenticate the digest of `resultClass`, `halts`, and `grantedForce` under the receipt signature. They do not authenticate every other nested result-body field or reproduce the private evaluator. Validate the complete envelope against its schema separately.

## Signature statement

For envelope version 1, construct this exact UTF-8 string, including line breaks and no final newline:

```text
WHP-DIP-OFFICIAL-RESULT-v1
release=<release>
releaseSha256=<releaseSha256>
termsVersion=<termsVersion>
receiptId=<receiptId>
resultId=<resultId>
inputDigest=<inputDigest>
resultDigest=<resultDigest>
issuedAt=<issuedAt>
keyId=<keyId>
```

Verify `signature.value` as a base64-encoded Ed25519 signature over those exact bytes.

## Key authority

Retrieve the WHP key registry at:

[the established WHP public repository](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/.well-known/whp-dip-keys.json). Download the registry independently; a key file supplied by a receipt sender is not automatically trusted.

The envelope's `keyId` must match a key whose status is active for the envelope's `issuedAt`. A key absent from the WHP registry has no authority to establish an official WHP result.

The public registry contains only public verification keys. The verifier accepts the registry's `publicKeySpkiBase64` as DER-encoded SPKI and also accepts `publicKeyPem` for compatible registries. The signing private key remains in the private runtime.

## Current issuance state

WHP key `whp-dip-ed25519-8214a0fd67bb70fe` is active for receipts issued on or after `2026-09-09T12:26:26Z`. The active-key registry determines signing authority; service availability is an operational state and does not alter the meaning of signatures already issued while the key was active.

## What verification establishes

Successful verification establishes that:

- the identified result is bound to the stated RC1 release;
- the receipt identifies the public terms version governing that issuance;
- the fields covered by the RC1 result digest are intact relative to that signed digest;
- the identified WHP signing key signed the exact receipt statement; and
- that key had published WHP authority under the key registry.

A signed release identity is an issuer statement; it does not independently prove which code production executed. Verification does not independently rerun the private evaluator, establish universal truth, or convert the result into a legal, safety, security, or Standing Mark certification.

To carry a result with a discoverable path back to WHP, use [the receipt companion](PROPAGATION.md). It preserves the signed envelope unchanged and keeps discovery metadata separate.
