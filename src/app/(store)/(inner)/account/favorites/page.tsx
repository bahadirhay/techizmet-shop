import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { MirrorFavoritesFrame } from "@/components/store/MirrorFavoritesFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { accountLoginPath } from "@/lib/account-return-path";
import { formatTry } from "@/lib/format";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { getStoreLocale } from "@/lib/i18n/server";
import { FAVORITES_PAGE_BRIDGE_JS } from "@/lib/mirror-favorites-page";
import { resolveThemeShellFavoritesContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId) {
    redirect(accountLoginPath("/account/favorites"));
  }

  const query = await searchParams;
  const homepageMode = await getStoreHomepageMode(site.id);
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/account/favorites", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = await resolveThemeShellFavoritesContent(session.customerId, locale);
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[FAVORITES_PAGE_BRIDGE_JS]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorFavoritesFrame />;
  }

  const favorites = await prisma.customerFavorite.findMany({
    where: { customerId: session.customerId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const items = favorites.filter((f) => f.product.siteId === site.id && f.product.published);

  return (
    <div className="kn-section kn-account-page">
      <h1>Favorilerim</h1>
      <p>
        <Link href="/account">← Hesabım</Link>
      </p>
      {items.length === 0 ? (
        <p className="kn-muted">Henüz favori ürününüz yok.</p>
      ) : (
        <ul className="kn-fav-list">
          {items.map((f) => (
            <li key={f.id} className="kn-fav-list__item">
              <Link href={`/products/${f.product.slug}`} className="kn-fav-list__link">
                {f.product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.product.imageUrl} alt="" className="kn-fav-list__img" />
                ) : (
                  <div className="kn-fav-list__img kn-product-card__img--placeholder" />
                )}
                <span>
                  <strong>
                    {formatProductDisplayTitle({
                      title: f.product.title,
                      weightGrams: f.product.weightGrams,
                      pieceCount: f.product.pieceCount,
                    })}
                  </strong>
                  <span className="kn-fav-list__price">{formatTry(f.product.priceMinor)}</span>
                </span>
              </Link>
              <FavoriteButton productId={f.product.id} showLabel />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
