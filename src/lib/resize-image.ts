// Client-side image resizer used by the asset upload UIs (Create/Edit app
// modals, app management view, etc.). Resizes any uploaded image to exact
// target dimensions using a "cover" fit: scale to fill the box, then
// center-crop the overflow. PNGs stay PNG so icon transparency is preserved;
// everything else is encoded as JPEG at 0.95 quality.
export function resizeImageToFile(
  file: File,
  targetW: number,
  targetH: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas is not supported in this browser.'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const sw = img.naturalWidth;
        const sh = img.naturalHeight;
        const scale = Math.max(targetW / sw, targetH / sh);
        const drawW = sw * scale;
        const drawH = sh * scale;
        const dx = (targetW - drawW) / 2;
        const dy = (targetH - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        URL.revokeObjectURL(url);

        const isPng = file.type === 'image/png';
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const ext = isPng ? 'png' : 'jpg';

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to encode resized image.'));
            return;
          }
          const base = file.name.replace(/\.[^.]+$/, '') || 'image';
          resolve(new File([blob], `${base}-${targetW}x${targetH}.${ext}`, { type: mime }));
        }, mime, 0.95);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error('Image resize failed.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the selected file as an image.'));
    };
    img.src = url;
  });
}

export const ICON_SIZE = { w: 512, h: 512 } as const;
export const FEATURE_GRAPHIC_SIZE = { w: 1024, h: 500 } as const;
