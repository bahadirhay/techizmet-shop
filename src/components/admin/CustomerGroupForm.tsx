"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { orderNumberPreview } from "@/lib/admin/order-number";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type Group = {
  id?: string;
  name: string;
  slug: string;
  discountPercent: number;
  orderNumberPrefix: string;
  active: boolean;
  description: string;
};

export function CustomerGroupForm({ initial }: { initial?: Group }) {
  const router = useRouter();
  const [form, setForm] = useState<Group>(
    initial ?? {
      name: "",
      slug: "",
      discountPercent: 15,
      orderNumberPrefix: "",
      active: true,
      description: "",
    },
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const url = form.id ? `/api/admin/customer-groups/${form.id}` : "/api/admin/customer-groups";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/customer-groups");
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-4">
      <AdminField label="Grup adı *">
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </AdminField>
      <AdminField label="Slug (URL)">
        <input
          className={inputClass}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="bayi"
        />
      </AdminField>
      <AdminField label="İndirim oranı (%) — satış fiyatı üzerinden">
        <input
          className={inputClass}
          type="number"
          min={0}
          max={99}
          value={form.discountPercent}
          onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
        />
      </AdminField>
      <AdminField
        label="Sipariş no öneki (B2B / bayi)"
        hint="Bu gruptaki üyeler sipariş verince kullanılır. Boş = mağaza varsayılanı."
      >
        <input
          className={`${inputClass} max-w-xs uppercase`}
          value={form.orderNumberPrefix}
          onChange={(e) => setForm({ ...form, orderNumberPrefix: e.target.value.toUpperCase() })}
          placeholder="BAYI"
          maxLength={8}
        />
        {form.orderNumberPrefix.trim() ? (
          <p className="mt-1 text-xs text-zinc-500">Örnek: {orderNumberPreview(form.orderNumberPrefix)}</p>
        ) : null}
      </AdminField>
      <AdminField label="Açıklama">
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </AdminField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        Grup aktif
      </label>
      <p className="text-xs text-zinc-500">
        Üyeler önce{" "}
        <Link href="/account/register" className="underline" target="_blank">
          mağazada kayıt
        </Link>{" "}
        olur; siz Müşteriler veya müşteri kartından gruba atarsınız.
      </p>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <Link href="/admin/customer-groups" className={btnSecondary}>
          İptal
        </Link>
      </div>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
    </div>
  );
}
