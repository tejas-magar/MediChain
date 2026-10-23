import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal, Button, FormField, Alert } from '../ui';
import { MedicalDocument } from '../../types';
import { mockService } from '../../services/mockService';

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: MedicalDocument;
  patientId: string;
  onSuccess?: () => void;
}

export const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({
  isOpen,
  onClose,
  document,
  patientId,
  onSuccess,
}) => {
  const [requestedChanges, setRequestedChanges] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedChanges.trim()) {
      setError('Please specify the specific clinical or demographic correction requested.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a clinical or factual reason for this correction request.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      mockService.submitCorrectionRequest({
        documentId: document.id,
        patientId,
        requestedChanges: requestedChanges.trim(),
        reason: reason.trim(),
      });
      setIsSubmitting(false);
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to submit correction request.');
    }
  };

  const handleClose = () => {
    setRequestedChanges('');
    setReason('');
    setError(null);
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Request Document Correction (${document.documentNumber})`}
      size="lg"
    >
      {submitted ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Correction Request Submitted</h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
              Your request for <strong>{document.documentNumber}</strong> has been logged in the audit trail.
              The issuing clinical authority (<strong>{document.issuerName}</strong>) has been notified.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 max-w-md mx-auto">
            Note: The original document remains active and unchanged until the issuer reviews and issues an amended version.
          </div>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="info" title="Immutability Notice">
            Official clinical records are cryptographically sealed and cannot be edited or deleted. Submitting this request initiates a formal review workflow with the issuing provider.
          </Alert>

          {error && (
            <Alert variant="danger" title="Validation Error">
              {error}
            </Alert>
          )}

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Document:</span>
              <span className="font-semibold text-slate-800">{document.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Document ID:</span>
              <span className="font-mono text-slate-700">{document.documentNumber} (Version {document.version})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issuing Authority:</span>
              <span className="font-medium text-slate-800">{document.issuerName} ({document.issuerOrg})</span>
            </div>
          </div>

          <FormField
            label="Requested Correction Details"
            required
            helperText="Specify the exact text, dosage, or parameter that needs correction."
          >
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[90px]"
              placeholder="e.g., The dosage instructions should reflect taking 1 tablet in the morning instead of evening..."
              value={requestedChanges}
              onChange={(e) => setRequestedChanges(e.target.value)}
            />
          </FormField>

          <FormField
            label="Clinical or Factual Reason"
            required
            helperText="Explain why this correction is clinically appropriate."
          >
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[70px]"
              placeholder="e.g., Experiencing lightheadedness during evening hours; advised by nurse hotline to request morning administration."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
