import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderLock,
  Pill,
  FlaskConical,
  ShieldCheck,
  Clock,
  ArrowRight,
  Shield,
  CheckCircle2,
  Stethoscope,
  Lock,
  Unlock,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../../components/ui';
import { ConsentRequest } from '../../types';

/* ── Inline handcrafted doodle – heartbeat line ── */
const DoodleHeartbeat = () => (
  <svg
    viewBox="0 0 80 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-20 h-6 text-blue-300"
    aria-hidden="true"
  >
    <polyline points="0,12 12,12 16,4 20,20 24,8 28,16 32,12 80,12" />
  </svg>
);

export const PatientOverview: React.FC = () => {
  const { activePatient } = useRole();
  const docs = mockService.getDocumentsByPatient(activePatient.id, activePatient.mrn, activePatient.fullName);
  const corrections = mockService.getCorrectionRequestsByPatient(activePatient.id, activePatient.fullName);

  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>(() =>
    mockService.getConsentRequestsByPatient(activePatient.id, activePatient.mrn)
  );

  const refreshConsents = () => {
    setConsentRequests(mockService.getConsentRequestsByPatient(activePatient.id, activePatient.mrn));
  };

  const syncBackendConsents = async () => {
    try {
      const res = await apiClient.getMyAssociations();
      if (res && res.associations && res.associations.length > 0) {
        mockService.syncConsentsFromBackend(res.associations);
      }
    } catch {
      // Offline or unauthenticated fallback
    }
    setConsentRequests(mockService.getConsentRequestsByPatient(activePatient.id, activePatient.mrn));
  };

  useEffect(() => {
    syncBackendConsents();
    // Poll every 3 seconds to pick up live consent requests dispatched by doctors or labs
    const interval = setInterval(() => {
      syncBackendConsents();
    }, 3000);
    return () => clearInterval(interval);
  }, [activePatient.id, activePatient.mrn]);

  const handleConsentDecision = async (
    requestId: string,
    decision: 'GRANT_CREATE_ONLY' | 'GRANT_FULL_ACCESS' | 'REJECT'
  ) => {
    const scope =
      decision === 'GRANT_CREATE_ONLY'
        ? 'CREATE_ONLY'
        : decision === 'GRANT_FULL_ACCESS'
        ? 'FULL_ACCESS'
        : 'REJECT';

    try {
      await apiClient.respondToAssociation(requestId, scope);
    } catch (err) {
      console.warn('Backend association respond notice:', err);
    }

    mockService.respondToConsentRequest(requestId, decision);
    refreshConsents();
  };

  const handleRevokeConsent = async (requestId: string) => {
    try {
      await apiClient.respondToAssociation(requestId, 'REJECT');
    } catch (err) {
      console.warn('Backend association revoke notice:', err);
    }

    mockService.revokeConsent(requestId);
    refreshConsents();
  };

  const pendingRequests = consentRequests.filter((r) => r.status === 'PENDING');
  const activeConsents = consentRequests.filter((r) => r.status === 'ACTIVE');

  const prescriptions = docs.filter((d) => d.category === 'PRESCRIPTION');
  const labReports = docs.filter((d) => d.category === 'LAB_REPORT');
  const activePrescriptions = prescriptions.filter((d) => d.status === 'FINALIZED');

  const stats = [
    {
      label: 'Total Records',
      value: docs.length,
      sub: 'All sealed records',
      icon: FolderLock,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Active Prescriptions',
      value: activePrescriptions.length,
      sub: 'Valid clinical regimens',
      icon: Pill,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Lab Reports',
      value: labReports.length,
      sub: 'Validated diagnostic tests',
      icon: FlaskConical,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Correction Requests',
      value: corrections.length,
      sub: 'Separate audit records',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Patient profile card ── */}
      <div className="mc-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-base shrink-0 select-none">
              {activePatient.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="mc-page-title">{activePatient.fullName}</h1>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {activePatient.mrn}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                <span>DOB: {activePatient.dateOfBirth}</span>
                <span className="text-slate-300">|</span>
                <span>Blood: {activePatient.bloodType}</span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-700 font-semibold">
                  Allergies: {activePatient.allergies.join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DoodleHeartbeat />
            <Link to="/patient/records">
              <button className="mc-btn-outline text-xs px-3 py-1.5 h-8">
                <FolderLock className="w-3.5 h-3.5" />
                Medical Folder
              </button>
            </Link>
            <Link to="/verify">
              <button className="mc-btn-primary text-xs px-3 py-1.5 h-8">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verify Document
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending Requests High-Priority Banner ── */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Action Required: Digital Consent Request ({pendingRequests.length})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Needs Decision
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                A healthcare professional or diagnostic laboratory has requested access. Choose whether to accept (Create Only or Full Access) or reject below.
              </p>
            </div>
          </div>
          <a
            href="#consent-section"
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            Review & Decide Now ↓
          </a>
        </div>
      )}

      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="mc-card p-4 flex items-center gap-3 hover:border-slate-300 transition-colors">
              <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">{s.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ABDM Digital Health Consent Manager ── */}
      <div id="consent-section" className="mc-card p-5 space-y-4 border-blue-200 bg-gradient-to-br from-white via-white to-blue-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ABDM Digital Health Consent & Provider Access Requests
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control which healthcare professionals can access your medical records or issue new prescriptions.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
            ABDM Consent Manager
          </span>
        </div>

        {/* Pending Access Requests */}
        {pendingRequests.length === 0 && activeConsents.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No pending access requests. Your health data is securely locked.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    Pending Consent Requests ({pendingRequests.length})
                  </span>
                </div>

                {pendingRequests.map((req) => {
                  const isDoc = req.providerRole === 'DOCTOR';
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-3 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDoc ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                            {isDoc ? <Stethoscope className="w-4.5 h-4.5" /> : <FlaskConical className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {req.providerName}
                              </span>
                              <Badge status={isDoc ? 'info' : 'neutral'} variant="subtle" className="text-[10px]">
                                {isDoc ? 'Physician' : 'Diagnostic Lab'}
                              </Badge>
                              <span className="text-[11px] font-mono text-slate-500">
                                {req.providerLicense}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {req.providerOrg}
                            </div>
                            <div className="text-xs text-amber-900 mt-1 font-medium bg-amber-100/60 px-2.5 py-1 rounded-md inline-block">
                              Purpose: {req.purpose}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 shrink-0 sm:text-right font-mono">
                          Requested {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Patient Decision Choices */}
                      <div className="pt-2 border-t border-amber-200/80">
                        <div className="text-[11px] font-semibold text-slate-700 mb-2">
                          Select Access Level to Grant:
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {/* Option 1: Create Only */}
                          <button
                            type="button"
                            onClick={() => handleConsentDecision(req.id, 'GRANT_CREATE_ONLY')}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-blue-300 text-blue-900 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-2xs text-left sm:text-center flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Allow to create only new prescription or report</span>
                          </button>

                          {/* Option 2: Full Access */}
                          <button
                            type="button"
                            onClick={() => handleConsentDecision(req.id, 'GRANT_FULL_ACCESS')}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs text-left sm:text-center flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5 shrink-0" />
                            <span>Share all previous reports and create new report</span>
                          </button>

                          {/* Option 3: Reject */}
                          <button
                            type="button"
                            onClick={() => handleConsentDecision(req.id, 'REJECT')}
                            className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Active Consents */}
            {activeConsents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Active Provider Consents ({activeConsents.length})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeConsents.map((consent) => (
                    <div
                      key={consent.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {consent.providerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {consent.providerOrg}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              consent.scope === 'CREATE_ONLY'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {consent.scope === 'CREATE_ONLY'
                              ? 'Create New Only (Past Records Hidden)'
                              : 'Full Access (History & Issuance)'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeConsent(consent.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md shrink-0 transition-colors"
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recent records table ── */}
      <div className="mc-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Clinical Records</h2>
          <Link
            to="/patient/records"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="mc-th">Document ID</th>
                <th className="mc-th">Category</th>
                <th className="mc-th">Clinical Title</th>
                <th className="mc-th">Issuing Provider</th>
                <th className="mc-th">Issue Date</th>
                <th className="mc-th">Status</th>
                <th className="mc-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="mc-td font-mono text-xs text-slate-600">{doc.documentNumber}</td>
                  <td className="mc-td">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        doc.category === 'PRESCRIPTION'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-teal-50 text-teal-700 border border-teal-100'
                      }`}
                    >
                      {doc.category === 'PRESCRIPTION' ? (
                        <Pill className="w-3 h-3" />
                      ) : (
                        <FlaskConical className="w-3 h-3" />
                      )}
                      {doc.category === 'PRESCRIPTION' ? 'Prescription' : 'Lab Report'}
                    </span>
                  </td>
                  <td className="mc-td font-semibold text-slate-900 text-xs">{doc.title}</td>
                  <td className="mc-td">
                    <div className="text-xs font-medium text-slate-800">{doc.issuerName}</div>
                    <div className="text-[11px] text-slate-400">{doc.issuerOrg}</div>
                  </td>
                  <td className="mc-td text-xs text-slate-500 whitespace-nowrap">
                    {new Date(doc.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="mc-td">
                    <Badge
                      variant={
                        doc.status === 'FINALIZED'
                          ? 'success'
                          : doc.status === 'SUPERSEDED'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="mc-td text-right">
                    <Link to={`/documents/${doc.id}`}>
                      <button className="mc-btn-outline text-xs px-2.5 py-1 h-7">View</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Correction requests ── */}
      {corrections.length > 0 && (
        <div className="mc-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Submitted Correction Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {corrections.map((corr) => (
              <div key={corr.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 font-mono">{corr.documentNumber}</span>
                    <span className="text-xs text-slate-500">— {corr.documentTitle}</span>
                    <Badge
                      variant={
                        corr.status === 'ACCEPTED'
                          ? 'success'
                          : corr.status === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {corr.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Requested:</strong> {corr.requestedChanges}
                  </div>
                  {corr.reviewNotes && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-1">
                      <strong>Review Feedback:</strong> {corr.reviewNotes}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 sm:text-right">
                  Submitted {new Date(corr.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
