import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { Badge, Button, Card, CardContent } from '../../components/ui';
import { LabReportClinicalData, MedicalDocument } from '../../types';
import { CorrectionRequestModal } from '../../components/modals/CorrectionRequestModal';

export const PatientLabReports: React.FC = () => {
  const { activePatient } = useRole();
  const allDocs = mockService.getDocumentsByPatient(activePatient.id, activePatient.mrn, activePatient.fullName);
  const labReports = allDocs.filter((d) => d.category === 'LAB_REPORT');

  const [selectedDocForCorrection, setSelectedDocForCorrection] = useState<MedicalDocument | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Laboratory Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Diagnostic pathology results, reference ranges, and abnormal indicators from accredited testing laboratories.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {labReports.map((doc) => {
          const lab = doc.clinicalData as LabReportClinicalData;
          const abnormalCount = lab.results.filter(
            (r) => r.flag === 'ABNORMAL_HIGH' || r.flag === 'ABNORMAL_LOW' || r.flag === 'CRITICAL'
          ).length;

          return (
            <Card key={doc.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                      <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span className="font-mono">{doc.documentNumber}</span>
                        <span>•</span>
                        <span>{lab.testCategory}</span>
                        <span>•</span>
                        <span>{doc.issuerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {abnormalCount > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {abnormalCount} Flagged Result{abnormalCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        All Results Normal
                      </span>
                    )}
                    <Badge variant={doc.status === 'FINALIZED' ? 'success' : 'neutral'}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>

                {/* Specimen and Result Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-semibold text-slate-700 block">Specimen & Collection:</span>
                    <div>Specimen: <span className="font-medium text-slate-900">{lab.specimenType}</span></div>
                    <div>Status: <span className="text-slate-600">{lab.fastingStatus}</span></div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      Collected on {new Date(lab.collectionTimestamp).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-semibold text-slate-700 block">Summary of Analyzed Analytes:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {lab.results.map((res) => (
                        <span
                          key={res.id}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            res.flag === 'NORMAL'
                              ? 'bg-slate-200/70 text-slate-700'
                              : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                          }`}
                        >
                          {res.parameterName}: {res.value} {res.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-mono text-slate-400 text-[11px]">
                    SHA-256: {doc.fileHash.substring(0, 16)}...
                  </span>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocForCorrection(doc)}
                      className="text-xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Request Correction
                    </Button>
                    <Link to={`/verify/${doc.verificationToken}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                        Verify
                      </Button>
                    </Link>
                    <Link to={`/documents/${doc.id}`}>
                      <Button variant="primary" size="sm" className="text-xs">
                        View Report
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDocForCorrection && (
        <CorrectionRequestModal
          isOpen={!!selectedDocForCorrection}
          onClose={() => setSelectedDocForCorrection(null)}
          document={selectedDocForCorrection}
          patientId={activePatient.id}
        />
      )}
    </div>
  );
};
