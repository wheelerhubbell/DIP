# DIP Profiles

Decision Integrity Protocol (DIP) is one canonical pre-execution authorization-evaluation protocol for consequential actions.

DIP may be accessed through domain-specific profiles, but every profile normalizes to the same canonical DIP input contract, uses the same canonical evaluator semantics, preserves the canonical result vocabulary, and produces the same class of verifiable WHP-issued result.

**Profiles expand discoverability and usability. They do not create divergent protocols.**

## Architecture

```text
DIP/AGENT ─┐
DIP/PAY   ─┤
DIP/MCP   ─┤
DIP/API   ─┤
DIP/WF    ─┤──→ Canonical DIP ──→ EPT + RC1 ──→ Canonical Result + WHP Receipt
DIP/A2A   ─┤
DIP/ENT   ─┤
DIP/BOT   ─┘
```

Many semantic entry points → one canonical DIP evaluation → one verifiable result model.

## Profile invariant

A DIP Profile may specialize context, require additional evidence, constrain accepted actions, and provide domain-specific interfaces. It may not alter the canonical meaning of authority, authorization, permitted force, decision result, receipt validity, or evaluator outcome.

A profile may be stricter than the base protocol. It may not weaken or redefine the base protocol's constitutional rules.

All consequential domain actions must normalize to a canonical requested transition before evaluation. No domain adapter may bypass canonical evaluation or issue a result that appears equivalent to a canonical DIP result without passing through the canonical evaluator.

Domain labels are presentation and discovery vocabulary only. They do not create new decision classes.

## Canonical RC1 result vocabulary

Profiles preserve the existing RC1 vocabulary:

- `AUTHORIZED`
- `BOUNDED`
- `AWAITING_AUTHORITY`
- `DENIED`

A profile may explain a result in domain language, but the underlying result class remains canonical.

## Profile registry

| Shorthand | Profile | Purpose |
| --- | --- | --- |
| `DIP/AGENT` | AI Agents | Delegated-action authorization for autonomous and semi-autonomous agents |
| `DIP/PAY` | Autonomous Payments | Constrained-spend authorization before an agent-initiated payment or purchase |
| `DIP/MCP` | MCP | Pre-execution authority evaluation for consequential MCP tool invocation |
| `DIP/API` | APIs | Authorization gate for API requests that create consequential external effects |
| `DIP/WF` | Approval Workflows | Bounded-force evaluation for human approvals and workflow transitions |
| `DIP/A2A` | AI-to-AI Actions | Standing and delegated-authority evaluation for agent-originated requests |
| `DIP/ENT` | Enterprise Automation | Institutional authority evaluation for consequential automated actions |
| `DIP/BOT` | Bots | Plain-language discovery alias for automated-system action authorization |

The machine-readable profile index is [`public/profiles/index.json`](public/profiles/index.json).

## Layer boundaries

### DIP Core

Canonical protocol specification, input contract, EPT constitutional rules, RC1 evaluator semantics, decision vocabulary, result structure, verification procedure, WHP issuance identity, and compatibility rules remain canonical.

### Domain Profiles

Profiles specify domain facts, required authority attributes, constraints, evidence expectations, canonical mappings, examples, and implementation guidance. They do not evaluate independently.

### Adapters and SDKs

Adapters may expose domain-native methods such as `authorizeToolCall`, `verifyApproval`, or `evaluatePayment`, but they must translate their inputs into the canonical DIP request and submit that request to canonical evaluation.

### Discovery Surfaces

Discovery surfaces use the vocabulary of the problem a developer or agent is already trying to solve. They route the user or machine to a profile and then to canonical DIP.

## Identity

Wheeler Hubbell Publishing, Inc. remains the institutional issuing and verification identity for official DIP results. A profile name does not create a separate issuer, evaluator, protocol lineage, or trust model.

**DIP is not a collection of authorization products. It is one decision-integrity object made reachable through multiple authorized relationships to real-world action domains.**
