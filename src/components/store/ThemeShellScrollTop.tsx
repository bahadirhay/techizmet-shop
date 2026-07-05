"use client";

import { useEffect, useState } from "react";

/** Mirror scroll-to-top — sağ altta yukarı ok */
export function ThemeShellScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const st = window.pageYOffset || document.documentElement.scrollTop || 0;
      setVisible(st > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`scroll-to-top position-right${visible ? " show" : ""}`}
      back-to-top-button=""
    >
      <button
        type="button"
        className="scroll-to-top-inner"
        title="Yukarı"
        aria-label="Yukarı"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden>
          <path
            d="M1 6L6 1L11 6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
