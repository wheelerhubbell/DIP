import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createReceiptPackage, verifyReceiptPackage, writeReceiptPackage, packageDipResponse, createDipClient, SERVICE_ENDPOINT, DISCOVERY } from "./receipt-companion.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function fixture(resultClass = "AUTHORIZED") {
  const keys = generateKeyPairSync("ed25519");
  const inputDigest = "1".repeat(64);
  const result = { id: "synthetic-result", protocolVersion: "1.0.0-rc.1", resultClass, grantedForce: resultClass === "AUTHORIZED" ? "INFORM" : null, requestedForce: "INFORM", resultingStanding: null, halts: [], boundedConditions: [], residue: [], auditTrace: { id: "synthetic-audit", protocolVersion: "1.0.0-rc.1", steps: [], inputDigest } };
  const resultDigest = createHash("sha256").update(JSON.stringify({ resultClass, halts: result.halts, granted: result.grantedForce })).digest("hex");
  result.auditTrace.resultDigest = resultDigest;
  const envelope = { envelopeVersion: "WHP-DIP-OFFICIAL-RESULT-v1", protocol: "Decision Integrity Protocol", release: "1.0.0-rc.1", releaseSha256: "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263", termsVersion: "WHP-DIP-PUBLIC-TERMS-v1", receiptId: "synthetic-only-α", resultId: result.id, inputDigest, resultDigest, issuedAt: "2026-09-10T08:00:00Z", keyId: "synthetic-test-key", result };
  const fields = ["release", "releaseSha256", "termsVersion", "receiptId", "resultId", "inputDigest", "resultDigest", "issuedAt", "keyId"];
  const statement = [envelope.envelopeVersion, ...fields.map((key) => `${key}=${envelope[key]}`)].join("\n");
  envelope.signature = { algorithm: "Ed25519", encoding: "base64", value: sign(null, Buffer.from(statement), keys.privateKey).toString("base64") };
  const registry = { keys: [{ id: envelope.keyId, status: "active", algorithm: "Ed25519", validFrom: "2026-09-09T00:00:00Z", validUntil: null, publicKeySpkiBase64: keys.publicKey.export({ type: "spki", format: "der" }).toString("base64") }] };
  const bytes = Buffer.from("  " + JSON.stringify(envelope, null, 3) + "\n\n");
  return { bytes, envelope, registry };
}

