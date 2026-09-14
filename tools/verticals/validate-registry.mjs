import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BANNED_TERMS = [
  "stakeholder",
  "synergy",
  "optimize",
  "optimization",
  "solution",
  "solutions",
  "seamless",
  "best practice",
  "best practices",
];

const DEFAULT_MAX_JACCARD = 0.20;

function textValues(vertical) {
  return [
    vertical.slug,
    vertical.name,
    vertical.core_decision,
    vertical.example_request,
    ...Object.values(vertical.vocabulary ?? {}),
    ...(vertical.evidence_types ?? []),
    ...(vertical.authority_roles ?? []),
    ...(vertical.discovery_terms ?? []),
    ...(vertical.regulatory_authorities ?? []).flatMap((x) => typeof x === "string" ? [x] : [x?.name, x?.jurisdiction]),
    ...(vertical.standards ?? []).flatMap((x) => typeof x === "string" ? [x] : [x?.name, x?.citation]),
    ...(vertical.liabilities ?? []),
  ].filter(Boolean).map(String);
}

function phraseFingerprint(vertical) {
  const phrases = [
    ...Object.values(vertical.vocabulary ?? {}),
    ...(vertical.evidence_types ?? []),
    ...(vertical.authority_roles ?? []),
    ...(vertical.discovery_terms ?? []),
    ...(vertical.regulatory_authorities ?? []).map((x) => typeof x === "string" ? x : x?.name),
    ...(vertical.standards ?? []).map((x) => typeof x === "string" ? x : x?.name),
    ...(vertical.liabilities ?? []),
  ];
  return new Set(phrases.filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateGeneratedSpecificity(vertical, errors) {
  const classification = vertical.classification;
  if (!classification) return;

  assert(classification.system === "NAICS-2022", `${vertical.slug}: classification.system must be NAICS-2022`, errors);
  assert(/^\d{6}$/.test(String(classification.code ?? "")), `${vertical.slug}: classification.code must be a six-digit NAICS code`, errors);
  assert(typeof classification.title === "string" && classification.title.trim().length >= 3, `${vertical.slug}: classification.title is required`, errors);

  assert(Array.isArray(vertical.regulatory_authorities) && vertical.regulatory_authorities.length >= 1,
    `${vertical.slug}: generated NAICS vertical requires regulatory_authorities`, errors);
  assert(Array.isArray(vertical.standards) && vertical.standards.length >= 1,
    `${vertical.slug}: generated NAICS vertical requires standards`, errors);
  assert(Array.isArray(vertical.liabilities) && vertical.liabilities.length >= 1,
    `${vertical.slug}: generated NAICS vertical requires liabilities`, errors);
  assert(Array.isArray(vertical.authoritative_sources) && vertical.authoritative_sources.length >= 1,
    `${vertical.slug}: generated NAICS vertical requires authoritative_sources`, errors);

  for (const source of vertical.authoritative_sources ?? []) {
    assert(source && typeof source.title === "string" && source.title.trim().length >= 3,
      `${vertical.slug}: every authoritative source requires a title`, errors);
    assert(source && /^https:\/\//i.test(source.url ?? ""),
      `${vertical.slug}: every authoritative source requires an https URL`, errors);
    assert(["taxonomy", "regulator", "statute", "regulation", "standard", "official-guidance"].includes(source.kind),
      `${vertical.slug}: authoritative source kind is invalid`, errors);
  }
}

export function validateRegistry(registry, options = {}) {
  const errors = [];
  const maxJaccard = Number(options.maxJaccard ?? process.env.MAX_VERTICAL_JACCARD ?? DEFAULT_MAX_JACCARD);
  const verticals = registry?.verticals;

  assert(Array.isArray(verticals) && verticals.length > 0, "registry.verticals must be a non-empty array", errors);
  if (!Array.isArray(verticals)) return { ok: false, errors };

  const slugs = new Set();
  const naicsCodes = new Set();

  for (const vertical of verticals) {
    const slug = vertical?.slug ?? "<missing-slug>";
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), `${slug}: invalid slug`, errors);
    assert(!slugs.has(slug), `${slug}: duplicate slug`, errors);
    slugs.add(slug);

    for (const required of ["name", "core_decision", "example_request"]) {
      assert(typeof vertical?.[required] === "string" && vertical[required].trim().length >= 10,
        `${slug}: ${required} must be specific text`, errors);
    }
    assert(vertical?.vocabulary && typeof vertical.vocabulary === "object", `${slug}: vocabulary is required`, errors);
    for (const key of ["primary_actor", "artifact", "validation_event"]) {
      assert(typeof vertical?.vocabulary?.[key] === "string" && vertical.vocabulary[key].trim().length >= 2,
        `${slug}: vocabulary.${key} is required`, errors);
    }
    for (const key of ["evidence_types", "authority_roles", "discovery_terms"]) {
      assert(Array.isArray(vertical?.[key]) && vertical[key].length >= 2, `${slug}: ${key} requires at least two entries`, errors);
    }

    const haystack = textValues(vertical).join("\n").toLowerCase();
    for (const banned of BANNED_TERMS) {
      const pattern = new RegExp(`(^|[^a-z])${banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
      if (pattern.test(haystack)) errors.push(`${slug}: banned generic term detected: ${banned}`);
    }

    if (vertical.classification?.code) {
      const code = String(vertical.classification.code);
      assert(!naicsCodes.has(code), `${slug}: duplicate NAICS code ${code}`, errors);
      naicsCodes.add(code);
    }
    validateGeneratedSpecificity(vertical, errors);
  }

  for (let i = 0; i < verticals.length; i += 1) {
    const a = verticals[i];
    const aSet = phraseFingerprint(a);
    for (let j = i + 1; j < verticals.length; j += 1) {
      const b = verticals[j];
      const score = jaccard(aSet, phraseFingerprint(b));
      if (score > maxJaccard) {
        errors.push(`${a.slug} <-> ${b.slug}: semantic phrase overlap ${(score * 100).toFixed(1)}% exceeds ${(maxJaccard * 100).toFixed(0)}%`);
      }
    }
  }

  return { ok: errors.length === 0, errors, count: verticals.length, maxJaccard };
}

function main() {
  const target = process.argv[2] ?? "data/verticals.json";
  const absolute = path.resolve(process.cwd(), target);
  const registry = JSON.parse(fs.readFileSync(absolute, "utf8"));
  const result = validateRegistry(registry);
  if (!result.ok) {
    console.error(`Vertical registry validation failed (${result.errors.length} error(s)):`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Vertical registry valid: ${result.count} vertical(s), max semantic overlap ${(result.maxJaccard * 100).toFixed(0)}%.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
