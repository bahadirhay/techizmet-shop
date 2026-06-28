import { getApprovedReviews, getReviewStats } from "@/lib/reviews/service";
import { StarRating } from "@/components/store/StarRating";
import { ReviewForm } from "@/components/store/ReviewForm";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Ürün sayfasında taranabilir, görünür yorum bloğu.
 * Mirror (iframe) modunda gerçek içerik iframe içinde kaldığı için yorumlar
 * burada ana DOM'da render edilir — hem kullanıcı hem arama motoru/AI görür.
 */
export async function ProductReviews({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [stats, reviews] = await Promise.all([
    getReviewStats(productId),
    getApprovedReviews(productId),
  ]);

  return (
    <section className="kn-reviews" id="yorumlar" aria-label="Ürün yorumları">
      {/* Kullanıcıya yorum bölümü olduğunu bildiren görünür başlık bandı */}
      <div className="kn-reviews__banner">
        <span className="kn-reviews__banner-icon">★</span>
        <span>
          {stats.count > 0
            ? `${stats.count} müşteri yorumu · Puan: ${stats.average.toFixed(1)}/5`
            : "Yorum yaz — ilk değerlendiren siz olun"}
        </span>
      </div>
      <div className="kn-reviews__inner">
        <h2 className="kn-reviews__title">Müşteri Yorumları</h2>

        <div className="kn-reviews__summary">
          {stats.count > 0 ? (
            <>
              <span className="kn-reviews__avg">{stats.average.toFixed(1)}</span>
              <span className="kn-reviews__summary-stars">
                <StarRating value={stats.average} size="lg" />
                <span className="kn-reviews__count">{stats.count} değerlendirme</span>
              </span>
            </>
          ) : (
            <p className="kn-reviews__empty">
              {productName} için henüz yorum yok. İlk değerlendirmeyi siz yazın.
            </p>
          )}
        </div>

        {reviews.length ? (
          <ul className="kn-reviews__list">
            {reviews.map((r) => (
              <li key={r.id} className="kn-review">
                <div className="kn-review__head">
                  <StarRating value={r.rating} size="sm" />
                  <span className="kn-review__author">{r.authorName}</span>
                  {r.isVerifiedPurchase ? (
                    <span className="kn-review__badge">Doğrulanmış alışveriş</span>
                  ) : null}
                  <time className="kn-review__date" dateTime={r.createdAt}>
                    {formatDate(r.createdAt)}
                  </time>
                </div>
                {r.title ? <p className="kn-review__title">{r.title}</p> : null}
                <p className="kn-review__body">{r.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <ReviewForm productId={productId} />
      </div>
    </section>
  );
}
