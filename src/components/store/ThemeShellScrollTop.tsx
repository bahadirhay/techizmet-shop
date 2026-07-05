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
            d="M5.89338 2.23386L5.84983 2.27573L2.03117 5.94761C1.90077 6.07297 1.7251 6.14242 1.54313 6.14242C1.45291 6.14242 1.36345 6.12535 1.27979 6.09204C1.19613 6.05872 1.11974 6.00975 1.05512 5.94763C0.990497 5.8855 0.938902 5.81142 0.903587 5.72945C0.868264 5.64747 0.85 5.55939 0.85 5.47028C0.85 5.29007 0.924523 5.11849 1.05512 4.99294L4.91734 1.28C5.05945 1.14333 5.22787 1.03519 5.41281 0.96152C5.59775 0.88785 5.79578 0.85 5.99564 0.85C6.19551 0.85 6.39354 0.88785 6.57848 0.96152C6.76341 1.03519 6.93182 1.1433 7.07392 1.27997L10.935 4.99184C11.0626 5.81705 11.098 5.73374C11.1333 5.65041 11.151 5.56091 11.15 5.47057C11.1489 5.38022 11.129 5.29116 11.0918 5.20867C11.0547 5.12674 11.0014 5.0531 10.935 4.99184L7.07392 1.27997L6.09874 2.23386Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
