# DIP receipt propagation

A recipient can open [Use DIP](https://decision-integrity.wheelerhubbell.chatgpt.site/dip) to verify the original receipt on their own device and start a new use. The browser downloads WHP’s public keys independently; it does not upload the receipt or initiate payment. The Node companion verifier also checks the companion’s full-file checksum.

The receipt companion gives a result's next reader a route back to WHP verification and the DIP service. It travels with the original receipt through a caller's chosen report, attachment, or agent handoff.

## Implemented public tools

`tools/receipt-companion.mjs` is a dependency-free Node.js module and command-line tool. Use Node.js 22 or later. Packaging and local verification need no wallet, payment, third-party account, or network request.

Each package contains:

| File | Purpose |
| --- | --- |
| `official-result.json` | Exact bytes supplied by the caller, including whitespace; never reserialized or amended. |
| `receipt-companion.json` | Receipt identity, full-file checksum, and fixed WHP discovery and verification links. |
| `README.md` | Links and instructions for the next reader. |

The companion's contract is [public/receipt-companion.schema.json](public/receipt-companion.schema.json). It is separate from the signed v1 result envelope. Carry all three files when sharing a package so the discovery route travels with the receipt.

## Automatically package an agent's returned receipt

Use the helper in the public repository with your existing authorized x402 fetch client:

```js
import { createDipClient, writeReceiptPackage } from "./tools/receipt-companion.mjs";

// fetchWithPayment is your configured x402 client with its own spending limits.
// input is a complete request conforming to public/evaluation-input.schema.json.
const evaluate = createDipClient(fetchWithPayment);
const { response, receiptPackage, packagingError } = await evaluate(input);

if (receiptPackage) {
  // The directory must be new. This only writes local files.
  writeReceiptPackage(receiptPackage, "./receipt-package");
}

// The original response body remains readable, even when packaging fails.
const resultOrError = await response.text();
```

Before calling the supplied payment client, the helper automatically validates the request against the bundled [evaluation input schema](public/evaluation-input.schema.json). Invalid input rejects locally with `code: "DIP_INPUT_INVALID"`, a JSON-pointer `path`, and a `reason`; no request or payment authorization is attempted. Validation leaves the input unchanged. It checks structure, not the truth of supplied evidence, hash consistency, or the existence of authority. It does not fill missing fields or grant permissions.

After preflight passes, the helper makes one call through the supplied client to the existing DIP endpoint. The supplied x402 client owns payment handling and any protocol retry. Once a recognizable successful receipt arrives, the helper constructs its companion automatically. It performs no additional evaluation, payment, upload, tracking, or forwarding.

A `402` or other unsuccessful HTTP response returns `receiptPackage: null` and preserves the response. An unexpected successful body also preserves the response, with `packagingError: "RECEIPT_NOT_PACKAGED"`. It does not retry a potentially paid request just because packaging failed.

Existing integrations can instead pass their returned Fetch `Response` to `packageDipResponse(response)`, or pass the original receipt bytes to `createReceiptPackage(bytes)`.

## Package an existing receipt

From a copy of this repository:

```sh
node tools/receipt-companion.mjs pack /path/to/official-result.json ./receipt-package
```

This creates a new local directory and refuses to overwrite an existing one. It does not alter or reissue the receipt, and it does not verify the signature merely by packaging it. New directories and files use private filesystem permissions.

## Verify a received package

Obtain the [WHP key registry](https://raw.githubusercontent.com/wheelerhubbell/DIP/main/public/.well-known/whp-dip-keys.json) independently through WHP's established public repository. Do not trust replacement keys merely because a sender includes them in a package.

```sh
node tools/receipt-companion.mjs verify ./receipt-package /path/to/trusted-whp-dip-keys.json
```

Verification checks the receipt's exact file checksum and identity against the companion, requires the expected WHP discovery destinations, and runs the published v1 signature and result-digest checks against the supplied trusted registry. The verifier accepts the SPKI public-key encoding used by WHP's published registry, as well as PEM public keys.

The companion is unsigned. Its checksum binds the two local files for consistency; it is not independent evidence of WHP authorship. The existing WHP signature authenticates the v1 receipt statement and the digest of `resultClass`, `halts`, and `grantedForce`. It does not authenticate every other nested result field or establish what code production executed. See [the exact verification scope](OFFICIAL_RESULT_VERIFICATION.md).

## How the next encounter happens

When a caller chooses to include a package in a report or handoff, its recipient can follow the companion to the public service description, verification instructions, request schema, and evaluation endpoint. Verification of the existing receipt is local and free. A new evaluation is a separate request through the paid service.

The caller decides whether the original receipt is appropriate to share. The helper does not publish private inputs or results, contact recipients, or generate artificial traffic. A result never acquires broader authority merely because it is forwarded.

## Integration state

The public module, CLI, response helper, schema, and synthetic integration tests are implemented. The helper automatically creates companions for clients that use it. The existing production endpoint's direct response body has not been changed, and no production HTTP `Link` header has been added. Attaching a companion to every server response would require integration with that private deployment.

Run the public tool tests without installing the site's dependencies:

```sh
node --test tools/input-preflight.test.mjs tools/receipt-companion.test.mjs verify/verify-official-result.test.mjs
```
