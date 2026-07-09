"use client";

import { useLayoutEffect } from "react";

/** React SSR'da çalışmayan inline script'leri DOM'a enjekte eder */
export function ThemeShellInjectScript({ id, code }: { id: string; code: string }) {
  useLayoutEffect(() => {
    if (!code || document.getElementById(id)) return;
    const el = document.createElement("script");
    el.id = id;
    el.textContent = code;
    document.body.appendChild(el);
  }, [code, id]);

  return null;
}
