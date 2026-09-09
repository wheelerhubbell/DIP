import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const evmAddress = (process.env.X402_PAY_TO ??
  "0x000000000000000000000000000000000000dEaD") as `0x${string}`;

export const network = (process.env.X402_NETWORK ??
  "eip155:84532") as `eip155:${string}`;
export const price = process.env.X402_PRICE ?? "$0.001";
export const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

export const paymentServer = new x402ResourceServer(facilitatorClient);
paymentServer.register("eip155:*", new ExactEvmScheme());
