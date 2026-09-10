#!/usr/bin/env node

import fs from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

const RELEASE = "1.0.0-rc.1";
const RELEASE_SHA256 = "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263";
const ENVELOPE_VERSION = "WHP-DIP-OFFICIAL-RESULT-v1";
const TERMS_VERSION = "WHP-DIP-PUBLIC-TERMS-v1";

function fail(message) {
  throw new Error(message);
}

function decodeBase64(value, name) {
  if (typeof value !== "string" || !value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail(`${name} is not valid base64`);
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) fail(`${name} is not canonical base64`);
  return decoded;
}

function timestamp(value, name) {
  const parts = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/i.exec(value);
  if (!parts) fail(`${name} is not a valid date-time`);
  const [, year, month, day, hour, minute, second, offsetHour = 0, offsetMinute = 0] = parts.map((part) => part === undefined ? undefined : Number(part));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) {
    fail(`${name} is not a valid date-time`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${name} is not a valid date-time`);
  return parsed;
}

/** Verify the existing v1 signature and digest contract against a caller-trusted registry.
 * This authenticates the fields covered by that contract, not payment, runtime
 * identity, or every field of the nested result object.
 */
export function verifyOfficialResult(envelope, registry) {
  if (!envelope || typeof envelope !== "object") fail("envelope missing");
  if (envelope.envelopeVersion !== ENVELOPE_VERSION) fail("unsupported envelope version");
  if (envelope.protocol !== "Decision Integrity Protocol") fail("protocol mismatch");
  if (envelope.release !== RELEASE) fail("release mismatch");
  if (envelope.releaseSha256 !== RELEASE_SHA256) fail("release SHA-256 mismatch");
  if (envelope.termsVersion !== TERMS_VERSION) fail("terms version mismatch");
  for (const name of ["receiptId", "resultId", "keyId"]) {
    if (typeof envelope[name] !== "string" || !envelope[name] || /[\r\n]/.test(envelope[name])) fail(`${name} missing or invalid`);
  }
  for (const name of ["inputDigest", "resultDigest"]) {
    if (typeof envelope[name] !== "string" || !/^[0-9a-f]{64}$/.test(envelope[name])) fail(`${name} missing or invalid`);
  }
  if (envelope.result?.protocolVersion !== RELEASE) fail("result protocol version mismatch");
  if (envelope.resultId !== envelope.result?.id) fail("result ID mismatch");
  if (envelope.inputDigest !== envelope.result?.auditTrace?.inputDigest) fail("input digest mismatch");
  if (envelope.signature?.algorithm !== "Ed25519") fail("unsupported signature algorithm");
  if (envelope.signature?.encoding !== "base64") fail("unsupported signature encoding");

  const publicResultDigest = createHash("sha256")
    .update(JSON.stringify({
      resultClass: envelope.result.resultClass,
      halts: envelope.result.halts,
      granted: envelope.result.grantedForce,
    }))
    .digest("hex");

  if (publicResultDigest !== envelope.resultDigest) fail("computed result digest does not match envelope");
  if (publicResultDigest !== envelope.result?.auditTrace?.resultDigest) fail("computed result digest does not match audit trace");

  const key = Array.isArray(registry?.keys) && registry.keys.find((candidate) => candidate?.id === envelope.keyId);
  if (!key) fail("keyId is not published by WHP");
  if (key.status !== "active") fail("WHP key is not active");
  if (key.algorithm !== undefined && key.algorithm !== "Ed25519") fail("unsupported registry key algorithm");

  const issuedAt = timestamp(envelope.issuedAt, "issuedAt");
  const validFrom = key.validFrom == null ? null : timestamp(key.validFrom, "key validFrom");
  const validUntil = key.validUntil == null ? null : timestamp(key.validUntil, "key validUntil");
  if (validFrom !== null && validUntil !== null && validFrom > validUntil) fail("key authority interval is invalid");
  if (validFrom !== null && issuedAt < validFrom) fail("result predates key authority");
  if (validUntil !== null && issuedAt > validUntil) fail("result postdates key authority");

  let publicKey;
  if (key.publicKeySpkiBase64 !== undefined) {
    publicKey = createPublicKey({
      key: decodeBase64(key.publicKeySpkiBase64, "public verification key"),
      format: "der",
      type: "spki",
    });
  } else if (typeof key.publicKeyPem === "string" && key.publicKeyPem) {
    publicKey = createPublicKey(key.publicKeyPem);
  } else {
    fail("registry entry has no public verification key");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") fail("public verification key is not Ed25519");

  const statement = [
    ENVELOPE_VERSION,
    `release=${envelope.release}`,
    `releaseSha256=${envelope.releaseSha256}`,
    `termsVersion=${envelope.termsVersion}`,
    `receiptId=${envelope.receiptId}`,
    `resultId=${envelope.resultId}`,
    `inputDigest=${envelope.inputDigest}`,
    `resultDigest=${envelope.resultDigest}`,
    `issuedAt=${envelope.issuedAt}`,
    `keyId=${envelope.keyId}`,
  ].join("\n");

  const signature = decodeBase64(envelope.signature.value, "signature");
  if (signature.length !== 64) fail("Ed25519 signature must be 64 bytes");
  if (!verifySignature(null, Buffer.from(statement, "utf8"), publicKey, signature)) fail("WHP signature is invalid");

  return {
    receiptId: envelope.receiptId,
    resultId: envelope.resultId,
    release: envelope.release,
    releaseSha256: envelope.releaseSha256,
    termsVersion: envelope.termsVersion,
    keyId: envelope.keyId,
    issuedAt: envelope.issuedAt,
    inputDigest: envelope.inputDigest,
    resultDigest: envelope.resultDigest,
    resultClass: envelope.result.resultClass,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [receiptPath, registryPath] = process.argv.slice(2);
  if (!receiptPath || !registryPath) {
    console.error("Usage: node verify/verify-official-result.mjs <official-result.json> <whp-dip-keys.json>");
    process.exitCode = 2;
  } else {
    try {
      const receipt = verifyOfficialResult(
        JSON.parse(fs.readFileSync(receiptPath, "utf8")),
        JSON.parse(fs.readFileSync(registryPath, "utf8")),
      );
      console.log(`VALID OFFICIAL WHP DIP RESULT: ${receipt.receiptId}`);
      for (const name of ["resultId", "release", "termsVersion", "keyId", "resultClass"]) console.log(`${name}: ${receipt[name]}`);
    } catch (error) {
      console.error(`INVALID: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
