"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StaffUserPasswordForm } from "@/components/admin/StaffUserPasswordForm";
import {
  AdminField,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/admin/AdminForm";
import {
  STAFF_PERMISSION_KEYS,
  STAFF_PERMISSION_LABELS,
  type StaffPermission,
} from "@/lib/staff-permissions";
import { isAdminRoleSlug } from "@/lib/staff-role-presets";

export type StaffRoleOption = {
  id: string;
  slug: string;
  label: string;
  permissions: string[];
};

export type StaffUserOption = {
  id: string;
  username: string;
  displayName: string | null;
  active: boolean;
  roleIds: string[];
};

function RoleCheckboxes({
  roles,
  selected,
  onChange,
  disabled,
}: {
  roles: StaffRoleOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(roleId: string) {
    if (disabled) return;
    if (selected.includes(roleId)) {
      onChange(selected.filter((id) => id !== roleId));
    } else {
      onChange([...selected, roleId]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => {
        const on = selected.includes(r.id);
        return (
          <label
            key={r.id}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
              on ? "border-[var(--kn-brand)] bg-[var(--kn-brand)]/10" : "border-zinc-200 bg-white"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              className="rounded"
              checked={on}
              disabled={disabled}
              onChange={() => toggle(r.id)}
            />
            <span>{r.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export type StaffUserCreatePrefill = {
  username: string;
  displayName: string;
  autoOpen?: boolean;
};

function StaffUserCreateForm({
  roles,
  onCreated,
  prefill,
}: {
  roles: StaffRoleOption[];
  onCreated: () => void;
  prefill?: StaffUserCreatePrefill | null;
}) {
  const [open, setOpen] = useState(Boolean(prefill?.autoOpen));
  const [username, setUsername] = useState(prefill?.username ?? "");
  const [displayName, setDisplayName] = useState(prefill?.displayName ?? "");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setUsername(prefill.username);
    setDisplayName(prefill.displayName);
    if (prefill.autoOpen) setOpen(true);
  }, [prefill]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/admin/staff-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password, roleIds }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Oluşturulamadı");
      return;
    }
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRoleIds([]);
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
        + Panel kullanıcısı ekle
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border bg-zinc-50 p-4 space-y-4">
      <h3 className="font-medium text-sm">Yeni panel kullanıcısı</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Kullanıcı adı (giriş) *" hint="Küçük harf, örn. ayse.editor">
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
          />
        </AdminField>
        <AdminField label="Görünen ad">
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </AdminField>
      </div>
      <AdminField label="İlk şifre *">
        <input
          type="password"
          className={inputClass}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </AdminField>
      <AdminField label="Roller *">
        <RoleCheckboxes roles={roles} selected={roleIds} onChange={setRoleIds} />
      </AdminField>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={busy || roleIds.length === 0}>
          {busy ? "Kaydediliyor…" : "Oluştur"}
        </button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
          İptal
        </button>
      </div>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
    </form>
  );
}

function StaffUserEditRow({
  user,
  roles,
  currentUserId,
}: {
  user: StaffUserOption;
  roles: StaffRoleOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const isSelf = user.id === currentUserId;
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [active, setActive] = useState(user.active);
  const [roleIds, setRoleIds] = useState(user.roleIds);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roleLabels = useMemo(
    () =>
      roleIds
        .map((id) => roles.find((r) => r.id === id)?.label)
        .filter(Boolean)
        .join(", "),
    [roleIds, roles],
  );

  const dirty =
    displayName !== (user.displayName ?? "") ||
    active !== user.active ||
    roleIds.length !== user.roleIds.length ||
    roleIds.some((id) => !user.roleIds.includes(id));

  async function save() {
    setMsg(null);
    setBusy(true);
    const res = await fetch(`/api/admin/staff-users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, active, roleIds }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setMsg("Kaydedildi.");
    router.refresh();
  }

  return (
    <li className="rounded-xl border bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <strong>{user.username}</strong>
          {isSelf ? <span className="ml-2 text-xs text-zinc-500">(siz)</span> : null}
          {!dirty ? (
            <p className="mt-1 text-xs text-zinc-500">
              {roleLabels || "—"} · {active ? "Aktif" : "Pasif"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
        <AdminField label="Görünen ad">
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </AdminField>
        <AdminField label="Roller">
          <RoleCheckboxes roles={roles} selected={roleIds} onChange={setRoleIds} />
        </AdminField>
        {!isSelf ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Aktif (giriş yapabilir)
          </label>
        ) : null}
        {dirty ? (
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
            {busy ? "…" : "Değişiklikleri kaydet"}
          </button>
        ) : null}
        {msg ? <p className="text-xs text-zinc-600">{msg}</p> : null}
      </div>

      {!isSelf ? <StaffUserPasswordForm userId={user.id} username={user.username} /> : null}
    </li>
  );
}

function StaffRoleEditor({ role }: { role: StaffRoleOption }) {
  const router = useRouter();
  const isAdmin = isAdminRoleSlug(role.slug);
  const [label, setLabel] = useState(role.label);
  const [perms, setPerms] = useState<Set<string>>(new Set(role.permissions));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dirty =
    label !== role.label ||
    perms.size !== role.permissions.length ||
    role.permissions.some((p) => !perms.has(p));

  function togglePerm(key: StaffPermission) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setMsg(null);
    setBusy(true);
    const res = await fetch(`/api/admin/staff-roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, permissions: [...perms] }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setMsg("Rol güncellendi.");
    router.refresh();
  }

  return (
    <li className="rounded-xl border bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>{role.label}</strong>{" "}
          <span className="text-zinc-400">({role.slug})</span>
          {isAdmin ? (
            <p className="mt-1 text-xs text-amber-700">Tam yetki — bu rol düzenlenemez</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">{role.permissions.length} yetki atanmış</p>
          )}
        </div>
        {!isAdmin ? (
          <button
            type="button"
            className="text-xs text-[var(--kn-brand)] underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Gizle" : "Yetkileri düzenle"}
          </button>
        ) : null}
      </div>

      {expanded && !isAdmin ? (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
          <AdminField label="Rol adı">
            <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
          </AdminField>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-700">Yetkiler</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAFF_PERMISSION_KEYS.map((key) => (
                <label key={key} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded"
                    checked={perms.has(key)}
                    onChange={() => togglePerm(key)}
                  />
                  <span>
                    <span className="font-medium">{STAFF_PERMISSION_LABELS[key]}</span>
                    <span className="block text-zinc-400">{key}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {dirty ? (
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
              {busy ? "…" : "Rolü kaydet"}
            </button>
          ) : null}
          {msg ? <p className="text-xs text-zinc-600">{msg}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

export function StaffUsersPanel({
  users,
  roles,
  currentUserId,
  canManage,
  createPrefill,
}: {
  users: StaffUserOption[];
  roles: StaffRoleOption[];
  currentUserId: string;
  canManage: boolean;
  createPrefill?: StaffUserCreatePrefill | null;
}) {
  const router = useRouter();

  return (
    <>
      {canManage ? (
        <StaffUserCreateForm
          roles={roles}
          prefill={createPrefill}
          onCreated={() => router.refresh()}
        />
      ) : null}

      <ul className="mt-4 space-y-3">
        {users.map((u) =>
          canManage ? (
            <StaffUserEditRow key={u.id} user={u} roles={roles} currentUserId={currentUserId} />
          ) : (
            <li key={u.id} className="rounded-xl border bg-white p-4 text-sm">
              <strong>{u.username}</strong>
              {u.id === currentUserId ? (
                <span className="ml-2 text-xs text-zinc-500">(siz)</span>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">
                {u.roleIds
                  .map((id) => roles.find((r) => r.id === id)?.label)
                  .filter(Boolean)
                  .join(", ") || "—"}{" "}
                · {u.active ? "Aktif" : "Pasif"}
              </p>
            </li>
          ),
        )}
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Panel rolleri & yetkiler</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Hazır roller: Yönetici, Editör, Sayfa editörü, Ürün yöneticisi, Muhasebe, Pazaryeri. Bir
        kullanıcıya birden fazla rol verebilirsiniz.
      </p>
      <ul className="mt-4 space-y-3">
        {roles.map((r) =>
          canManage ? (
            <StaffRoleEditor key={r.id} role={r} />
          ) : (
            <li key={r.id} className="rounded-xl border bg-white p-4 text-sm">
              <strong>{r.label}</strong> <span className="text-zinc-400">({r.slug})</span>
              <p className="mt-2 text-xs text-zinc-500">
                {r.permissions.length} yetki — {r.permissions.slice(0, 6).join(", ")}
                {r.permissions.length > 6 ? "…" : ""}
              </p>
            </li>
          ),
        )}
      </ul>
    </>
  );
}
