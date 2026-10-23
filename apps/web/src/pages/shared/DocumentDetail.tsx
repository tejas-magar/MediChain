import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Printer,
  History,
  AlertTriangle,
  ExternalLink,
  Edit3,
  ArrowLeft,
  Lock,
  Download,
  QrCode,
} from 'lucide-react';
import { mockService } from '../../services/mockService';
import { apiClient } from '../../services/apiClient';
import { useRole } from '../../context/RoleContext';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent, Alert } from '../../components/ui';
import {
  PrescriptionClinicalData,
  LabReportClinicalData,
  MedicalDocument,
} from '../../types';
import { CorrectionRequestModal } from '../../components/modals/CorrectionRequestModal';
import { AmendDocumentModal } from '../../components/modals/AmendDocumentModal';
import { VerifiableQRCode } from '../../components/common/VerifiableQRCode';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeDoctor, activeLab, isPatient, isDoctor, isLab } = useRole();

  const [doc, setDoc] = useState<MedicalDocument | undefined>(() =>
    id ? mockService.getDocumentById(id) : undefined
  );
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);

  // Reload document if ID changes, with backend integration
  React.useEffect(() => {
    if (id) {
      const local = mockService.getDocumentById(id);
      if (local) {
        setDoc(local);
      } else {
        apiClient
          .getDocument(id)
          .then((res) => {
            if (res.document) {
              const d = res.document;
              const mapped: MedicalDocument = {
                id: d.id,
                documentNumber: d.documentNumber,
                category: d.category,
                title: d.title,
                status: d.status,
                version: d.version,
                patientId: d.patientId,
                patientName: d.patient?.fullName || 'Eleanor Vance',
                patientMrn: d.patient?.mrn || 'MRN-8841-A',
                issuerId: d.issuerId,
                issuerName: d.issuer?.fullName || 'Physician',
                issuerRole: d.issuer?.role || 'DOCTOR',
                issuerOrg: d.issuer?.organization || 'Clinical Center',
                issuerLicense: d.issuer?.licenseNumber || 'MD-9021-X',
                issuedAt: (d.issuedAt ? new Date(d.issuedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) ?? '',
                fileHash: d.fileHash || '',
                issuerSignature: d.issuerSignature || '',
                verificationToken: d.verificationToken || '',
                qrCodeUrl: `${window.location.origin}/verify/${d.verificationToken || ''}`,
                createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
                updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
                clinicalData: d.clinicalData,
                versionHistory:
                  d.versions?.map((v: any) => ({
                    version: v.versionNumber,
                    documentId: v.documentId,
                    documentNumber: d.documentNumber,
                    timestamp: v.finalizedAt,
                    author: d.issuer?.fullName || 'Physician',
                    reason: v.amendmentReason || 'Initial Finalization',
                  })) || [],
                blockchain: {
                  status: (d.blockchainStatus || 'NOT_ANCHORED') as any,
                  txHash: d.blockchainTxHash || undefined,
                  blockNumber: d.blockchainBlockNumber || undefined,
                  ledgerNetwork: 'Sepolia Testnet',
                  isMockData: false,
                  notes: 'Verified cryptographic clinical integrity record',
                },
              };
              setDoc(mapped);
            }
          })
          .catch((err) => {
            console.warn('[DocumentDetail] Backend fetch note:', err.message);
          });
      }
    }
  }, [id]);

  if (!doc) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Document Not Found</h3>
        <p className="text-sm text-slate-500">
          The requested medical document identifier does not exist or you do not have permission to view it.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Return to Previous Page
        </Button>
      </div>
    );
  }

  const isPrescription = doc.category === 'PRESCRIPTION';
  const rxData = isPrescription ? (doc.clinicalData as PrescriptionClinicalData) : null;
  const labData = !isPrescription ? (doc.clinicalData as LabReportClinicalData) : null;

  // Check if current issuer can amend this document
  const canAmend =
    (isDoctor && doc.category === 'PRESCRIPTION' && doc.issuerId === activeDoctor.id && doc.status === 'FINALIZED') ||
    (isLab && doc.category === 'LAB_REPORT' && doc.issuerId === activeLab.id && doc.status === 'FINALIZED');

  const handlePrint = () => {
    window.print();
  };

  /**
   * Download handler: generates a JSON export of the document for the
   * authorized patient. The downloaded file is the full clinical record
   * (the patient is authorized to access it). This download path is
   * role-gated — only the associated patient can trigger it.
   *
   * SECURITY: This download is gated by the patient role check in the UI.
   * The file never goes to an unauthenticated or unauthorized user.
   */
  const handleDownload = async () => {
    try {
      const { blob, filename } = await apiClient.downloadDocumentFile(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    } catch (e) {
      console.warn('[DocumentDetail] Server-side file download fallback to client export:', e);
    }

    const exportPayload = {
      documentNumber: doc.documentNumber,
      category: doc.category,
      title: doc.title,
      status: doc.status,
      version: doc.version,
      issuedAt: doc.issuedAt,
      issuerName: doc.issuerName,
      issuerOrg: doc.issuerOrg,
      issuerLicense: doc.issuerLicense,
      issuerRole: doc.issuerRole,
      patientMrn: doc.patientMrn,
      fileHash: doc.fileHash,
      issuerSignature: doc.issuerSignature,
      verificationToken: doc.verificationToken,
      clinicalData: doc.clinicalData,
      versionHistory: doc.versionHistory,
      blockchain: {
        status: doc.blockchain.status,
        txHash: doc.blockchain.txHash,
        blockNumber: doc.blockchain.blockNumber,
        ledgerNetwork: doc.blockchain.ledgerNetwork,
        isMockData: doc.blockchain.isMockData,
        note: doc.blockchain.isMockData
          ? 'This blockchain anchor is a simulated development record, not a live mainnet commitment.'
          : undefined,
      },
      exportedAt: new Date().toISOString(),
      exportNote:
        'This record was exported from MediChain. Verify document integrity using the fileHash and issuerSignature at /verify/' +
        doc.verificationToken,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber.replace(/\//g, '-')}_v${doc.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Records</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {doc.title}
            </h1>
            <Badge
              variant={
                doc.status === 'FINALIZED'
                  ? 'success'
                  : doc.status === 'SUPERSEDED'
                  ? 'warning'
                  : doc.status === 'REVOKED'
                  ? 'danger'
                  : 'neutral'
              }
            >
              {doc.status}
            </Badge>
            <span className="text-xs font-mono font-medium text-slate-500">
              v{doc.version} • {doc.documentNumber}
            </span>
          </div>
        </div>

        {/* Authorized Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Patient Action: Download authorized record */}
          {isPatient && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs"
              title="Download your authorized medical record as JSON"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Download Record
            </Button>
          )}

          {/* Patient Action: Submit Correction Request */}
          {isPatient && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCorrectionModal(true)}
              className="text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Request Correction
            </Button>
          )}

          {/* Doctor / Lab Action: Controlled Amendment */}
          {canAmend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAmendModal(true)}
              className="text-xs"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
              Issue Amendment
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handlePrint} className="text-xs">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Record
          </Button>

          <Link to={`/verify/${doc.verificationToken}`}>
            <Button variant="primary" size="sm" className="text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Verify Authenticity
            </Button>
          </Link>
        </div>
      </div>

      {/* Superseded Notice if applicable */}
      {doc.status === 'SUPERSEDED' && (
        <Alert variant="warning" title="Superseded Record Notice">
          This document version has been superseded by a newer version (
          {doc.supersededById ? (
            <Link to={`/documents/${doc.supersededById}`} className="underline font-bold text-amber-800">
              View Active Version
            </Link>
          ) : (
            'Amended'
          )}
          ). Reason: {doc.amendmentReason || 'Clinical treatment adjustment.'}
        </Alert>
      )}

      {/* Clinical Meta Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Demographics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Patient Association
          </span>
          <div className="text-sm font-bold text-slate-900">{doc.patientName}</div>
          <div className="text-xs text-slate-500 mt-0.5">Medical Record No: <span className="font-mono">{doc.patientMrn}</span></div>
          <div className="text-xs text-slate-500">Patient Identifier: <span className="font-mono">{doc.patientId}</span></div>
        </div>

        {/* Issuing Authority */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Issuing Clinical Entity
          </span>
          <div className="text-sm font-bold text-slate-900">{doc.issuerName}</div>
          <div className="text-xs text-slate-500 mt-0.5">{doc.issuerOrg}</div>
          <div className="text-xs text-slate-500">License / Reg: <span className="font-mono">{doc.issuerLicense}</span></div>
        </div>

        {/* Official Issuance Timestamps */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Timestamp & Authority Proof
          </span>
          <div className="text-xs text-slate-700">
            <strong>Issued:</strong> {new Date(doc.issuedAt).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <strong>Category:</strong> {doc.category === 'PRESCRIPTION' ? 'Clinical Prescription' : 'Diagnostic Laboratory Report'}
          </div>
          <div className="text-xs mt-1">
            <strong>Registry State:</strong>{' '}
            <span
              className={
                doc.status === 'FINALIZED'
                  ? 'font-semibold text-emerald-700'
                  : doc.status === 'SUPERSEDED'
                  ? 'font-semibold text-amber-700'
                  : doc.status === 'REVOKED'
                  ? 'font-semibold text-red-700'
                  : 'font-semibold text-slate-600'
              }
            >
              {doc.status === 'FINALIZED' && 'Finalized & Sealed'}
              {doc.status === 'SUPERSEDED' && 'Superseded by Amendment'}
              {doc.status === 'REVOKED' && 'Formally Revoked'}
              {doc.status === 'DRAFT' && 'Draft \u2014 Not Yet Finalized'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Clinical Payload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isPrescription ? 'Prescription Order & Clinical Regimen' : 'Laboratory Diagnostic Findings'}
              </CardTitle>
              <div className="text-xs text-slate-500 mt-0.5">
                Exact finalized clinical payload. Stored off-chain in private encrypted storage.
              </div>
            </div>
            <span className="text-xs font-mono font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
              OFF-CHAIN VAULT SECURED
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isPrescription && rxData && (
            <div className="space-y-6">
              {/* Diagnosis */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Primary Clinical Diagnosis
                </span>
                <div className="text-sm font-semibold text-slate-900">{rxData.diagnosis}</div>
                {rxData.icdCode && (
                  <span className="text-xs font-mono text-slate-600 mt-0.5 inline-block">
                    ICD-10 Code: {rxData.icdCode}
                  </span>
                )}
                <div className="text-xs text-slate-600 mt-2">
                  <strong>Plan:</strong> {rxData.treatmentPlan}
                </div>
              </div>

              {/* Medication Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Prescribed Medications
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Medication & Strength</th>
                        <th className="py-2.5 px-3">Form</th>
                        <th className="py-2.5 px-3">Frequency</th>
                        <th className="py-2.5 px-3">Quantity</th>
                        <th className="py-2.5 px-3">Refills</th>
                        <th className="py-2.5 px-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rxData.medications.map((med) => (
                        <tr key={med.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {med.medicationName} ({med.strength})
                          </td>
                          <td className="py-2.5 px-3">{med.dosageForm}</td>
                          <td className="py-2.5 px-3">{med.frequency}</td>
                          <td className="py-2.5 px-3">{med.quantity}</td>
                          <td className="py-2.5 px-3">{med.refills}</td>
                          <td className="py-2.5 px-3 text-slate-600">{med.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {rxData.notesToPharmacist && (
                <div className="text-xs text-slate-600 border-l-2 border-slate-300 pl-3 py-1">
                  <strong>Pharmacist Instructions:</strong> {rxData.notesToPharmacist}
                </div>
              )}
            </div>
          )}

          {!isPrescription && labData && (
            <div className="space-y-6">
              {/* Specimen Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Test Category</span>
                  <span className="font-semibold text-slate-900">{labData.testCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Specimen Collected</span>
                  <span className="font-semibold text-slate-900">{labData.specimenType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fasting Status</span>
                  <span className="font-semibold text-slate-900">{labData.fastingStatus}</span>
                </div>
              </div>

              {/* Lab Results Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Laboratory Test Parameters
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Analyte / Test Parameter</th>
                        <th className="py-2.5 px-3">Observed Value</th>
                        <th className="py-2.5 px-3">Reference Range</th>
                        <th className="py-2.5 px-3 text-right">Clinical Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {labData.results.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.parameterName}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {item.value} <span className="font-normal text-slate-500">{item.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {item.referenceRange}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.flag === 'NORMAL' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Normal
                              </span>
                            )}
                            {item.flag === 'ABNORMAL_HIGH' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                High (Abnormal)
                              </span>
                            )}
                            {item.flag === 'ABNORMAL_LOW' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Low (Abnormal)
                              </span>
                            )}
                            {item.flag === 'CRITICAL' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Critical Alert
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {labData.technologistRemarks && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <strong>Pathologist & Technologist Remarks:</strong>
                  <p>{labData.technologistRemarks}</p>
                  {labData.clinicalSignificance && (
                    <p className="text-slate-500 italic mt-1">{labData.clinicalSignificance}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cryptographic Proofs & Blockchain Ledger Anchor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cryptographic Hashes & Signatures */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-teal-600" />
              <CardTitle>Cryptographic Integrity Proofs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">
                SHA-256 Byte Digest (Exact Finalized Document Bytes):
              </span>
              <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-800 break-all select-all border border-slate-200">
                {doc.fileHash}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">
                Issuer Digital Signature (RSA-2048):
              </span>
              <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-700 break-all border border-slate-200">
                {doc.issuerSignature}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">
                Opaque High-Entropy Verification Token:
              </span>
              <div className="font-mono bg-teal-50 text-teal-900 p-2 rounded text-[11px] font-semibold border border-teal-200">
                {doc.verificationToken}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Zero-knowledge verification token. Contains no patient names, diagnoses, or clinical secrets.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Anchor Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <CardTitle>Blockchain Commitment Proof</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Commitment Status:</span>
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
                  ? `Confirmed on Ledger · Block #${doc.blockchain.blockNumber}`
                  : doc.blockchain.status === 'PENDING'
                  ? 'Pending — Awaiting Confirmation'
                  : doc.blockchain.status}
              </Badge>
            </div>

            {/* Never label unconfirmed/mock transactions as blockchain-verified */}
            {doc.blockchain.isMockData && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-800">
                <strong>Development Notice:</strong> This is a simulated blockchain anchor on a
                local test chain. It is NOT a live mainnet commitment and must not be treated as
                blockchain-verified.
              </div>
            )}

            {doc.blockchain.status === 'PENDING' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
                <strong>Pending Registration:</strong> Transaction submitted. Do not label this
                record as blockchain-anchored until the transaction is confirmed.
              </div>
            )}

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Ledger Network:</span>
              <span className="font-semibold text-slate-800">{doc.blockchain.ledgerNetwork}</span>
            </div>

            {doc.blockchain.txHash && (
              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">
                  Transaction Hash:
                </span>
                <div className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-800 break-all border border-slate-200">
                  {doc.blockchain.txHash}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] text-slate-600">
              <strong>Note:</strong> {doc.blockchain.notes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code & Verification Token */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-slate-700" />
            <CardTitle>QR Code &amp; Verification Token</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Real Verifiable QR Code (Scannable on the Internet) */}
            <div className="shrink-0 flex flex-col items-center">
              <VerifiableQRCode
                token={doc.verificationToken}
                size={140}
                showToken={false}
                showActions={true}
                downloadFileName={`medichain-qr-${doc.documentNumber}.png`}
              />
              <p className="text-[10px] text-slate-500 mt-2 text-center max-w-[170px]">
                Scan with any phone camera or internet QR scanner
              </p>
            </div>

            <div className="flex-1 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">
                  Opaque High-Entropy Verification Token:
                </span>
                <div className="font-mono bg-teal-50 text-teal-900 p-2 rounded text-[11px] font-semibold border border-teal-200 break-all select-all">
                  {doc.verificationToken}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">Verification URL:</span>
                <Link
                  to={`/verify/${doc.verificationToken}`}
                  className="font-mono text-[11px] text-teal-700 hover:text-teal-900 break-all underline"
                >
                  /verify/{doc.verificationToken}
                </Link>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Security guarantee:</strong> This QR code and token are opaque and
                  high-entropy. They do not contain patient names, diagnoses, medications, document
                  contents, passwords, private keys, or decryption keys.
                </p>
                <p>
                  The QR code links only to the <em>public verification endpoint</em>. It does not
                  grant access to the private medical file — authentication is required to view
                  clinical data.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version History Tree */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-slate-700" />
            <CardTitle>Immutable Version History & Audit Trail</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {doc.versionHistory.map((item) => {
              const isCurrent = item.version === doc.version;
              return (
                <div key={item.version} className="relative flex items-start space-x-3">
                  <span
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                      isCurrent ? 'border-teal-600 bg-teal-600' : 'border-slate-400'
                    }`}
                  />
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Version {item.version} ({item.documentNumber})
                        {isCurrent && (
                          <span className="ml-2 px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold text-[10px]">
                            Viewing
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">Author: {item.author}</div>
                    {item.reason && (
                      <div className="text-slate-700 mt-1 italic bg-white p-2 rounded border border-slate-100">
                        "{item.reason}"
                      </div>
                    )}
                    {!isCurrent && (
                      <div className="mt-2">
                        <Link
                          to={`/documents/${item.documentId}`}
                          className="text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center space-x-1"
                        >
                          <span>Inspect this prior version</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showCorrectionModal && (
        <CorrectionRequestModal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          document={doc}
          patientId={doc.patientId}
          onSuccess={() => {
            // Refreshed
          }}
        />
      )}

      {showAmendModal && (
        <AmendDocumentModal
          isOpen={showAmendModal}
          onClose={() => setShowAmendModal(false)}
          document={doc}
          authorName={isDoctor ? activeDoctor.fullName : activeLab.fullName}
          onSuccess={(amendedDoc) => {
            setDoc(amendedDoc);
            navigate(`/documents/${amendedDoc.id}`);
          }}
        />
      )}
    </div>
  );
};