test("packaging preserves original bytes, including whitespace and Unicode", () => {
  const { bytes } = fixture();
  const before = Buffer.from(bytes);
  const packaged = createReceiptPackage(bytes);
  assert.deepEqual(packaged.files["official-result.json"], before);
  assert.equal(packaged.companion.receipt.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(packaged.companion.verificationStatus, "NOT_PERFORMED");
  bytes.fill(0);
  assert.deepEqual(packaged.files["official-result.json"], before);
  assert.match(packaged.files["README.md"].toString(), /Use DIP for your own question/);
  assert.equal(packaged.companion.discovery.serviceDescriptor, DISCOVERY.serviceDescriptor);
});

test("package and published v1 signature verify locally with a synthetic trusted key", () => {
  const { bytes, registry } = fixture();
  const packaged = createReceiptPackage(bytes);
  assert.equal(verifyReceiptPackage(bytes, packaged.companion, registry).receiptId, "synthetic-only-α");
});

test("packaging does not claim authenticity for an invalid signature", () => {
  const { envelope, registry } = fixture();
  envelope.signature.value = Buffer.alloc(64).toString("base64");
  const bytes = Buffer.from(JSON.stringify(envelope));
  const packaged = createReceiptPackage(bytes);
  assert.equal(packaged.companion.verificationStatus, "NOT_PERFORMED");
  assert.throws(() => verifyReceiptPackage(bytes, packaged.companion, registry), /signature/i);
});

test("substituting receipt bytes or discovery destinations is rejected", () => {
  const first = fixture();
  const second = fixture();
  const companion = createReceiptPackage(first.bytes).companion;
  assert.throws(() => verifyReceiptPackage(second.bytes, companion, second.registry), /binding mismatch/);
  companion.discovery.publicKeyRegistry = "https://attacker.invalid/keys.json";
  assert.throws(() => verifyReceiptPackage(first.bytes, companion, first.registry), /discovery destination/);
});

test("a forged verified label is rejected", () => {
  const { bytes, registry } = fixture();
  const companion = createReceiptPackage(bytes).companion;
  companion.verificationStatus = "VERIFIED";
  assert.throws(() => verifyReceiptPackage(bytes, companion, registry), /must not assert/);
});

test("digest tampering is rejected even if the unsigned companion is regenerated", () => {
  const { envelope, registry } = fixture();
  envelope.result.resultClass = "DENIED";
  const bytes = Buffer.from(JSON.stringify(envelope));
  const companion = createReceiptPackage(bytes).companion;
  assert.throws(() => verifyReceiptPackage(bytes, companion, registry), /digest/i);
});

test("packaging accepts all four published result classes without promoting them", () => {
  for (const outcome of ["AUTHORIZED", "BOUNDED", "DENIED", "AWAITING_AUTHORITY"]) {
    const { bytes, registry } = fixture(outcome);
    const packaged = createReceiptPackage(bytes);
    assert.equal(verifyReceiptPackage(bytes, packaged.companion, registry).resultClass, outcome);
    assert.deepEqual(packaged.files["official-result.json"], bytes);
  }
});

test("rejects generic JSON, parsed objects, malformed UTF-8, and unsupported releases", () => {
  assert.throws(() => createReceiptPackage("{}"));
  assert.throws(() => createReceiptPackage({}), /original receipt bytes/);
  assert.throws(() => createReceiptPackage(Buffer.from([0xff])));
  const { envelope } = fixture();
  envelope.release = "different";
  assert.throws(() => createReceiptPackage(JSON.stringify(envelope)), /Release mismatch/);
});

test("402 and error bodies remain available; no companion is fabricated", async () => {
  for (const status of [402, 500]) {
    const response = new Response('{"message":"unchanged"}', { status });
    const result = await packageDipResponse(response);
    assert.equal(result.response, response);
    assert.equal(result.receiptPackage, null);
    assert.equal(result.packagingError, null);
    assert.deepEqual(await response.json(), { message: "unchanged" });
  }
});

test("an unexpected successful body preserves the response and returns a packaging error", async () => {
  const response = new Response("not a receipt", { status: 200 });
  const result = await packageDipResponse(response);
  assert.equal(result.packagingError, "RECEIPT_NOT_PACKAGED");
  assert.equal(result.receiptPackage, null);
  assert.equal(await response.text(), "not a receipt");
});

test("agent client packages a returned receipt automatically with one delegated request", async () => {
  const { bytes } = fixture();
  const input = { synthetic: "request supplied by caller" };
  let calls = 0;
  const evaluate = createDipClient(async (url, init) => {
    calls++;
    assert.equal(url, SERVICE_ENDPOINT);
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body), input);
    return new Response(bytes, { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const result = await evaluate(input);
  assert.equal(calls, 1);
  assert.deepEqual(result.receiptPackage.files["official-result.json"], bytes);
  assert.deepEqual(Buffer.from(await result.response.arrayBuffer()), bytes);
});

test("pack and verify require no network or payment client", () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Unexpected network access"); };
  try {
    const { bytes, registry } = fixture();
    verifyReceiptPackage(bytes, createReceiptPackage(bytes).companion, registry);
  } finally { globalThis.fetch = previous; }
});

test("writer preserves bytes, creates private files, and refuses to overwrite", (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "dip-companion-test-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const out = path.join(temporary, "shared-result");
  const { bytes } = fixture();
  const packaged = createReceiptPackage(bytes);
  writeReceiptPackage(packaged, out);
  assert.deepEqual(fs.readFileSync(path.join(out, "official-result.json")), bytes);
  assert.equal(fs.statSync(out).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(out, "official-result.json")).mode & 0o777, 0o600);
  assert.throws(() => writeReceiptPackage(packaged, out), /EEXIST/);
  assert.deepEqual(fs.readFileSync(path.join(out, "official-result.json")), bytes);
});

test("command-line pack and recipient verification complete using synthetic receipts", (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "dip-companion-cli-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const { bytes, registry } = fixture();
  const source = path.join(temporary, "source.json");
  const keys = path.join(temporary, "trusted-keys.json");
  const out = path.join(temporary, "receipt-package");
  fs.writeFileSync(source, bytes);
  fs.writeFileSync(keys, JSON.stringify(registry));
  const pack = spawnSync(process.execPath, ["tools/receipt-companion.mjs", "pack", source, out], { cwd: root, encoding: "utf8" });
  assert.equal(pack.status, 0, pack.stderr);
  const verify = spawnSync(process.execPath, ["tools/receipt-companion.mjs", "verify", out, keys], { cwd: root, encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /^VALID:/);
  assert.deepEqual(fs.readFileSync(path.join(out, "official-result.json")), bytes);
});
