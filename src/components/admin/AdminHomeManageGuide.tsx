import Link from "next/link";

/** Ana sayfa bölümleri → admin yolu */
export function AdminHomeManageGuide() {
  return (
    <details className="mx-4 mb-4 rounded-xl border bg-white text-sm md:mx-8">
      <summary className="cursor-pointer px-4 py-3 font-medium text-zinc-800">
        Ana sayfa: hangi alan nereden düzenlenir?
      </summary>
      <div className="overflow-x-auto border-t px-4 py-3">
        <table className="w-full min-w-[640px] text-left text-xs text-zinc-700">
          <thead>
            <tr className="border-b text-zinc-500">
              <th className="py-2 pr-4">Vitrinde gördüğünüz</th>
              <th className="py-2 pr-4">Admin yolu</th>
              <th className="py-2">Ne yaparsınız?</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2 pr-4 font-medium">Tüm ana sayfa bölümleri (sıra, gizle, başlık)</td>
              <td className="py-2 pr-4">
                <Link href="/admin/home" className="text-[var(--kn-brand)] underline">
                  Admin → Ana Sayfa
                </Link>
              </td>
              <td className="py-2">
                Techizmet Shop mirror şablonu. Soldan sürükle-bırak, sağdan başlık / gizle, <strong>Kaydet</strong>.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">Koleksiyon kartları (Facial Boosters vb.)</td>
              <td className="py-2 pr-4">Sayfalar → Ana Sayfa → <strong>Koleksiyon grid</strong> bloğu</td>
              <td className="py-2">Kart başlığı, görsel, link. Veya kartları koleksiyonlardan otomatik doldurmak için aşağıdaki Koleksiyonlar.</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">Skincare Collection, Flash Sale… (ürün listesi)</td>
              <td className="py-2 pr-4">
                Sayfalar → Ana Sayfa → <strong>Ürün grid</strong> bloğu +{" "}
                <Link href="/admin/collections" className="text-[var(--kn-brand)] underline">
                  Koleksiyonlar
                </Link>{" "}
                +{" "}
                <Link href="/admin/products" className="text-[var(--kn-brand)] underline">
                  Ürünler
                </Link>
              </td>
              <td className="py-2">
                Grid bloğunda başlık ve <em>koleksiyon slug</em> (ör. skincare). Ürünler Admin → Ürünler’de; hangi koleksiyonda oldukları Ürün düzenle → Koleksiyon.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">Müşteri yorumları</td>
              <td className="py-2 pr-4">Sayfalar → Ana Sayfa → <strong>Müşteri yorumları</strong> bloğu</td>
              <td className="py-2">Yorum metinleri sağ panelden; sürükle-bırak ile sıra.</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">Üst menü linkleri</td>
              <td className="py-2 pr-4">
                <Link href="/admin/settings/menu" className="text-[var(--kn-brand)] underline">
                  Ayarlar → Menü
                </Link>
              </td>
              <td className="py-2">Collections, Best Sellers vb.</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">
                <code>/collections/all</code> sayfası (tüm ürünler)
              </td>
              <td className="py-2 pr-4">
                <Link href="/admin/products" className="text-[var(--kn-brand)] underline">
                  Ürünler
                </Link>
                {" · "}
                <Link href="/admin/theme" className="text-[var(--kn-brand)] underline">
                  Tema
                </Link>
              </td>
              <td className="py-2">
                Bu URL ayrı bir vitrin sayfasıdır; ana sayfa editörü değil. Ürünleri burada listelemek için ürün ekleyin. Techizmet Shop mirror görünümü için Tema → mirror modu.
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-zinc-500">
          Ortadaki önizlemede artık gerçek ürünler görünür. Vitrin ana sayfası:{" "}
          <a href="/" className="underline" target="_blank" rel="noreferrer">
            /
          </a>
          {" · "}
          Kaydettikten sonra kontrol edin.
        </p>
      </div>
    </details>
  );
}
