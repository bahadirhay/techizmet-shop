import type { CartView } from "@/lib/cart/types";
import { formatCheckoutLine1 } from "@/lib/tr-address/format";
import type { LegalSellerProfile } from "@/lib/legal/seller-profile";

export type DistanceSalesBuyerContext = {
  fullName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  orderNumber?: string;
  contractDate?: string;
  paymentMethodLabel?: string;
  shippingLabel?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(value: string | undefined, placeholder: string): string {
  const v = value?.trim();
  if (v) return esc(v);
  return `<span class="kn-dsa-placeholder">${esc(placeholder)}</span>`;
}

function infoTable(rows: [string, string][]): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><th scope="row">${esc(label)}</th><td>${value}</td></tr>`,
    )
    .join("");
  return `<table class="kn-dsa-table"><tbody>${body}</tbody></table>`;
}

export function formatDistanceSalesContractDate(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildDistanceSalesBuyerContextFromCheckout(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  line1?: string;
  postalCode?: string;
  paymentMethod?: string;
  shippingLabel?: string;
}): DistanceSalesBuyerContext {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const street = formatCheckoutLine1(input.neighborhood ?? "", input.line1 ?? "") || input.line1?.trim();
  const address = [street, input.district, input.city, input.postalCode].filter(Boolean).join(", ");

  const paymentLabels: Record<string, string> = {
    cod: "Kapıda ödeme (nakit / kart)",
    bank_transfer: "Havale / EFT",
    card: "Kredi / banka kartı",
  };

  return {
    fullName: fullName || undefined,
    address: address || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    contractDate: formatDistanceSalesContractDate(),
    paymentMethodLabel: input.paymentMethod
      ? paymentLabels[input.paymentMethod] ?? input.paymentMethod
      : undefined,
    shippingLabel: input.shippingLabel?.trim() || undefined,
  };
}

export function buildDistanceSalesCartSummary(cart: CartView, formatTotal: (minor: number) => string): string {
  if (!cart.items.length) return "";
  const lines = cart.items.map(
    (item) =>
      `<li>${esc(item.title)} × ${item.qty} — ${esc(formatTotal(item.discountMinor > 0 ? item.lineTotalMinor : item.lineMinor))}</li>`,
  );
  return `<ul class="kn-dsa-products">${lines.join("")}</ul><p><strong>Toplam (vergiler dahil):</strong> ${esc(formatTotal(cart.totalMinor))}</p>`;
}

export function buildDistanceSalesAgreementHtml(
  seller: LegalSellerProfile,
  buyer: DistanceSalesBuyerContext = {},
  cartSummaryHtml = "",
): string {
  const contractDate = cell(
    buyer.contractDate,
    "Sipariş tarihi sipariş onayında sistem tarafından atanır",
  );
  const orderNumber = cell(buyer.orderNumber, "Sistem tarafından otomatik atanır");
  const taxOfficeNo =
    seller.taxOffice && seller.taxNo
      ? `${seller.taxOffice} — ${seller.taxNo}`
      : seller.taxOffice || seller.taxNo;

  const sellerTable = infoTable([
    ["Ticari Unvan", cell(seller.tradeName, "Firmanızın ticari unvanı")],
    ["Adres", cell(seller.address, "Açık adres")],
    ["Telefon", cell(seller.phone, "Telefon numarası")],
    ["E-Posta", cell(seller.email, "E-posta adresi")],
    ["MERSİS No", cell(seller.mersisNo, "MERSİS numarası")],
    ["Vergi Dairesi / No", cell(taxOfficeNo || undefined, "Vergi dairesi — numarası")],
    ["Web Sitesi", esc(seller.website)],
  ]);

  const buyerTable = infoTable([
    ["Ad Soyad", cell(buyer.fullName, "Siparişte belirtilen ad soyad")],
    ["T.C. Kimlik / Vergi No", cell(buyer.taxId, "Kimlik / vergi numarası")],
    ["Adres", cell(buyer.address, "Teslimat adresi")],
    ["Telefon", cell(buyer.phone, "Telefon numarası")],
    ["E-Posta", cell(buyer.email, "E-posta adresi")],
  ]);

  const paymentNote = buyer.paymentMethodLabel
    ? `<p><strong>Ödeme şekli:</strong> ${esc(buyer.paymentMethodLabel)}</p>`
    : "";
  const shippingNote = buyer.shippingLabel
    ? `<p><strong>Teslimat / kargo:</strong> ${esc(buyer.shippingLabel)}</p>`
    : "";

  return `<article class="kn-distance-sales-agreement">
<h1 class="kn-dsa-title">MESAFELİ SATIŞ SÖZLEŞMESİ</h1>
<p class="kn-dsa-meta"><strong>Sözleşme Tarihi:</strong> ${contractDate}</p>

<h2>MADDE 1 – TARAFLAR</h2>
<h3>SATICI</h3>
${sellerTable}
<p>Bundan sonra &quot;SATICI&quot; olarak anılacaktır.</p>

<h3>ALICI</h3>
${buyerTable}
<p>Bundan sonra &quot;ALICI&quot; olarak anılacaktır.</p>

<h2>MADDE 2 – KONU VE KAPSAM</h2>
<p>İşbu sözleşmenin konusu; ALICI&apos;nın SATICI&apos;ya ait ${esc(seller.website)} internet sitesi üzerinden elektronik ortamda sipariş verdiği, aşağıda nitelikleri ve satış fiyatı belirtilen ürünlerin satışı, teslimi ve tarafların bu işleme ilişkin karşılıklı hak ve yükümlülüklerinin belirlenmesidir.</p>
<p>İşbu sözleşme; 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine uygun olarak düzenlenmiştir.</p>

<h2>MADDE 3 – SÖZLEŞME KONUSU ÜRÜN BİLGİLERİ</h2>
<p>ALICI tarafından sipariş edilen ürün/hizmetin temel özellikleri (türü, miktarı, marka/modeli, barkodu vb.), vergiler dahil toplam satış fiyatı, ödeme şekli, teslimat koşulları ve ek masraflar (kargo, paketleme vb.) sipariş oluşturulması sırasında ALICI&apos;nın erişimine sunulan Ön Bilgilendirme Formu&apos;nda ve sipariş özetinde açıkça belirtilmiştir.</p>
<p>Bu bilgiler ve sipariş onayı, işbu sözleşmenin ayrılmaz bir parçasıdır. Ön bilgilendirme formunda yer almayan ek masraflardan ALICI sorumlu değildir.</p>
${cartSummaryHtml}
${paymentNote}
${shippingNote}
<p><strong>Sipariş Numarası:</strong> ${orderNumber}</p>

<h2>MADDE 4 – FİYAT VE ÖDEME ŞARTLARI</h2>
<p>4.1. Sözleşme konusu ürünlerin satış fiyatı, vergiler dahil olmak üzere Türk Lirası (TL) cinsinden ön bilgilendirme formunda ve sipariş özetinde gösterilmiştir.</p>
<p>4.2. Ödeme şekilleri: Kredi kartı (tek çekim/taksitli), banka havalesi/EFT, kapıda ödeme ve diğer elektronik ödeme sistemleri şeklinde olabilir.</p>
<p>4.3. Taksitli satışlarda her taksit miktarı ve toplam ödeme tutarı ayrıca gösterilir.</p>
<p>4.4. Ürün bedelinin ALICI tarafından ödenmemesi veya banka kayıtlarında iptal edilmesi durumunda, SATICI ürün teslimi yükümlülüğünden kurtulmuş sayılır.</p>
<p>4.5. ALICI, ödeme yapmadan önce verdiği siparişin ödeme yükümlülüğü anlamına geldiği konusunda bilgilendirilmiştir.</p>

<h2>MADDE 5 – TESLİMAT ŞARTLARI</h2>
<p>5.1. Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşuluyla, ALICI&apos;nın yerleşim yerinin uzaklığına bağlı olarak internet sitesinde açıklanan süre içinde ALICI veya gösterdiği adresteki kişi/kuruluşa teslim edilecektir.</p>
<p>5.2. Teslimat, ALICI&apos;nın sipariş sırasında belirttiği adrese yapılır. ALICI'dan başka bir kişi/kuruluşa teslim edilecekse, teslim edilecek kişi/kuruluşun teslimatı kabul etmemesinden SATICI sorumlu tutulamaz.</p>
<p>5.3. Ürünün teslimatı için ürün bedelinin ALICI tarafından ödenmiş olması şarttır.</p>
<p>5.4. SATICI, mücbir sebepler veya nakliyeyi engelleyen olağanüstü durumlar nedeniyle sözleşme konusu ürünü süresi içinde teslim edemezse, durumu ALICI&apos;ya bildirmekle yükümlüdür. Bu durumda ALICI; siparişi iptal etme, emsal ürünle değiştirme veya teslimat süresinin engelleyici durumun ortadan kalkmasına kadar erteleme haklarından birini kullanabilir. ALICI&apos;nın siparişi iptal etmesi halinde ödediği tutar 10 (on) gün içinde kendisine nakden ve defaten iade edilir.</p>
<p>5.5. Kargo ücreti sipariş tutarına ve kampanya koşullarına göre değişebilir. Kargo bedeli, ön bilgilendirme formunda ve sipariş özetinde ayrıca gösterilir.</p>

<h2>MADDE 6 – SATICI&apos;NIN YÜKÜMLÜLÜKLERİ</h2>
<p>6.1. SATICI, sözleşme konusu ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri ve kullanım kılavuzları ile teslim edilmesinden sorumludur.</p>
<p>6.2. SATICI, sözleşme konusu ürünün teslimatından önce ALICI&apos;ya Ön Bilgilendirme Formu&apos;nu sunmuş ve ALICI&apos;nın bu formu onaylamasını sağlamıştır.</p>
<p>6.3. SATICI, tüketicinin şikayet ve taleplerini hızlı bir şekilde sonuçlandırmak için gerekli çaba gösterir.</p>
<p>6.4. Garanti belgesi ile satılan ürünlerin arızalı veya bozuk olanları, garanti şartları içinde gerekli onarımın yapılması için SATICI&apos;ya gönderilebilir; bu durumda kargo giderleri SATICI tarafından karşılanır.</p>

<h2>MADDE 7 – ALICI&apos;NIN YÜKÜMLÜLÜKLERİ</h2>
<p>7.1. ALICI, SATICI internet sitesinde yer alan sözleşme konusu ürünlerin temel nitelikleri, satış fiyatı, ödeme şekli ve teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</p>
<p>7.2. ALICI, ürünün tesliminden sonra kredi kartının yetkisiz kişilerce haksız veya hukuka aykırı olarak kullanılması nedeniyle ilgili banka veya finans kuruluşunun ürün bedelini SATICI&apos;ya ödememesi durumunda, ürünü 3 (üç) gün içinde SATICI&apos;ya göndermekle yükümlüdür. Bu durumun ALICI&apos;nın kusurundan kaynaklanmaması şarttır.</p>
<p>7.3. ALICI, siparişin gerçekleşmesi durumunda işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.</p>

<h2>MADDE 8 – CAYMA HAKKI</h2>
<p>8.1. ALICI, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren 14 (ondört) gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>
<p>8.2. Cayma hakkı süresi, mal satışlarında malın teslim edildiği günden itibaren başlar.</p>
<p>8.3. Cayma hakkının kullanılabilmesi için; ürünün ambalajının açılmamış, bozulmamış ve ürünün tekrar satılabilirlik özelliğini kaybetmemiş olması gerekir. Açılmış, kullanılmış, bozulmuş veya hijyenik açıdan iadesi uygun olmayan ürünlerin iadesi kabul edilmez.</p>
<p>8.4. Cayma hakkı kullanılamayacak haller:</p>
<ul>
<li>Tüketicinin özel talebi veya kişisel ihtiyaçları doğrultusunda hazırlanan, üzerinde değişiklik veya ilave yapılan ürünler</li>
<li>Son kullanma tarihi geçebilecek veya çabuk bozulabilen ürünler (açılmış mama, ıslak mama, ödül mamaları vb.)</li>
<li>Sağlık ve hijyen açısından iadesi uygun olmayan ürünler (açılmış kozmetik/bakım ürünleri, tasmaların ağzına geçirilen ürünler vb.)</li>
<li>Ürün üzerindeki mühür, etiket, açma bandının kısmen veya tamamen hasar gördüğü ürünler</li>
<li>Teslimat sonrasında farklı ürünlerle karıştırılan ve yapısı itibariyle tekrar ayrılması mümkün olmayan ürünler</li>
<li>Abonelik sözleşmeleri kapsamında sağlanan ürünler (aylık mama abonelikleri vb.)</li>
</ul>
<p>8.5. Cayma hakkının kullanılması için 14 günlük süre içinde SATICI&apos;ya aşağıdaki iletişim kanallarından yazılı bildirimde bulunulması gerekir:</p>
<ul>
<li><strong>E-Posta:</strong> ${cell(seller.caymaEmail, "cayma e-posta adresi")}</li>
<li><strong>Telefon:</strong> ${cell(seller.phone, "Telefon numarası")}</li>
<li><strong>Adres:</strong> ${cell(seller.address, "Firma adresi")}</li>
</ul>
<p>8.6. Cayma bildiriminin SATICI&apos;ya ulaşmasından itibaren 14 (ondört) gün içinde ürün bedeli ALICI&apos;ya iade edilir. Ürünün iade kargo bedeli ALICI tarafından karşılanır.</p>
<p>8.7. SATICI, cayma hakkına ilişkin bilgileri Ön Bilgilendirme Formu&apos;nda ve işbu sözleşmede açıkça bildirmiştir. Bu bilgilerin usulüne uygun sunulmadığı tespit edilirse, ALICI&apos;nın cayma hakkı süresi 1 (bir) yıla uzar.</p>

<h2>MADDE 9 – GARANTİ KOŞULLARI</h2>
<p>9.1. Garanti belgesi ile satılan ürünlerde, garanti koşulları üretici veya ithalatçı firmanın garanti belgesinde belirtilen şartlara tabidir.</p>
<p>9.2. Garanti kapsamında arızalı ürünlerin onarımı için SATICI&apos;ya gönderilmesi halinde, kargo giderleri garanti süresi içinde SATICI tarafından karşılanır.</p>

<h2>MADDE 10 – GİZLİLİK VE KİŞİSEL VERİLER</h2>
<p>10.1. SATICI, ALICI&apos;ya ait kişisel verileri 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işler. Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgiler için web sitesinde yer alan Aydınlatma Metni incelenmelidir.</p>
<p>10.2. ALICI, kişisel verilerinin sipariş işlemleri, teslimat, pazarlama ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmesine onay verdiğini beyan eder.</p>

<h2>MADDE 11 – UYUŞMAZLIKLARIN ÇÖZÜMÜ</h2>
<p>11.1. İşbu sözleşmenin uygulanmasında, Sanayi ve Ticaret Bakanlığı tarafından belirlenen değere kadar Tüketici Hakem Heyetleri ile ALICI&apos;nın veya SATICI&apos;nın yerleşim yerindeki Tüketici Mahkemeleri yetkilidir.</p>
<p>11.2. Tüketici Hakem Heyeti&apos;ne başvuru için: ${cell(seller.arbitrationInfo, "İlgili Tüketici Hakem Heyeti bilgileri")}</p>
<p>11.3. Uyuşmazlıkların çözümünde Türk Hukuku uygulanır.</p>

<h2>MADDE 12 – DELİL SÖZLEŞMESİ VE SAKLAMA YÜKÜMLÜLÜĞÜ</h2>
<p>12.1. Taraflar, işbu sözleşme ve Ön Bilgilendirme Formu&apos;nun elektronik ortamda oluşturulduğunu, ALICI&apos;nın sipariş verme işlemi sırasında bu belgeleri okuduğunu ve onayladığını kabul ederler.</p>
<p>12.2. SATICI, işbu sözleşme, Ön Bilgilendirme Formu, cayma hakkı bildirimi ve ilgili tüm işlemlere dair belgeleri 3 (üç) yıl süreyle saklamakla yükümlüdür.</p>

<h2>MADDE 13 – DİĞER HÜKÜMLER</h2>
<p>13.1. İşbu sözleşme, ALICI&apos;nın ${esc(seller.website)} sitesi üzerinden sipariş vermesiyle kurulur ve elektronik ortamda ALICI tarafından onaylandığı anda yürürlüğe girer.</p>
<p>13.2. SATICI, tipografik hatalar ve yanlış fiyat girişinden sorumlu tutulamaz. Ancak bu durumun fark edilmesi halinde ALICI bilgilendirilir ve sipariş iptal edilebilir veya düzeltilerek onay istenebilir.</p>
<p>13.3. İşbu sözleşmede hüküm bulunmayan hususlarda 6502 sayılı Tüketicinin Korunması Hakkında Kanun, Mesafeli Sözleşmeler Yönetmeliği ve ilgili mevzuat hükümleri uygulanır.</p>

<h2>MADDE 14 – YÜRÜRLÜK</h2>
<p>İşbu sözleşme, ALICI tarafından elektronik ortamda onaylandığı tarihte yürürlüğe girer. ALICI, siparişi tamamlayarak işbu sözleşmenin tüm hükümlerini okuduğunu, anladığını ve kabul ettiğini beyan eder.</p>
<p class="kn-dsa-signatures"><strong>SATICI:</strong> ${cell(seller.tradeName, "Firma unvanı")}<br>
<strong>ALICI:</strong> ${cell(buyer.fullName, "Ad soyad")}<br>
<strong>Sipariş Onay Tarihi:</strong> ${contractDate}</p>
</article>`;
}
