/**
 * about-tr.html kabuğundan gizlilik / hizmet şartları / iade politikası mirror sayfaları üretir
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "theme", "techizmet-shop", "mirror");
const ABOUT_TR = join(ROOT, "pages", "about-tr.html");
const ABOUT_EN = join(ROOT, "pages", "about.html");

function buildFromShell(shellPath, mainBlock, meta) {
  const html = readFileSync(shellPath, "utf8");
  const start = html.indexOf('<main id="MainContent"');
  const end = html.indexOf("</main>", start);
  if (start < 0 || end < 0) throw new Error(`MainContent not found in ${shellPath}`);
  let out = html.slice(0, start) + mainBlock + html.slice(end + "</main>".length);
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  out = out.replace(
    /<meta property="og:title" content="[^"]*">/i,
    `<meta property="og:title" content="${meta.title}">`,
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*">/i,
    `<meta name="twitter:title" content="${meta.title}">`,
  );
  if (meta.description) {
    if (out.includes('name="description"')) {
      out = out.replace(
        /<meta name="description" content="[^"]*">/i,
        `<meta name="description" content="${meta.description}">`,
      );
    }
    if (out.includes('property="og:description"')) {
      out = out.replace(
        /<meta property="og:description" content="[^"]*">/i,
        `<meta property="og:description" content="${meta.description}">`,
      );
    }
    if (out.includes('name="twitter:description"')) {
      out = out.replace(
        /<meta name="twitter:description" content="[^"]*">/i,
        `<meta name="twitter:description" content="${meta.description}">`,
      );
    }
  }
  out = out
    .replace(/href="\.\.\/policies\/privacy-policy\.html"/g, 'href="/pages/privacy-policy"')
    .replace(/href="\.\.\/policies\/terms-of-service\.html"/g, 'href="/pages/terms-of-service"')
    .replace(/href="\.\.\/policies\/refund-policy\.html"/g, 'href="/pages/refund-policy"')
    .replace(/href="\/policies\/privacy-policy\.html"/g, 'href="/pages/privacy-policy"')
    .replace(/href="\/policies\/terms-of-service\.html"/g, 'href="/pages/terms-of-service"')
    .replace(/href="\/policies\/refund-policy\.html"/g, 'href="/pages/refund-policy"');
  return out;
}

function pageBanner(sectionKey, title, subtitle) {
  return `<section id="kn-mirror-section-template--${sectionKey}__page_banner" class="kn-mirror-section page-banner">
<div class="section-wrapper section-spacing scheme-scheme-d845756f-c4c9-40c8-b95e-18182d3a518f section-gradient" data-vvip="25">
        <div class="page--content">
          <div class="container-narrow">
            <div class="page--content-inner text-center">
        <h2 class="page--title heading-font page--item h2">${title}</h2>
        <p class="page--desc page--item text-medium">${subtitle}</p>
            </div>
          </div>
        </div>
</div>
<style>
  #kn-mirror-section-template--${sectionKey}__page_banner .section-spacing {
    --top_spacing: 25px;
    --bottom_spacing: 25px;
    --banner_height: 250px;
    --image_overlay_opacity: 0.1;
  }
  @media only screen and (max-width:767px) {
    #kn-mirror-section-template--${sectionKey}__page_banner .section-spacing {
      --top_spacing: 0px;
      --bottom_spacing: 0px;
      --banner_height: 200px;
    }
  }
</style>
</section>`;
}

function richText(sectionKey, bodyHtml) {
  return `<section id="kn-mirror-section-template--${sectionKey}__rich_text" class="kn-mirror-section section-richtext">
<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/richtext5169.css?v=67875551086195285421750848849" rel="stylesheet" type="text/css" media="all" />
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container-narrow">
    <div class="richtext--content content-medium position-left text-left">
${bodyHtml}
    </div>
  </div>
</div>
<style>
  #kn-mirror-section-template--${sectionKey}__rich_text {
    --top_spacing: 25px;
    --bottom_spacing: 40px;
  }
  @media only screen and (max-width: 767px) {
    #kn-mirror-section-template--${sectionKey}__rich_text {
      --top_spacing: 20px;
      --bottom_spacing: 30px;
    }
  }
</style>
</section>`;
}

function buildMain(sectionKey, title, subtitle, bodyHtml) {
  return `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
${pageBanner(sectionKey, title, subtitle)}
${richText(sectionKey, bodyHtml)}
</main>`;
}

const PAGES = [
  {
    slug: "privacy-policy",
    sectionKey: "policy_privacy",
    tr: {
      title: "Gizlilik Politikası",
      subtitle: "Kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu öğrenin.",
      description:
        "Anatolian Paw gizlilik politikası — kişisel verilerin korunması ve çerez kullanımı hakkında bilgi.",
      body: `
      <h3 class="heading-font h4">1. Genel</h3>
      <p>Bu gizlilik politikası, Anatolian Paw (&quot;biz&quot;) olarak web sitemizi ziyaret ettiğinizde veya alışveriş yaptığınızda kişisel verilerinizi nasıl işlediğimizi açıklar. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla hareket ederiz.</p>
      <h3 class="heading-font h4">2. Topladığımız bilgiler</h3>
      <p>Sipariş ve hesap oluşturma sırasında ad, soyad, e-posta, telefon, teslimat ve fatura adresi; ödeme işlemi için gerekli bilgiler (kart bilgileri ödeme sağlayıcısı tarafından işlenir, sunucularımızda saklanmaz); site kullanımına ilişkin çerez ve analitik verileri toplayabiliriz.</p>
      <h3 class="heading-font h4">3. Bilgilerin kullanımı</h3>
      <p>Toplanan veriler siparişlerinizi işlemek, kargo ve teslimat sağlamak, müşteri desteği sunmak, yasal yükümlülükleri yerine getirmek ve — izin vermeniz hâlinde — kampanya ve bülten iletişimi için kullanılır.</p>
      <h3 class="heading-font h4">4. Paylaşım</h3>
      <p>Verilerinizi yalnızca kargo firmaları, ödeme hizmet sağlayıcıları ve yasal zorunluluk hâlinde yetkili kurumlarla, işin gerektirdiği ölçüde paylaşırız. Verileriniz üçüncü taraflara satılmaz.</p>
      <h3 class="heading-font h4">5. Çerezler</h3>
      <p>Sitemiz deneyiminizi iyileştirmek, sepet ve oturum bilgilerini korumak için çerez kullanır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz; bazı özellikler çerezler kapalıyken çalışmayabilir.</p>
      <h3 class="heading-font h4">6. Haklarınız</h3>
      <p>KVKK kapsamında verilerinize erişme, düzeltme, silme, işlemeyi kısıtlama ve itiraz etme haklarına sahipsiniz. Talepleriniz için <a href="/pages/contact">iletişim sayfamızdan</a> bize ulaşabilirsiniz.</p>
      <h3 class="heading-font h4">7. Güncellemeler</h3>
      <p>Bu politika zaman zaman güncellenebilir. Güncel metin her zaman bu sayfada yayımlanır. Son güncelleme: Haziran 2026.</p>`,
    },
    en: {
      title: "Privacy Policy",
      subtitle: "Learn how we collect, use, and protect your personal information.",
      description:
        "Anatolian Paw privacy policy — how we handle personal data and cookies on our store.",
      body: `
      <h3 class="heading-font h4">1. Overview</h3>
      <p>This privacy policy explains how Anatolian Paw (&quot;we&quot;) processes personal data when you visit our website or place an order. We act as the data controller under applicable privacy laws.</p>
      <h3 class="heading-font h4">2. Information we collect</h3>
      <p>We may collect your name, email, phone, shipping and billing address when you checkout or create an account; payment details are processed by our payment provider and are not stored on our servers; we also use cookies and analytics to improve the site.</p>
      <h3 class="heading-font h4">3. How we use information</h3>
      <p>We use your data to fulfill orders, arrange delivery, provide customer support, meet legal obligations, and — with your consent — send marketing communications.</p>
      <h3 class="heading-font h4">4. Sharing</h3>
      <p>We share data only with carriers, payment processors, and authorities when required by law. We do not sell your personal information.</p>
      <h3 class="heading-font h4">5. Cookies</h3>
      <p>We use cookies to improve your experience and keep your cart and session active. You can manage cookies in your browser; some features may not work if cookies are disabled.</p>
      <h3 class="heading-font h4">6. Your rights</h3>
      <p>You may request access, correction, deletion, or restriction of your data. Contact us via our <a href="/pages/contact">contact page</a>.</p>
      <h3 class="heading-font h4">7. Updates</h3>
      <p>We may update this policy from time to time. The current version is always published on this page. Last updated: June 2026.</p>`,
    },
  },
  {
    slug: "terms-of-service",
    sectionKey: "policy_terms",
    tr: {
      title: "Hizmet Şartları",
      subtitle: "Sitemizi ve hizmetlerimizi kullanırken geçerli koşullar.",
      description: "Anatolian Paw hizmet şartları — alışveriş ve site kullanım koşulları.",
      body: `
      <h3 class="heading-font h4">1. Kabul</h3>
      <p>Bu web sitesini kullanarak veya sipariş vererek aşağıdaki hizmet şartlarını kabul etmiş sayılırsınız. Şartları kabul etmiyorsanız lütfen sitemizi kullanmayın.</p>
      <h3 class="heading-font h4">2. Hizmet kapsamı</h3>
      <p>Anatolian Paw, evcil hayvan ürünleri satışı yapan bir e-ticaret platformudur. Ürün açıklamaları, görseller ve fiyatlar önceden haber verilmeksizin güncellenebilir.</p>
      <h3 class="heading-font h4">3. Sipariş ve ödeme</h3>
      <p>Siparişiniz, ödemenin onaylanması ve stok durumuna bağlı olarak işleme alınır. Fiyatlar Türk Lirası cinsindendir; vergiler ve kargo ücretleri ödeme adımında gösterilir. Yanlış fiyatlandırma tespit edilirse sipariş iptal edilebilir.</p>
      <h3 class="heading-font h4">4. Teslimat</h3>
      <p>Tahmini teslimat süreleri bilgilendirme amaçlıdır; gecikmelerden kaynaklanan dolaylı zararlardan sorumlu değiliz. Teslimat adresinin doğruluğundan müşteri sorumludur.</p>
      <h3 class="heading-font h4">5. Hesap güvenliği</h3>
      <p>Hesap bilgilerinizin gizliliğinden siz sorumlusunuz. Yetkisiz kullanım şüphesinde derhal bizimle iletişime geçin.</p>
      <h3 class="heading-font h4">6. Fikri mülkiyet</h3>
      <p>Sitedeki metin, görsel, logo ve tasarımlar Anatolian Paw&apos;a aittir; izinsiz kopyalanamaz veya ticari amaçla kullanılamaz.</p>
      <h3 class="heading-font h4">7. Sorumluluk sınırı</h3>
      <p>Yasaların izin verdiği ölçüde, hizmet kesintileri veya üçüncü taraf hizmetlerinden kaynaklanan zararlardan sorumluluk kabul etmeyiz.</p>
      <h3 class="heading-font h4">8. İletişim</h3>
      <p>Sorularınız için <a href="/pages/contact">iletişim sayfamızı</a> kullanabilirsiniz. Son güncelleme: Haziran 2026.</p>`,
    },
    en: {
      title: "Terms of Service",
      subtitle: "Conditions that apply when you use our website and services.",
      description: "Anatolian Paw terms of service — shopping and site usage conditions.",
      body: `
      <h3 class="heading-font h4">1. Acceptance</h3>
      <p>By using this website or placing an order, you agree to these terms. If you do not agree, please do not use our services.</p>
      <h3 class="heading-font h4">2. Scope</h3>
      <p>Anatolian Paw is an e-commerce store for pet products. Descriptions, images, and prices may change without notice.</p>
      <h3 class="heading-font h4">3. Orders and payment</h3>
      <p>Orders are processed after payment confirmation and stock availability. Prices are shown in TRY; taxes and shipping are displayed at checkout. We may cancel orders with incorrect pricing.</p>
      <h3 class="heading-font h4">4. Delivery</h3>
      <p>Estimated delivery times are indicative. We are not liable for indirect damages from delays. You are responsible for providing a correct shipping address.</p>
      <h3 class="heading-font h4">5. Account security</h3>
      <p>You are responsible for keeping your account credentials secure. Contact us immediately if you suspect unauthorized use.</p>
      <h3 class="heading-font h4">6. Intellectual property</h3>
      <p>Site content, logos, and designs belong to Anatolian Paw and may not be copied or used commercially without permission.</p>
      <h3 class="heading-font h4">7. Limitation of liability</h3>
      <p>To the extent permitted by law, we are not liable for service interruptions or issues caused by third-party providers.</p>
      <h3 class="heading-font h4">8. Contact</h3>
      <p>Questions? Reach us via our <a href="/pages/contact">contact page</a>. Last updated: June 2026.</p>`,
    },
  },
  {
    slug: "refund-policy",
    sectionKey: "policy_refund",
    tr: {
      title: "İade Politikası",
      subtitle: "Ürün iade ve değişim koşullarımız.",
      description: "Anatolian Paw iade politikası — iade süreci ve istisnalar.",
      body: `
      <h3 class="heading-font h4">1. Cayma hakkı</h3>
      <p>Mesafeli satışlarda, ürünü teslim aldığınız tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin cayma hakkınız bulunmaktadır. Cayma bildiriminizi <a href="/pages/contact">iletişim kanallarımız</a> üzerinden iletebilirsiniz.</p>
      <h3 class="heading-font h4">2. İade koşulları</h3>
      <p>İade edilecek ürünler kullanılmamış, orijinal ambalajında ve satılabilir durumda olmalıdır. Hasarlı, açılmış veya hijyen açısından iade edilemeyecek ürünler kabul edilmez.</p>
      <h3 class="heading-font h4">3. Gıda ve tüketim ürünleri</h3>
      <p>Köpek ödülü, mama ve benzeri gıda ürünleri sağlık ve hijyen nedeniyle ambalajı açıldıktan sonra iade kapsamı dışındadır. Hasarlı veya hatalı gönderim durumunda lütfen teslimattan sonra 48 saat içinde fotoğraflı bildirim yapın.</p>
      <h3 class="heading-font h4">4. İade süreci</h3>
      <p>İade talebiniz onaylandıktan sonra size kargo bilgileri iletilir. Ürün depomuza ulaştığında ve kontrol tamamlandığında ödemeniz, kullandığınız ödeme yöntemine göre 5–10 iş günü içinde iade edilir.</p>
      <h3 class="heading-font h4">5. Kargo ücreti</h3>
      <p>Cayma hakkı kapsamındaki iadelerde, yasal düzenlemelere uygun olarak iade kargo masrafı müşteriye ait olabilir. Bizden kaynaklanan hatalı veya eksik gönderimlerde kargo ücreti tarafımızca karşılanır.</p>
      <h3 class="heading-font h4">6. Değişim</h3>
      <p>Stok durumuna bağlı olarak aynı ürünün farklı varyantı veya eşdeğer bir ürünle değişim yapılabilir. Değişim talepleri için müşteri hizmetlerimizle iletişime geçin.</p>
      <h3 class="heading-font h4">7. Sorular</h3>
      <p>İade süreci hakkında detaylı bilgi için <a href="/pages/faq">SSS sayfamıza</a> göz atabilir veya <a href="/pages/contact">bize yazabilirsiniz</a>. Son güncelleme: Haziran 2026.</p>`,
    },
    en: {
      title: "Refund Policy",
      subtitle: "Our conditions for returns and exchanges.",
      description: "Anatolian Paw refund policy — return process and exceptions.",
      body: `
      <h3 class="heading-font h4">1. Right of withdrawal</h3>
      <p>For distance sales, you may withdraw within 14 days of receiving your order without giving a reason. Send your request through our <a href="/pages/contact">contact channels</a>.</p>
      <h3 class="heading-font h4">2. Return conditions</h3>
      <p>Items must be unused, in original packaging, and resalable. Damaged, opened, or non-returnable hygiene-sensitive products cannot be accepted.</p>
      <h3 class="heading-font h4">3. Food and consumables</h3>
      <p>Pet treats, food, and similar consumables cannot be returned once opened for health and hygiene reasons. For damaged or incorrect shipments, notify us with photos within 48 hours of delivery.</p>
      <h3 class="heading-font h4">4. Return process</h3>
      <p>After your return is approved, we will share shipping instructions. Once the item is received and inspected, refunds are issued within 5–10 business days to your original payment method.</p>
      <h3 class="heading-font h4">5. Shipping costs</h3>
      <p>For withdrawal returns, return shipping may be borne by the customer as permitted by law. We cover shipping for our errors or incomplete shipments.</p>
      <h3 class="heading-font h4">6. Exchanges</h3>
      <p>Subject to stock, we may exchange for another variant or equivalent product. Contact customer support for exchange requests.</p>
      <h3 class="heading-font h4">7. Questions</h3>
      <p>See our <a href="/pages/faq">FAQ</a> or <a href="/pages/contact">contact us</a> for help. Last updated: June 2026.</p>`,
    },
  },
];

for (const page of PAGES) {
  const mainTr = buildMain(page.sectionKey, page.tr.title, page.tr.subtitle, page.tr.body);
  const mainEn = buildMain(page.sectionKey, page.en.title, page.en.subtitle, page.en.body);
  writeFileSync(
    join(ROOT, "pages", `${page.slug}-tr.html`),
    buildFromShell(ABOUT_TR, mainTr, { title: page.tr.title, description: page.tr.description }),
    "utf8",
  );
  writeFileSync(
    join(ROOT, "pages", `${page.slug}.html`),
    buildFromShell(ABOUT_EN, mainEn, { title: page.en.title, description: page.en.description }),
    "utf8",
  );
  console.log(`Generated pages/${page.slug}-tr.html and pages/${page.slug}.html`);
}

console.log("Policy mirror pages ready.");
