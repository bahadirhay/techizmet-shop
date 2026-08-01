"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { GoogleAppearanceScanResult } from "@/lib/admin/google-appearance/scan";
import type { GoogleAppearanceFixResult } from "@/lib/admin/google-appearance/fix";

export function GoogleAppearanceScanPanel() {
  const [scan, setScan] = useState<GoogleAppearanceScanResult | null>(null);
  const [busy, setBusy] = useState<"scan" | "fix" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastFix, setLastFix] = useState<GoogleAppearanceFixResult | null>(null);

  async function runScan() {
    setBusy("scan");
    setMsg(null);
    setLastFix(null);
    const res = await fetch("/api/admin/google-appearance/scan");
    const j = (await res.json()) as GoogleAppearanceScanResult & { error?: string };
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Tarama başarısız");
      return;
    }
    setScan(j);
    if (!j.findings.length) {
      setMsg(
        j.searchBlocked?.added?.length
          ? `Temiz. Search Console engeli: ${j.searchBlocked.added.join(", ")} robots.txt’e eklendi.`
          : "Temiz: tarama kalıntı bulmadı. Google sitelinkleri birkaç gün içinde kendini güncelleyebilir.",
      );
    } else {
      setMsg(
        j.searchBlocked?.added?.length
          ? `Bulgular var. Search Console engeli eklendi: ${j.searchBlocked.added.join(", ")}`
          : null,
      );
    }
  }

  async function runFix() {
    setBusy("fix");
    setMsg(null);
    const res = await fetch("/api/admin/google-appearance/fix", { method: "POST" });
    const j = (await res.json()) as GoogleAppearanceFixResult & { error?: string };
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Düzeltme başarısız");
      return;
    }
    setLastFix(j);
    setMsg(
      j.updatedSettings
        ? `${j.patchedFields} alan düzeltildi${j.robotsDisallowAdded.length ? `; robots: ${j.robotsDisallowAdded.join(", ")}` : ""}. Yeniden taranıyor…`
        : "Kayıtlı ayarlarda düzeltilecek alan yoktu; önbellek yenilendi. Yeniden taranıyor…",
    );
    await runScan();
  }

  return (
    <section className="admin-card admin-card-pad space-y-4">
      <h2 className="text-lg font-semibold">Google görünüm temizliği</h2>
      <p className="text-sm text-zinc-600">
        Tüm vitrin sayfalarını ve kayıtlı metinleri tarar; eski kozmetik şablon kalıntılarını
        (Our Skincare Picks, Glow Begins Here, theking-noor…) bulur. Tarama bitince şablon/demo
        yolları otomatik <strong>robots.txt + sitemap dışı</strong> bırakılır — Search Console’a
        düşmesin. Ana sayfa/koleksiyon gibi gerçek sayfalar engellenmez; onlar düzeltilir.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void runScan()}>
          {busy === "scan" ? "Taranıyor…" : "Tüm sayfaları tara"}
        </button>
        <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void runFix()}>
          {busy === "fix" ? "Düzeltiliyor…" : "Bulunanları düzelt"}
        </button>
      </div>
      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      {lastFix?.details?.length ? (
        <details className="text-xs text-zinc-500">
          <summary>Düzeltme detayları ({lastFix.details.length})</summary>
          <ul className="mt-2 list-disc pl-5">
            {lastFix.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {scan ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {scan.summary.urlsScanned} URL · {scan.summary.settingsFieldsScanned} ayar alanı —{" "}
            <span className="text-red-700">{scan.summary.fail} kritik</span>,{" "}
            <span className="text-amber-700">{scan.summary.warn} uyarı</span>,{" "}
            <span className="text-green-700">{scan.summary.clean} temiz canlı sayfa</span>
          </p>
          {scan.searchBlocked?.robotsDisallowPaths?.length ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Search Console engeli (robots/sitemap):{" "}
              <code className="text-xs">
                {(scan.searchBlocked.added.length
                  ? scan.searchBlocked.added
                  : scan.searchBlocked.robotsDisallowPaths.filter(
                      (p) =>
                        p.startsWith("/_mirror-prebuilt") ||
                        p.startsWith("/theme/techizmet-shop/mirror"),
                    )
                ).join(", ") || "aktif"}
              </code>
              {scan.searchBlocked.added.length
                ? " — yeni eklendi"
                : " — zaten tanımlı"}
            </p>
          ) : null}
          {scan.findings.length ? (
            <div className="max-h-[32rem] overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Kaynak</th>
                    <th className="px-3 py-2">Sayfa</th>
                    <th className="px-3 py-2">Bulgular</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.findings.map((f, i) => (
                    <tr key={`${f.source}-${f.path}-${f.field ?? ""}-${i}`} className="border-t align-top">
                      <td className="px-3 py-2 text-xs uppercase text-zinc-500">
                        {f.source === "live" ? "Canlı" : "Ayar"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-xs text-zinc-500">{f.path}</div>
                        {f.field ? <div className="text-xs text-zinc-400">{f.field}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <ul className="space-y-1 text-xs">
                          {f.hits.map((h) => (
                            <li
                              key={h.phraseId}
                              className={h.severity === "fail" ? "text-red-700" : "text-amber-700"}
                            >
                              <strong>“{h.phrase}”</strong> — {h.hint}
                            </li>
                          ))}
                        </ul>
                        {f.excerpt ? (
                          <p className="mt-1 text-[11px] leading-snug text-zinc-400">{f.excerpt}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-green-700">Kalıntı bulunamadı.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
