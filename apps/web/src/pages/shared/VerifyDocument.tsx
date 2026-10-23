import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  Clock,
  Info,
  Upload,
} from 'lucide-react';
import jsQR from 'jsqr';
import { mockService } from '../../services/mockService';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent, Input, Alert } from '../../components/ui';
import { VerificationState, PublicDocumentView } from '../../types';

export const VerifyDocument: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState(token || '');
  const [activeTab, setActiveTab] = useState<'token' | 'qr'>('token');
  const [isDecodingQr, setIsDecodingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    state: VerificationState;
    document?: PublicDocumentView;
    reason?: string;
  } | null>(null);

  // Auto-verify if token is provided in URL
  useEffect(() => {
    if (token && token.trim()) {
      setInputToken(token);
      performVerification(token.trim());
    } else {
      setVerificationResult(null);
    }
  }, [token]);

  const performVerification = (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;
    const res = mockService.verifyByToken(tokenToVerify.trim());
    setVerificationResult(res);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingQr(true);
    setQrUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setQrUploadError('Could not process canvas context.');
          setIsDecodingQr(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          let extractedToken = code.data.trim();
          if (extractedToken.includes('/verify/')) {
            const parts = extractedToken.split('/verify/');
            const lastPart = parts[parts.length - 1] || '';
            extractedToken = lastPart.split('?')[0] || '';
          }
          setInputToken(extractedToken);
          navigate(`/verify/${extractedToken}`);
        } else {
          setQrUploadError('No valid QR code was detected in this image. Please upload a clear QR code image or screenshot.');
        }
        setIsDecodingQr(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      navigate(`/verify/${inputToken.trim()}`);
    }
  };

  const handleSampleToken = (sampleTok: string) => {
    setInputToken(sampleTok);
    navigate(`/verify/${sampleTok}`);
  };

  const doc = verificationResult?.document;
  const state = verificationResult?.state;

  // Derive banner styling and icon per state
  const bannerConfig: Record<
    VerificationState,
    { bg: string; icon: React.ReactNode; label: string }
  > = {
    VERIFIED: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      label: 'Official Record Authenticity Confirmed',
    },
    SUPERSEDED: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      label: 'Document Version Superseded',
    },
    REVOKED: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      label: 'Official Record Formally Revoked',
    },
    MODIFIED: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      label: 'Cryptographic Hash Mismatch Detected',
    },
    PENDING_REGISTRATION: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Clock className="w-6 h-6 text-blue-600" />,
      label: 'Awaiting Blockchain Registration',
    },
    UNVERIFIED: {
      bg: 'bg-slate-100 border-slate-200 text-slate-800',
      icon: <ShieldAlert className="w-6 h-6 text-slate-500" />,
      label: 'Document Not Yet Verified',
    },
    UNAVAILABLE: {
      bg: 'bg-slate-100 border-slate-200 text-slate-800',
      icon: <ShieldAlert className="w-6 h-6 text-slate-500" />,
      label: 'Record Not Found in Registry',
    },
  };

  const badgeVariant = (s?: VerificationState) => {
    if (s === 'VERIFIED') return 'success';
    if (s === 'SUPERSEDED' || s === 'PENDING_REGISTRATION') return 'warning';
    if (s === 'REVOKED' || s === 'MODIFIED') return 'danger';
    return 'neutral';
  };

  const banner = state ? bannerConfig[state] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Privacy Policy Alert */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Public Document Verification Portal
        </h1>
        <p className="text-sm text-slate-600">
          Independently verify cryptographic authenticity, digital issuer signatures, and blockchain
          commitments of MediChain clinical records.
        </p>
      </div>

      {/* Zero-Knowledge Privacy Guarantee Notice */}
      <Alert variant="info" title="Zero-Knowledge Healthcare Privacy Policy">
        In strict accordance with medical privacy standards, this public portal exposes{' '}
        <strong>minimal, non-clinical metadata only</strong> — issuer identity, document version,
        issuance timestamp, and cryptographic proofs. Patient identities, clinical diagnoses,
        medication details, and all clinical data are{' '}
        <strong>never exposed on this public page</strong>.{' '}
        <em>A QR code or verification token never grants access to the private medical file.</em>
      </Alert>

      {/* Verification Search Bar with QR Scanner Upload */}
      <Card>
        <CardContent className="pt-6">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('token')}
              className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'token'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Enter Verification Token / Hash</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'qr'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan / Upload QR Code Image</span>
            </button>
          </div>

          {activeTab === 'token' ? (
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter high-entropy verification token (e.g. tok_rx_8841_02_c3d8a1f7)"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  leftIcon={<QrCode className="w-4 h-4 text-slate-400" />}
                />
              </div>
              <Button variant="primary" type="submit" disabled={!inputToken.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Verify Document
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {isDecodingQr ? 'Decoding QR Code...' : 'Upload or Drag & Drop Prescription / Record QR Code'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Works with any QR code image, screenshot, or mobile camera snapshot
                  </div>
                </div>
              </div>
              {qrUploadError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {qrUploadError}
                </div>
              )}
            </div>
          )}

          {/* Quick Test Token Chips for Reviewers */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Test Tokens:</span>
            <button
              type="button"
              onClick={() => handleSampleToken('tok_rx_8841_02_c3d8a1f7')}
              className="text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded font-mono border border-teal-200 cursor-pointer"
            >
              tok_rx_8841 (Active Rx v2)
            </button>
            <button
              type="button"
              onClick={() => handleSampleToken('tok_rx_8840_01_a7f9c2e4')}
              className="text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded font-mono border border-amber-200 cursor-pointer"
            >
              tok_rx_8840 (Superseded Rx v1)
            </button>
            <button
              type="button"
              onClick={() => handleSampleToken('tok_cbc_20260408_99a1')}
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-mono border border-blue-200 cursor-pointer"
            >
              tok_cbc_2026 (CBC Lab Results)
            </button>
            <button
              type="button"
              onClick={() => handleSampleToken('tok_cons_20260322_88b2')}
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-mono border border-blue-200 cursor-pointer"
            >
              tok_cons_2026 (Annual Exam)
            </button>
            <button
              type="button"
              onClick={() => handleSampleToken('tok_xray_20260228_66d4')}
              className="text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded font-mono border border-purple-200 cursor-pointer"
            >
              tok_xray_2026 (Chest X-Ray)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Result Card */}
      {verificationResult && banner && (
        <div className="space-y-4 animate-fade-in">
          {/* Status Header Banner */}
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${banner.bg}`}
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-lg bg-white/80 shadow-xs shrink-0 mt-0.5">
                {banner.icon}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h3 className="text-base font-bold tracking-tight">{banner.label}</h3>
                  <Badge variant={badgeVariant(state)}>{state}</Badge>
                </div>
                <p className="text-xs mt-1 text-slate-700">{verificationResult.reason}</p>
              </div>
            </div>

            {doc && (
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  {doc.documentNumber}
                </span>
                <span className="text-[11px] text-slate-500">Version {doc.version}</span>
              </div>
            )}
          </div>

          {/* Pending Registration Warning */}
          {state === 'PENDING_REGISTRATION' && (
            <Alert variant="warning" title="Pending Blockchain Registration">
              This document has been finalized and digitally signed by the issuer, but its
              blockchain commitment has not yet been confirmed on the ledger.{' '}
              <strong>Do not treat this as blockchain-verified.</strong> Check back after the
              transaction confirms.
            </Alert>
          )}

          {/* Mock Data Transparency Warning */}
          {doc?.blockchain.isMockData && state === 'VERIFIED' && (
            <Alert variant="info" title="Development Environment Notice">
              The blockchain anchor shown for this record is a <strong>simulated development
              commitment</strong> on a local test chain, not a live mainnet transaction.
              This record is cryptographically signed but should not be treated as having a live
              blockchain proof.
            </Alert>
          )}

          {/* Minimal Non-Clinical Verified Attributes */}
          {doc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Issuing Authority &amp; Timestamp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Issuing Entity:</span>
                    <span className="font-semibold text-slate-900">{doc.issuerName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Healthcare Organization:</span>
                    <span className="font-medium text-slate-800">{doc.issuerOrg}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">License / Accreditation:</span>
                    <span className="font-mono text-slate-700">{doc.issuerLicense}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Document Classification:</span>
                    <span className="font-medium text-slate-800">
                      {doc.category === 'PRESCRIPTION'
                        ? 'Clinical Prescription'
                        : 'Diagnostic Laboratory Panel'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Document Version:</span>
                    <span className="font-mono text-slate-800">v{doc.version}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Official Timestamp:</span>
                    <span className="font-mono text-slate-800">
                      {new Date(doc.issuedAt).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cryptographic Registry Proofs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">SHA-256 Digest:</span>
                    <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-800 break-all border border-slate-200 select-all">
                      {doc.fileHash}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Integrity proof: hash of exact finalized document bytes. Compare against your
                      copy to detect tampering. A matching hash is not proof of authenticity alone.
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">
                      Issuer Digital Signature:
                    </span>
                    <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-600 break-all border border-slate-200">
                      {doc.issuerSignature}
                    </div>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-100">
                    <span className="text-slate-500">Verification Status:</span>
                    <Badge variant={badgeVariant(state)}>{state}</Badge>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-100">
                    <span className="text-slate-500">Blockchain Network:</span>
                    <span className="font-semibold text-slate-800">
                      {doc.blockchain.ledgerNetwork}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Ledger Status:</span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          doc.blockchain.status === 'CONFIRMED' && !doc.blockchain.isMockData
                            ? 'success'
                            : doc.blockchain.status === 'PENDING'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {doc.blockchain.status === 'CONFIRMED' && doc.blockchain.isMockData
                          ? 'Simulated (Dev Only)'
                          : doc.blockchain.status === 'CONFIRMED'
                          ? `Confirmed · Block #${doc.blockchain.blockNumber}`
                          : doc.blockchain.status}
                      </Badge>
                    </div>
                  </div>
                  {doc.blockchain.txHash && (
                    <div>
                      <span className="text-slate-500 block mb-0.5 font-medium">
                        Transaction Hash:
                      </span>
                      <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-700 break-all border border-slate-200">
                        {doc.blockchain.txHash}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Superseded: point to superseding record */}
          {state === 'SUPERSEDED' && doc?.supersededByNumber && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>This record has been superseded.</strong> The active authoritative version
                is <span className="font-mono font-bold">{doc.supersededByNumber}</span>. Always
                refer to the current active version for clinical purposes.
              </div>
            </div>
          )}

          {/* Privacy Reminder Footer */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <span>
              <strong>Privacy guarantee:</strong> No patient names, diagnoses, medication details,
              or clinical data are accessible via this public portal. The verification token in the
              QR code is opaque and high-entropy — it contains no personally identifiable information
              and does not grant access to the private medical record.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
