import type { Metadata } from "next";
import Link from "next/link";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { getStoreLocale } from "@/lib/i18n/server";
import { buildStreetFoodFundPublicPayload } from "@/lib/street-food-fund/campaign";
import { listPublishedStreetFoodDonations } from "@/lib/street-food-fund/donations";
import { getStreetFoodFundSettings, streetFoodTexts } from "@/lib/street-food-fund/settings";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const texts = streetFoodTexts("tr", settings);
  return {
    title: texts.title,
    description: texts.slogan,
  };
}

export default async function StreetFoodFundPublicPage() {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) notFound();

  const homepageMode = getHomepageMode(settings);
  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="sokak-dostlari" />;
  }

  const [fund, donations] = await Promise.all([
    buildStreetFoodFundPublicPayload(site.id, locale),
    listPublishedStreetFoodDonations(site.id, locale === "en" ? "en" : "tr"),
  ]);

  if (!fund) notFound();

  return (
    <div className="min-h-screen bg-[var(--kn-bg,#fafafa)]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-3xl">🐾</p>
          <h1 className="text-2xl font-semibold">{fund.title}</h1>
          <p className="text-lg text-[var(--kn-muted,#555)]">{fund.slogan}</p>
          <p className="text-xl font-semibold">
            Toplanan Mama: {fund.collectedLabel} / {fund.targetLabel}
          </p>
          <div
            className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-black/10"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${fund.progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-[var(--kn-muted,#555)]">{fund.counterSubtext}</p>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white p-6 space-y-3">
          <h2 className="text-lg font-semibold">Nasıl çalışır?</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>Ödül mamalarımızdan sipariş verirsiniz.</li>
            <li>Siparişinizdeki ürün gramajı kadar kuru mama fonumuzda birikir.</li>
            <li>Hedefe ulaşınca mama, ihtiyaç sahibi barınak veya sokak dostlarına ulaştırılır.</li>
            <li>Bağış fotoğraf ve videoları bu sayfada paylaşılır.</li>
          </ol>
          <p className="pt-2">
            <Link href="/collections/all" className="font-medium underline">
              Alışverişe başla
            </Link>
          </p>
        </section>

        {donations.length ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Bağış günlüğü</h2>
            {donations.map((d) => (
              <article
                key={d.id}
                className="rounded-2xl border border-black/10 bg-white p-6 space-y-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold">{d.recipientName}</h3>
                  <span className="text-sm text-[var(--kn-muted,#555)]">
                    {new Date(d.donatedAt).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR")} ·{" "}
                    {d.gramsLabel}
                  </span>
                </div>
                {d.storyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: d.storyHtml }}
                  />
                ) : null}
                {d.videoUrl ? (
                  <p>
                    <a href={d.videoUrl} className="underline" target="_blank" rel="noreferrer">
                      Bağış videosunu izle
                    </a>
                  </p>
                ) : null}
                {d.photoUrls.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {d.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
