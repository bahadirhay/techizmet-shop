import type { FeatureCardIconKey } from "@/lib/feature-cards-icons";

function IconGlobe() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" aria-hidden>
      <circle cx="24" cy="24" r="18" stroke="#2563eb" strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="8" ry="18" stroke="#2563eb" strokeWidth="2" />
      <path d="M6 24h36M8 15h32M8 33h32" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" aria-hidden>
      <path
        d="M8 38c14-2 22-10 26-26 0 0-10 2-18 10S8 38 8 38z"
        fill="#22c55e"
        opacity=".25"
      />
      <path
        d="M8 38c14-2 22-10 26-26 0 0-10 2-18 10S8 38 8 38z"
        stroke="#16a34a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" aria-hidden>
      <path
        d="M14 10h20v8c0 6-4 10-10 10s-10-4-10-10v-8z"
        fill="#eab308"
        opacity=".35"
      />
      <path
        d="M14 10h20v8c0 6-4 10-10 10s-10-4-10-10v-8z"
        stroke="#ca8a04"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M18 28v4h12v-4M20 32h8v4H20v-4z" stroke="#ca8a04" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 14h4c0 4 2 6 4 6M34 14h4c0 4-2 6-4 6" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function FeatureCardIcon({
  iconUrl,
  iconKey,
  iconText,
}: {
  iconUrl?: string;
  iconKey?: FeatureCardIconKey;
  iconText?: string;
}) {
  if (iconUrl?.trim()) {
    return (
      <div className="kn-fc-icon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl.trim()} alt="" width={48} height={48} loading="lazy" />
      </div>
    );
  }
  if (iconKey === "tr") {
    return <div className="kn-fc-icon kn-fc-icon--text">TR</div>;
  }
  if (iconKey === "globe") {
    return (
      <div className="kn-fc-icon kn-fc-icon--svg">
        <IconGlobe />
      </div>
    );
  }
  if (iconKey === "leaf") {
    return (
      <div className="kn-fc-icon kn-fc-icon--svg">
        <IconLeaf />
      </div>
    );
  }
  if (iconKey === "trophy") {
    return (
      <div className="kn-fc-icon kn-fc-icon--svg">
        <IconTrophy />
      </div>
    );
  }
  if (iconText?.trim()) {
    return <div className="kn-fc-icon kn-fc-icon--text">{iconText.trim()}</div>;
  }
  return <div className="kn-fc-icon" />;
}
