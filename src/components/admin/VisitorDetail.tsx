"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EVENT_LABELS, formatEventDetail, parseCartItemsJson } from "@/lib/analytics/format-event";
import { formatTry } from "@/lib/format";

type Profile = {
  visitorKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deviceType: string | null;
  userAgent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerSince: string | null;
};

type EventRow = {
  id: string;
  eventType: string;
  payloadJson: string;
  createdAt: string;
};

type CartRow = {
  id: string;
  status: string;
  itemsJson: string;
  cartValueMinor: number;
  itemCount: number;
  lastActivityAt: string;
  remindedAt: string | null;
  convertedOrderId: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  recovered: "Kurtarıldı",
  expired: "Süresi doldu",
};

export function VisitorDetail({ visitorKey }: { visitorKey: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [carts, setCarts] = useState<CartRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/analytics/visitors/${encodeURIComponent(visitorKey)}`)
      .then((r) => r.json())
      .then(
        (d: {
          profile?: Profile;
          events?: EventRow[];
          cartAbandonments?: CartRow[];
          error?: string;
        }) => {
          if (d.error) setErr(d.error);
          else {
            setProfile(d.profile ?? null);
            setEvents(d.events ?? []);
            setCarts(d.cartAbandonments ?? []);
          }
        },
      )
      .catch(() => setErr("Yüklenemedi"));
  }, [visitorKey]);

  if (err) {
    return (
      <p className="text-sm text-red-600">
        {err}{" "}
        <Link href="/admin/analytics/visitors" className="underline">
          Listeye dön
        </Link>
      </p>
    );
  }

  if (!profile) return <p className="text-sm text-zinc-600">Yükleniyor…</p>;

  const title =
    profile.customerName ?? profile.customerEmail ?? `Ziyaretçi …${profile.visitorKey.slice(-8)}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/admin/analytics/visitors" className="underline">
              Ziyaretçiler
            </Link>
            {" · "}
            <Link href="/admin/analytics" className="underline">
              Analitik özet
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">{profile.visitorKey}</p>
        </div>
        {profile.customerEmail ? (
          <a
            href={`mailto:${profile.customerEmail}`}
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            E-posta gönder
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="İlk görülme" value={fmt(profile.firstSeenAt)} />
        <InfoCard label="Son görülme" value={fmt(profile.lastSeenAt)} />
        <InfoCard label="Cihaz" value={profile.deviceType ?? "—"} />
        <InfoCard
          label="Pazarlama"
          value={
            [profile.utmSource, profile.utmMedium, profile.utmCampaign].filter(Boolean).join(" / ") ||
            "—"
          }
        />
      </div>

      {profile.customerEmail ? (
        <section className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-semibold">Bağlı müşteri</h2>
          <p className="mt-2">
            {profile.customerName && <span className="font-medium">{profile.customerName} · </span>}
            <a href={`mailto:${profile.customerEmail}`} className="text-blue-700 underline">
              {profile.customerEmail}
            </a>
            {profile.customerPhone ? ` · ${profile.customerPhone}` : ""}
          </p>
          {profile.customerSince ? (
            <p className="mt-1 text-zinc-500">Üyelik: {fmt(profile.customerSince)}</p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          Anonim ziyaretçi — e-posta yok. Sepet hatırlatma e-postası gönderilemez; manuel geri dönüş
          için checkout sırasında üyelik veya e-posta toplanması gerekir.
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Sepet geçmişi</h2>
        {!carts.length ? (
          <p className="text-sm text-zinc-500">Sepet terki kaydı yok.</p>
        ) : (
          <div className="space-y-3">
            {carts.map((c) => (
              <div key={c.id} className="rounded-xl border bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {STATUS_LABELS[c.status] ?? c.status} · {formatTry(c.cartValueMinor)}
                  </span>
                  <span className="text-zinc-500">{fmt(c.lastActivityAt)}</span>
                </div>
                <ul className="mt-2 list-inside list-disc text-zinc-700">
                  {parseCartItemsJson(c.itemsJson).map((item, i) => (
                    <li key={i}>
                      {item.title}
                      {item.qty > 1 ? ` ×${item.qty}` : ""}
                      {item.slug ? (
                        <span className="text-zinc-400"> ({item.slug})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">
                  Hatırlatma:{" "}
                  {c.remindedAt ? fmt(c.remindedAt) : "gönderilmedi"}
                  {c.convertedOrderId ? ` · Sipariş: ${c.convertedOrderId}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Gezinti zaman çizelgesi</h2>
        <p className="mb-3 text-xs text-zinc-500">En yeni üstte (son {events.length} olay).</p>
        {!events.length ? (
          <p className="text-sm text-zinc-500">Olay kaydı yok (çerez onayı kapalı olabilir).</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Olay</th>
                  <th className="p-3">Detay</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">{fmt(e.createdAt)}</td>
                    <td className="p-3">
                      {EVENT_LABELS[e.eventType as keyof typeof EVENT_LABELS] ?? e.eventType}
                    </td>
                    <td className="p-3 text-zinc-800">
                      {formatEventDetail(e.eventType, e.payloadJson)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR");
}
