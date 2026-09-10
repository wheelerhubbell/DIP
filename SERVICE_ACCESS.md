# Use the WHP Decision Integrity Protocol service

For a phone-friendly starting point, open [Use DIP](https://decision-integrity.wheelerhubbell.chatgpt.site/dip). It explains suitable transitions, verifies an existing receipt locally, and supplies copyable agent instructions. This page does not execute a paid evaluation.

Wheeler Hubbell Publishing, Inc. operates the public DIP evaluation endpoint at:

**POST https://whp-dip-x402.vercel.app/api/evaluate**

DIP evaluates whether a proposed transition is supported by the standing, authority, warrants, qualifiers, constraints, and requested force supplied in a structured request. The [protocol contract](PROTOCOL.md) defines the evaluation and its limits.

## Access and price

The endpoint advertises **1 USDC per evaluation**, using **x402 version 2 on Base mainnet**. An unpaid request receives HTTP `402 Payment Required`; an x402-capable client can read the payment requirements, authorize payment, and retry the request.

| Payment field | Advertised value |
| --- | --- |
| Network | Base mainnet — `eip155:8453` |
| Scheme | `exact` |
| Asset | Native USDC |
| USDC contract | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Amount | `1000000` base units = 1 USDC |
| WHP receiving address | `0x1050eddd8282623b0c263ed6bdbd42370bbc28d3` |

Read the current challenge before authorizing a payment and apply your client's spending limits. Base Sepolia test USDC cannot pay this mainnet endpoint.

## Construct a request

Use the complete [evaluation input schema](public/evaluation-input.schema.json), available as [raw JSON](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/evaluation-input.schema.json). A free-text question alone is not the input contract.

The request identifies the source, exact object and standing, proposition and qualifiers, proposed transition, supporting warrants and policies, requested force, and actor's authority grant. The schema specifies required fields and allowed values.

A complete [synthetic INFORM request](public/examples/inform.json) is provided as a formatting and integration example. It contains no real person, event, customer record, or operational authority. It has passed local schema validation and the retained RC1 evaluator's informational path.

The public [`createDipClient(fetchWithPayment)` helper](PROPAGATION.md) automatically checks the complete request against the bundled schema before calling the authorized payment client. Invalid requests fail locally with `code: "DIP_INPUT_INVALID"`, a JSON-pointer `path`, and a `reason`, without a network request or payment attempt. The check does not modify the request, fill missing authority, evaluate evidence, or verify hash contents. Direct HTTP calls do not receive this client-side preflight automatically.

## Read the payment challenge without paying

Download the example, then send it without payment credentials:

```sh
curl --fail --location \
  'https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/examples/inform.json' \
  --output dip-inform.json

curl --include \
  --request POST 'https://whp-dip-x402.vercel.app/api/evaluate' \
  --header 'Content-Type: application/json' \
  --data-binary @dip-inform.json
```

This sends no payment authorization. The expected payment-gate response is HTTP `402`, with base64-encoded JSON in the `Payment-Required` response header. A `402` confirms a payment challenge, not completion of an evaluation.

## Make a paid request from an agent

Use an [x402-compatible buyer client](https://docs.cdp.coinbase.com/x402/buyer/quickstart) with a funded Base-mainnet payer and an authorized spending budget. Configure the request as `POST`, set `Content-Type: application/json`, and supply the complete request body to the endpoint above.

The client must support x402 v2 and the EVM `exact` scheme. Check that the challenge names the expected network, asset, amount, and WHP recipient before signing. The client then supplies the payment authorization and retries the request according to x402.

A standalone wallet transfer is not an API call and does not obtain a DIP result.

## Read and verify a returned result

The [official-result schema](public/official-result.schema.json) and [verification procedure](OFFICIAL_RESULT_VERIFICATION.md) define the published result contract. The [public verification-key registry](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/.well-known/whp-dip-keys.json) and [independent verifier](verify/verify-official-result.mjs) are available in this repository.

Validate the returned envelope and signature before treating a result as WHP-issued. The protocol vocabulary is `AUTHORIZED`, `BOUNDED`, `AWAITING_AUTHORITY`, and `DENIED`; the RC1 evaluation path may produce a narrower subset. Payment does not guarantee a favorable outcome. A result is not, by itself, a WHP Standing Mark or authority to execute an external action.

## Carry the result forward

Use [the public receipt companion helper](PROPAGATION.md) to retain the returned receipt unchanged and attach a machine-readable route to verification and a new DIP evaluation. Its `createDipClient(fetchWithPayment)` integration packages successful receipts automatically for participating clients; it preserves error responses and does not retry paid calls on packaging failure. Direct production response bodies remain unchanged.

## Machine-readable discovery

- [Service descriptor](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/service.json)
- [OpenAPI description](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/openapi.json)
- [Agent reading index](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/llms.txt)

These files are published in this GitHub repository.

[Public terms](PUBLIC_TERMS.md) · [Source identity](SOURCE_IDENTITY.md) · [Security and authenticity](SECURITY.md)
