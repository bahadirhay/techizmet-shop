import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";

// Minimal inline test — import TS via dynamic require won't work; parse prebuild manually
const html = readFileSync("tmp-girtlak-prebuilt.html", "utf8");
const { document } = parseHTML(html);
const outer = document.querySelector("#MainContent .main--product-image-slider-outer");
console.log("prebuild fp:", outer?.getAttribute("data-kn-gallery-fp"));
console.log("slides:", outer?.querySelectorAll(".main--product-item").length);
console.log("img src:", outer?.querySelector("img")?.getAttribute("src"));
console.log("media ratio:", outer?.querySelector(".media")?.getAttribute("style"));
console.log("kn-product-images:", !!document.getElementById("kn-product-images-css"));

// Check if img has dimensions causing layout issues
const img = outer?.querySelector("img");
if (img) {
  console.log("img w/h attrs:", img.getAttribute("width"), img.getAttribute("height"));
  console.log("computed classes:", img.className);
}
