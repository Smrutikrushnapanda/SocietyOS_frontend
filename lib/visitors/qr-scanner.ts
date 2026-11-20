import jsQR from 'jsqr';

export function decodeGuestQr(source: CanvasImageSource, width: number, height: number): string | null {
  if (!width || !height) return null;
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('QR image reader is unavailable');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

export async function decodeGuestQrFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('Choose a QR image under 10 MB');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const token = decodeGuestQr(image, image.naturalWidth, image.naturalHeight);
    if (!token) throw new Error('No QR code found in this image');
    return token;
  } finally {
    URL.revokeObjectURL(url);
  }
}
