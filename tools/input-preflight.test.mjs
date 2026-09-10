import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateDipInput, compileSchema } from "./input-preflight.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../public/examples/inform.json", import.meta.url), "utf8"));
const fixture = () => structuredClone(example);
const invalid = (input, expectedPath, reason) => assert.throws(() => validateDipInput(input), (error) => {
  assert.equal(error.code, "DIP_INPUT_INVALID");
  assert.equal(error.path, expectedPath);
  assert.match(error.reason, reason);
  return true;
});

test("canonical INFORM fixture validates without mutation or replacing input", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const freeze = (value) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  };
  freeze(input);
  assert.equal(validateDipInput(input), input);
  assert.equal(JSON.stringify(input), before);
});

test("missing root and nested required properties have exact paths", () => {
  invalid({}, "/source", /required/);
  const input = fixture();
  delete input.object.standing.Q.uncertainty;
  invalid(input, "/object/standing/Q/uncertainty", /required/);
});

test("incorrect types are rejected without coercing booleans or arrays", () => {
  invalid([], "", /expected type object/);
  const input = fixture();
  input.source.admitted = "true";
  invalid(input, "/source/admitted", /expected type boolean/);
  input.source.admitted = true;
  input.relations = {};
  invalid(input, "/relations", /expected type array/);
});

test("capability enums are checked within nested arrays", () => {
  const input = fixture();
  input.authorityGrant.permittedOperations = ["INFORM", "ALLOW_EVERYTHING"];
  invalid(input, "/authorityGrant/permittedOperations/1", /allowed enum/);
});

test("unknown fields are rejected at root and nested levels", () => {
  const input = fixture();
  input.walletPrivateKey = "do-not-log-me";
  invalid(input, "/walletPrivateKey", /additional property/);
  assert.throws(() => validateDipInput(input), (error) => !error.message.includes("do-not-log-me"));
  delete input.walletPrivateKey;
  input.proposition.carriedQualifiers.extra = true;
  invalid(input, "/proposition/carriedQualifiers/extra", /additional property/);
});

test("nullable types accept null but reject unsupported scalar types", () => {
  const input = fixture();
  assert.equal(validateDipInput(input), input);
  input.authorityGrant.expiresAt = false;
  invalid(input, "/authorityGrant/expiresAt", /string or null/);
});

test("optional domain gate and correction records still enforce nested required fields", () => {
  const input = fixture();
  input.domainGate = { id: "test" };
  invalid(input, "/domainGate/gateName", /required/);
  delete input.domainGate;
  input.object.standing.V.corrections = [{ correctionId: "test", recordedAt: "now" }];
  invalid(input, "/object/standing/V/corrections/0/note", /required/);
});

test("schema-defined string hashes are not silently promoted into cryptographic checks", () => {
  const input = fixture();
  // RC1 specifies type:string, with no pattern or content/hash consistency rule.
  // The evaluator retains responsibility for those semantic checks.
  input.object.contentHash = "not-a-sha256-digest";
  assert.equal(validateDipInput(input), input);
  input.object.contentHash = 123;
  invalid(input, "/object/contentHash", /expected type string/);
});

test("JSON values allowed by unconstrained diff fields remain valid without inventing authority", () => {
  const input = fixture();
  input.transition.diffs = [{ dimension: "Q", changeKind: "REPLACE", from: { arbitrary: [null, 1, false] }, to: "different", material: true, citedWarrantId: null, description: "Synthetic only" }];
  assert.equal(validateDipInput(input), input);
  input.transition.diffs[0].changeKind = "PRESUME";
  invalid(input, "/transition/diffs/0/changeKind", /allowed enum/);
});

test("non-JSON inputs fail before serialization can change or omit their values", () => {
  for (const value of [undefined, NaN, Infinity, 1n, () => true]) {
    const input = fixture();
    input.object.contentHash = value;
    invalid(input, "/object/contentHash", /JSON value/);
  }
  const input = fixture();
  input.authorityGrant.expiresAt = new Date();
  invalid(input, "/authorityGrant/expiresAt", /plain JSON object/);
  input.authorityGrant.expiresAt = null;
  input.relations = new Array(1);
  invalid(input, "/relations", /sparse/);
});

test("getters and cyclic objects are rejected without invoking user code", () => {
  const input = fixture();
  let calls = 0;
  Object.defineProperty(input.source, "admitted", { get() { calls++; return true; }, enumerable: true });
  invalid(input, "/source/admitted", /data property/);
  assert.equal(calls, 0);
  const cyclic = fixture();
  cyclic.object.contentHash = cyclic;
  invalid(cyclic, "/object/contentHash", /cyclic/);
});

