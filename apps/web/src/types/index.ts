export type UserRole = 'PATIENT' | 'DOCTOR' | 'TESTING_LAB';

export type DocumentCategory = 'PRESCRIPTION' | 'LAB_REPORT' | 'CONSULTATION' | 'X_RAY';

export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'SUPERSEDED' | 'REVOKED';

/**
 * VerificationState: Meaningful states for document verification.
 * - VERIFIED: hash + signature + issuer confirmed, FINALIZED status.
 * - MODIFIED: cryptographic hash does not match trusted registry reference.
 * - UNVERIFIED: document exists but has not been finalized/signed.
 * - PENDING_REGISTRATION: document is awaiting blockchain confirmation.
 * - SUPERSEDED: document was replaced by a newer authorized version.
 * - REVOKED: document was formally revoked by the issuing authority.
 * - UNAVAILABLE: no record found for the provided token.
 *
 * SECURITY NOTE: Never label an unconfirmed transaction as blockchain-verified.
 * A matching hash alone is not proof of authenticity — the trusted issuer
 * signature, issuer status, and document version must all be verified.
 */
export type VerificationState =
  | 'VERIFIED'
  | 'MODIFIED'
  | 'UNVERIFIED'
  | 'PENDING_REGISTRATION'
  | 'SUPERSEDED'
  | 'REVOKED'
  | 'UNAVAILABLE';

/**
 * PublicDocumentView: A zero-knowledge sanitized model for the public
 * verification portal. Exposes ONLY minimal non-clinical metadata.
 *
 * SECURITY RULES:
 * - MUST NOT contain patient name, MRN, diagnosis, medications, or any
 *   clinical data.
 * - MUST NOT contain private keys, decryption keys, or passwords.
 * - The verificationToken in QR codes and public URLs is opaque and
 *   high-entropy — it does not reveal patient identity or document contents.
 * - A matching hash proves integrity only when compared against this trusted
 *   reference; it is not sufficient proof of authenticity on its own.
 */
export interface PublicDocumentView {
  /** Unique document identifier (document number, e.g. RX-2026-0041) */
  documentNumber: string;
  /** Broad document category — no clinical details */
  category: DocumentCategory;
  /** Document version number */
  version: number;
  /** Issuer name (doctor or lab name) */
  issuerName: string;
  /** Issuer's role */
  issuerRole: 'DOCTOR' | 'TESTING_LAB';
  /** Issuer's organization/clinic/lab name */
  issuerOrg: string;
  /** Issuer's license or accreditation number */
  issuerLicense: string;
  /** Official issuance timestamp (ISO 8601) */
  issuedAt: string;
  /** Document status for verification decision */
  status: DocumentStatus;
  /** SHA-256 hex digest of the exact finalized document bytes */
  fileHash: string;
  /** Cryptographic digital signature over fileHash by issuer */
  issuerSignature: string;
  /** Opaque high-entropy token — used in QR codes and public URLs.
   *  Never contains patient names, diagnoses, or decryption keys. */
  verificationToken: string;
  /** Blockchain anchoring status and minimal proof details */
  blockchain: {
    /** NOT_ANCHORED | PENDING | CONFIRMED | FAILED
     *  IMPORTANT: Only CONFIRMED transactions on a live network (not mock/dev)
     *  may be presented as blockchain-anchored. */
    status: 'NOT_ANCHORED' | 'PENDING' | 'CONFIRMED' | 'FAILED';
    /** Transaction hash on the anchored ledger */
    txHash?: string;
    /** Block number in the ledger */
    blockNumber?: number;
    /** Ledger network identifier */
    ledgerNetwork: string;
    /** True if this is simulated test data — must not be labeled as verified */
    isMockData: boolean;
  };
  /** If superseded, reference to the superseding document number */
  supersededByNumber?: string;
}

export interface PatientProfile {
  id: string;
  mrn: string; // Medical Record Number e.g. MRN-8842-A
  fullName: string;
  dateOfBirth: string;
  gender: 'Female' | 'Male' | 'Other';
  phone: string;
  email: string;
  bloodType: string;
  allergies: string[];
}

