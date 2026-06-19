"use client";

import Link from "next/link";
import { useState } from "react";
import { inputClass, AdminField, btnPrimary } from "@/components/admin/AdminForm";
import { SiteMemberSearchField } from "@/components/admin/SiteMemberSearchField";
import type { CustomerCounterpartyPrefill } from "@/lib/finance/customer-counterparty-prefill";

type Counterparty = { id: string; type: string; title: string; taxId: string | null };
type Category = { id: string; name: string; kind: string };
type Account = { id: string; name: string; kind: string };
type PostingTemplate = {
  id: string;
  name: string;
  keyword: string;
  direction: string | null;
  source: string | null;
  priority: number;
  category?: { name: string };
  account?: { name: string };
};

export function FinanceMasterDataManager({
  initialCounterparties,
  initialCategories,
  initialAccounts,
  initialTemplates,
}: {
  initialCounterparties: Counterparty[];
  initialCategories: Category[];
  initialAccounts: Account[];
  initialTemplates: PostingTemplate[];
}) {
  const [counterparties, setCounterparties] = useState(initialCounterparties);
  const [categories, setCategories] = useState(initialCategories);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [templates, setTemplates] = useState(initialTemplates);
  const [msg, setMsg] = useState<string | null>(null);

  const [cpForm, setCpForm] = useState({
    title: "",
    taxId: "",
    taxOffice: "",
    email: "",
    phone: "",
    addressLine: "",
    city: "",
    district: "",
    type: "external_manual",
    customerId: "",
  });
  const [selectedMember, setSelectedMember] = useState<CustomerCounterpartyPrefill | null>(null);

  function resetCpForm() {
    setCpForm({
      title: "",
      taxId: "",
      taxOffice: "",
      email: "",
      phone: "",
      addressLine: "",
      city: "",
      district: "",
      type: "external_manual",
      customerId: "",
    });
    setSelectedMember(null);
  }

  function applyMember(member: CustomerCounterpartyPrefill) {
    setSelectedMember(member);
    setCpForm((f) => ({
      ...f,
      customerId: member.id,
      title: member.title,
      email: member.email ?? "",
      phone: member.phone ?? "",
      taxId: member.taxId ?? "",
      taxOffice: member.taxOffice ?? "",
      addressLine: member.addressLine ?? "",
      city: member.city ?? "",
      district: member.district ?? "",
    }));
  }
  const [catForm, setCatForm] = useState({ name: "", kind: "expense" });
  const [accForm, setAccForm] = useState({ name: "", kind: "bank" });
  const [tplForm, setTplForm] = useState({
    name: "",
    keyword: "",
    direction: "",
    source: "",
    categoryId: "",
    accountId: "",
    priority: 100,
  });

  async function refresh() {
    const [cp, ct, ac, tp] = await Promise.all([
      fetch("/api/admin/finance/counterparties").then((r) => r.json()),
      fetch("/api/admin/finance/categories").then((r) => r.json()),
      fetch("/api/admin/finance/accounts").then((r) => r.json()),
      fetch("/api/admin/finance/posting-templates").then((r) => r.json()),
    ]);
    setCounterparties(cp.counterparties ?? []);
    setCategories(ct.categories ?? []);
    setAccounts(ac.accounts ?? []);
    setTemplates(tp.templates ?? []);
  }

  return (
    <div className="space-y-6">
      <section className="admin-card admin-card-pad">
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          Müşteri / üye ekleme işlemi artık{" "}
          <Link href="/admin/customers/new" className="font-medium text-[var(--kn-brand)] underline">
            Müşteriler & üyeler
          </Link>{" "}
          bölümündedir.
        </div>
      </section>

      <section className="admin-card admin-card-pad grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Karşı taraf ekle</h2>
          <div className="mt-3 space-y-3">
            <AdminField label="Tür">
              <select
                className={inputClass}
                value={cpForm.type}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === "external_manual") {
                    resetCpForm();
                    setCpForm({ title: "", taxId: "", taxOffice: "", email: "", phone: "", addressLine: "", city: "", district: "", type: "external_manual", customerId: "" });
                  } else {
                    setCpForm((f) => ({ ...f, type: "site_member" }));
                  }
                }}
              >
                <option value="external_manual">Site dışı / manuel</option>
                <option value="site_member">Site üyesi</option>
              </select>
            </AdminField>

            {cpForm.type === "site_member" ? (
              <>
                <SiteMemberSearchField
                  value={selectedMember}
                  onSelect={applyMember}
                  onClear={() => {
                    setSelectedMember(null);
                    setCpForm((f) => ({
                      ...f,
                      customerId: "",
                      title: "",
                      email: "",
                      phone: "",
                      taxId: "",
                      taxOffice: "",
                      addressLine: "",
                      city: "",
                      district: "",
                    }));
                  }}
                />
                {selectedMember?.hasCounterparty && selectedMember.counterpartyId ? (
                  <p className="text-sm text-amber-800">
                    Bu üye için cari kart zaten var.{" "}
                    <Link
                      href={`/admin/finance/counterparties/${selectedMember.counterpartyId}`}
                      className="underline"
                    >
                      Cari karta git →
                    </Link>
                  </p>
                ) : null}
              </>
            ) : null}

            <AdminField label="Ünvan / ad">
              <input
                className={inputClass}
                value={cpForm.title}
                onChange={(e) => setCpForm((f) => ({ ...f, title: e.target.value }))}
                readOnly={cpForm.type === "site_member" && Boolean(selectedMember)}
              />
            </AdminField>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="E-posta">
                <input
                  className={inputClass}
                  value={cpForm.email}
                  onChange={(e) => setCpForm((f) => ({ ...f, email: e.target.value }))}
                  readOnly={cpForm.type === "site_member" && Boolean(selectedMember)}
                />
              </AdminField>
              <AdminField label="Telefon">
                <input
                  className={inputClass}
                  value={cpForm.phone}
                  onChange={(e) => setCpForm((f) => ({ ...f, phone: e.target.value }))}
                  readOnly={cpForm.type === "site_member" && Boolean(selectedMember)}
                />
              </AdminField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="VKN/TCKN">
                <input
                  className={inputClass}
                  value={cpForm.taxId}
                  onChange={(e) => setCpForm((f) => ({ ...f, taxId: e.target.value }))}
                  placeholder={cpForm.type === "site_member" ? "Son faturadan veya manuel" : ""}
                />
              </AdminField>
              <AdminField label="Vergi dairesi">
                <input
                  className={inputClass}
                  value={cpForm.taxOffice}
                  onChange={(e) => setCpForm((f) => ({ ...f, taxOffice: e.target.value }))}
                />
              </AdminField>
            </div>
            {cpForm.type === "site_member" && selectedMember ? (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-600">
                {cpForm.addressLine ? (
                  <p>
                    {cpForm.addressLine}
                    {cpForm.district || cpForm.city
                      ? ` — ${[cpForm.district, cpForm.city].filter(Boolean).join(" / ")}`
                      : ""}
                  </p>
                ) : (
                  <p>Kayıtlı adres yok — cari kart adres alanları boş kalır.</p>
                )}
              </div>
            ) : null}
            <button
              className={btnPrimary}
              disabled={cpForm.type === "site_member" && (!selectedMember || selectedMember.hasCounterparty)}
              onClick={async () => {
                setMsg(null);
                if (cpForm.type === "site_member" && !cpForm.customerId) {
                  setMsg("Önce site üyesi arayıp seçin.");
                  return;
                }
                const res = await fetch("/api/admin/finance/counterparties", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(cpForm),
                });
                const j = (await res.json()) as { error?: string; counterparty?: { id: string } };
                if (!res.ok) return setMsg(j.error ?? "Karşı taraf eklenemedi.");
                resetCpForm();
                setMsg("Karşı taraf eklendi.");
                await refresh();
              }}
            >
              Karşı taraf ekle
            </button>
          </div>
        </div>

        <div />
      </section>

      <section className="admin-card admin-card-pad grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Muhasebe kategorisi ekle</h2>
          <div className="mt-3 space-y-3">
            <select className={inputClass} value={catForm.kind} onChange={(e) => setCatForm((f) => ({ ...f, kind: e.target.value }))}>
              <option value="expense">Gider</option>
              <option value="income">Gelir</option>
            </select>
            <input className={inputClass} placeholder="Kategori adı" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
            <button className={btnPrimary} onClick={async () => {
              const res = await fetch("/api/admin/finance/categories", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(catForm),
              });
              const j = (await res.json()) as { error?: string };
              if (!res.ok) return setMsg(j.error ?? "Kategori eklenemedi.");
              setCatForm({ name: "", kind: "expense" });
              await refresh();
            }}>
              Kategori ekle
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-semibold">Muhasebe hesabı ekle</h2>
          <div className="mt-3 space-y-3">
            <select className={inputClass} value={accForm.kind} onChange={(e) => setAccForm((f) => ({ ...f, kind: e.target.value }))}>
              <option value="cash">Kasa</option>
              <option value="bank">Banka</option>
              <option value="credit_card">Kredi kartı</option>
              <option value="marketplace_receivable">Pazaryeri alacağı</option>
            </select>
            <input className={inputClass} placeholder="Hesap adı" value={accForm.name} onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))} />
            <button className={btnPrimary} onClick={async () => {
              const res = await fetch("/api/admin/finance/accounts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(accForm),
              });
              const j = (await res.json()) as { error?: string };
              if (!res.ok) return setMsg(j.error ?? "Hesap eklenemedi.");
              setAccForm({ name: "", kind: "bank" });
              await refresh();
            }}>
              Hesap ekle
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card-pad">
        <h3 className="font-semibold">Mevcut kayıtlar</h3>
        <p className="mt-1 text-sm text-zinc-500">{msg}</p>
        <div className="mt-3 grid gap-6 md:grid-cols-3 text-sm">
          <div>
            <p className="mb-2 font-medium">Karşı taraflar</p>
            <ul className="space-y-1">
              {counterparties.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/finance/counterparties/${c.id}`} className="underline">
                    {c.title}
                  </Link>{" "}
                  <span className="text-zinc-500">({c.type})</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">Kategoriler</p>
            <ul className="space-y-1">{categories.map((c) => <li key={c.id}>{c.name} ({c.kind})</li>)}</ul>
          </div>
          <div>
            <p className="mb-2 font-medium">Hesaplar</p>
            <ul className="space-y-1">{accounts.map((a) => <li key={a.id}>{a.name} ({a.kind})</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card-pad">
        <h3 className="font-semibold">Otomatik hesap/kategori eşleme şablonları</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input className={inputClass} placeholder="Şablon adı" value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputClass} placeholder="Anahtar kelime (örn. komisyon)" value={tplForm.keyword} onChange={(e) => setTplForm((f) => ({ ...f, keyword: e.target.value }))} />
          <input className={inputClass} placeholder="Öncelik (düşük önce)" type="number" value={tplForm.priority} onChange={(e) => setTplForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          <select className={inputClass} value={tplForm.direction} onChange={(e) => setTplForm((f) => ({ ...f, direction: e.target.value }))}>
            <option value="">Yön: farketmez</option>
            <option value="incoming">Gelen</option>
            <option value="outgoing">Giden</option>
          </select>
          <select className={inputClass} value={tplForm.categoryId} onChange={(e) => setTplForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={inputClass} value={tplForm.accountId} onChange={(e) => setTplForm((f) => ({ ...f, accountId: e.target.value }))}>
            <option value="">Hesap</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button
          className={`${btnPrimary} mt-3`}
          onClick={async () => {
            const res = await fetch("/api/admin/finance/posting-templates", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(tplForm),
            });
            const j = (await res.json()) as { error?: string };
            if (!res.ok) return setMsg(j.error ?? "Şablon eklenemedi.");
            setTplForm({ name: "", keyword: "", direction: "", source: "", categoryId: "", accountId: "", priority: 100 });
            await refresh();
          }}
        >
          Eşleme şablonu ekle
        </button>
        <ul className="mt-4 space-y-1 text-sm">
          {templates.map((t) => (
            <li key={t.id}>
              <b>{t.name}</b> · "{t.keyword}" · {t.direction ?? "her yön"} → {t.category?.name ?? "?"} / {t.account?.name ?? "?"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
