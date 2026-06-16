export type StreetFoodFundSettings = {
  enabled?: boolean;
  /** Yeni kampanya varsayılan hedef (gram) — 50 kg = 50000 */
  defaultTargetGrams?: number;
  sloganTr?: string;
  sloganEn?: string;
  counterSubtextTr?: string;
  counterSubtextEn?: string;
  detailPath?: string;
  /** Pazaryeri siparişlerini dahil et */
  includeMarketplaceOrders?: boolean;
};

export type StreetFoodFundPublicPayload = {
  enabled: boolean;
  collectedGrams: number;
  targetGrams: number;
  progressPercent: number;
  title: string;
  slogan: string;
  counterSubtext: string;
  detailHref: string;
  collectedLabel: string;
  targetLabel: string;
};

export type StreetFoodDonationPublic = {
  id: string;
  recipientName: string;
  gramsDelivered: number;
  gramsLabel: string;
  donatedAt: string;
  storyHtml: string | null;
  photoUrls: string[];
  videoUrl: string | null;
};
