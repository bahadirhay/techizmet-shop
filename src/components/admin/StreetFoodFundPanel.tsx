"use client";

import { useCallback, useEffect, useState } from "react";

type FundData = {
  settings: {
    enabled: boolean;
    defaultTargetGrams: number;
    sloganTr: string;
    counterSubtextTr: string;
    detailPath: string;
  };
  campaign: {
    id: string;
    targetGrams: number;
    collectedGrams: number;
    status: string;
  } | null;
  contributions: {
    id: string;
    source: string;
    orderNumber: string | null;
    manualNote: string | null;
    gramsLabel: string;
    createdAt: string;
  }[];
  donations: {
    id: string;
    recipientName: string;
    gramsLabel: string;
    donatedAt: string;
    published: boolean;
    storyHtml: string | null;
    videoUrl: string | null;
    photoUrlsJson: string | null;
  }[];
  stats: { orderCount: number; totalGrams: number };
};

export function StreetFoodFundPanel() {
  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [donationForm, setDonationForm] = useState({
    recipientName: "",
    gramsDelivered: "",
    storyHtml: "",
    photoUrls: "",
    videoUrl: "",
    publish: true,
  });
  const [manualForm, setManualForm] = useState({ grams: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/street-food-fund");
      if (!res.ok) throw new Error();
      setData((await res.json()) as FundData);
    } catch {
      setMessage("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/street-food-fund", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: patch }),
      });
      if (!res.ok) throw new Error();
      await load();
      setMessage("Ayarlar kaydedildi.");
    } catch {
      setMessage("Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTarget(targetGrams: number) {
    setSaving(true);
    try {
      await fetch("/api/admin/street-food-fund", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: { targetGrams } }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function startNewCampaign() {
    setSaving(true);
    try {
      await fetch("/api/admin/street-food-fund", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startNewCampaign: true }),
      });
      await load();
      setMessage("Yeni kampanya başlatıldı.");
    } finally {
      setSaving(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/street-food-fund/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grams: Number(manualForm.grams),
          note: manualForm.note || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Kayıt başarısız");
      setManualForm({ grams: "", note: "" });
      await load();
      setMessage("Kumbaraya manuel ekleme kaydedildi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Manuel ekleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDonation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/street-food-fund/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: donationForm.recipientName,
          gramsDelivered: Number(donationForm.gramsDelivered),
          storyHtml: donationForm.storyHtml,
          photoUrls: donationForm.photoUrls,
          videoUrl: donationForm.videoUrl,
          publish: donationForm.publish,
        }),
      });
      if (!res.ok) throw new Error();
      setDonationForm({
        recipientName: "",
        gramsDelivered: "",
        storyHtml: "",
        photoUrls: "",
        videoUrl: "",
        publish: true,
      });
      await load();
      setMessage("Bağış kaydı oluşturuldu.");
    } catch {
      setMessage("Bağış kaydı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--kn-muted)]">Yükleniyor…</p>;
  if (!data) return <p className="text-sm text-red-600">{message ?? "Veri yok"}</p>;

  const kgCollected = (data.campaign?.collectedGrams ?? 0) / 1000;
  const kgTarget = (data.campaign?.targetGrams ?? data.settings.defaultTargetGrams) / 1000;

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm">{message}</p> : null}

      <section className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Genel ayarlar</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.settings.enabled}
            disabled={saving}
            onChange={(e) => void saveSettings({ enabled: e.target.checked })}
          />
          Mama fonu aktif (üst sayaç + sipariş katkısı)
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm block">
            <span className="text-[var(--kn-muted)]">Slogan (TR)</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              defaultValue={data.settings.sloganTr}
              onBlur={(e) => void saveSettings({ sloganTr: e.target.value })}
            />
          </label>
          <label className="text-sm block">
            <span className="text-[var(--kn-muted)]">Sayaç alt metni (TR)</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              defaultValue={data.settings.counterSubtextTr}
              onBlur={(e) => void saveSettings({ counterSubtextTr: e.target.value })}
            />
          </label>
        </div>
        <p className="text-xs text-[var(--kn-muted)]">
          Detay sayfası:{" "}
          <a href={data.settings.detailPath} className="underline" target="_blank" rel="noreferrer">
            {data.settings.detailPath}
          </a>
        </p>
      </section>

      <section className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Aktif kumbara</h2>
        {data.campaign ? (
          <>
            <p className="text-2xl font-semibold">
              {kgCollected.toFixed(1).replace(".", ",")} kg / {kgTarget.toFixed(0)} kg
            </p>
            <p className="text-sm text-[var(--kn-muted)]">
              Durum: {data.campaign.status} · {data.stats.orderCount} sipariş katkısı
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="text-sm flex items-center gap-2">
                Hedef (gram):
                <input
                  type="number"
                  className="w-28 rounded border border-[var(--kn-border)] px-2 py-1"
                  defaultValue={data.campaign.targetGrams}
                  onBlur={(e) => void updateTarget(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void startNewCampaign()}
                className="rounded-lg border border-[var(--kn-border)] px-3 py-1.5 text-sm"
              >
                Yeni döngü başlat
              </button>
            </div>
            <form
              className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-[var(--kn-border)] p-4"
              onSubmit={(e) => void submitManual(e)}
            >
              <p className="w-full text-sm font-medium">Kumbaraya manuel ekle</p>
              <label className="text-sm block">
                Gram (gr)
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  className="mt-1 w-32 rounded-lg border border-[var(--kn-border)] px-3 py-2"
                  value={manualForm.grams}
                  onChange={(e) => setManualForm((f) => ({ ...f, grams: e.target.value }))}
                />
              </label>
              <label className="text-sm block flex-1 min-w-[12rem]">
                Not (isteğe bağlı)
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
                  placeholder="Örn. nakit bağış, etkinlik"
                  value={manualForm.note}
                  onChange={(e) => setManualForm((f) => ({ ...f, note: e.target.value }))}
                />
              </label>
              <button
                type="submit"
                disabled={saving || !data.settings.enabled}
                className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Ekle
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-[var(--kn-muted)]">
            Aktif kampanya yok. Fonu etkinleştirdiğinizde veya yeni döngü başlattığınızda oluşur.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Bağış kaydı (foto / video)</h2>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submitDonation(e)}>
          <label className="text-sm block sm:col-span-1">
            Alıcı (barınak / kurum)
            <input
              required
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              value={donationForm.recipientName}
              onChange={(e) => setDonationForm((f) => ({ ...f, recipientName: e.target.value }))}
            />
          </label>
          <label className="text-sm block sm:col-span-1">
            Teslim edilen mama (gram)
            <input
              required
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              value={donationForm.gramsDelivered}
              onChange={(e) => setDonationForm((f) => ({ ...f, gramsDelivered: e.target.value }))}
            />
          </label>
          <label className="text-sm block sm:col-span-2">
            Hikâye / açıklama (HTML)
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              value={donationForm.storyHtml}
              onChange={(e) => setDonationForm((f) => ({ ...f, storyHtml: e.target.value }))}
            />
          </label>
          <label className="text-sm block sm:col-span-2">
            Fotoğraf URL’leri (her satır bir URL)
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2 font-mono text-xs"
              value={donationForm.photoUrls}
              onChange={(e) => setDonationForm((f) => ({ ...f, photoUrls: e.target.value }))}
            />
          </label>
          <label className="text-sm block sm:col-span-2">
            Video URL (YouTube / MP4)
            <input
              className="mt-1 w-full rounded-lg border border-[var(--kn-border)] px-3 py-2"
              value={donationForm.videoUrl}
              onChange={(e) => setDonationForm((f) => ({ ...f, videoUrl: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={donationForm.publish}
              onChange={(e) => setDonationForm((f) => ({ ...f, publish: e.target.checked }))}
            />
            Yayınla ve yeni kumbara döngüsü başlat
          </label>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Bağışı kaydet
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Son katkılar</h2>
        <ul className="divide-y divide-[var(--kn-border)] rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)]">
          {data.contributions.length ? (
            data.contributions.map((c) => (
              <li key={c.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <span>
                  {c.source === "manual" ? (
                    <>
                      Manuel
                      {c.manualNote ? (
                        <span className="text-[var(--kn-muted)]"> · {c.manualNote}</span>
                      ) : null}
                    </>
                  ) : (
                    <>#{c.orderNumber ?? "—"}</>
                  )}
                </span>
                <span>{c.gramsLabel}</span>
                <span className="text-[var(--kn-muted)]">
                  {new Date(c.createdAt).toLocaleString("tr-TR")}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-sm text-[var(--kn-muted)]">Henüz katkı yok.</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Bağış geçmişi</h2>
        <ul className="space-y-3">
          {data.donations.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{d.recipientName}</strong>
                <span>{d.gramsLabel}</span>
              </div>
              <p className="text-[var(--kn-muted)] mt-1">
                {new Date(d.donatedAt).toLocaleDateString("tr-TR")} ·{" "}
                {d.published ? "Yayında" : "Taslak"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
