import fs from "node:fs/promises";
import path from "node:path";

const REQUEST_TIMEOUT_MS = 12000;
const MAX_BODY_CHARS = 500000;

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export async function loadTrustPolicy(file = "data/trusted-source-domains.json") {
  return JSON.parse(await fs.readFile(path.resolve(file), "utf8"));
}

export function isTrustedUrl(urlString, policy) {
  let url;
  try { url = new URL(urlString); } catch { return false; }
  if (url.protocol !== "https:") return false;
  const host = normalizeHost(url.hostname);
  if ((policy.trusted_domains ?? []).some((domain) => host === normalizeHost(domain) || host.endsWith(`.${normalizeHost(domain)}`))) return true;
  return (policy.trusted_suffixes ?? []).some((suffix) => host.endsWith(String(suffix).toLowerCase()));
}

function significantTokens(text) {
  const stop = new Set(["the","and","for","with","from","into","under","official","guidance","regulation","standard","authority","department","bureau","office","commission","administration","code"]);
  return [...new Set(String(text ?? "").toLowerCase().match(/[a-z0-9][a-z0-9.-]{3,}/g) ?? [])]
    .filter((token) => !stop.has(token) && !/^https?$/.test(token));
}

function sourceClaimTokens(vertical, source) {
  const values = [source.title];
  for (const authority of vertical.regulatory_authorities ?? []) values.push(authority.name, authority.jurisdiction);
  for (const standard of vertical.standards ?? []) values.push(standard.name, standard.citation);
  values.push(vertical.classification?.title);
  return significantTokens(values.filter(Boolean).join(" ")).slice(0, 24);
}

function contentMatches(vertical, source, body, finalUrl) {
  const haystack = `${body}\n${finalUrl}`.toLowerCase();
  const tokens = sourceClaimTokens(vertical, source);
  if (!tokens.length) return { ok: false, matches: [], tokens };
  const matches = tokens.filter((token) => haystack.includes(token));
  const required = tokens.length <= 3 ? 1 : 2;
  return { ok: matches.length >= required, matches, tokens };
}

export async function verifySource(vertical, source, policy) {
  if (!isTrustedUrl(source.url, policy)) {
    return { ok: false, code: "SOURCE_DOMAIN_UNTRUSTED", url: source.url };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "WHP-DIP-Source-Verifier/1.0" },
    });
    if (!response.ok) return { ok: false, code: "SOURCE_HTTP_STATUS", status: response.status, url: source.url };
    const finalUrl = response.url || source.url;
    if (!isTrustedUrl(finalUrl, policy)) return { ok: false, code: "SOURCE_REDIRECT_UNTRUSTED", url: source.url, finalUrl };

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!(contentType.includes("text/") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("html"))) {
      return { ok: false, code: "SOURCE_CONTENT_UNVERIFIABLE", contentType, url: source.url, finalUrl };
    }

    const body = (await response.text()).slice(0, MAX_BODY_CHARS);
    const match = contentMatches(vertical, source, body, finalUrl);
    if (!match.ok) return { ok: false, code: "SOURCE_CONTENT_MISMATCH", url: source.url, finalUrl, matchedTokens: match.matches };
    return { ok: true, code: "SOURCE_VERIFIED", url: source.url, finalUrl, matchedTokens: match.matches, contentType };
  } catch (error) {
    return { ok: false, code: error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_FETCH_ERROR", url: source.url, detail: String(error?.message ?? error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyVerticalSources(vertical, policy) {
  const results = [];
  for (const source of vertical.authoritative_sources ?? []) results.push(await verifySource(vertical, source, policy));
  return { ok: results.length > 0 && results.every((result) => result.ok), results };
}
