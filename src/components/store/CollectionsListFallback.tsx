import Link from "next/link";
import { getStoreLocale } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { resolveCollectionsFallbackTexts } from "@/lib/store-static-texts";

/** /collections — Admin → Koleksiyonlar’daki kayıtlar */
export async function CollectionsListFallback() {
  const locale = await getStoreLocale();
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const texts = resolveCollectionsFallbackTexts(locale, settings.store?.texts);

  const collections = await prisma.storeCollection.findMany({
    where: { siteId: site.id, published: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <div className="kn-section">
      <h1 className="kn-section__title">{texts.title}</h1>
      <p className="kn-section__lead kn-muted">{texts.lead}</p>
      {collections.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">{texts.empty}</p>
      ) : (
        <div className="kn-collection-grid">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className="kn-collection-card">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="kn-collection-card__img" />
              ) : (
                <div className="kn-collection-card__ph" />
              )}
              <span className="kn-collection-card__title">{c.title}</span>
              {c.description?.trim() ? (
                <span className="kn-collection-card__desc">{c.description}</span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
