"use client";

import { useEffect } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";
import { stripLocaleSwitchParamFromUrl } from "@/lib/i18n/locale-switch-url";

export function HtmlLang({ locale }: { locale: ShopLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-shop-locale", locale);
    stripLocaleSwitchParamFromUrl();
  }, [locale]);
  return null;
}
