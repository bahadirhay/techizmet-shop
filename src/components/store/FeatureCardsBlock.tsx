import Link from "next/link";
import type { ShopBlock } from "@/lib/blocks/schema";
import { FeatureCardIcon } from "@/components/store/FeatureCardIcon";

type Props = Extract<ShopBlock, { type: "featureCards" }>["props"];

export function FeatureCardsBlock({ title, subtitle, backgroundColor, items }: Props) {
  const bg = backgroundColor?.trim() || "#faf7f2";
  return (
    <section className="kn-feature-cards-section" style={{ background: bg }}>
      <div className="kn-fc-header">
        <h2>{title}</h2>
        {subtitle?.trim() ? <p>{subtitle}</p> : null}
      </div>
      <div className="kn-fc-grid">
        {items.map((item) => {
          const inner = (
            <>
              <FeatureCardIcon iconUrl={item.iconUrl} iconKey={item.iconKey} iconText={item.iconText} />
              <h3>{item.heading}</h3>
              <p>{item.description}</p>
            </>
          );
          if (item.linkHref?.trim()) {
            return (
              <Link key={item.id} href={item.linkHref.trim()} className="kn-fc-card">
                {inner}
              </Link>
            );
          }
          return (
            <article key={item.id} className="kn-fc-card">
              {inner}
            </article>
          );
        })}
      </div>
    </section>
  );
}