export interface MedicationItem {
  id: string;
  medicationName: string;
  strength: string; // e.g. "10 mg", "500 mg"
  dosageForm: string; // "Tablet", "Capsule", "Inhaler", "Oral Suspension"
  frequency: string; // "Once daily with food", "Twice daily every 12h"
  duration: string; // "30 days", "Ongoing"
  quantity: string; // "30 tablets"
  refills: number;
  instructions: string;
}

export interface PrescriptionClinicalData {
  diagnosis: string;
  icdCode?: string;
  treatmentPlan: string;
  medications: MedicationItem[];
  dispenseAsWritten: boolean;
  notesToPharmacist?: string;
  patientAllergiesAcknowledged: boolean;
}

export interface LabResultItem {
  id: string;
  parameterName: string; // e.g. "Fasting Blood Glucose", "Serum Creatinine"
  value: string; // e.g. "108"
  unit: string; // e.g. "mg/dL", "mmol/L"
  referenceRange: string; // e.g. "70 - 99 mg/dL"
  flag: 'NORMAL' | 'ABNORMAL_HIGH' | 'ABNORMAL_LOW' | 'CRITICAL';
}

export interface LabReportClinicalData {
  testCategory: 'Hematology' | 'Chemistry' | 'Lipid Panel' | 'Endocrine' | 'Urinalysis' | 'Immunology' | 'Diagnostic Imaging' | 'General Medicine';
  specimenType: 'Serum / Venous Blood' | 'Plasma' | 'Random Urine' | 'Saliva' | 'Tissue Biopsy' | 'Whole Blood' | 'Radiography' | 'N/A';
  collectionTimestamp: string;
  fastingStatus: 'Fasting (12 hrs)' | 'Non-Fasting' | 'Not Applicable';
  results: LabResultItem[];
  technologistRemarks: string;
  clinicalSignificance?: string;
}

export interface BlockchainAnchorDetails {
  status: 'NOT_ANCHORED' | 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
  ledgerNetwork: 'Local Hardhat Node' | 'Sepolia Testnet';
  isMockData: boolean;
  notes: string;
}

export interface MedicalDocument {
  id: string;
  documentNumber: string; // e.g. RX-2026-0041 or LAB-2026-0082
  category: DocumentCategory;
  title: string;
  status: DocumentStatus;
  version: number;
  
  // Patient details
  patientId: string;
  patientName: string;
  patientMrn: string;

  // Issuer details
  issuerId: string;
  issuerName: string;
  issuerRole: 'DOCTOR' | 'TESTING_LAB';
  issuerOrg: string;
  issuerLicense: string;

  // Versioning & controlled amendments
  parentDocumentId?: string;
  supersededById?: string;
  amendmentReason?: string;
  versionHistory: Array<{
    version: number;
    documentId: string;
    documentNumber: string;
    timestamp: string;
    reason?: string;
    author: string;
  }>;

  // Cryptographic & Integrity Proofs
  fileHash: string; // SHA-256 byte digest
  issuerSignature: string; // Cryptographic digital signature (RSA-2048)
  verificationToken: string; // Opaque high-entropy token for QR lookup
  qrCodeUrl: string;

  // Clinical Payload
  clinicalData: PrescriptionClinicalData | LabReportClinicalData;

  // Blockchain Anchoring State
  blockchain: BlockchainAnchorDetails;

  // Metadata
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionRequest {
  id: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  patientId: string;
  patientName: string;
  requestedChanges: string;
  reason: string;
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED';
  reviewNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewerName?: string;
}

export type ConsentScope = 'CREATE_ONLY' | 'FULL_ACCESS';
export type ConsentStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface ConsentRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  providerId: string;
  providerName: string;
  providerRole: 'DOCTOR' | 'TESTING_LAB';
  providerOrg?: string;
  providerLicense?: string;
  status: ConsentStatus;
  scope?: ConsentScope;
  purpose: string;
  requestedAt: string;
  respondedAt?: string;
}
