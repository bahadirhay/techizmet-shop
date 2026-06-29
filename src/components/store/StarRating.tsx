import "./star-rating.css";

/** Salt görüntüleme yıldız puanı (server-safe) */
export function StarRating({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const rounded = Math.round(value);
  return (
    <span className={`kn-stars kn-stars--${size}`} role="img" aria-label={`5 üzerinden ${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? "kn-stars__on" : "kn-stars__off"} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
