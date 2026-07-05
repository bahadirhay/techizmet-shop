"use client";

import { useEffect } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";

export function HtmlLang({ locale }: { locale: ShopLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-shop-locale", locale);
  }, [locale]);
  return null;
}
