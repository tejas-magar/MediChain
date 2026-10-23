import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill, ShieldCheck, AlertTriangle, QrCode } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { Badge, Button, Card, CardContent } from '../../components/ui';
import { PrescriptionClinicalData, MedicalDocument } from '../../types';
import { CorrectionRequestModal } from '../../components/modals/CorrectionRequestModal';
import { VerifyQRCodeModal } from '../../components/modals/VerifyQRCodeModal';

export const PatientPrescriptions: React.FC = () => {
  const { activePatient } = useRole();
  const allDocs = mockService.getDocumentsByPatient(activePatient.id, activePatient.mrn, activePatient.fullName);
  const prescriptions = allDocs.filter((d) => d.category === 'PRESCRIPTION');

  const [selectedDocForCorrection, setSelectedDocForCorrection] = useState<MedicalDocument | null>(null);
  const [selectedQrDoc, setSelectedQrDoc] = useState<MedicalDocument | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Prescriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Active and historical clinical medication regimens finalized by licensed physicians.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {prescriptions.map((doc) => {
          const rx = doc.clinicalData as PrescriptionClinicalData;
          return (
            <Card key={doc.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                      <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span className="font-mono">{doc.documentNumber}</span>
                        <span>•</span>
                        <span>Version {doc.version}</span>
                        <span>•</span>
                        <span>Prescribed by {doc.issuerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
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
                  </div>
                </div>

                {/* Medication Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-semibold text-slate-700 block">Medication Details:</span>
                    {rx.medications.map((med) => (
                      <div key={med.id}>
                        <div className="font-bold text-slate-900 text-sm">
                          {med.medicationName} {med.strength}
                        </div>
                        <div className="text-slate-600 mt-0.5">{med.instructions}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Form: {med.dosageForm} • Quantity: {med.quantity} • Refills: {med.refills}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-semibold text-slate-700 block">Clinical Indication:</span>
                    <div className="text-slate-900 font-medium">{rx.diagnosis}</div>
                    <div className="text-slate-600 mt-1">
                      <strong>Regimen:</strong> {rx.treatmentPlan}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Issued on {new Date(doc.issuedAt).toLocaleDateString()}
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
                      onClick={() => setSelectedQrDoc(doc)}
                      className="text-xs"
                      title="View & scan verifiable QR code"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Verify QR Code
                    </Button>
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
                        View Details
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

      {selectedQrDoc && (
        <VerifyQRCodeModal
          isOpen={Boolean(selectedQrDoc)}
          onClose={() => setSelectedQrDoc(null)}
          document={selectedQrDoc}
        />
      )}
    </div>
  );
};
