export type AmazonSpApiCredentials = {
  sellerId: string;
  lwaClientId: string;
  lwaClientSecret: string;
  refreshToken: string;
  region: "eu" | "na" | "fe";
};

const REGION_ENDPOINTS: Record<AmazonSpApiCredentials["region"], string> = {
  eu: "https://sellingpartnerapi-eu.amazon.com",
  na: "https://sellingpartnerapi-na.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

export function parseAmazonConfig(config: Record<string, string>): AmazonSpApiCredentials | null {
  const sellerId = config.sellerId?.trim() || config.amazonSellerId?.trim();
  const lwaClientId = config.lwaClientId?.trim() || config.apiKey?.trim();
  const lwaClientSecret = config.lwaClientSecret?.trim() || config.apiSecret?.trim() || config.secretKey?.trim();
  const refreshToken = config.refreshToken?.trim() || config.amazonRefreshToken?.trim();
  if (!sellerId || !lwaClientId || !lwaClientSecret || !refreshToken) return null;

  const regionRaw = (config.amazonRegion ?? config.spApiRegion ?? "eu").trim().toLowerCase();
  const region = regionRaw === "na" || regionRaw === "fe" ? regionRaw : "eu";

  return { sellerId, lwaClientId, lwaClientSecret, refreshToken, region };
}

export function amazonSpApiBase(creds: AmazonSpApiCredentials): string {
  return REGION_ENDPOINTS[creds.region];
}

export async function getAmazonAccessToken(
  creds: AmazonSpApiCredentials,
): Promise<{ accessToken: string; error?: string }> {
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: creds.lwaClientId,
      client_secret: creds.lwaClientSecret,
    }),
  });
  const text = await res.text();
  let json: { access_token?: string; error_description?: string } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* ignore */
  }
  if (!res.ok || !json.access_token) {
    return { accessToken: "", error: json.error_description ?? `LWA HTTP ${res.status}` };
  }
  return { accessToken: json.access_token };
}

export async function amazonSpApiRequest(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  path: string,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const url = `${amazonSpApiBase(creds)}${path}`;
  const res = await fetch(url, {
    headers: {
      "x-amz-access-token": accessToken,
      Accept: "application/json",
      "User-Agent": "TechizmetShop/1.0 (Language=TypeScript)",
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export type AmazonFinancialEventGroup = {
  financialEventGroupId: string;
  processingStatus: string | null;
  fundTransferStatus: string | null;
  fundTransferDate: Date | null;
  originalTotalMinor: number;
  convertedTotalMinor: number;
};

export type AmazonFinancialEvents = {
  amazonOrderIds: string[];
  shipmentNetMinor: number;
  feeMinor: number;
};

function parseCurrencyMinor(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const obj = raw as Record<string, unknown>;
  const amount = Number(obj.CurrencyAmount ?? obj.amount ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.abs(amount) * 100);
}

function parseGroup(raw: Record<string, unknown>): AmazonFinancialEventGroup | null {
  const id = String(raw.FinancialEventGroupId ?? "").trim();
  if (!id) return null;
  const fundDateRaw = raw.FundTransferDate ?? raw.FinancialEventGroupEnd;
  const fundTransferDate = fundDateRaw ? new Date(String(fundDateRaw)) : null;
  return {
    financialEventGroupId: id,
    processingStatus: raw.ProcessingStatus != null ? String(raw.ProcessingStatus) : null,
    fundTransferStatus: raw.FundTransferStatus != null ? String(raw.FundTransferStatus) : null,
    fundTransferDate: fundTransferDate && !Number.isNaN(fundTransferDate.getTime()) ? fundTransferDate : null,
    originalTotalMinor: parseCurrencyMinor(raw.OriginalTotal),
    convertedTotalMinor: parseCurrencyMinor(raw.ConvertedTotal),
  };
}

export async function fetchAmazonFinancialEventGroups(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  postedAfter: Date,
  postedBefore: Date,
): Promise<{ groups: AmazonFinancialEventGroup[]; error?: string }> {
  const groups: AmazonFinancialEventGroup[] = [];
  let nextToken: string | undefined;

  do {
    const qs = new URLSearchParams({
      FinancialEventGroupStartedAfter: postedAfter.toISOString(),
      FinancialEventGroupStartedBefore: postedBefore.toISOString(),
      MaxResultsPerPage: "100",
    });
    if (nextToken) qs.set("NextToken", nextToken);

    const res = await amazonSpApiRequest(
      creds,
      accessToken,
      `/finances/v0/financialEventGroups?${qs}`,
    );
    if (!res.ok) {
      return { groups, error: `Amazon finans HTTP ${res.status}: ${res.text.slice(0, 200)}` };
    }

    const payload = (res.json as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
    const list = (payload?.FinancialEventGroupList as Record<string, unknown>[]) ?? [];
    for (const item of list) {
      const parsed = parseGroup(item);
      if (parsed) groups.push(parsed);
    }
    nextToken = payload?.NextToken != null ? String(payload.NextToken) : undefined;
  } while (nextToken);

  return { groups };
}

export async function fetchAmazonFinancialEventsByGroup(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  eventGroupId: string,
): Promise<{ events: AmazonFinancialEvents; error?: string }> {
  const amazonOrderIds = new Set<string>();
  let shipmentNetMinor = 0;
  let feeMinor = 0;
  let nextToken: string | undefined;

  do {
    const path = nextToken
      ? `/finances/v0/financialEventGroups/${encodeURIComponent(eventGroupId)}/financialEvents?NextToken=${encodeURIComponent(nextToken)}`
      : `/finances/v0/financialEventGroups/${encodeURIComponent(eventGroupId)}/financialEvents?MaxResultsPerPage=100`;

    const res = await amazonSpApiRequest(creds, accessToken, path);
    if (!res.ok) {
      return {
        events: { amazonOrderIds: [], shipmentNetMinor: 0, feeMinor: 0 },
        error: `Amazon events HTTP ${res.status}: ${res.text.slice(0, 200)}`,
      };
    }

    const payload = (res.json as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
    const financialEvents = payload?.FinancialEvents as Record<string, unknown> | undefined;
    if (financialEvents) {
      const shipmentList = (financialEvents.ShipmentEventList as Record<string, unknown>[]) ?? [];
      for (const shipment of shipmentList) {
        const orderId = String(shipment.AmazonOrderId ?? "").trim();
        if (orderId) amazonOrderIds.add(orderId);

        for (const item of (shipment.ShipmentItemList as Record<string, unknown>[]) ?? []) {
          for (const charge of (item.ItemChargeList as Record<string, unknown>[]) ?? []) {
            shipmentNetMinor += parseCurrencyMinor(charge.ChargeAmount);
          }
          for (const fee of (item.ItemFeeList as Record<string, unknown>[]) ?? []) {
            feeMinor += parseCurrencyMinor(fee.FeeAmount);
          }
        }
      }
    }
    nextToken = payload?.NextToken != null ? String(payload.NextToken) : undefined;
  } while (nextToken);

  return {
    events: {
      amazonOrderIds: [...amazonOrderIds],
      shipmentNetMinor,
      feeMinor,
    },
  };
}
