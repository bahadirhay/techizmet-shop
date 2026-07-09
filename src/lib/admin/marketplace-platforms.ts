export const MARKETPLACE_PLATFORMS = [
  { id: "trendyol", label: "Trendyol" },
  { id: "hepsiburada", label: "Hepsiburada" },
  { id: "n11", label: "n11" },
  { id: "amazon_tr", label: "Amazon.com.tr" },
  { id: "ciceksepeti", label: "Çiçeksepeti" },
  { id: "pazarama", label: "Pazarama" },
] as const;

export const SHIPPING_CARRIER_PRESETS = [
  { code: "yurtici", name: "Yurtiçi Kargo", trackingUrlTemplate: "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={tracking}" },
  { code: "aras", name: "Aras Kargo", trackingUrlTemplate: "https://www.araskargo.com.tr/trmm.aspx?q={tracking}" },
  { code: "surat", name: "Sürat Kargo", trackingUrlTemplate: "https://www.suratkargo.com.tr/KargoTakip/?kargotakipno={tracking}" },
  { code: "mng", name: "MNG Kargo", trackingUrlTemplate: "https://www.mngkargo.com.tr/track/{tracking}" },
  { code: "ptt", name: "PTT Kargo", trackingUrlTemplate: "https://gonderitakip.ptt.gov.tr/Track/{tracking}" },
  { code: "hepsijet", name: "HepsiJet", trackingUrlTemplate: "https://www.hepsijet.com/gonderi-takibi/{tracking}" },
  { code: "sendeo", name: "Sendeo", trackingUrlTemplate: "https://sendeo.com.tr/tracking/{tracking}" },
  { code: "ups", name: "UPS", trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}" },
] as const;

export const ORDER_STATUSES = [
  { id: "awaiting_payment", label: "Ödeme bekleniyor" },
  { id: "pending", label: "Beklemede" },
  { id: "confirmed", label: "Onaylandı" },
  { id: "preparing", label: "Hazırlanıyor" },
  { id: "shipped", label: "Kargoya Verildi" },
  { id: "delivered", label: "Teslim Edildi" },
  { id: "cancelled", label: "İptal" },
  { id: "refund_requested", label: "İade Talebi" },
  { id: "refunded", label: "İade Edildi" },
] as const;
