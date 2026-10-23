import React, { useState } from 'react';
import { Modal, Button, FormField, Alert } from '../ui';
import { MedicalDocument, PrescriptionClinicalData, LabReportClinicalData } from '../../types';
import { mockService } from '../../services/mockService';

interface AmendDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: MedicalDocument;
  authorName: string;
  onSuccess?: (newDoc: MedicalDocument) => void;
}

export const AmendDocumentModal: React.FC<AmendDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  authorName,
  onSuccess,
}) => {
  const [amendmentReason, setAmendmentReason] = useState('');
  const [treatmentOrRemarks, setTreatmentOrRemarks] = useState(() => {
    if (document.category === 'PRESCRIPTION') {
      return (document.clinicalData as PrescriptionClinicalData).treatmentPlan;
    } else {
      return (document.clinicalData as LabReportClinicalData).technologistRemarks;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAmend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendmentReason.trim()) {
      setError('A formal clinical amendment reason is mandatory to issue a superseding version.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let amendedClinicalData: PrescriptionClinicalData | LabReportClinicalData;

      if (document.category === 'PRESCRIPTION') {
        const currentData = document.clinicalData as PrescriptionClinicalData;
        amendedClinicalData = {
          ...currentData,
          treatmentPlan: treatmentOrRemarks,
        };
      } else {
        const currentData = document.clinicalData as LabReportClinicalData;
        amendedClinicalData = {
          ...currentData,
          technologistRemarks: treatmentOrRemarks,
        };
      }

      const newVersionDoc = mockService.amendDocument(
        document.id,
        amendedClinicalData,
        amendmentReason.trim(),
        authorName
      );

      setIsSubmitting(false);
      if (onSuccess) onSuccess(newVersionDoc);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to issue amended document version.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Issue Controlled Amendment (Version ${document.version + 1})`}
      size="lg"
    >
      <form onSubmit={handleAmend} className="space-y-4">
        <Alert variant="warning" title="Controlled Versioning Rule">
          Finalized records cannot be modified in place. Issuing this amendment creates{' '}
          <strong>Version {document.version + 1}</strong>, seals it with a new cryptographic hash and signature, and marks{' '}
          <strong>{document.documentNumber} (Version {document.version})</strong> as <code>SUPERSEDED</code>.
        </Alert>

        {error && (
          <Alert variant="danger" title="Validation Error">
            {error}
          </Alert>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Current Record:</span>
            <span className="font-semibold text-slate-800">{document.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Parent Version:</span>
            <span className="font-mono text-slate-700">v{document.version} ({document.documentNumber})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Patient:</span>
            <span className="font-medium text-slate-800">{document.patientName} ({document.patientMrn})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amending Authority:</span>
            <span className="font-medium text-teal-700">{authorName}</span>
          </div>
        </div>

        <FormField
          label="Clinical Amendment Reason"
          required
          helperText="Document why this clinical record is being superseded (e.g. dosage titration, laboratory re-calibration, reported adverse reaction)."
        >
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[80px]"
            placeholder="e.g. Patient experienced mild dizziness on 20mg dose; clinical evaluation prompted reduction to 10mg maintenance therapy."
            value={amendmentReason}
            onChange={(e) => setAmendmentReason(e.target.value)}
          />
        </FormField>

        <FormField
          label={document.category === 'PRESCRIPTION' ? 'Updated Treatment & Clinical Plan' : 'Updated Technologist Remarks'}
          required
        >
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[90px]"
            value={treatmentOrRemarks}
            onChange={(e) => setTreatmentOrRemarks(e.target.value)}
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            Confirm & Issue Version {document.version + 1}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
