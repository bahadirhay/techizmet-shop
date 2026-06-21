import { minorToTry } from "@/lib/admin/money";
import { parseCampaignScope } from "@/lib/campaign-engine";

export type CampaignFormData = {
  id?: string;
  name: string;
  code: string;
  type: string;
  percentOff: string;
  amountOff: string;
  buyQuantity: string;
  payQuantity: string;
  categoryIds: string[];
  collectionIds: string[];
  brandIds: string[];
  productIds: string[];
  minCart: string;
  freeShipping: boolean;
  autoApply: boolean;
  firstOrderOnly: boolean;
  maxUses: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  description: string;
};

export function campaignToForm(c: {
  id: string;
  name: string;
  code: string | null;
  type: string;
  percentOff: number | null;
  amountOffMinor: number | null;
  buyQuantity: number | null;
  payQuantity: number | null;
  scopeJson: string | null;
  autoApply: boolean;
  firstOrderOnly?: boolean;
  minCartMinor: number | null;
  freeShipping: boolean;
  maxUses: number | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  description: string | null;
}): CampaignFormData {
  const dt = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "");
  const scope = parseCampaignScope(c.scopeJson);
  return {
    id: c.id,
    name: c.name,
    code: c.code ?? "",
    type: c.type,
    percentOff: c.percentOff != null ? String(c.percentOff) : "",
    amountOff: c.amountOffMinor != null ? minorToTry(c.amountOffMinor) : "",
    buyQuantity: c.buyQuantity != null ? String(c.buyQuantity) : "3",
    payQuantity: c.payQuantity != null ? String(c.payQuantity) : "2",
    categoryIds: scope?.categoryIds ?? [],
    collectionIds: scope?.collectionIds ?? [],
    brandIds: scope?.brandIds ?? [],
    productIds: scope?.productIds ?? [],
    minCart: c.minCartMinor != null ? minorToTry(c.minCartMinor) : "",
    freeShipping: c.freeShipping,
    autoApply: c.autoApply ?? false,
    firstOrderOnly: c.firstOrderOnly ?? false,
    maxUses: c.maxUses != null ? String(c.maxUses) : "",
    active: c.active,
    startsAt: dt(c.startsAt),
    endsAt: dt(c.endsAt),
    description: c.description ?? "",
  };
}

export function emptyCampaignForm(): CampaignFormData {
  return {
    name: "",
    code: "",
    type: "percent_off",
    percentOff: "10",
    amountOff: "",
    buyQuantity: "3",
    payQuantity: "2",
    categoryIds: [],
    collectionIds: [],
    brandIds: [],
    productIds: [],
    minCart: "",
    freeShipping: false,
    autoApply: false,
    firstOrderOnly: false,
    maxUses: "",
    active: true,
    startsAt: "",
    endsAt: "",
    description: "",
  };
}
