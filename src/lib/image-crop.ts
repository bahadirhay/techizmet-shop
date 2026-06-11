/** İstemci — canvas ile kırpma ve yeniden boyutlandırma */

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı"));
    };
    img.src = url;
  });
}

/** loadImageFromFile sonrası blob önizleme URL'sini serbest bırak */
export function releaseImageObjectUrl(img: HTMLImageElement | null | undefined) {
  const src = img?.src;
  if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
}

/** Görseli kırpıp hedef boyuta ölçekler; JPEG/PNG çıktı */
export async function cropImageToBlob(
  img: HTMLImageElement,
  crop: CropRect,
  output: { width: number; height: number; mime?: "image/jpeg" | "image/png"; quality?: number },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  const sx = Math.max(0, Math.min(img.naturalWidth - 1, crop.x));
  const sy = Math.max(0, Math.min(img.naturalHeight - 1, crop.y));
  const sw = Math.max(1, Math.min(img.naturalWidth - sx, crop.width));
  const sh = Math.max(1, Math.min(img.naturalHeight - sy, crop.height));

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, output.width, output.height);

  const mime = output.mime ?? "image/jpeg";
  const quality = output.quality ?? 0.92;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Dışa aktarılamadı"))),
      mime,
      quality,
    );
  });
}

function isTrimEmpty(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return true;
  return r >= 248 && g >= 248 && b >= 248;
}

/** Logo — boş kenarları kırp (şeffaf veya beyaz) */
export function trimImageBounds(img: HTMLImageElement): CropRect {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
  }
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  let top = h;
  let left = w;
  let bottom = 0;
  let right = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!isTrimEmpty(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) {
        top = Math.min(top, y);
        left = Math.min(left, x);
        bottom = Math.max(bottom, y);
        right = Math.max(right, x);
      }
    }
  }

  if (top > bottom || left > right) {
    return { x: 0, y: 0, width: w, height: h };
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };
}

/** Logo — oranı koru, kutuya sığdır, dosyada boş şerit bırakma */
export async function prepareLogoImageBlob(
  img: HTMLImageElement,
  opts: { maxWidth: number; maxHeight: number; trim?: boolean; mime?: "image/png" | "image/jpeg" },
): Promise<Blob> {
  const bounds = opts.trim === false ? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight } : trimImageBounds(img);
  const scale = Math.min(1, opts.maxWidth / bounds.width, opts.maxHeight / bounds.height);
  const outW = Math.max(1, Math.round(bounds.width * scale));
  const outH = Math.max(1, Math.round(bounds.height * scale));
  const mime = opts.mime ?? "image/png";
  return cropImageToBlob(img, bounds, { width: outW, height: outH, mime, quality: 0.95 });
}

/** Kırpmasız — en uzun kenarı maxPx ile küçült */
export async function resizeImageToBlob(
  img: HTMLImageElement,
  maxPx: number,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<Blob> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxPx / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  return cropImageToBlob(img, { x: 0, y: 0, width: w, height: h }, { width: outW, height: outH, mime });
}

/** Pan/zoom önizlemeden kaynak piksel kırpma alanı */
export function viewportToCropRect(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  aspect: number,
): CropRect {
  const frameW = viewW;
  const frameH = viewW / aspect;
  const frameTop = (viewH - frameH) / 2;

  const dispW = imgW * scale;
  const dispH = imgH * scale;
  const imgLeft = (viewW - dispW) / 2 + offsetX;
  const imgTop = (viewH - dispH) / 2 + offsetY;

  const cropX = ((0 - imgLeft) / dispW) * imgW;
  const cropY = ((frameTop - imgTop) / dispH) * imgH;
  const cropW = (frameW / dispW) * imgW;
  const cropH = (frameH / dispH) * imgH;

  return {
    x: Math.max(0, cropX),
    y: Math.max(0, cropY),
    width: Math.min(imgW, cropW),
    height: Math.min(imgH, cropH),
  };
}
