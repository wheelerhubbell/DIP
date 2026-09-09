#!/usr/bin/env node

import fs from "node:fs";
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

const RELEASE = "1.0.0-rc.1";
const RELEASE_SHA256 = "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263";
const ENVELOPE_VERSION = "WHP-DIP-OFFICIAL-RESULT-v1";

const [receiptPath, registryPath] = process.argv.slice(2);
if (!receiptPath || !registryPath) {
  console.error("Usage: node verify/verify-official-result.mjs <official-result.json> <whp-dip-keys.json>");
  process.exit(2);
}

const envelope = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

function fail(message) {
  console.error(`INVALID: ${message}`);
  process.exit(1);
}

if (envelope.envelopeVersion !== ENVELOPE_VERSION) fail("unsupported envelope version");
if (envelope.protocol !== "Decision Integrity Protocol") fail("protocol mismatch");
if (envelope.release !== RELEASE) fail("release mismatch");
if (envelope.releaseSha256 !== RELEASE_SHA256) fail("release SHA-256 mismatch");
if (envelope.result?.protocolVersion !== RELEASE) fail("result protocol version mismatch");
if (envelope.resultId !== envelope.result?.id) fail("result ID mismatch");
if (envelope.inputDigest !== envelope.result?.auditTrace?.inputDigest) fail("input digest mismatch");

const publicResultDigest = createHash("sha256")
  .update(
    JSON.stringify({
      resultClass: envelope.result.resultClass,
      halts: envelope.result.halts,
      granted: envelope.result.grantedForce,
    }),
  )
  .digest("hex");

if (publicResultDigest !== envelope.resultDigest) fail("computed result digest does not match envelope");
if (publicResultDigest !== envelope.result?.auditTrace?.resultDigest) fail("computed result digest does not match audit trace");

const key = (registry.keys ?? []).find((candidate) => candidate.id === envelope.keyId);
if (!key) fail("keyId is not published by WHP");
if (key.status !== "active") fail("WHP key is not active");

const issuedAt = Date.parse(envelope.issuedAt);
if (!Number.isFinite(issuedAt)) fail("issuedAt is not a valid date");
if (key.validFrom && issuedAt < Date.parse(key.validFrom)) fail("result predates key authority");
if (key.validUntil && issuedAt > Date.parse(key.validUntil)) fail("result postdates key authority");
if (!key.publicKeyPem) fail("registry entry has no public verification key");

const statement = [
  ENVELOPE_VERSION,
  `release=${envelope.release}`,
  `releaseSha256=${envelope.releaseSha256}`,
  `resultId=${envelope.resultId}`,
  `inputDigest=${envelope.inputDigest}`,
  `resultDigest=${envelope.resultDigest}`,
  `issuedAt=${envelope.issuedAt}`,
  `keyId=${envelope.keyId}`,
].join("\n");

const ok = verifySignature(
  null,
  Buffer.from(statement, "utf8"),
  createPublicKey(key.publicKeyPem),
  Buffer.from(envelope.signature.value, "base64"),
);

if (!ok) fail("WHP signature is invalid");

console.log(`VALID OFFICIAL WHP DIP RESULT: ${envelope.resultId}`);
console.log(`release: ${envelope.release}`);
console.log(`keyId: ${envelope.keyId}`);
console.log(`resultClass: ${envelope.result.resultClass}`);
