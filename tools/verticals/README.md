# Vertical generation pipeline

This directory contains deterministic gates for scaling Decision Integrity vertical doors without changing the canonical `/evaluate` engine.

## Pipeline

1. Ingest an authoritative taxonomy source such as the official 2022 NAICS structure.
2. Produce candidate vertical records in batches (recommended: 50).
3. Reject banned generic language.
4. Require concrete regulators, standards, liabilities, evidence artifacts, and authority roles for generated NAICS-backed verticals.
5. Reject semantic phrase overlap above the configured threshold (default 20%).
6. Keep failed or weak records in a review queue; do not publish them.
7. Append only validated records to `data/verticals.json`.
8. Run the normal Next.js build, which materializes `/industries/<slug>` and `/industries/<slug>/mcp.json` from the registry.

## Validation

Run:

```sh
node tools/verticals/validate-registry.mjs data/verticals.json
```

The validator currently enforces:

- unique slugs and NAICS codes;
- required domain vocabulary, evidence types, authority roles, and discovery terms;
- negative vocabulary filter (`stakeholder`, `synergy`, `optimize`, `solution`, `seamless`, `best practice`, etc.);
- for records carrying `classification`, a six-digit `NAICS-2022` code plus named regulatory authorities, standards, liabilities, and authoritative source URLs;
- maximum pairwise semantic phrase overlap of 20% by default.

Override the overlap gate only deliberately:

```sh
MAX_VERTICAL_JACCARD=0.15 node tools/verticals/validate-registry.mjs data/verticals.json
```

## Generation boundary

The generator should be model-agnostic. It may use an LLM or another extraction service, but generated claims about regulators, statutes, standards, or legal liabilities are not accepted merely because a model produced them. Candidate records must carry authoritative source links, and the deterministic validator must pass before publication.

A generation prompt should require JSON only and explicitly prohibit generic corporate language. It should ask for:

- a concrete decision question;
- a named primary actor, artifact, and validation event;
- at least four industry-native evidence artifacts;
- at least four authority roles;
- named regulatory authorities where applicable;
- named statutes, regulations, or technical standards where applicable;
- concrete liability/failure modes;
- authoritative citations/URLs supporting those domain claims;
- discovery terms and a realistic example request.

## Important distinction

Taxonomy coverage and domain truth are different problems. NAICS can provide exhaustive industry coverage, but it does not itself establish the correct regulator, standard, authority hierarchy, or liability for a particular decision. Those claims need authoritative evidence before a door is promoted into the production registry.
