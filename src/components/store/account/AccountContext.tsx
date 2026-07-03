"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AccountDrawerMode = "login" | "register" | "forgot";

export type AccountCustomer = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AccountContextValue = {
  customer: AccountCustomer | null;
  loading: boolean;
  isOpen: boolean;
  mode: AccountDrawerMode;
  openAccount: (mode?: AccountDrawerMode) => void;
  closeAccount: () => void;
  setMode: (mode: AccountDrawerMode) => void;
  refreshSession: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<AccountCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AccountDrawerMode>("login");

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/store/bootstrap", { credentials: "same-origin" });
      if (res.ok) {
        const j = (await res.json()) as { customer: AccountCustomer | null };
        setCustomer(j.customer ?? null);
      }
    } catch {
      /* sessiz — çevrimdışı/istek hatası oturumu bozmasın */
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const openAccount = useCallback((next?: AccountDrawerMode) => {
    if (next) setMode(next);
    setIsOpen(true);
  }, []);
  const closeAccount = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      isOpen,
      mode,
      openAccount,
      closeAccount,
      setMode,
      refreshSession,
    }),
    [customer, loading, isOpen, mode, openAccount, closeAccount, refreshSession],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