test("error paths use escaped JSON pointers and messages do not echo supplied values", () => {
  const input = fixture();
  input["invalid/key~name"] = "private detail";
  invalid(input, "/invalid~1key~0name", /additional property/);
});

test("a future unsupported assertion or external reference fails closed during compilation", () => {
  for (const alteration of [
    (schema) => { schema.$defs.InformationObject.properties.contentHash.maxLength = 64; },
    (schema) => { schema.properties.source.$ref = "https://example.invalid/source.json"; },
  ]) {
    const schema = JSON.parse(fs.readFileSync(new URL("../public/evaluation-input.schema.json", import.meta.url), "utf8"));
    alteration(schema);
    assert.throws(() => compileSchema(schema), (error) => error.code === "DIP_INPUT_SCHEMA_UNSUPPORTED");
  }
});

test("constant, minimum length, and hash patterns enforce declared schema assertions", () => {
  const validate = compileSchema({ type: "object", properties: {
    version: { const: "v1" }, hash: { type: "string", pattern: "^[0-9a-f]{64}$" }, label: { type: "string", minLength: 2 },
  }, required: ["version", "hash", "label"] });
  const valid = { version: "v1", hash: "a".repeat(64), label: "ok" };
  assert.equal(validate(valid), valid);
  for (const hash of ["a".repeat(63), "g".repeat(64), "A".repeat(64), "a".repeat(64) + "\n"]) {
    assert.throws(() => validate({ ...valid, hash }), (error) => error.path === "/hash");
  }
  assert.throws(() => validate({ ...valid, version: "v2" }), /required constant/);
  assert.throws(() => validate({ ...valid, label: "" }), /minLength/);
  assert.throws(() => validate({ ...valid, label: "😀" }), /minLength/);
  assert.equal(validate({ ...valid, label: "😀x" }).label, "😀x");
});

test("date-time uses the official verifier's calendar and timezone rules", () => {
  const validate = compileSchema({ type: "string", format: "date-time" });
  for (const value of ["2026-09-10T08:00:00Z", "2024-02-29t23:59:59.999z", "2000-02-29T12:30:00+05:30", "2026-09-10T08:00:00-04:00"]) assert.equal(validate(value), value);
  for (const value of ["2026-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T00:00:00Z", "2026-13-01T00:00:00Z", "2026-09-10T24:00:00Z", "2026-09-10T08:60:00Z", "2026-09-10T08:00:60Z", "2026-09-10T08:00:00+24:00", "2026-09-10T08:00:00+00:60", "2026-09-10T08:00:00", "2026-09-10"]) {
    assert.throws(() => validate(value), /valid date-time/);
  }
});

test("unsupported formats and malformed new assertions fail at compile time", () => {
  for (const schema of [{ format: "email" }, { minLength: -1 }, { pattern: "[" }, { pattern: true }, { const: {} }]) {
    assert.throws(() => compileSchema(schema), (error) => error.code === "DIP_INPUT_SCHEMA_UNSUPPORTED");
  }
});

test("canonical official-result schema validates structure independently of authenticity", () => {
  const schema = JSON.parse(fs.readFileSync(new URL("../public/official-result.schema.json", import.meta.url), "utf8"));
  const validate = compileSchema(schema);
  // This is deliberately a structurally valid synthetic envelope, not a signed receipt.
  const result = {
    id: "synthetic", protocolVersion: "1.0.0-rc.1", resultClass: "AUTHORIZED", grantedForce: "INFORM", requestedForce: "INFORM", resultingStanding: null,
    halts: [], boundedConditions: [], residue: [], auditTrace: { id: "synthetic-audit", protocolVersion: "1.0.0-rc.1", steps: [], inputDigest: "a".repeat(64), resultDigest: "b".repeat(64) },
  };
  const envelope = {
    envelopeVersion: "WHP-DIP-OFFICIAL-RESULT-v1", protocol: "Decision Integrity Protocol", release: "1.0.0-rc.1",
    releaseSha256: "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263", termsVersion: "WHP-DIP-PUBLIC-TERMS-v1",
    receiptId: "synthetic-only", resultId: "synthetic", inputDigest: "a".repeat(64), resultDigest: "b".repeat(64), issuedAt: "2026-09-10T08:00:00Z", keyId: "synthetic-only", result,
    signature: { algorithm: "Ed25519", encoding: "base64", value: "synthetic-only-not-a-signature" },
  };
  assert.equal(validate(envelope), envelope);
  envelope.inputDigest = "invalid";
  assert.throws(() => validate(envelope), (error) => error.path === "/inputDigest" && /pattern/.test(error.reason));
});
