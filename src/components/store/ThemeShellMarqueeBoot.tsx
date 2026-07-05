"use client";

import { useEffect } from "react";

/** Tema kabuğunda kayan şerit — autoplay sınıfı ve okunabilir boyut */
function bootMarqueeSections() {
  document.querySelectorAll("section.section-marquee").forEach((section) => {
    section.classList.add("kn-marquee-readable");
    section.querySelectorAll(".marquee--block-node").forEach((node) => {
      node.classList.add("autoplay--infinite");
    });
    section.querySelectorAll(".marquee-text .outline--filled").forEach((el) => {
      el.classList.add("outline-animate");
    });
  });
}

export function ThemeShellMarqueeBoot() {
  useEffect(() => {
    bootMarqueeSections();
    const t1 = window.setTimeout(bootMarqueeSections, 80);
    const t2 = window.setTimeout(bootMarqueeSections, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
