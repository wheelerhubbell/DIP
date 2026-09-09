import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { evaluate, PROTOCOL_VERSION } from "@/lib/dip/index.js";
import { evmAddress, network, paymentServer, price } from "@/lib/x402";

export const runtime = "nodejs";

const handler = async (request: NextRequest) => {
  try {
    const input = await request.json();
    const result = evaluate(input);

    return NextResponse.json(
      {
        protocol: `Decision Integrity Protocol ${PROTOCOL_VERSION}`,
        release: "1.0.0-rc.1",
        releaseSha256:
          "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263",
        result,
      },
      {
        status: 200,
        headers: {
          Link: '</rsl.xml>; rel="license"; type="application/rsl+xml"',
          "X-WHP-DIP-Release": "1.0.0-rc.1",
          "X-WHP-DIP-SHA256":
            "6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_DIP_INPUT",
        detail: error instanceof Error ? error.message : "Invalid request body",
      },
      { status: 400 },
    );
  }
};

const routes = {
  "/api/evaluate": {
    accepts: [
      {
        scheme: "exact",
        price,
        network,
        payTo: evmAddress,
      },
    ],
    description:
      "Run one deterministic Decision Integrity Protocol v1.0.0-rc.1 evaluation against a complete DIP input object.",
    mimeType: "application/json",
    resource: {
      description: "WHP Decision Integrity evaluation",
      serviceName: "WHP Decision Integrity",
      tags: ["decision-integrity", "governance", "provenance", "agents"],
    },
    extensions: {
      ...declareDiscoveryExtension({
        input: {},
        inputSchema: {
          type: "object",
          description:
            "Complete DIP v1.0.0-rc.1 evaluation input. See /dip-v1.schema.json for the canonical structural schema.",
          additionalProperties: true,
        },
      }),
    },
  },
};

export const POST = withX402(handler, routes, paymentServer);
