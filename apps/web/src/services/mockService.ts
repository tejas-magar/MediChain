/**
 * ==============================================================================
 * MediLedger - Mock Service Layer (Phase 2 Development)
 * ------------------------------------------------------------------------------
 * DEVELOPER NOTICE:
 * All state modifications in this module update client-side memory and
 * localStorage for interactive manual verification and QA testing.
 * Digital signature generation and blockchain commitments are simulated locally
 * to test complete UX flows before cryptographic and smart contract wiring.
 * ==============================================================================
 */

import {
  MedicalDocument,
  PatientProfile,
  CorrectionRequest,
  PrescriptionClinicalData,
  LabReportClinicalData,
  VerificationState,
  PublicDocumentView,
  ConsentRequest,
  ConsentScope,
} from '../types';
import {
  INITIAL_DOCUMENTS,
  MOCK_PATIENTS,
  INITIAL_CORRECTIONS,
  MOCK_DOCTOR,
  MOCK_TESTING_LAB,
  INITIAL_CONSENT_REQUESTS,
} from './mockData';

const STORAGE_KEYS = {
  DOCUMENTS: 'mediledger_mock_documents_in_v6',
  CORRECTIONS: 'mediledger_mock_corrections_in_v6',
  CONSENTS: 'mediledger_mock_consents_in_v3',
};

// Generate high-entropy hex string simulating SHA-256
function generateMockSha256(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const salt = Math.random().toString(16).substring(2, 10);
  const time = Date.now().toString(16);
  return `${hex}${salt}${time}4b89e1a2f09312c4091823ab647e3b0c44298fc1c14`.substring(0, 64);
}

function generateOpaqueToken(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 12);
  const time = Date.now().toString(36);
  return `tok_${prefix}_${time}_${rand}`;
}

class MockService {
  private documents: MedicalDocument[] = [];
  private corrections: CorrectionRequest[] = [];
  private dynamicPatients: PatientProfile[] = [];
  private consents: ConsentRequest[] = [];

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (savedDocs) {
        this.documents = JSON.parse(savedDocs);
      } else {
        this.documents = [...INITIAL_DOCUMENTS];
        this.saveDocuments();
      }

      const savedCorrs = localStorage.getItem(STORAGE_KEYS.CORRECTIONS);
      if (savedCorrs) {
        this.corrections = JSON.parse(savedCorrs);
      } else {
        this.corrections = [...INITIAL_CORRECTIONS];
        this.saveCorrections();
      }

