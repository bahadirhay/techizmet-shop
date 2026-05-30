"use client";

import { useEffect, useState } from "react";

/** dnd-kit ve benzeri kütüphanelerde SSR/client aria-id uyumsuzluğunu önler */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
