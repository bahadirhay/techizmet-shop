import Link from "next/link";
import {
  IMAGE_GUIDE_CHECKLIST,
  IMAGE_GUIDE_GENERAL,
  IMAGE_GUIDE_MARKETPLACE,
  IMAGE_GUIDE_ROWS,
} from "@/lib/admin/image-guide-data";

export function ImageGuideView() {
  return (
    <div className="max-w-4xl space-y-8">
      <section className="admin-card admin-card-pad">
        <h2 className="text-lg font-semibold">Genel kurallar</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-zinc-700">Format</dt>
            <dd className="text-zinc-600">{IMAGE_GUIDE_GENERAL.formats}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Maks. dosya boyutu</dt>
            <dd className="text-zinc-600">{IMAGE_GUIDE_GENERAL.maxMb} MB / görsel</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Kayıt yeri</dt>
            <dd className="text-zinc-600">
              <code className="rounded bg-zinc-100 px-1 text-xs">{IMAGE_GUIDE_GENERAL.uploadPath}</code>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Kırpma olmadan yükleme</dt>
            <dd className="text-zinc-600">Uzun kenar en fazla {IMAGE_GUIDE_GENERAL.maxEdgeNoCrop}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-zinc-600">
          Admin formlarında sürükle-bırak veya dosya seçin; tanımlı alanlarda kırpma penceresi açılır ve
          çıktı boyutu otomatik ayarlanır.
        </p>
      </section>

      <section className="admin-card admin-card-pad overflow-x-auto">
        <h2 className="text-lg font-semibold">Görsel türleri ve boyutlar</h2>
        <p className="mt-1 text-sm text-zinc-500">
          &quot;Admin&quot; sütunundaki linkler ilgili panele gider.
        </p>
        <table className="mt-4 w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-zinc-500">
              <th className="pb-2 pr-3">Görsel</th>
              <th className="pb-2 pr-3">Boyut</th>
              <th className="pb-2 pr-3">Oran</th>
              <th className="pb-2 pr-3">Vitrinde</th>
              <th className="pb-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {IMAGE_GUIDE_ROWS.map((row) => (
              <tr key={row.name} className="border-b border-zinc-100 align-top">
                <td className="py-3 pr-3 font-medium">{row.name}</td>
                <td className="py-3 pr-3 tabular-nums whitespace-nowrap">{row.size}</td>
                <td className="py-3 pr-3 whitespace-nowrap">{row.ratio}</td>
                <td className="py-3 pr-3 text-zinc-600">
                  {row.where}
                  {row.notes ? (
                    <span className="mt-1 block text-xs text-zinc-500">{row.notes}</span>
                  ) : null}
                </td>
                <td className="py-3">
                  <Link href={row.adminPath} className="text-[var(--kn-brand)] hover:underline">
                    {row.adminLabel}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card admin-card-pad">
          <h2 className="text-lg font-semibold">Pazaryeri</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {IMAGE_GUIDE_MARKETPLACE.map((m) => (
              <li key={m.channel}>
                <span className="font-medium">{m.channel}:</span>{" "}
                <span className="text-zinc-600">{m.spec}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Ürün görselleri kare ve yüksek çözünürlüklü olmalı; metin/watermark eklemeyin.
          </p>
        </section>

        <section className="admin-card admin-card-pad">
          <h2 className="text-lg font-semibold">Yeni ürün kontrol listesi</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            {IMAGE_GUIDE_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm">
            <Link href="/admin/products/new" className="text-[var(--kn-brand)] hover:underline">
              Yeni ürün ekle →
            </Link>
            {" · "}
            <Link href="/admin/settings/seo-ai" className="text-[var(--kn-brand)] hover:underline">
              SEO AI ayarları →
            </Link>
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
        <strong>İpucu:</strong> Ürün formunda görsel yüklerken kırpma penceresinde hedef piksel boyutu
        gösterilir. Vitrin CSS&apos;i <code>object-fit: cover</code> kullandığı için kenarlardan hafif
        kırpma normaldir — ürünü kare alanın ortasına yerleştirin.
      </section>
    </div>
  );
}
