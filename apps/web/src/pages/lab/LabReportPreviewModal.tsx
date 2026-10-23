import React from 'react';
import { FileSignature, Lock } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { PatientProfile, LabReportClinicalData } from '../../types';

interface LabReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinalize: () => void;
  patient: PatientProfile;
  labName: string;
  labOrg: string;
  labLicense: string;
  title: string;
  clinicalData: LabReportClinicalData;
  isSubmitting: boolean;
}

export const LabReportPreviewModal: React.FC<LabReportPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmFinalize,
  patient,
  labName,
  labOrg,
  labLicense,
  title,
  clinicalData,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Laboratory Report Preview & Cryptographic Finalization"
      size="xl"
    >
      <div className="space-y-5">
        {/* Banner */}
        <div className="bg-blue-950 text-blue-50 p-4 rounded-xl text-xs space-y-1.5 border border-blue-800">
          <div className="flex items-center space-x-2 font-bold text-sm text-blue-200">
            <FileSignature className="w-4 h-4" />
            <span>CLIA Laboratory Finalization & Digital Signature</span>
          </div>
          <p>
            Upon confirmation, this diagnostic report will be cryptographically hashed (SHA-256) and digitally signed using your laboratory private key.
            Once finalized, <strong>this version is permanent and immutable</strong>. Any re-assays or corrections require issuing a superseding version with a recorded reason.
          </p>
        </div>

        {/* Clinical Document Preview Card */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4 text-xs shadow-inner">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                Official Laboratory Diagnostic Report
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{title}</h3>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Testing Facility: <strong>{labName}</strong> ({labLicense}) • {labOrg}
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                Ready to Finalize
              </span>
              <div className="text-[10px] text-slate-400 mt-1">Version 1.0</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Patient Name:</span>
              <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
              <span className="text-slate-500 font-mono block text-[11px]">MRN: {patient.mrn}</span>
            </div>
            <div>
              <span className="text-slate-400 block">DOB / Blood:</span>
              <span className="font-medium text-slate-800">{patient.dateOfBirth} ({patient.bloodType})</span>
              <span className="text-slate-500 block text-[11px]">Category: {clinicalData.testCategory}</span>
            </div>
          </div>

          {/* Specimen Info */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block font-semibold">Specimen Type:</span>
              <span className="font-medium text-slate-800">{clinicalData.specimenType}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Fasting Status:</span>
              <span className="font-medium text-slate-800">{clinicalData.fastingStatus}</span>
            </div>
          </div>

          {/* Results Table */}
          <div>
            <span className="text-slate-500 font-bold block mb-1">Diagnostic Test Parameters:</span>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Analyte / Test Parameter</th>
                    <th className="py-2 px-3">Measured Value</th>
                    <th className="py-2 px-3">Reference Range</th>
                    <th className="py-2 px-3 text-right">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clinicalData.results.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.parameterName}</td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {r.value} <span className="font-normal text-slate-500">{r.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono">{r.referenceRange}</td>
                      <td className="py-2 px-3 text-right">
                        {r.flag === 'NORMAL' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Normal
                          </span>
                        )}
                        {r.flag !== 'NORMAL' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            {r.flag}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block font-semibold">Technologist Remarks:</span>
            <p className="text-slate-800 mt-0.5">{clinicalData.technologistRemarks}</p>
          </div>
        </div>

        {/* Finalization Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Digital signature will anchor this diagnostic report to the registry.</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={onConfirmFinalize}
              loading={isSubmitting}
            >
              <FileSignature className="w-4 h-4 mr-1.5" />
              Sign & Finalize Report
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
