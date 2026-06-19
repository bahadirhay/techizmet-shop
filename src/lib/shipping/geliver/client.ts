import "server-only";

import { GeliverClient } from "@geliver/sdk";
import type { ResolvedGeliverConfig } from "@/lib/shipping/geliver/settings";

export function createGeliverClient(config: ResolvedGeliverConfig): GeliverClient {
  if (!config.apiToken) throw new Error("Geliver API token tanımlı değil");
  return new GeliverClient({
    token: config.apiToken,
    timeoutMs: 45_000,
    maxRetries: 2,
  });
}
