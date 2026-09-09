# Verifying an Official WHP DIP Result

An output is not an official WHP result merely because it contains DIP-shaped JSON or names the Decision Integrity Protocol.

For `1.0.0-rc.1`, officiality requires an **official-result envelope**, an intact RC1 result digest, and a valid WHP Ed25519 signature under an active public key published by Wheeler Hubbell Publishing, Inc.

## Required envelope

Validate the object against `public/official-result.schema.json`.

The envelope must identify:

- `envelopeVersion = WHP-DIP-OFFICIAL-RESULT-v1`
- `release = 1.0.0-rc.1`
- `releaseSha256 = 6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263`
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

These checks establish that the result body has not been substituted relative to the signed digest fields. They do not reproduce the private evaluator.

## Signature statement

For envelope version 1, construct this exact UTF-8 string, including line breaks and no final newline:

```text
WHP-DIP-OFFICIAL-RESULT-v1
release=<release>
releaseSha256=<releaseSha256>
resultId=<resultId>
inputDigest=<inputDigest>
resultDigest=<resultDigest>
issuedAt=<issuedAt>
keyId=<keyId>
```

Verify `signature.value` as a base64-encoded Ed25519 signature over those exact bytes.

## Key authority

Retrieve the WHP key registry at:

`/.well-known/whp-dip-keys.json`

The envelope's `keyId` must match a key whose status is active for the envelope's `issuedAt`. A key absent from the WHP registry has no authority to establish an official WHP result.

The public registry contains only public verification keys. The signing private key remains in the private runtime.

## Current issuance state

The public registry is intentionally empty until the private signing runtime is provisioned and verified. Therefore, at the current state of this repository, **no newly presented signed result should be represented as an official WHP DIP result**.

## What verification establishes

Successful verification establishes that:

- the identified result is bound to the stated RC1 release;
- the public portion of the result is intact relative to its RC1 result digest;
- the identified WHP signing key signed the envelope statement; and
- that key had published WHP authority under the key registry.

It does not independently rerun the private evaluator, establish universal truth, or convert the result into a legal, safety, security, or Standing Mark certification.