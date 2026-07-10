/** Amazon listing issue mesajlarını admin panelde okunur hale getirir. */
export function formatAmazonListingError(message: string): string {
  const url = message.match(/https:\/\/[^\s'"]+/)?.[0];
  const brandFromUrl = url?.match(/brandName=([^&]+)/)?.[1];

  if (
    message.includes("Onay İsteyin") ||
    message.includes("onaylanmamış") ||
    message.includes("approvalrequest")
  ) {
    const brand = brandFromUrl ? decodeURIComponent(brandFromUrl.replace(/\+/g, " ")) : "markanız";
    const hint =
      brand === "Anatolian"
        ? " (Amazon'da onaylı ad «Anatolian Paw» — panelden yeniden gönderin)"
        : "";
    return url
      ? `Marka onayı gerekli (${brand})${hint} — Seller Central: ${url}`
      : `Marka onayı gerekli (${brand})${hint}: ${message.slice(0, 180)}`;
  }

  if (message.includes("katalogda olmaması") || message.includes("13013")) {
    return (
      "Ürün henüz Amazon kataloğunda oluşturulamadı (marka onayı veya görsel hataları giderildikten sonra yeniden gönderin). " +
      "Panelden ürünü tekrar Amazon'a gönderin."
    );
  }

  if (
    message.includes("zaman aşımı") ||
    message.includes("indirilemedi") ||
    message.includes("Resim dosya türünüz desteklenmiyor") ||
    message.includes("unsupported image")
  ) {
    return (
      "Görsel Amazon gereksinimlerine uymuyor veya indirilemedi. Admin panelden ürünü yeniden gönderin " +
      "(görseller artık JPEG, min 1000px olarak iletilir)."
    );
  }

  return message;
}

export function amazonBrandApprovalUrl(brandName: string): string {
  const q = new URLSearchParams({
    restrictionScope: "CONTRIBUTION",
    brandName,
    operationFilter: "use_brand_value",
  });
  return `https://sellercentral.amazon.com.tr/hz/approvalrequest?${q}`;
}
