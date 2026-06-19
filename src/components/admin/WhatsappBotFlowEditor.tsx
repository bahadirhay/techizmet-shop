"use client";

import type { WhatsAppBotNode } from "@prisma/client";
import { useMemo, useState } from "react";
import { buildBotTree, type WhatsAppBotNodeTree } from "@/lib/whatsapp-bot";

function str(v: string | null | undefined) {
  return v ?? "";
}

function NodeEditor({
  node,
  depth,
  onRefresh,
}: {
  node: WhatsAppBotNodeTree;
  depth: number;
  onRefresh: () => void;
}) {
  const [label, setLabel] = useState(node.label);
  const [botReply, setBotReply] = useState(str(node.botReply));
  const [messageTemplate, setMessageTemplate] = useState(str(node.messageTemplate));
  const [published, setPublished] = useState(node.published);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/whatsapp/bot/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        botReply: botReply.trim() || null,
        messageTemplate: messageTemplate.trim() || null,
        published,
      }),
    });
    setSaving(false);
    onRefresh();
  }

  async function remove() {
    if (!confirm(`"${node.label}" silinsin mi? Alt seçenekler de silinir.`)) return;
    await fetch(`/api/admin/whatsapp/bot/nodes/${node.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs sm:col-span-2">
          Buton metni
          <input
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs sm:col-span-2">
          Bot yanıtı (alt menüden önce gösterilir)
          <input
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            value={botReply}
            onChange={(e) => setBotReply(e.target.value)}
            placeholder="İsteğe bağlı"
          />
        </label>
        <label className="grid gap-1 text-xs sm:col-span-2">
          WhatsApp mesajı (yaprak düğüm — alt seçenek yoksa)
          <textarea
            className="min-h-[2.5rem] rounded border border-zinc-300 px-2 py-1 text-sm"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Merhaba, …"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Yayında
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {saving ? "…" : "Kaydet"}
        </button>
        <button type="button" onClick={remove} className="text-xs text-red-600 hover:underline">
          Sil
        </button>
      </div>
    </div>
  );
}

function TreeBlock({
  nodes,
  allNodes,
  depth,
  onRefresh,
}: {
  nodes: ReturnType<typeof buildBotTree>;
  allNodes: WhatsAppBotNode[];
  depth: number;
  onRefresh: () => void;
}) {
  return (
    <ul className="space-y-3">
      {nodes.map((n) => (
        <li key={n.id} className="space-y-2">
          <NodeEditor node={n} depth={depth} onRefresh={onRefresh} />
          <AddChildForm parentId={n.id} parentLabel={n.label} onRefresh={onRefresh} depth={depth + 1} />
          {n.children.length > 0 ? (
            <TreeBlock nodes={n.children} allNodes={allNodes} depth={depth + 1} onRefresh={onRefresh} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AddChildForm({
  parentId,
  parentLabel,
  depth,
  onRefresh,
}: {
  parentId: string | null;
  parentLabel?: string;
  depth: number;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await fetch("/api/admin/whatsapp/bot/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId,
        label: label.trim(),
        messageTemplate: messageTemplate.trim() || null,
      }),
    });
    setLabel("");
    setMessageTemplate("");
    setOpen(false);
    onRefresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        style={{ marginLeft: depth * 16 }}
        className="text-xs text-emerald-700 hover:underline"
        onClick={() => setOpen(true)}
      >
        + {parentId ? `"${parentLabel}" altına seçenek ekle` : "Kök seçenek ekle"}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-lg border border-dashed border-emerald-300 p-3"
      style={{ marginLeft: depth * 16 }}
    >
      <input
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Buton metni"
        required
      />
      <input
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
        value={messageTemplate}
        onChange={(e) => setMessageTemplate(e.target.value)}
        placeholder="WhatsApp mesajı (isteğe bağlı)"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white">
          Ekle
        </button>
        <button type="button" className="text-xs text-zinc-500" onClick={() => setOpen(false)}>
          İptal
        </button>
      </div>
    </form>
  );
}

export function WhatsappBotFlowEditor({
  initialNodes,
  onRefresh,
}: {
  initialNodes: WhatsAppBotNode[];
  onRefresh: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const tree = useMemo(() => buildBotTree(initialNodes), [initialNodes]);

  async function loadDefaults() {
    if (!confirm("Örnek bot akışı yüklensin mi? (Mevcut düğüm yoksa)")) return;
    setSeeding(true);
    const res = await fetch("/api/admin/whatsapp/bot/seed", { method: "POST" });
    setSeeding(false);
    if (res.ok) onRefresh();
    else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? "Yüklenemedi");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bot akışı</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Ziyaretçi menüden konu seçer; son adımda sipariş no veya e-posta girer, ardından WhatsApp açılır.
          </p>
        </div>
        {initialNodes.length === 0 ? (
          <button
            type="button"
            disabled={seeding}
            onClick={loadDefaults}
            className="rounded-full border border-emerald-600 px-4 py-2 text-sm text-emerald-800 disabled:opacity-50"
          >
            {seeding ? "Yükleniyor…" : "Örnek akışı yükle"}
          </button>
        ) : null}
      </div>

      {initialNodes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          Henüz bot menüsü yok. Örnek akışı yükleyin veya kök seçenek ekleyin.
        </p>
      ) : (
        <TreeBlock nodes={tree} allNodes={initialNodes} depth={0} onRefresh={onRefresh} />
      )}

      <AddChildForm parentId={null} onRefresh={onRefresh} depth={0} />
    </section>
  );
}
