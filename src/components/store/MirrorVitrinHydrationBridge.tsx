"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MirrorVitrinHydration } from "@/lib/mirror-vitrin-data";

const MirrorVitrinHydrationContext = createContext<MirrorVitrinHydration | null>(null);

export function MirrorVitrinHydrationProvider({
  value,
  children,
}: {
  value: MirrorVitrinHydration;
  children: ReactNode;
}) {
  const memo = useMemo(() => value, [value]);
  return (
    <MirrorVitrinHydrationContext.Provider value={memo}>{children}</MirrorVitrinHydrationContext.Provider>
  );
}

export function useMirrorVitrinHydration() {
  return useContext(MirrorVitrinHydrationContext);
}
