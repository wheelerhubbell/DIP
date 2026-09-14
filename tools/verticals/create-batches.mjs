import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BATCH_SIZE = 50;
const BANNED = ["stakeholder","synergy","optimize","optimization","solution","solutions","seamless","best practice","best practices"];

function slugify(value) {
  return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function makeTask(industry) {
  const slug = `${industry.code}-${slugify(industry.title)}`;
  return {
    naics_code: industry.code,
    naics_title: industry.title,
    proposed_slug: slug,
    status: "pending-generation",
    generation_contract: {
      output: "one JSON object conforming to public/vertical-registry.schema.json vertical item",
      must_include: [
        "domain-native core decision",
        "domain-native primary actor, artifact, and validation event",
        "at least 4 concrete evidence types",
        "at least 4 authority roles",
        "named regulatory authorities where applicable",
        "named standards or legal citations where applicable",
        "at least 1 concrete liability",
        "at least 2 authoritative primary-source URLs",
        "one realistic example request",
        "at least 4 discovery terms"
      ],
      forbidden_terms: BANNED,
      hard_rules: [
        "Do not infer authority from NAICS alone.",
        "Do not invent statutes, regulations, standards, regulators, or professional bodies.",
        "Every regulatory, statutory, standards, and liability claim must be supportable by a cited primary source.",
        "Use exact domain vocabulary rather than generic corporate language.",
        "If reliable primary sources cannot be established, emit status=quarantine-needed instead of guessing."
      ]
    }
  };
}

async function main() {
  const taxonomyPath = process.argv[2] ?? "data/naics-2022.json";
  const manifestPath = process.argv[3] ?? "data/vertical-manifest.json";
  const outputPath = process.argv[4] ?? "data/vertical-queue/pending.json";
  const batchSize = Number(process.env.VERTICAL_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);

  const taxonomy = JSON.parse(await fs.readFile(path.resolve(taxonomyPath), "utf8"));
  let manifest = { version: 1, processed: {} };
  try { manifest = JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8")); } catch {}

  const remaining = taxonomy.industries.filter((industry) => !manifest.processed?.[industry.code]);
  const tasks = remaining.slice(0, batchSize).map(makeTask);
  const queue = {
    taxonomy: taxonomy.taxonomy,
    source_url: taxonomy.source_url,
    created_at: new Date().toISOString(),
    batch_size: batchSize,
    remaining_before_batch: remaining.length,
    tasks,
  };

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`Queued ${tasks.length} vertical candidate(s); ${Math.max(0, remaining.length - tasks.length)} remain after this batch.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}
