/**
 * "Doğal Köpek Ödülü Nedir?" blog yazısını oluşturur veya günceller.
 * node scripts/seed-dogal-kopek-odulu-blog.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "dogal-kopek-odulu-nedir";
const AUTHOR = "Anatolian Paw";

const TITLE = "Doğal Köpek Ödülü Nedir? 2026 Fiyat ve Seçim Rehberi";
const EXCERPT = "Doğal köpek ödülü seçerken nelere dikkat edilmeli? Tahılsız, katkısız ve tek proteinli ödüllerin köpeğinize faydaları, fiyatları ve Anatolian Paw önerileri bu rehberde.";

const SEO_TITLE = "Doğal Köpek Ödülü Nedir? 2026 Fiyat ve Seçim Rehberi | Anatolian Paw";
const SEO_DESCRIPTION = "Doğal köpek ödülü seçerken nelere dikkat edilmeli? Tahılsız, katkısız, tek protein kaynaklı ödüllerin faydaları, fiyatları ve uzman önerileri.";

const BODY_TR = `
<h2>Doğal Köpek Ödülü Nedir?</h2>
<p>
  <strong>Doğal köpek ödülü</strong>; yapay renklendirici, tahıl, şeker ve koruyucu katkı maddesi içermeyen, genellikle tek bir protein kaynağından elde edilen ve minimal işlem görmüş atıştırmalıklardır.
  Et, organ eti (ciğer, akciğer, kalp) veya kemik bazlı olan bu ödüller; düşük ısıda kurutma ya da liyofilizasyon gibi yöntemlerle işlenir; böylece besin değerleri korunur.
</p>
<p>
  Eğitim seanslarında, diş sağlığını desteklemek için ya da günlük ödüllendirmede kullanılan bu ürünler, market raflarındaki tahıl ve katkı yüklü ödüllere güçlü bir alternatif sunar.
</p>

<h2>Doğal Köpek Ödülü ile İşlenmiş Ödül Arasındaki Fark</h2>
<p>
  İşlenmiş köpek ödülleri çoğunlukla un, mısır nişastası, yapay renklendirici ve uzun raf ömrü için kimyasal koruyucu içerir.
  Oysa doğal ödüllerde içerik listesi kısadır: <em>dana ciğer, tuz yok, katkı maddesi yok</em> gibi ifadeler öne çıkar.
</p>
<ul>
  <li><strong>İçerik listesi kısalığı:</strong> Ne kadar az madde, o kadar doğal.</li>
  <li><strong>Protein kaynağı netliği:</strong> "Et ve et yan ürünleri" yerine "dana ciğer" gibi spesifik ifadeler tercih edin.</li>
  <li><strong>Renk ve koku:</strong> Yapay boyasız ödüller mat görünümlü olabilir; bu normaldir.</li>
  <li><strong>Raf ömrü:</strong> Doğal ödüllerin raf ömrü genellikle daha kısadır; bu tazeliğin göstergesidir.</li>
</ul>

<h2>Hangi Doğal Ödüller En Sağlıklı?</h2>
<h3>Kurutulmuş Organ Etleri</h3>
<p>
  Dana ciğer, akciğer ve kalp; yüksek protein, B vitamini ve demir açısından zengindir.
  Düşük ısıda (60–80°C) kurutulan ürünler besin değerini büyük ölçüde korur.
  <a href="/collections/dogal-kopek-odulu">Anatolian Paw doğal köpek ödülleri</a> arasında en çok tercih edilenler de bu kategoridedir.
</p>
<h3>Çiğneme Kemikleri</h3>
<p>
  Ördek boynu, tavuk boynu ve sığır derisi kemikler diş taşı birikimine karşı doğal fırça görevi görür.
  Uygun büyüklükte seçilmesi önemlidir; köpeğin boyutuna göre parça seçin.
</p>
<h3>Balık Derisi ve Deniz Ürünleri</h3>
<p>
  Omega-3 açısından zengin balık derisi ödülleri; deri, tüy ve eklem sağlığını destekler.
  Özellikle alerji geçmişi olan köpekler için balık tek-protein ödülleri iyi bir seçenek olabilir.
</p>

<h2>Doğal Köpek Ödülü Seçerken Dikkat Edilecekler</h2>
<ol>
  <li><strong>İçerik listesini okuyun:</strong> İlk malzeme belirli bir et veya organ olmalı.</li>
  <li><strong>Köpeğinizin boyutuna uygun parça seçin:</strong> Küçük ırklar için küçük parçalar, büyük ırklar için orta-büyük boy uygundur.</li>
  <li><strong>Tek proteinli seçin:</strong> Alerjisi olan köpekler için tek protein kaynağı (monotrein) tercih edin.</li>
  <li><strong>Tahılsız ve katkısız olduğunu doğrulayın:</strong> "Tahılsız", "glutensiz" ibarelerini etiket üzerinde arayın.</li>
  <li><strong>Üretim yeri:</strong> Türkiye üretimi ürünler uluslararası tedarik zinciri risklerini azaltır ve tazelik avantajı sunar.</li>
  <li><strong>Yaşa uygunluk:</strong> Yavru köpekler için önerilen ürünleri seçin; sert çiğneme ödülleri yavru dişlere zarar verebilir.</li>
</ol>

<h2>Doğal Köpek Ödülü Eğitimde Nasıl Kullanılır?</h2>
<p>
  Eğitim seanslarında küçük parçalara bölünmüş doğal ödüller en etkili pekiştiricidir.
  Yüksek değerli bir ödül (ciğer, balık) zorlu komutlarda; daha sıradan bir ödül (kurutulmuş et) tekrar alıştırmalarında kullanılabilir.
</p>
<ul>
  <li>Günlük rasyonun en fazla <strong>%10'u</strong> ödülden oluşmalı.</li>
  <li>Seans başına 5–10 dakika yeterlidir; uzun seanslar köpeği yorar.</li>
  <li>Ödülü hemen verin — gecikme pekiştirmeyi zayıflatır.</li>
</ul>

<h2>Doğal Köpek Ödülü Fiyatları (2026)</h2>
<p>
  <a href="/collections/dogal-kopek-odulu">Anatolian Paw koleksiyonunda</a> doğal köpek ödülleri genellikle <strong>150–250 TL</strong> aralığındadır.
  Gramaj, protein türü ve üretim yöntemi (düşük ısı kurutma vs. liyofilizasyon) fiyatı etkiler.
  Güncel fiyatlar ve stok durumu için ürün sayfalarını inceleyebilirsiniz.
</p>
<table>
  <thead><tr><th>Ürün Tipi</th><th>Ortalama Fiyat</th></tr></thead>
  <tbody>
    <tr><td>Dana ciğer kurutma (100 g)</td><td>180–220 TL</td></tr>
    <tr><td>Balık derisi ödülü (80 g)</td><td>150–190 TL</td></tr>
    <tr><td>Çiğneme kemiği (orta boy)</td><td>200–250 TL</td></tr>
  </tbody>
</table>

<h2>Sıkça Sorulan Sorular</h2>

<h3>Doğal köpek ödülü nedir?</h3>
<p>
  Doğal köpek ödülü, yapay renklendirici, tahıl ve koruyucu içermeyen; tek protein kaynaklı kurutulmuş veya minimal işlem görmüş atıştırmalıklardır.
  Eğitim ve pozitif pekiştirmede kullanılır.
</p>

<h3>Doğal köpek ödülü fiyatları ne kadar?</h3>
<p>
  Anatolian Paw doğal köpek ödülleri genelde 150–250 TL aralığındadır.
  Gramaj ve proteine göre değişir; güncel fiyatlar ürün sayfalarında listelenir.
</p>

<h3>Hangi köpekler için uygundur?</h3>
<p>
  Yetişkin ve yavru köpekler için uygun ürünler ayrı etiketlenir.
  Tahılsız ve tek proteinli ödüller hassas sindirim ve alerji riski düşük beslenme tercih edenler için idealdir.
</p>

<h3>Eğitim ödülü olarak nasıl kullanılır?</h3>
<p>
  Küçük parçalara bölünerek kısa eğitim seanslarında verin.
  Günlük rasyonun %10'unu geçmeyecek şekilde ödül miktarını sınırlayın.
</p>

<h2>Sonuç</h2>
<p>
  Köpeğinize doğal bir ödül vermek; onun sağlığına yatırım yapmaktır.
  Tahılsız, tek proteinli ve katkısız ürünleri tercih ederek hem sindirim sistemini hem de genel sağlığını destekleyebilirsiniz.
  <a href="/collections/dogal-kopek-odulu">Anatolian Paw doğal köpek ödülleri</a> sayfasını ziyaret ederek güncel koleksiyonumuzu keşfedebilirsiniz.
  Ayrıca <a href="/collections/dogal-kopek-odul-mamasi">doğal köpek ödül maması</a> ve <a href="/collections/kopek-odul-mamasi">köpek ödül maması</a> kategorilerimize de göz atabilirsiniz.
</p>
`.trim();

async function main() {
  const site = await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });
  if (!site) throw new Error("StoreSite bulunamadı");

  const existing = await prisma.storeBlogPost.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: SLUG } },
  });

  if (existing) {
    await prisma.storeBlogPost.update({
      where: { id: existing.id },
      data: {
        titleTr: TITLE,
        excerptTr: EXCERPT,
        bodyTr: BODY_TR,
        author: AUTHOR,
        seoTitle: SEO_TITLE,
        seoDescription: SEO_DESCRIPTION,
        published: true,
        publishedAt: existing.publishedAt ?? new Date("2026-01-15T10:00:00Z"),
        updatedAt: new Date(),
      },
    });
    console.log("✅ Blog yazısı güncellendi:", SLUG);
  } else {
    await prisma.storeBlogPost.create({
      data: {
        siteId: site.id,
        slug: SLUG,
        titleTr: TITLE,
        excerptTr: EXCERPT,
        bodyTr: BODY_TR,
        author: AUTHOR,
        seoTitle: SEO_TITLE,
        seoDescription: SEO_DESCRIPTION,
        published: true,
        publishedAt: new Date("2026-01-15T10:00:00Z"),
        sortOrder: 0,
      },
    });
    console.log("✅ Blog yazısı oluşturuldu:", SLUG);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
