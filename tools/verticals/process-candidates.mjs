import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRegistry } from "./validate-registry.mjs";
import { loadTrustPolicy, verifyVerticalSources } from "./source-verification.mjs";

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(path.resolve(file), "utf8")); } catch { return fallback; }
}

function now() { return new Date().toISOString(); }

function candidateCode(candidate) {
  return String(candidate?.classification?.code ?? candidate?.naics_code ?? "");
}

function uniqueBySlug(verticals) {
  const seen = new Set();
  return verticals.filter((v) => v?.slug && !seen.has(v.slug) && seen.add(v.slug));
}

export async function processCandidates({
  candidatesPath = "data/vertical-queue/candidates.json",
  registryPath = "data/verticals.json",
  manifestPath = "data/vertical-manifest.json",
  failPath = "data/vertical-queue/registry.fail.json",
  passPath = "data/vertical-queue/registry.pass.json",
  trustPolicyPath = "data/trusted-source-domains.json",
  apply = false,
} = {}) {
  const registry = await readJson(registryPath, { verticals: [] });
  const input = await readJson(candidatesPath, { candidates: [] });
  const candidates = Array.isArray(input) ? input : (input.candidates ?? []);
  const manifest = await readJson(manifestPath, { version: 1, processed: {} });
  manifest.version = 1;
  manifest.processed ??= {};
  const policy = await loadTrustPolicy(trustPolicyPath);

  const accepted = [];
  const quarantined = [];
  let working = [...registry.verticals];

  for (const candidate of candidates) {
    const code = candidateCode(candidate);
    const structural = validateRegistry({ verticals: [...working, candidate] });
    if (!structural.ok) {
      quarantined.push({ code, slug: candidate.slug, violation_code: "REGISTRY_VALIDATION_FAILED", errors: structural.errors, candidate });
      if (code) manifest.processed[code] = { status: "quarantined", at: now(), reason: "REGISTRY_VALIDATION_FAILED" };
      continue;
    }

    const sourceCheck = await verifyVerticalSources(candidate, policy);
    if (!sourceCheck.ok) {
      quarantined.push({ code, slug: candidate.slug, violation_code: "SOURCE_VERIFICATION_FAILED", source_results: sourceCheck.results, candidate });
      if (code) manifest.processed[code] = { status: "quarantined", at: now(), reason: "SOURCE_VERIFICATION_FAILED" };
      continue;
    }

    accepted.push({ code, slug: candidate.slug, source_results: sourceCheck.results, candidate });
    working.push(candidate);
    if (code) manifest.processed[code] = { status: "accepted", at: now(), slug: candidate.slug };
  }

  working = uniqueBySlug(working);
  await fs.mkdir(path.dirname(path.resolve(failPath)), { recursive: true });
  await fs.writeFile(path.resolve(failPath), `${JSON.stringify({ generated_at: now(), quarantined }, null, 2)}\n`);
  await fs.writeFile(path.resolve(passPath), `${JSON.stringify({ generated_at: now(), accepted }, null, 2)}\n`);
  await fs.writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

  if (apply && accepted.length) {
    const finalCheck = validateRegistry({ verticals: working });
    if (!finalCheck.ok) throw new Error(`Refusing registry write: ${finalCheck.errors.join("; ")}`);
    await fs.writeFile(path.resolve(registryPath), `${JSON.stringify({ ...registry, verticals: working }, null, 2)}\n`);
  }

  return { accepted: accepted.length, quarantined: quarantined.length, applied: apply ? accepted.length : 0 };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const result = await processCandidates({ apply });
  console.log(`Candidates processed: ${result.accepted} accepted, ${result.quarantined} quarantined, ${result.applied} applied.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}
