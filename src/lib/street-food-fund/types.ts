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
  /** Yayınlanmış bağış adedi (tüm zamanlar) */
  publishedDonationCount: number;
  /** Benzersiz alıcı / kurum sayısı */
  uniqueRecipientCount: number;
  /** Yayınlanmış bağışların toplam gramı */
  totalDeliveredGrams: number;
  totalDeliveredLabel: string;
  /** Örn. “Şimdiye kadar 2 yere toplam 30 kg mama ulaştırdık.” — yoksa null */
  impactLabel: string | null;
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
