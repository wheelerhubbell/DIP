#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { verifyOfficialResult } from "../verify/verify-official-result.mjs";

export const SERVICE_ENDPOINT = "https://whp-dip-x402.vercel.app/api/evaluate";
export const COMPANION_VERSION = "WHP-DIP-RECEIPT-COMPANION-v1";
export const DISCOVERY = Object.freeze({
  serviceDescriptor: "https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/service.json",
  serviceAccess: "https://github.com/wheelerhubbell/DIP/blob/main/SERVICE_ACCESS.md",
  verificationInstructions: "https://github.com/wheelerhubbell/DIP/blob/main/OFFICIAL_RESULT_VERIFICATION.md",
  publicKeyRegistry: "https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/.well-known/whp-dip-keys.json",
});

const VERSION = "1.0.0-rc.1";
const RELEASE_HASH = "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263";
const HEX = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

// This is a packaging recognition check, not a signature or full schema check.
function readEnvelope(bytes) {
  const envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  requireValue(isObject(envelope), "Expected a result envelope object");
  requireValue(envelope.envelopeVersion === "WHP-DIP-OFFICIAL-RESULT-v1", "Unsupported envelope version");
  requireValue(envelope.protocol === "Decision Integrity Protocol", "Protocol mismatch");
  requireValue(envelope.release === VERSION && envelope.releaseSha256 === RELEASE_HASH, "Release mismatch");
  requireValue(envelope.termsVersion === "WHP-DIP-PUBLIC-TERMS-v1", "Terms version mismatch");
  for (const field of ["receiptId", "resultId", "keyId"]) {
    requireValue(typeof envelope[field] === "string" && envelope[field].length > 0, `Missing ${field}`);
  }
  requireValue(typeof envelope.issuedAt === "string" && Number.isFinite(Date.parse(envelope.issuedAt)), "Invalid issuance time");
  requireValue(HEX.test(envelope.inputDigest) && HEX.test(envelope.resultDigest), "Invalid digest fields");
  requireValue(isObject(envelope.result) && envelope.result.id === envelope.resultId, "Result identity mismatch");
  requireValue(isObject(envelope.signature) && envelope.signature.algorithm === "Ed25519" && envelope.signature.encoding === "base64" && typeof envelope.signature.value === "string" && envelope.signature.value.length > 0, "Missing supported signature");
  return envelope;
}

/** Package receipt bytes locally. No network, payment, publication, or authenticity claim. */
export function createReceiptPackage(receiptBytes) {
  requireValue(typeof receiptBytes === "string" || receiptBytes instanceof Uint8Array, "Supply original receipt bytes or UTF-8 text, not a parsed object");
  const bytes = Buffer.from(receiptBytes);
  const envelope = readEnvelope(bytes);
  const companion = {
    companionVersion: COMPANION_VERSION,
    serviceName: "WHP Decision Integrity Protocol",
    receipt: {
      filename: "official-result.json",
      sha256: sha256(bytes),
      receiptId: envelope.receiptId,
      resultId: envelope.resultId,
      release: envelope.release,
      keyId: envelope.keyId,
    },
    discovery: { ...DISCOVERY },
    verificationStatus: "NOT_PERFORMED",
    sharing: "LOCAL_ONLY_UNTIL_CALLER_CHOOSES_TO_SHARE",
  };
  const readme = `# WHP DIP receipt package

This package preserves the supplied receipt in official-result.json byte for byte.
It is not verified merely because it has been packaged. The companion is unsigned.

[Verify the WHP receipt](${DISCOVERY.verificationInstructions})

[Use DIP for your own question](${DISCOVERY.serviceAccess})

[Machine-readable service description](${DISCOVERY.serviceDescriptor})

Obtain the public key registry independently from the established WHP repository.
Do not substitute a key registry supplied by the sender of this package.
Verify locally with the public tool:

\`\`\`sh
node tools/receipt-companion.mjs verify /path/to/this-package /path/to/trusted-whp-dip-keys.json
\`\`\`

The companion's full-file SHA-256 detects a mismatch between these two files.
That unsigned checksum does not establish who issued the receipt. WHP's signature
covers the existing v1 receipt statement and defined result digest, not every
nested result field. Consult the verification instructions for its exact scope.

Opening, packaging, and verifying this receipt do not send data or make a payment.
The original receipt can contain sensitive information; the caller chooses
whether and with whom to share it. Sharing this package does not grant broader
authority, certify an action, or issue a WHP Standing Mark.
`;
  return {
    companion,
    files: {
      "official-result.json": bytes,
      "receipt-companion.json": Buffer.from(JSON.stringify(companion, null, 2) + "\n"),
      "README.md": Buffer.from(readme),
    },
  };
}

