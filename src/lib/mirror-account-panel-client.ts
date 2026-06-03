/** Hesap paneli — statik mirror kabuğu + /api/account/panel ile doldurma */

import { applyMirrorAccountDashboardClient } from "@/lib/mirror-account-dashboard-client";
import { accountLoginPath } from "@/lib/account-return-path";

export async function hydrateMirrorAccountPanel(doc: Document): Promise<void> {
  const root = doc.getElementById("kn-account-dashboard-root");
  if (!root || root.dataset.knPanelHydrated === "1") return;

  if (root.querySelector(".kn-account-dashboard")) {
    root.dataset.knPanelHydrated = "1";
    applyMirrorAccountDashboardClient(doc);
    return;
  }

  if (root.dataset.knPanelLoading === "1") return;
  root.dataset.knPanelLoading = "1";

  try {
    const res = await fetch("/api/account/panel", { credentials: "same-origin" });
    if (res.status === 401) {
      const win = doc.defaultView;
      const topWin = win?.top ?? win;
      const path =
        topWin?.location.pathname && topWin.location.search
          ? `${topWin.location.pathname}${topWin.location.search}`
          : "/account";
      const target = topWin ?? win;
      if (target) target.location.href = accountLoginPath(path);
      return;
    }
    if (!res.ok) return;

    const data = (await res.json()) as { markup?: string; welcomeHtml?: string };
    if (data.markup) root.innerHTML = data.markup;

    if (data.welcomeHtml) {
      const welcome = doc.getElementById("kn-account-welcome");
      if (welcome) welcome.innerHTML = data.welcomeHtml;
    }

    root.dataset.knPanelHydrated = "1";
    applyMirrorAccountDashboardClient(doc);
  } finally {
    delete root.dataset.knPanelLoading;
  }
}
