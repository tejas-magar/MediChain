import React from 'react';
import { FileSignature, Lock } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { PatientProfile, PrescriptionClinicalData } from '../../types';

interface PrescriptionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinalize: () => void;
  patient: PatientProfile;
  doctorName: string;
  doctorOrg: string;
  doctorLicense: string;
  title: string;
  clinicalData: PrescriptionClinicalData;
  isSubmitting: boolean;
}

export const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmFinalize,
  patient,
  doctorName,
  doctorOrg,
  doctorLicense,
  title,
  clinicalData,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Prescription Preview & Cryptographic Finalization"
      size="xl"
    >
      <div className="space-y-5">
        {/* Immutability & Signature Warning Banner */}
        <div className="bg-teal-900 text-teal-50 p-4 rounded-xl text-xs space-y-1.5 border border-teal-800">
          <div className="flex items-center space-x-2 font-bold text-sm text-teal-200">
            <FileSignature className="w-4 h-4" />
            <span>Digital Signature & Immutability Enforcement</span>
          </div>
          <p>
            Upon confirmation, this document will be cryptographically hashed (SHA-256) and digitally signed using your physician RSA-2048 private key.
            Once finalized, <strong>this version can never be overwritten, modified, or deleted</strong>. Any future adjustments must go through the controlled amendment workflow.
          </p>
        </div>

        {/* Clinical Document Preview Card */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4 text-xs shadow-inner">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                Official Clinical Prescription
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{title}</h3>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Prescribing Physician: <strong>{doctorName}</strong> ({doctorLicense}) • {doctorOrg}
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
              <span className="text-amber-800 block text-[11px] font-medium">Allergies: {patient.allergies.join(', ')}</span>
            </div>
          </div>

          {/* Clinical Indication */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-semibold">Diagnosis & Indication:</span>
            <div className="font-medium text-slate-900">{clinicalData.diagnosis}</div>
            {clinicalData.icdCode && (
              <span className="text-slate-500 font-mono">ICD-10: {clinicalData.icdCode}</span>
            )}
            <div className="text-slate-600 mt-1">
              <strong>Plan:</strong> {clinicalData.treatmentPlan}
            </div>
          </div>

          {/* Medication Items */}
          <div>
            <span className="text-slate-500 font-bold block mb-1">Prescribed Items:</span>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Medication</th>
                    <th className="py-2 px-3">Form</th>
                    <th className="py-2 px-3">Frequency</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Refills</th>
                    <th className="py-2 px-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clinicalData.medications.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 px-3 font-bold text-slate-900">{m.medicationName} ({m.strength})</td>
                      <td className="py-2 px-3">{m.dosageForm}</td>
                      <td className="py-2 px-3">{m.frequency}</td>
                      <td className="py-2 px-3">{m.quantity}</td>
                      <td className="py-2 px-3">{m.refills}</td>
                      <td className="py-2 px-3 text-slate-600">{m.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cryptographic Finalization Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Lock className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Digital signature will anchor this document to the registry.</span>
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
              Sign & Finalize Record
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
