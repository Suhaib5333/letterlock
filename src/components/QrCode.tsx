import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a scannable QR code (PNG data URL) for any text/URL. */
export function QrCode({ value, size = 148 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#0b1020', light: '#ffffff' } })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc('');
      });
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) return <div className="qr-img qr-loading" style={{ width: size, height: size }} aria-hidden="true" />;
  return <img className="qr-img" src={src} width={size} height={size} alt="QR code — scan to view the prompt" draggable={false} />;
}
