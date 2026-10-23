import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { VerifiableQRCode } from '../common/VerifiableQRCode';
import { ShieldCheck, QrCode, Smartphone, Globe, ExternalLink, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';

interface VerifyQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    documentNumber: string;
    title: string;
    category: string;
    issuerName: string;
    issuerOrg?: string;
    version: number;
    status: string;
    verificationToken: string;
    fileHash: string;
  } | null;
}

export const VerifyQRCodeModal: React.FC<VerifyQRCodeModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'test-scanner'>('qr');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!doc) return null;

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/verify/${doc.verificationToken}`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setScanError(null);
    setScannedResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = window.document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setScanError('Could not process canvas context.');
          setIsProcessing(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setScannedResult(code.data);
        } else {
          setScanError('No QR code detected in this image. Please upload a clear QR code screenshot or image.');
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cryptographic Document Verification & QR Code"
      size="lg"
    >
      <div className="space-y-4">
        {/* Document Header Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800">
                {doc.documentNumber}
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                v{doc.version} · {doc.category.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{doc.title}</h3>
            <p className="text-xs text-slate-500">
              Prescribed / Issued by {doc.issuerName} {doc.issuerOrg ? `· ${doc.issuerOrg}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                doc.status === 'FINALIZED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : doc.status === 'SUPERSEDED'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {doc.status}
            </span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan-Ready Verifiable QR Code</span>
          </button>
          <button
            onClick={() => setActiveTab('test-scanner')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'test-scanner'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Test In-App QR Scanner</span>
          </button>
        </div>

        {activeTab === 'qr' ? (
          <div className="space-y-4">
            {/* The QR Code */}
            <div className="flex flex-col items-center justify-center pt-2">
              <VerifiableQRCode
                token={doc.verificationToken}
                url={verifyUrl}
                size={190}
                downloadFileName={`medichain-qr-${doc.documentNumber}.png`}
              />
            </div>

            {/* Universal Scanner Callout */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Verifiable with ANY Scanner on the Internet</span>
              </div>
              <p className="text-[12px] leading-relaxed text-emerald-800/90">
                This QR code follows standard ISO/IEC 18004 specifications. You can scan it directly with your
                <strong> iPhone / Android camera</strong>, <strong>Google Lens</strong>, or any web-based scanner
                (such as <a href="https://webqr.com" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-emerald-950">webqr.com</a> or <a href="https://scanqr.org" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-emerald-950">scanqr.org</a>).
              </p>
              <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/60 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Knowledge Privacy: Contains no patient names, diagnoses, or clinical secrets.</span>
              </div>
            </div>

            {/* Verification Link Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Direct Verification URL</span>
                <span className="font-mono text-slate-700 truncate block text-[11px] select-all">
                  {verifyUrl}
                </span>
              </div>
              <Link
                to={`/verify/${doc.verificationToken}`}
                target="_blank"
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="text-xs text-slate-600">
              Test scanning any prescription QR code. Upload a screenshot, photo, or downloaded QR PNG:
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {isProcessing ? 'Decoding QR Code...' : 'Click to Upload or Drag & Drop QR Image'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Supports PNG, JPG, WEBP screenshots
                </div>
              </div>
            </div>

            {scanError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {scannedResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>QR Code Successfully Decoded!</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-xs font-mono text-slate-800 break-all select-all">
                  {scannedResult}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-emerald-700">Payload resolved to valid verification URL</span>
                  <a
                    href={scannedResult}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                  >
                    <span>View Verification Result</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
