"use client";

import type { WhatsAppLead } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminWhatsAppButton } from "@/components/admin/AdminWhatsAppButton";
import {
  WA_LEAD_SOURCE_LABELS,
  WA_LEAD_STATUS,
  WA_LEAD_STATUS_LABELS,
  type WaLeadSource,
  type WaLeadStatus,
} from "@/lib/whatsapp-lead";

type CountRow = { status: string; _count: { _all: number } };

function formatWhen(iso: string | Date) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

function sourceLabel(source: string) {
  return WA_LEAD_SOURCE_LABELS[source as WaLeadSource] ?? source;
}

export function WhatsappInboxClient({
  initialLeads,
  initialCounts,
  whatsappNumber,
}: {
  initialLeads: WhatsAppLead[];
  initialCounts: CountRow[];
  whatsappNumber: string | null;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [counts, setCounts] = useState(initialCounts);
  const [filter, setFilter] = useState<WaLeadStatus | "all">("all");
  const [loading, setLoading] = useState(false);

  const countMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of counts) m[c.status] = c._count._all;
    return m;
  }, [counts]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/admin/whatsapp/leads${q}`);
    setLoading(false);
    if (!res.ok) return;
    const data = (await res.json()) as { leads: WhatsAppLead[]; counts: CountRow[] };
    setLeads(data.leads);
    setCounts(data.counts);
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function patchLead(id: string, patch: { status?: WaLeadStatus; notes?: string | null }) {
    const res = await fetch(`/api/admin/whatsapp/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    await refresh();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gelen kutusu</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ziyaretçi WhatsApp&apos;a tıkladığında kayıt oluşur. Mesajdaki <strong>Ref</strong> kodu ile
          eşleştirin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...WA_LEAD_STATUS] as const).map((key) => {
          const label =
            key === "all"
              ? `Tümü (${leads.length})`
              : `${WA_LEAD_STATUS_LABELS[key]} (${countMap[key] ?? 0})`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === key
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {label}
            </button>
          );
        })}
        {loading ? <span className="self-center text-xs text-zinc-500">Yükleniyor…</span> : null}
      </div>

      {leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          Henüz kayıt yok. Sitedeki WhatsApp balonu veya botuna tıklandığında burada görünür.
        </p>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs">
                      Ref: {lead.ref}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        lead.status === "new"
                          ? "bg-amber-100 text-amber-900"
                          : lead.status === "contacted"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {WA_LEAD_STATUS_LABELS[lead.status as WaLeadStatus] ?? lead.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {formatWhen(lead.createdAt)} · {sourceLabel(lead.source)}
                    {lead.pagePath ? ` · ${lead.pagePath}` : ""}
                    {lead.botPath ? ` · Bot: ${lead.botPath}` : ""}
                  </p>
                  {lead.prefilledText ? (
                    <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                      {lead.prefilledText}
                    </pre>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {whatsappNumber ? (
                    <AdminWhatsAppButton
                      phone={whatsappNumber}
                      prefilledMessage={lead.prefilledText ?? `Ref: ${lead.ref}`}
                      label="Yanıtla"
                    />
                  ) : null}
                  {lead.status !== "contacted" ? (
                    <button
                      type="button"
                      className="rounded-full border border-emerald-600 px-3 py-1 text-xs text-emerald-700"
                      onClick={() => patchLead(lead.id, { status: "contacted" })}
                    >
                      Yanıtlandı
                    </button>
                  ) : null}
                  {lead.status !== "closed" ? (
                    <button
                      type="button"
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs"
                      onClick={() => patchLead(lead.id, { status: "closed" })}
                    >
                      Kapat
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="mt-3 grid gap-1 text-xs">
                Not
                <textarea
                  className="min-h-[2.5rem] rounded border border-zinc-300 px-2 py-1 text-sm"
                  defaultValue={lead.notes ?? ""}
                  placeholder="İç not…"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v === (lead.notes ?? "")) return;
                    void patchLead(lead.id, { notes: v || null });
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