/** Preserve the fetch Response for the caller, including 402s and error bodies. */
export async function packageDipResponse(response) {
  if (!response.ok) return { response, receiptPackage: null, packagingError: null };
  try {
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    return { response, receiptPackage: createReceiptPackage(bytes), packagingError: null };
  } catch {
    // Do not expose receipt contents or trigger a retry of a potentially paid call.
    return { response, receiptPackage: null, packagingError: "RECEIPT_NOT_PACKAGED" };
  }
}

/** Use an existing authorized x402 fetch client. This helper creates no wallet or payment authorization. */
export function createDipClient(authorizedFetch) {
  requireValue(typeof authorizedFetch === "function", "Supply your authorized fetch client");
  return async function evaluate(input) {
    requireValue(isObject(input), "Supply a structured DIP request");
    const response = await authorizedFetch(SERVICE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return packageDipResponse(response);
  };
}

/** Validate the companion binding and the WHP signature using independently trusted keys. */
export function verifyReceiptPackage(receiptBytes, companion, trustedRegistry) {
  const bytes = Buffer.from(receiptBytes);
  const expected = createReceiptPackage(bytes).companion;
  requireValue(isObject(companion) && companion.companionVersion === COMPANION_VERSION, "Unsupported companion version");
  requireValue(companion.verificationStatus === "NOT_PERFORMED", "Companion must not assert a verification result");
  requireValue(companion.serviceName === expected.serviceName && companion.sharing === expected.sharing, "Companion metadata mismatch");
  requireValue(isObject(companion.receipt) && isObject(companion.discovery), "Incomplete companion");
  for (const [actual, model] of [[companion, expected], [companion.receipt, expected.receipt], [companion.discovery, expected.discovery]]) {
    requireValue(Object.keys(actual).length === Object.keys(model).length && Object.keys(actual).every((key) => Object.hasOwn(model, key)), "Unexpected companion fields");
  }
  for (const [key, value] of Object.entries(expected.receipt)) {
    requireValue(companion.receipt[key] === value, `Receipt binding mismatch: ${key}`);
  }
  for (const [key, value] of Object.entries(DISCOVERY)) {
    requireValue(companion.discovery[key] === value, `Unexpected discovery destination: ${key}`);
  }
  return verifyOfficialResult(readEnvelope(bytes), trustedRegistry);
}

/** Write to a new private directory. Refuse to overwrite an existing package. */
export function writeReceiptPackage(receiptPackage, outputDirectory) {
  const names = ["official-result.json", "receipt-companion.json", "README.md"];
  for (const name of names) requireValue(receiptPackage.files[name] instanceof Uint8Array, `Missing package file: ${name}`);
  fs.mkdirSync(outputDirectory, { mode: 0o700 });
  try {
    for (const name of names) fs.writeFileSync(path.join(outputDirectory, name), receiptPackage.files[name], { flag: "wx", mode: 0o600 });
  } catch (error) {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
    throw error;
  }
}

function main(args) {
  const [command, input, destination] = args;
  if (args.length !== 3 || !["pack", "verify"].includes(command)) {
    console.error("Usage: node tools/receipt-companion.mjs pack <receipt.json> <new-directory>\n       node tools/receipt-companion.mjs verify <package-directory> <trusted-whp-dip-keys.json>");
    return 2;
  }
  try {
    if (command === "pack") {
      writeReceiptPackage(createReceiptPackage(fs.readFileSync(input)), destination);
      console.log("Receipt package created locally. Signature verification has not been performed. No data was sent and no payment was made.");
    } else {
      verifyReceiptPackage(
        fs.readFileSync(path.join(input, "official-result.json")),
        JSON.parse(fs.readFileSync(path.join(input, "receipt-companion.json"), "utf8")),
        JSON.parse(fs.readFileSync(destination, "utf8")),
      );
      console.log("VALID: receipt package binding and the published v1 signature/digest checks passed against the supplied trusted registry. No payment was made.");
    }
    return 0;
  } catch (error) {
    console.error(`FAILED: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
