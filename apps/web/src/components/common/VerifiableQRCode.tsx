import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, ShieldCheck } from 'lucide-react';

interface VerifiableQRCodeProps {
  token: string;
  url?: string;
  size?: number;
  className?: string;
  showToken?: boolean;
  showActions?: boolean;
  downloadFileName?: string;
}

export const VerifiableQRCode: React.FC<VerifiableQRCodeProps> = ({
  token,
  url,
  size = 180,
  className = '',
  showToken = true,
  showActions = true,
  downloadFileName,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullVerifyUrl =
    url ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${token}`
      : `http://localhost:5173/verify/${token}`);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(fullVerifyUrl, {
      width: size * 2, // high resolution for crisp rendering
      margin: 1,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((res) => {
        if (isMounted) setDataUrl(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to generate QR code');
      });

    return () => {
      isMounted = false;
    };
  }, [fullVerifyUrl, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullVerifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = downloadFileName || `medichain-qr-${token.slice(0, 12)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* QR Code Container */}
      <div
        className="p-3 bg-white rounded-xl border-2 border-slate-200/90 shadow-sm relative group transition-all hover:border-slate-300"
        style={{ width: size + 24, height: size + 24 }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Verifiable QR Code for ${token}`}
            className="w-full h-full object-contain select-none"
            title="Scan with any smartphone camera or internet QR scanner"
          />
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-red-500 p-2 text-center">
            {error}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showToken && (
        <div className="mt-2 text-center max-w-[240px]">
          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all block truncate">
            {token}
          </span>
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-1.5 mt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Copy Public Verification URL"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Download QR Code image to scan or verify online"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PNG</span>
          </button>

          <a
            href={fullVerifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            title="Open Public Zero-Knowledge Verification Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify</span>
          </a>
        </div>
      )}
    </div>
  );
};
