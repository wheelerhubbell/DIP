import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyOfficialResult } from "./verify-official-result.mjs";

// Only generated ephemeral test keys are used to sign synthetic receipts.
// Preserve the published registry's shape, never its live signing identity.
function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = JSON.parse(readFileSync(new URL("../public/.well-known/whp-dip-keys.json", import.meta.url), "utf8"));
  const publishedShape = registry.keys[0];
  registry.keys = [{
    ...publishedShape,
    id: "synthetic-test-key",
    publicKeySpkiBase64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    validFrom: "2026-09-09T12:26:26Z",
    validUntil: null,
    note: "Ephemeral test key; not an official WHP signing identity.",
  }];
  const result = {
    id: "synthetic-result",
    protocolVersion: "1.0.0-rc.1",
    resultClass: "AUTHORIZED",
    grantedForce: "INFORM",
    requestedForce: "INFORM",
    resultingStanding: null,
    halts: [],
    boundedConditions: [],
    residue: [],
    auditTrace: {
      id: "synthetic-audit",
      protocolVersion: "1.0.0-rc.1",
      steps: [],
      inputDigest: "a".repeat(64),
    },
  };
  const resultDigest = createHash("sha256").update(JSON.stringify({
    resultClass: result.resultClass,
    halts: result.halts,
    granted: result.grantedForce,
  })).digest("hex");
  result.auditTrace.resultDigest = resultDigest;
  const envelope = {
    envelopeVersion: "WHP-DIP-OFFICIAL-RESULT-v1",
    protocol: "Decision Integrity Protocol",
    release: "1.0.0-rc.1",
    releaseSha256: "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263",
    termsVersion: "WHP-DIP-PUBLIC-TERMS-v1",
    receiptId: "synthetic-receipt",
    resultId: result.id,
    inputDigest: result.auditTrace.inputDigest,
    resultDigest,
    issuedAt: "2026-09-10T00:00:00Z",
    keyId: registry.keys[0].id,
    result,
  };
  function resign() {
    const statement = [
      envelope.envelopeVersion,
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
    envelope.signature = {
      algorithm: "Ed25519",
      encoding: "base64",
      value: sign(null, Buffer.from(statement, "utf8"), privateKey).toString("base64"),
    };
  }
  resign();
  return { envelope, registry, publicKey, resign };
}

test("verifies an ephemeral signature with the published SPKI registry shape", () => {
  const { envelope, registry } = fixture();
  const before = JSON.stringify({ envelope, registry });
  const verified = verifyOfficialResult(envelope, registry);
  assert.equal(verified.receiptId, envelope.receiptId);
  assert.equal(verified.resultDigest, envelope.resultDigest);
  assert.equal(verified.resultClass, "AUTHORIZED");
  assert.equal("result" in verified, false);
  assert.equal("signature" in verified, false);
  assert.equal(JSON.stringify({ envelope, registry }), before);
});

test("preserves PEM registry support", () => {
  const { envelope, registry, publicKey } = fixture();
  delete registry.keys[0].publicKeySpkiBase64;
  registry.keys[0].publicKeyPem = publicKey.export({ format: "pem", type: "spki" });
  delete registry.keys[0].algorithm;
  assert.equal(verifyOfficialResult(envelope, registry).receiptId, envelope.receiptId);
});

test("rejects altered signed receipt metadata", () => {
  const { envelope, registry } = fixture();
  envelope.receiptId += "-tampered";
  assert.throws(() => verifyOfficialResult(envelope, registry), /signature is invalid/);
});

test("rejects altered result class and granted force", () => {
  for (const field of ["resultClass", "grantedForce"]) {
    const { envelope, registry } = fixture();
    envelope.result[field] = "TAMPERED";
    assert.throws(() => verifyOfficialResult(envelope, registry), /computed result digest/);
  }
});

test("rejects forged result digest even when the audit trace is updated", () => {
  const { envelope, registry } = fixture();
  envelope.result.resultClass = "DENIED";
  envelope.resultDigest = createHash("sha256").update(JSON.stringify({ resultClass: "DENIED", halts: [], granted: "INFORM" })).digest("hex");
  envelope.result.auditTrace.resultDigest = envelope.resultDigest;
  assert.throws(() => verifyOfficialResult(envelope, registry), /signature is invalid/);
});

