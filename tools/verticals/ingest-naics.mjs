import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

export const DEFAULT_NAICS_URL = "https://www.census.gov/naics/2022NAICS/2022_NAICS_Structure.xlsx";

function normalizeCell(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function extractSixDigitRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const out = [];
  for (const row of rows) {
    const cells = row.map(normalizeCell);
    const codeIndex = cells.findIndex((cell) => /^\d{6}$/.test(cell));
    if (codeIndex < 0) continue;
    const code = cells[codeIndex];
    const title = cells.slice(codeIndex + 1).find((cell) => cell && !/^\d+$/.test(cell));
    if (!title) continue;
    out.push({ code, title: title.replace(/^\s*[A-Z]\s+/, "").trim() });
  }
  return out;
}

async function readSource(source) {
  if (/^https:\/\//i.test(source)) {
    const response = await fetch(source, { redirect: "follow", headers: { "user-agent": "WHP-DIP-Vertical-Ingester/1.0" } });
    if (!response.ok) throw new Error(`NAICS source fetch failed: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return fs.readFile(path.resolve(source));
}

export async function ingestNaics(source = DEFAULT_NAICS_URL) {
  const bytes = await readSource(source);
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const records = [];
  for (const name of workbook.SheetNames) records.push(...extractSixDigitRows(workbook.Sheets[name]));

  const byCode = new Map();
  for (const record of records) if (!byCode.has(record.code)) byCode.set(record.code, record);
  const industries = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  if (industries.length < 500) {
    throw new Error(`Suspicious NAICS parse: only ${industries.length} six-digit industries found`);
  }

  return {
    taxonomy: "NAICS-2022",
    source_url: /^https:\/\//i.test(source) ? source : DEFAULT_NAICS_URL,
    retrieved_at: new Date().toISOString(),
    count: industries.length,
    industries,
  };
}

async function main() {
  const source = process.argv[2] ?? DEFAULT_NAICS_URL;
  const output = process.argv[3] ?? "data/naics-2022.json";
  const result = await ingestNaics(source);
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Ingested ${result.count} six-digit NAICS industries -> ${output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}
