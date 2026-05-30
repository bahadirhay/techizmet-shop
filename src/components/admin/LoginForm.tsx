"use client";

import { useState } from "react";

export function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: login.trim(), password }),
    });
    if (res.ok) window.location.href = "/admin/dashboard";
    else setErr(true);
  }

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
      <label className="text-sm">
        Kullanıcı adı
        <input
          type="text"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        Şifre
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      {err ? <p className="text-sm text-red-600">Giriş başarısız</p> : null}
      <button type="submit" className="mt-2 rounded-full bg-[var(--kn-brand)] py-2 text-sm font-medium text-white">
        Giriş
      </button>
    </form>
  );
}