test("rejects a signature under a different Ed25519 key", () => {
  const { envelope, registry } = fixture();
  registry.keys[0].publicKeySpkiBase64 = generateKeyPairSync("ed25519").publicKey.export({ format: "der", type: "spki" }).toString("base64");
  assert.throws(() => verifyOfficialResult(envelope, registry), /signature is invalid/);
});

test("rejects unknown and inactive keys", () => {
  const { envelope, registry } = fixture();
  assert.throws(() => verifyOfficialResult(envelope, { keys: [] }), /keyId is not published/);
  registry.keys[0].status = "revoked";
  assert.throws(() => verifyOfficialResult(envelope, registry), /key is not active/);
});

test("checks declared signature algorithm and encoding", () => {
  for (const [field, value, expected] of [["algorithm", "RSA", /signature algorithm/], ["encoding", "hex", /signature encoding/]]) {
    const { envelope, registry } = fixture();
    envelope.signature[field] = value;
    assert.throws(() => verifyOfficialResult(envelope, registry), expected);
  }
});

test("checks registry algorithm and the actual public-key type", () => {
  const { envelope, registry } = fixture();
  registry.keys[0].algorithm = "RSA";
  assert.throws(() => verifyOfficialResult(envelope, registry), /registry key algorithm/);
  registry.keys[0].algorithm = "Ed25519";
  registry.keys[0].publicKeySpkiBase64 = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey.export({ format: "der", type: "spki" }).toString("base64");
  assert.throws(() => verifyOfficialResult(envelope, registry), /key is not Ed25519/);
});

test("rejects malformed signature encoding and incorrect signature length", () => {
  const { envelope, registry } = fixture();
  envelope.signature.value += "!";
  assert.throws(() => verifyOfficialResult(envelope, registry), /valid base64/);
  envelope.signature.value = Buffer.alloc(63).toString("base64");
  assert.throws(() => verifyOfficialResult(envelope, registry), /64 bytes/);
});

test("rejects invalid issuance times even with matching signatures", () => {
  for (const value of ["not-a-date", "2026-02-30T00:00:00Z", "2026-09-10", "2026-09-10T24:00:00Z", 0]) {
    const { envelope, registry, resign } = fixture();
    envelope.issuedAt = value;
    resign();
    assert.throws(() => verifyOfficialResult(envelope, registry), /issuedAt is not a valid date-time/);
  }
});

test("invalid key authority times cannot bypass date comparison", () => {
  for (const field of ["validFrom", "validUntil"]) {
    for (const value of ["invalid", "", "2026-02-30T00:00:00Z"]) {
      const { envelope, registry } = fixture();
      registry.keys[0][field] = value;
      assert.throws(() => verifyOfficialResult(envelope, registry), new RegExp(`key ${field} is not a valid date-time`));
    }
  }
});

test("enforces both bounds of the key authority interval", () => {
  const { envelope, registry } = fixture();
  registry.keys[0].validFrom = "2026-09-11T00:00:00Z";
  assert.throws(() => verifyOfficialResult(envelope, registry), /predates key authority/);
  registry.keys[0].validFrom = "2026-09-08T00:00:00Z";
  registry.keys[0].validUntil = "2026-09-09T00:00:00Z";
  assert.throws(() => verifyOfficialResult(envelope, registry), /postdates key authority/);
  registry.keys[0].validFrom = "2026-09-11T00:00:00Z";
  assert.throws(() => verifyOfficialResult(envelope, registry), /interval is invalid/);
});

test("CLI preserves successful, invalid, and missing-argument exit codes", (t) => {
  const { envelope, registry } = fixture();
  const directory = mkdtempSync(join(tmpdir(), "dip-public-verifier-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const receiptPath = join(directory, "receipt.json");
  const registryPath = join(directory, "registry.json");
  const verifierPath = fileURLToPath(new URL("./verify-official-result.mjs", import.meta.url));
  writeFileSync(receiptPath, JSON.stringify(envelope));
  writeFileSync(registryPath, JSON.stringify(registry));
  const valid = spawnSync(process.execPath, [verifierPath, receiptPath, registryPath], { encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /VALID OFFICIAL WHP DIP RESULT: synthetic-receipt/);
  envelope.receiptId = "tampered";
  writeFileSync(receiptPath, JSON.stringify(envelope));
  const invalid = spawnSync(process.execPath, [verifierPath, receiptPath, registryPath], { encoding: "utf8" });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /INVALID: WHP signature is invalid/);
  const usage = spawnSync(process.execPath, [verifierPath], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /Usage:/);
});
