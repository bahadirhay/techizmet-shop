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
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı"));
    };
    img.src = url;
  });
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