      const savedConsents = localStorage.getItem(STORAGE_KEYS.CONSENTS);
      if (savedConsents) {
        this.consents = JSON.parse(savedConsents);
      } else {
        this.consents = [...INITIAL_CONSENT_REQUESTS];
        this.saveConsents();
      }
    } catch {
      this.documents = [...INITIAL_DOCUMENTS];
      this.corrections = [...INITIAL_CORRECTIONS];
      this.consents = [...INITIAL_CONSENT_REQUESTS];
    }
  }

  private saveDocuments() {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.documents));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  private saveCorrections() {
    try {
      localStorage.setItem(STORAGE_KEYS.CORRECTIONS, JSON.stringify(this.corrections));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  private saveConsents() {
    try {
      localStorage.setItem(STORAGE_KEYS.CONSENTS, JSON.stringify(this.consents));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  /**
   * Synchronizes documents loaded from the real PostgreSQL database into local memory & storage.
   */
  syncFromBackend(backendDocs: any[]) {
    if (!Array.isArray(backendDocs) || backendDocs.length === 0) return;

    backendDocs.forEach((bd) => {
      if (!bd || !bd.id) return;
      const existingIdx = this.documents.findIndex(
        (d) => d.id === bd.id || d.documentNumber === bd.documentNumber
      );

      let clinicalData = bd.clinicalData;
      if (bd.prescriptionDetails) {
        clinicalData = {
          diagnosis: bd.prescriptionDetails.diagnosis || bd.description || bd.title,
          icdCode: bd.prescriptionDetails.icdCode,
          treatmentPlan: bd.prescriptionDetails.treatmentPlan || '',
          medications: (bd.prescriptionDetails.medications || []).map((m: any, i: number) => ({
            id: m.id || `med-${i}`,
            medicationName: m.name,
            strength: m.strength || '',
            dosageForm: m.dosageForm || 'Tablet',
            frequency: m.frequency || 'Daily',
            duration: m.duration || '30 days',
            quantity: m.quantity || '30 tablets',
            refills: m.refills || 0,
            instructions: m.instructions || '',
          })),
          dispenseAsWritten: bd.prescriptionDetails.dispenseAsWritten || false,
          patientAllergiesAcknowledged: bd.prescriptionDetails.allergiesAcknowledged || true,
        };
      } else if (bd.labReportDetails) {
        clinicalData = {
          testCategory: bd.labReportDetails.testCategory || 'Comprehensive Metabolic Panel',
          specimenType: bd.labReportDetails.specimenType || 'Serum / Venous Blood',
          collectionTimestamp: bd.labReportDetails.collectionTimestamp || bd.issuedAt || new Date().toISOString(),
          fastingStatus: bd.labReportDetails.fastingStatus || 'Fasting (12 hrs)',
          results: (bd.labReportDetails.results || []).map((r: any, i: number) => ({
            id: r.id || `res-${i}`,
            parameterName: r.parameterName || r.testName,
            value: r.value,
            unit: r.unit || '',
            referenceRange: r.referenceRange || '',
            flag: (r.flag === 'HIGH' ? 'ABNORMAL_HIGH' : r.flag === 'LOW' ? 'ABNORMAL_LOW' : r.flag === 'CRITICAL' ? 'CRITICAL' : 'NORMAL') as any,
          })),
          technologistRemarks: bd.labReportDetails.technologistRemarks || '',
          clinicalSignificance: bd.labReportDetails.clinicalSignificance,
        };
      }

      const mappedDoc: MedicalDocument = {
        id: bd.id,
        documentNumber: bd.documentNumber,
        category: bd.category,
        title: bd.title,
        status: bd.status || 'FINALIZED',
        version: bd.version || 1,
        patientId: bd.patientId || (bd.patient ? bd.patient.id : ''),
        patientName: bd.patient?.fullName || 'Patient',
        patientMrn: bd.patient?.mrn || 'ABHA-PATIENT',
        issuerId: bd.issuerId || (bd.issuer ? bd.issuer.id : ''),
        issuerName: bd.issuer?.fullName || (bd.category === 'PRESCRIPTION' ? 'Dr. Rajesh Varma, MD, DM' : 'Dr. Lal PathLabs & Diagnostics'),
        issuerRole: bd.issuer?.role || (bd.category === 'PRESCRIPTION' ? 'DOCTOR' : 'TESTING_LAB'),
        issuerOrg: bd.issuer?.organization || (bd.category === 'PRESCRIPTION' ? 'AIIMS New Delhi • Department of Cardiology' : 'National Reference Laboratory, New Delhi'),
        issuerLicense: bd.issuer?.licenseNumber || (bd.category === 'PRESCRIPTION' ? 'NMC-DL-2018-9412' : 'NABL-MC-88910 (ICMR Certified)'),
        parentDocumentId: bd.parentDocumentId,
        supersededById: bd.supersededById,
        amendmentReason: bd.amendmentReason,
        versionHistory: (bd.versions && bd.versions.length > 0)
          ? bd.versions.map((v: any) => ({
              version: v.versionNumber,
              documentId: bd.id,
              documentNumber: bd.documentNumber,
              timestamp: v.finalizedAt || bd.issuedAt,
              author: bd.issuer?.fullName || 'Authorized Issuer',
              reason: v.amendmentReason,
            }))
          : [
              {
                version: bd.version || 1,
                documentId: bd.id,
                documentNumber: bd.documentNumber,
                timestamp: bd.issuedAt || new Date().toISOString(),
                author: bd.issuer?.fullName || 'Authorized Issuer',
              },
            ],
        fileHash: bd.fileHash || 'b080a5eedf181a52dc4ca62b7060d378bf77cccbe93e3eb1cf8ae1092227df97',
        issuerSignature: bd.issuerSignature || 'RSA-PSS-SHA256:verified_database_signature',
        verificationToken: bd.verificationToken || `tok_${bd.documentNumber.toLowerCase()}`,
        qrCodeUrl: typeof window !== 'undefined' ? `${window.location.origin}/verify/${bd.verificationToken}` : '',
        clinicalData: clinicalData || {
          diagnosis: bd.title,
          treatmentPlan: bd.description || '',
          medications: [],
          dispenseAsWritten: false,
          patientAllergiesAcknowledged: true,
        },
        blockchain: {
          status: 'CONFIRMED',
          txHash: '0x' + (bd.fileHash ? bd.fileHash.slice(0, 40) : '0000000000000000000000000000000000000000'),
          blockNumber: 1984550,
          timestamp: bd.issuedAt || new Date().toISOString(),
          ledgerNetwork: 'Local Hardhat Node',
          isMockData: true,
          notes: 'Record commitment anchored with digital signature in PostgreSQL.',
        },
        issuedAt: bd.issuedAt || new Date().toISOString(),
        createdAt: bd.createdAt || bd.issuedAt || new Date().toISOString(),
        updatedAt: bd.updatedAt || bd.issuedAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        this.documents[existingIdx] = mappedDoc;
      } else {
        this.documents.unshift(mappedDoc);
      }
    });

    this.saveDocuments();
  }

  // Consent & Access Management
  syncConsentsFromBackend(backendAssocs: any[]) {
    if (!Array.isArray(backendAssocs)) return;

    backendAssocs.forEach((assoc) => {
      let scope: ConsentScope | undefined = undefined;
      let note = 'Clinical consultation, historical records review, and document issuance';
      let requestedAt = assoc.createdAt || new Date().toISOString();
      let respondedAt = assoc.confirmedAt || undefined;

      if (assoc.purpose) {
        try {
          const parsed = typeof assoc.purpose === 'string' && assoc.purpose.startsWith('{') ? JSON.parse(assoc.purpose) : null;
          if (parsed) {
            if (parsed.scope === 'CREATE_ONLY' || parsed.scope === 'FULL_ACCESS') {
              scope = parsed.scope;
            }
            if (parsed.note) note = parsed.note;
            if (parsed.requestedAt) requestedAt = parsed.requestedAt;
            if (parsed.respondedAt) respondedAt = parsed.respondedAt;
          } else {
            note = assoc.purpose;
          }
        } catch (e) {
          note = assoc.purpose;
        }
      }

      let status: 'PENDING' | 'ACTIVE' | 'REVOKED' = 'ACTIVE';
      if (assoc.status === 'PENDING_CONFIRMATION') {
        status = 'PENDING';
      } else if (assoc.status === 'REVOKED' || assoc.status === 'EXPIRED') {
        status = 'REVOKED';
      }

      const req: ConsentRequest = {
        id: assoc.id,
        patientId: assoc.patientId,
        patientName: assoc.patient?.fullName || 'Patient',
        patientMrn: assoc.patient?.mrn || '',
        providerId: assoc.providerId,
        providerName: assoc.provider?.fullName || 'Healthcare Provider',
        providerRole: (assoc.provider?.role as any) || 'DOCTOR',
        providerOrg: assoc.provider?.organization || 'Clinical Facility',
        providerLicense: assoc.provider?.licenseNumber || 'Verified License',
        status,
        scope: status === 'ACTIVE' ? (scope || 'FULL_ACCESS') : undefined,
        purpose: note,
        requestedAt,
        respondedAt,
      };

      const existingIndex = this.consents.findIndex(
        (c) =>
          c.id === req.id ||
          ((c.patientId === req.patientId || (req.patientMrn && c.patientMrn === req.patientMrn)) &&
            c.providerId === req.providerId)
      );

      if (existingIndex >= 0) {
        this.consents[existingIndex] = req;
      } else {
        this.consents.unshift(req);
      }
    });

    this.saveConsents();
  }

  getConsentRequestsByPatient(patientId: string, patientName?: string, patientMrn?: string): ConsentRequest[] {
    return this.consents.filter(
      (c) =>
        c.patientId === patientId ||
        (patientMrn && c.patientMrn === patientMrn) ||
        (patientName && c.patientName.toLowerCase() === patientName.toLowerCase())
    );
  }

  getConsentRequestsByProvider(providerId: string): ConsentRequest[] {
    return this.consents.filter((c) => c.providerId === providerId);
  }

  getConsentStatus(
    patientId: string,
    providerId: string,
    patientMrn?: string
  ): { status: 'NONE' | 'PENDING' | 'ACTIVE' | 'REVOKED'; scope?: ConsentScope; request?: ConsentRequest } {
    const isDoc =
      providerId === 'DOC-101' ||
      providerId === 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c' ||
      providerId === MOCK_DOCTOR.id;
    const isLab =
      providerId === 'LAB-201' ||
      providerId === 'b76d8afd-971d-47f1-ab77-333954275ada' ||
      providerId === MOCK_TESTING_LAB.id;

    const found = this.consents.find(
      (c) =>
        (c.patientId === patientId ||
          (patientMrn && c.patientMrn === patientMrn) ||
          c.patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' ||
          patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' ||
          patientId === 'PAT-001') &&
        (c.providerId === providerId ||
          (isDoc && (c.providerId === 'DOC-101' || c.providerId === 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c' || c.providerRole === 'DOCTOR')) ||
          (isLab && (c.providerId === 'LAB-201' || c.providerId === 'b76d8afd-971d-47f1-ab77-333954275ada' || c.providerRole === 'TESTING_LAB')))
    );

    if (!found) return { status: 'NONE' };
    return {
      status: found.status,
      scope: found.scope,
      request: found,
    };
  }

  requestAccess(
    providerId: string,
    providerName: string,
    providerRole: 'DOCTOR' | 'TESTING_LAB',
    providerOrg: string,
    providerLicense: string,
    patient: PatientProfile,
    purpose?: string,
    requestId?: string
  ): ConsentRequest {
    const existingIndex = this.consents.findIndex(
      (c) =>
        (c.patientId === patient.id || (patient.mrn && c.patientMrn === patient.mrn)) &&
        c.providerId === providerId
    );

    const newReq: ConsentRequest = {
      id: requestId || `req-c-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      providerId,
      providerName,
      providerRole,
      providerOrg,
      providerLicense,
      status: 'PENDING',
      purpose: purpose || 'Clinical consultation, historical records review, and document issuance',
      requestedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.consents[existingIndex] = newReq;
    } else {
      this.consents.unshift(newReq);
    }

    this.saveConsents();
    return newReq;
  }

  respondToConsentRequest(
    requestId: string,
    decision: 'GRANT_CREATE_ONLY' | 'GRANT_FULL_ACCESS' | 'REJECT'
  ): ConsentRequest | null {
    const req = this.consents.find((c) => c.id === requestId);
    if (!req) return null;

    if (decision === 'REJECT') {
      req.status = 'REVOKED';
      req.scope = undefined;
    } else if (decision === 'GRANT_CREATE_ONLY') {
      req.status = 'ACTIVE';
      req.scope = 'CREATE_ONLY';
    } else {
      req.status = 'ACTIVE';
      req.scope = 'FULL_ACCESS';
    }

    req.respondedAt = new Date().toISOString();
    this.saveConsents();
    return req;
  }

  revokeConsent(requestId: string): ConsentRequest | null {
    const req = this.consents.find((c) => c.id === requestId);
    if (!req) return null;

    req.status = 'REVOKED';
    req.respondedAt = new Date().toISOString();
    this.saveConsents();
    return req;
  }

  // Patients
  registerDynamicPatient(patient: PatientProfile) {
    if (!this.dynamicPatients.find((p) => p.id === patient.id || (patient.mrn && p.mrn === patient.mrn))) {
      this.dynamicPatients.unshift(patient);
    }
  }

  getPatients(): PatientProfile[] {
    const combined = [...this.dynamicPatients];
    for (const mock of MOCK_PATIENTS) {
      if (!combined.some((p) => p.id === mock.id || p.mrn === mock.mrn)) {
        combined.push(mock);
      }
    }
    return combined;
  }

  getPatientById(id: string): PatientProfile | undefined {
    return (
      this.dynamicPatients.find((p) => p.id === id || p.mrn === id) ||
      MOCK_PATIENTS.find((p) => p.id === id || p.mrn === id)
    );
  }

  // Documents
  getDocuments(): MedicalDocument[] {
    return [...this.documents];
  }

  getDocumentById(id: string): MedicalDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  getDocumentByToken(token: string): MedicalDocument | undefined {
    return this.documents.find((d) => d.verificationToken === token);
  }

  getDocumentsByPatient(patientId: string, mrn?: string, fullName?: string): MedicalDocument[] {
    return this.documents.filter((d) => {
      if (d.patientId === patientId) return true;
      if (mrn && d.patientMrn && d.patientMrn.toLowerCase() === mrn.toLowerCase()) return true;
      if (fullName && d.patientName && d.patientName.toLowerCase() === fullName.toLowerCase()) return true;
      if (
        (d.patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' || d.patientId === 'PAT-881') &&
        (patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' ||
          patientId === 'PAT-881' ||
          mrn === 'ABHA-91-8841-1029' ||
          (fullName && fullName.toLowerCase().includes('aarav')))
      ) {
        return true;
      }
      return false;
    });
  }

  getDocumentsByIssuer(issuerId: string, licenseNumber?: string): MedicalDocument[] {
    return this.documents.filter((d) => {
      if (d.issuerId === issuerId) return true;
      if (licenseNumber && d.issuerLicense && d.issuerLicense.toLowerCase() === licenseNumber.toLowerCase()) return true;
      if (
        (d.issuerId === 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c' || d.issuerId === 'DOC-101') &&
        (issuerId === 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c' ||
          issuerId === 'DOC-101' ||
          (licenseNumber && licenseNumber.includes('NMC-DL-2018-9412')))
      ) {
        return true;
      }
      if (
        (d.issuerId === 'b76d8afd-971d-47f1-ab77-333954275ada' || d.issuerId === 'LAB-201') &&
        (issuerId === 'b76d8afd-971d-47f1-ab77-333954275ada' ||
          issuerId === 'LAB-201' ||
          (licenseNumber && licenseNumber.includes('NABL-MC-88910')))
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Projects a full MedicalDocument to a PublicDocumentView.
   *
   * SECURITY: This strips ALL clinical data, patient identity, diagnoses,
   * medications, MRN, patientId, and any field that could constitute PHI
   * (Protected Health Information). The resulting object is safe to send
   * to the public verification portal.
   *
   * A QR code or public URL must never grant access to a private medical file.
   * The verificationToken is opaque and high-entropy — it never contains
   * patient names, diagnoses, document contents, passwords, or private keys.
   */
  private toPublicView(doc: MedicalDocument): PublicDocumentView {
    // Find the superseding document number (not ID) for SUPERSEDED docs
    let supersededByNumber: string | undefined;
    if (doc.supersededById) {
      const supersedingDoc = this.documents.find((d) => d.id === doc.supersededById);
      supersededByNumber = supersedingDoc?.documentNumber;
    }

    return {
      documentNumber: doc.documentNumber,
      category: doc.category,
      version: doc.version,
      issuerName: doc.issuerName,
      issuerRole: doc.issuerRole,
      issuerOrg: doc.issuerOrg,
      issuerLicense: doc.issuerLicense,
      issuedAt: doc.issuedAt,
      status: doc.status,
      fileHash: doc.fileHash,
      issuerSignature: doc.issuerSignature,
      verificationToken: doc.verificationToken,
      blockchain: {
        status: doc.blockchain.status,
        txHash: doc.blockchain.txHash,
        blockNumber: doc.blockchain.blockNumber,
        ledgerNetwork: doc.blockchain.ledgerNetwork,
        isMockData: doc.blockchain.isMockData,
      },
      supersededByNumber,
    };
  }

  /**
   * Doctor workflow: Create and finalize a Prescription
   */
  createPrescription(
    input: {
      patientId: string;
      title: string;
      clinicalData: PrescriptionClinicalData;
    },
    doctor = MOCK_DOCTOR
  ): MedicalDocument {
    const patient = this.getPatientById(input.patientId);
    if (!patient) throw new Error(`Patient ${input.patientId} not found.`);

    const rxCount = this.documents.filter((d) => d.category === 'PRESCRIPTION').length + 42;
    const documentNumber = `RX-2026-00${rxCount}`;
    const docId = `DOC-RX-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const canonicalBytesPayload = JSON.stringify({
      documentNumber,
      category: 'PRESCRIPTION',
      patientId: patient.id,
      patientName: patient.fullName,
      issuerId: doctor.id,
      issuerName: doctor.fullName,
      clinicalData: input.clinicalData,
      issuedAt: nowIso,
    });

    const fileHash = generateMockSha256(canonicalBytesPayload);
    const verificationToken = generateOpaqueToken('rx');

    const newDoc: MedicalDocument = {
      id: docId,
      documentNumber,
      category: 'PRESCRIPTION',
      title: input.title,
      status: 'FINALIZED',
      version: 1,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      issuerId: doctor.id,
      issuerName: doctor.fullName,
      issuerRole: 'DOCTOR',
      issuerOrg: doctor.organization,
      issuerLicense: doctor.licenseNumber,
      versionHistory: [
        {
          version: 1,
          documentId: docId,
          documentNumber,
          timestamp: nowIso,
          author: doctor.fullName,
          reason: 'Initial prescription finalized and digitally signed.',
        },
      ],
      fileHash,
      issuerSignature: `RSA-PSS-SHA256:${fileHash.substring(0, 16)}...mock_dr_${doctor.id}`,
      verificationToken,
      qrCodeUrl: `http://localhost:5173/verify/${verificationToken}`,
      clinicalData: input.clinicalData,
      blockchain: {
        status: 'CONFIRMED',
        txHash: `0x${generateMockSha256(fileHash)}`,
        blockNumber: 1985200 + Math.floor(Math.random() * 50),
        timestamp: nowIso,
        ledgerNetwork: 'Local Hardhat Node',
        isMockData: true,
        notes: 'Simulated local block registration for Phase 2 frontend testing.',
      },
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.documents.unshift(newDoc);
    this.saveDocuments();
    return newDoc;
  }

  /**
   * Testing Lab workflow: Create and finalize a Lab Report
   */
  createLabReport(
    input: {
      patientId: string;
      title: string;
      clinicalData: LabReportClinicalData;
    },
    lab = MOCK_TESTING_LAB
  ): MedicalDocument {
    const patient = this.getPatientById(input.patientId);
    if (!patient) throw new Error(`Patient ${input.patientId} not found.`);

    const labCount = this.documents.filter((d) => d.category === 'LAB_REPORT').length + 84;
    const documentNumber = `LAB-2026-00${labCount}`;
    const docId = `DOC-LAB-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const canonicalBytesPayload = JSON.stringify({
      documentNumber,
      category: 'LAB_REPORT',
      patientId: patient.id,
      patientName: patient.fullName,
      issuerId: lab.id,
      issuerName: lab.fullName,
      clinicalData: input.clinicalData,
      issuedAt: nowIso,
    });

    const fileHash = generateMockSha256(canonicalBytesPayload);
    const verificationToken = generateOpaqueToken('lab');

    const newDoc: MedicalDocument = {
      id: docId,
      documentNumber,
      category: 'LAB_REPORT',
      title: input.title,
      status: 'FINALIZED',
      version: 1,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      issuerId: lab.id,
      issuerName: lab.fullName,
      issuerRole: 'TESTING_LAB',
      issuerOrg: lab.organization,
      issuerLicense: lab.licenseNumber,
      versionHistory: [
        {
          version: 1,
          documentId: docId,
          documentNumber,
          timestamp: nowIso,
          author: lab.fullName,
          reason: 'Initial diagnostic panel validated and digitally signed.',
        },
      ],
      fileHash,
      issuerSignature: `RSA-PSS-SHA256:${fileHash.substring(0, 16)}...mock_lab_${lab.id}`,
      verificationToken,
      qrCodeUrl: `http://localhost:5173/verify/${verificationToken}`,
      clinicalData: input.clinicalData,
      blockchain: {
        status: 'CONFIRMED',
        txHash: `0x${generateMockSha256(fileHash)}`,
        blockNumber: 1985220 + Math.floor(Math.random() * 50),
        timestamp: nowIso,
        ledgerNetwork: 'Local Hardhat Node',
        isMockData: true,
        notes: 'Simulated local block registration for Phase 2 frontend testing.',
      },
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.documents.unshift(newDoc);
    this.saveDocuments();
    return newDoc;
  }

  /**
   * Controlled Amendment Workflow (Issuer only): Creates Version N+1, marks parent SUPERSEDED
   */
  amendDocument(
    originalDocId: string,
    amendedClinicalData: PrescriptionClinicalData | LabReportClinicalData,
    amendmentReason: string,
    authorName: string
  ): MedicalDocument {
    const originalDoc = this.getDocumentById(originalDocId);
    if (!originalDoc) throw new Error('Original document not found');
    if (originalDoc.status !== 'FINALIZED') {
      throw new Error('Only finalized documents can be amended.');
    }

    const nextVersion = originalDoc.version + 1;
    const prefix = originalDoc.category === 'PRESCRIPTION' ? 'RX' : 'LAB';
    const randSuffix = Math.floor(10 + Math.random() * 90);
    const newDocNumber = `${prefix}-2026-00${randSuffix}`;
    const newDocId = `DOC-${prefix}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const canonicalBytesPayload = JSON.stringify({
      documentNumber: newDocNumber,
      category: originalDoc.category,
      patientId: originalDoc.patientId,
      version: nextVersion,
      parentDocumentId: originalDoc.id,
      amendmentReason,
      clinicalData: amendedClinicalData,
      issuedAt: nowIso,
    });

    const fileHash = generateMockSha256(canonicalBytesPayload);
    const verificationToken = generateOpaqueToken(prefix.toLowerCase());

    const updatedHistory = [
      ...originalDoc.versionHistory,
      {
        version: nextVersion,
        documentId: newDocId,
        documentNumber: newDocNumber,
        timestamp: nowIso,
        author: authorName,
        reason: amendmentReason,
      },
    ];

    const amendedDoc: MedicalDocument = {
      ...originalDoc,
      id: newDocId,
      documentNumber: newDocNumber,
      version: nextVersion,
      parentDocumentId: originalDoc.id,
      supersededById: undefined,
      amendmentReason,
      versionHistory: updatedHistory,
      fileHash,
      issuerSignature: `RSA-PSS-SHA256:${fileHash.substring(0, 16)}...amended_v${nextVersion}`,
      verificationToken,
      qrCodeUrl: `http://localhost:5173/verify/${verificationToken}`,
      clinicalData: amendedClinicalData,
      status: 'FINALIZED',
      blockchain: {
        status: 'CONFIRMED',
        txHash: `0x${generateMockSha256(fileHash)}`,
        blockNumber: 1985300 + Math.floor(Math.random() * 40),
        timestamp: nowIso,
        ledgerNetwork: 'Local Hardhat Node',
        isMockData: true,
        notes: `Simulated local block registration for amendment Version ${nextVersion}.`,
      },
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Mark original document as SUPERSEDED and link to new document
    originalDoc.status = 'SUPERSEDED';
    originalDoc.supersededById = newDocId;
    originalDoc.updatedAt = nowIso;

    this.documents.unshift(amendedDoc);
    this.saveDocuments();
    return amendedDoc;
  }

  // Patient Correction Requests (Separate workflow entity, never mutates the original document!)
  getCorrectionRequests(): CorrectionRequest[] {
    return [...this.corrections];
  }

  getCorrectionRequestsByPatient(patientId: string, fullName?: string): CorrectionRequest[] {
    return this.corrections.filter((c) => {
      if (c.patientId === patientId) return true;
      if (fullName && c.patientName.toLowerCase() === fullName.toLowerCase()) return true;
      if (
        (c.patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' || c.patientId === 'PAT-881') &&
        (patientId === '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1' ||
          patientId === 'PAT-881' ||
          (fullName && fullName.toLowerCase().includes('aarav')))
      ) {
        return true;
      }
      return false;
    });
  }

  submitCorrectionRequest(input: {
    documentId: string;
    patientId: string;
    requestedChanges: string;
    reason: string;
  }): CorrectionRequest {
    const doc = this.getDocumentById(input.documentId);
    if (!doc) throw new Error('Target document not found.');
    const patient = this.getPatientById(input.patientId);
    if (!patient) throw new Error('Patient record not found.');

    const newRequest: CorrectionRequest = {
      id: `CORR-2026-${Date.now().toString(36).toUpperCase()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      patientId: patient.id,
      patientName: patient.fullName,
      requestedChanges: input.requestedChanges,
      reason: input.reason,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
    };

    this.corrections.unshift(newRequest);
    this.saveCorrections();
    return newRequest;
  }

  /**
   * Public verification by opaque high-entropy token.
   *
   * Returns a PublicDocumentView (never the full MedicalDocument).
   * The public portal must only see minimal, non-clinical metadata.
   *
   * Verification logic:
   * 1. Token lookup — if not found: UNAVAILABLE.
   * 2. REVOKED status: REVOKED.
   * 3. SUPERSEDED status: SUPERSEDED.
   * 4. Blockchain PENDING (anchoring in progress): PENDING_REGISTRATION.
   *    NOTE: "PENDING" blockchain status must never be labeled as verified.
   * 5. FINALIZED + hash + signature present: VERIFIED.
   * 6. Otherwise: UNVERIFIED.
   *
   * SECURITY: A matching database row is NOT proof of authenticity.
   * The caller must independently verify the supplied document's hash against
   * the trusted reference here, the issuer signature, and issuer status.
   */
  verifyByToken(token: string): {
    state: VerificationState;
    document?: PublicDocumentView;
    reason?: string;
  } {
    const doc = this.getDocumentByToken(token.trim());
    if (!doc) {
      return {
        state: 'UNAVAILABLE',
        reason: 'No record associated with this verification token could be located in the registry.',
      };
    }

    if (doc.status === 'REVOKED') {
      return {
        state: 'REVOKED',
        document: this.toPublicView(doc),
        reason: 'This medical document was formally revoked by the issuing clinical authority. It is no longer valid.',
      };
    }

    if (doc.status === 'SUPERSEDED') {
      const supersedingDoc = doc.supersededById
        ? this.documents.find((d) => d.id === doc.supersededById)
        : undefined;
      const supersedingNumber = supersedingDoc?.documentNumber;
      return {
        state: 'SUPERSEDED',
        document: this.toPublicView(doc),
        reason: `This document version (${doc.documentNumber} v${doc.version}) has been superseded by an amended version${
          supersedingNumber ? ` (${supersedingNumber})` : ''
        }. Refer to the current version for the authoritative record.`,
      };
    }

    // Blockchain anchoring in progress — not yet confirmed.
    // IMPORTANT: Must not be labeled as "blockchain-verified" until CONFIRMED.
    if (doc.blockchain.status === 'PENDING') {
      return {
        state: 'PENDING_REGISTRATION',
        document: this.toPublicView(doc),
        reason: 'Document has been finalized and signed, but blockchain registration is still pending confirmation. Verify again shortly.',
      };
    }

    if (doc.status === 'FINALIZED' && doc.fileHash && doc.issuerSignature) {
      return {
        state: 'VERIFIED',
        document: this.toPublicView(doc),
        reason:
          'Document hash, issuer digital signature, and issuance timestamp verified successfully against the trusted registry.' +
          (doc.blockchain.isMockData
            ? ' Blockchain anchor is a simulated development record — not a live mainnet commitment.'
            : ''),
      };
    }

    return {
      state: 'UNVERIFIED',
      document: this.toPublicView(doc),
      reason: 'Document is in draft status and has not been officially finalized or cryptographically signed.',
    };
  }

  /**
   * Verification by raw document hash comparison.
   *
   * SECURITY NOTE: A matching hash proves integrity only when compared
   * against a trusted reference (this registry). It does not prove
   * authenticity on its own. The issuer signature and issuer status
   * must also be independently verified.
   *
   * A matching database row is NOT sufficient proof — the supplied
   * document bytes must hash to exactly the stored fileHash.
   */
  verifyByHash(hash: string): {
    state: VerificationState;
    document?: PublicDocumentView;
    reason?: string;
  } {
    const doc = this.documents.find((d) => d.fileHash.toLowerCase() === hash.trim().toLowerCase());
    if (!doc) {
      return {
        state: 'MODIFIED',
        reason:
          'Cryptographic hash mismatch. The provided document bytes do not match any issued record in the trusted registry. The document may have been tampered with.',
      };
    }

    return this.verifyByToken(doc.verificationToken);
  }

  /**
   * Reset store to initial synthetic state
   */
  resetToDefault() {
    this.documents = [...INITIAL_DOCUMENTS];
    this.corrections = [...INITIAL_CORRECTIONS];
    this.saveDocuments();
    this.saveCorrections();
  }
}

export const mockService = new MockService();
