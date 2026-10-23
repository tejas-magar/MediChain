import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  QrCode,
  Pill,
  FlaskConical,
  FileText,
  Stethoscope,
  X,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { EmptyState, Modal, Button } from '../../components/ui';
import { VerifyQRCodeModal } from '../../components/modals/VerifyQRCodeModal';
import { MedicalDocument } from '../../types';

export const PatientFolder: React.FC = () => {
  const { activePatient } = useRole();
  const [docs, setDocs] = useState(() =>
    mockService.getDocumentsByPatient(activePatient.id, activePatient.mrn, activePatient.fullName)
  );

  useEffect(() => {
    setDocs(mockService.getDocumentsByPatient(activePatient.id, activePatient.mrn, activePatient.fullName));
  }, [activePatient.id, activePatient.mrn, activePatient.fullName]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'LAB_REPORT' | 'CONSULTATION' | 'PRESCRIPTION' | 'X_RAY'>('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedQrDoc, setSelectedQrDoc] = useState<MedicalDocument | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Record Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'PRESCRIPTION' | 'LAB_REPORT' | 'CONSULTATION' | 'X_RAY'>('LAB_REPORT');
  const [newDoctor, setNewDoctor] = useState('Dr. Rajesh Varma, MD');
  const [newDate, setNewDate] = useState('2026-04-15');

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.issuerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (doc: MedicalDocument) => {
    const exportPayload = {
      documentNumber: doc.documentNumber,
      title: doc.title,
      category: doc.category,
      status: doc.status,
      version: doc.version,
      issuedAt: doc.issuedAt,
      issuerName: doc.issuerName,
      patientName: doc.patientName,
      patientMrn: doc.patientMrn,
      fileHash: doc.fileHash,
      issuerSignature: doc.issuerSignature,
      verificationToken: doc.verificationToken,
      verificationUrl: `${window.location.origin}/verify/${doc.verificationToken}`,
      exportedAt: new Date().toISOString(),
      note: 'Cryptographically verifiable record exported from MediChain. Scan QR code or visit /verify/' + doc.verificationToken,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber.replace(/\//g, '-')}_sealed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const docNum = `${newCategory.slice(0, 3)}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const token = `tok_${newCategory.toLowerCase().slice(0, 4)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const hash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newDoc: MedicalDocument = {
      id: `DOC-${Date.now()}`,
      documentNumber: docNum,
      category: newCategory,
      title: newTitle.trim(),
      status: 'FINALIZED',
      version: 1,
      patientId: activePatient.id,
      patientName: activePatient.fullName,
      patientMrn: activePatient.mrn,
      issuerId: 'DOC-NEW',
      issuerName: newDoctor,
      issuerRole: 'DOCTOR',
      issuerOrg: 'MetroHealth Medical System',
      issuerLicense: 'MD-CAL-89211',
      versionHistory: [
        {
          version: 1,
          documentId: `DOC-${Date.now()}`,
          documentNumber: docNum,
          timestamp: new Date().toISOString(),
          author: newDoctor,
        },
      ],
      fileHash: hash,
      issuerSignature: `RSA-PSS-SHA256:${hash.slice(0, 24)}...dr_sig`,
      verificationToken: token,
      qrCodeUrl: `${window.location.origin}/verify/${token}`,
      clinicalData: newCategory === 'PRESCRIPTION' || newCategory === 'CONSULTATION'
        ? {
            diagnosis: newTitle,
            treatmentPlan: 'Sealed clinical record registered in EHR registry.',
            medications: [],
            dispenseAsWritten: false,
            patientAllergiesAcknowledged: true,
          }
        : {
            testCategory: 'Chemistry',
            specimenType: 'Serum / Venous Blood',
            collectionTimestamp: new Date().toISOString(),
            fastingStatus: 'Non-Fasting',
            results: [],
            technologistRemarks: 'Clinical test sealed.',
          },
      blockchain: {
        status: 'CONFIRMED',
        txHash: `0x${hash}`,
        blockNumber: 1992000 + Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString(),
        ledgerNetwork: 'Local Hardhat Node',
        isMockData: true,
        notes: 'Simulated local registry anchor.',
      },
      issuedAt: new Date(newDate).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDoc, ...docs];
    setDocs(updated);
    setIsAddModalOpen(false);
    setNewTitle('');
  };

  // Helper to get Type Pill badge
  const renderTypeBadge = (category: string) => {
    switch (category) {
      case 'LAB_REPORT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lab Results</span>
          </span>
        );
      case 'CONSULTATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Consultation</span>
          </span>
        );
      case 'PRESCRIPTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <Pill className="w-3.5 h-3.5" />
            <span>Prescription</span>
          </span>
        );
      case 'X_RAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <FileText className="w-3.5 h-3.5" />
            <span>X-Ray</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            <FileText className="w-3.5 h-3.5" />
            <span>Document</span>
          </span>
        );
    }
  };

  // Helper to format status according to screenshot
  const renderStatusBadge = (_status: string, category: string) => {
    if (category === 'PRESCRIPTION') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
          Active
        </span>
      );
    }
    if (category === 'CONSULTATION') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
        Reviewed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header (Matching Screenshot) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Medical Records
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View and manage your medical records
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Record</span>
        </button>
      </div>

      {/* ── Search & Filter Bar (Matching Screenshot) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              showFilterDrawer || categoryFilter !== 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Records
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('LAB_REPORT')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              categoryFilter === 'LAB_REPORT'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Lab Results
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('CONSULTATION')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              categoryFilter === 'CONSULTATION'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Consultation
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('PRESCRIPTION')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              categoryFilter === 'PRESCRIPTION'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Prescription
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('X_RAY')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              categoryFilter === 'X_RAY'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            X-Ray
          </button>
        </div>
      </div>

      {/* ── Table Card (Matching Screenshot Design) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-14 px-4">
            <EmptyState
              title="No records found"
              description="No documents matched your current search criteria."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-500 font-semibold text-xs border-b border-slate-200">
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Type</th>
                  <th className="py-3 px-5 font-semibold">Description</th>
                  <th className="py-3 px-5 font-semibold">Doctor</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const dateStr = doc.issuedAt ? doc.issuedAt.slice(0, 10) : '2026-04-08';
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-5 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {renderTypeBadge(doc.category)}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-5">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {doc.title}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {doc.documentNumber}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-5 text-xs text-slate-700 whitespace-nowrap">
                        {doc.issuerName}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {renderStatusBadge(doc.status, doc.category)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2 text-slate-400">
                          {/* QR Code Verify Action */}
                          <button
                            type="button"
                            onClick={() => setSelectedQrDoc(doc)}
                            className="p-1.5 rounded-md hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Verify with ANY internet QR scanner"
                          >
                            <QrCode className="w-4 h-4 text-blue-600" />
                          </button>

                          {/* View Action */}
                          <Link
                            to={`/documents/${doc.id}`}
                            role="button"
                            aria-label="View"
                            className="p-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="View Record Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Download Action */}
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Download Signed Record JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Verifiable QR Code Modal (Supports Any Internet Scanner) ── */}
      <VerifyQRCodeModal
        isOpen={Boolean(selectedQrDoc)}
        onClose={() => setSelectedQrDoc(null)}
        document={selectedQrDoc}
      />

      {/* ── Add Record Modal ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Sealed Medical Record"
        size="md"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Record Title / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Comprehensive Metabolic Panel (CMP)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Document Type
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="LAB_REPORT">Lab Results</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="X_RAY">X-Ray</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Issuance Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Attending Physician / Specialist
            </label>
            <input
              type="text"
              value={newDoctor}
              onChange={(e) => setNewDoctor(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 space-y-1">
            <span className="font-semibold block text-slate-800">Automatic Cryptographic Sealing:</span>
            <p>
              MediChain will automatically compute a <strong>SHA-256 byte digest</strong>, generate a <strong>digital signature</strong>, and issue an <strong>opaque verifiable QR code</strong> scannable on the internet.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create &amp; Seal Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
