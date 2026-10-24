/**
 * ==============================================================================
 * MediLedger - Synthetic Data & Mock Store
 * ------------------------------------------------------------------------------
 * Production-accurate single sample personas:
 * 1. Sample Patient: Aarav Sharma (ABHA-91-8841-1029)
 * 2. Sample Doctor: Dr. Rajesh Varma, MD, DM (NMC-DL-2018-9412)
 * 3. Sample Laboratory: Dr. Lal PathLabs & Diagnostics (NABL-MC-88910)
 * All other profiles and documents removed to maintain strict database parity.
 * ==============================================================================
 */

import { PatientProfile, MedicalDocument, CorrectionRequest, ConsentRequest } from '../types';

export const MOCK_PATIENTS: PatientProfile[] = [
  {
    id: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    mrn: 'ABHA-91-8841-1029',
    fullName: 'Aarav Sharma',
    dateOfBirth: '1985-06-14',
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@example.in',
    bloodType: 'B positive (B+)',
    allergies: ['Penicillin (Moderate rash)', 'Sulfa drugs (Hives)'],
  },
];

export const MOCK_DOCTOR = {
  id: 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c',
  fullName: 'Dr. Rajesh Varma, MD, DM',
  specialty: 'Cardiovascular Medicine & Interventional Cardiology',
  licenseNumber: 'NMC-DL-2018-9412',
  organization: 'AIIMS New Delhi • Department of Cardiology',
  email: 'dr.rajesh.varma@aiims.edu.in',
};

export const MOCK_TESTING_LAB = {
  id: 'b76d8afd-971d-47f1-ab77-333954275ada',
  fullName: 'Dr. Lal PathLabs & Diagnostics',
  director: 'Dr. Vandana Lal, MD (Pathology)',
  licenseNumber: 'NABL-MC-88910 (ICMR Certified)',
  organization: 'National Reference Laboratory, New Delhi',
  email: 'reference.lab@lalpathlabs.com',
};

export const INITIAL_DOCUMENTS: MedicalDocument[] = [
  // 0. Antihypertensive Initial Regimen (Superseded by RX-2026-0041)
  {
    id: 'DOC-RX-000',
    documentNumber: 'RX-2026-0040',
    category: 'PRESCRIPTION',
    title: 'Antihypertensive Initial Regimen',
    status: 'SUPERSEDED',
    version: 1,
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    patientMrn: 'ABHA-91-8841-1029',
    issuerId: 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c',
    issuerName: 'Dr. Rajesh Varma, MD, DM',
    issuerRole: 'DOCTOR',
    issuerOrg: 'AIIMS New Delhi • Department of Cardiology',
    issuerLicense: 'NMC-DL-2018-9412',
    supersededById: 'DOC-RX-001',
    versionHistory: [
      {
        version: 1,
        documentId: 'DOC-RX-000',
        documentNumber: 'RX-2026-0040',
        timestamp: '2026-09-01T10:00:00Z',
        author: 'Dr. Rajesh Varma, MD, DM',
        reason: 'Initial preliminary prescription prior to dosage titration',
      },
    ],
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    issuerSignature: 'RSA-PSS-SHA256:superseded_sample_sig',
    verificationToken: 'tok_rx_8840_01_a7f9c2e4',
    qrCodeUrl: 'http://localhost:5173/verify/tok_rx_8840_01_a7f9c2e4',
    clinicalData: {
      diagnosis: 'Primary Essential Hypertension (ICD-10 I10)',
      icdCode: 'I10',
      treatmentPlan: 'Initial trial of Telmisartan 20 mg daily.',
      dispenseAsWritten: false,
      patientAllergiesAcknowledged: true,
      medications: [
        {
          id: 'med-0',
          medicationName: 'Telmisartan 20 mg',
          strength: '20 mg',
          dosageForm: 'Tablet',
          frequency: 'Once daily with food',
          duration: '14 days',
          quantity: '14 tablets',
          refills: 0,
          instructions: 'Take 1 tablet in the morning after breakfast.',
        },
      ],
    },
    blockchain: {
      status: 'CONFIRMED',
      txHash: '0x99887766554433221100aabbccddeeff00112233445566778899aabbccddeeff',
      blockNumber: 1984400,
      timestamp: '2026-09-01T10:05:00Z',
      ledgerNetwork: 'Local Hardhat Node',
      isMockData: true,
      notes: 'Initial record commitment (superseded).',
    },
    issuedAt: '2026-09-01T10:00:00Z',
    createdAt: '2026-09-01T09:30:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },

  // 1. Antihypertensive Titrated Maintenance Regimen
  {
    id: 'DOC-RX-001',
    documentNumber: 'RX-2026-0041',
    category: 'PRESCRIPTION',
    title: 'Antihypertensive Titrated Maintenance Regimen',
    status: 'FINALIZED',
    version: 1,
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    patientMrn: 'ABHA-91-8841-1029',
    issuerId: 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c',
    issuerName: 'Dr. Rajesh Varma, MD, DM',
    issuerRole: 'DOCTOR',
    issuerOrg: 'AIIMS New Delhi • Department of Cardiology',
    issuerLicense: 'NMC-DL-2018-9412',
    versionHistory: [
      {
        version: 1,
        documentId: 'DOC-RX-001',
        documentNumber: 'RX-2026-0041',
        timestamp: '2026-10-14T10:00:00Z',
        author: 'Dr. Rajesh Varma, MD, DM',
        reason: 'Initial verified clinical prescription',
      },
    ],
    fileHash: 'b080a5eedf181a52dc4ca62b7060d378bf77cccbe93e3eb1cf8ae1092227df97',
    issuerSignature: 'RSA-PSS-SHA256:7b12c89e02f...dr_varma_signature',
    verificationToken: 'tok_rx_8841_01_c8d194ae',
    qrCodeUrl: 'http://localhost:5173/verify/tok_rx_8841_01_c8d194ae',
    clinicalData: {
      diagnosis: 'Primary Essential Hypertension (ICD-10 I10)',
      icdCode: 'I10',
      treatmentPlan: 'Take Telmisartan and Hydrochlorothiazide once daily with breakfast. Record home blood pressure twice weekly.',
      medications: [
        {
          id: 'med-1',
          medicationName: 'Telmisartan 40 mg',
          strength: '40 mg',
          dosageForm: 'Tablet',
          frequency: 'Once daily with food',
          duration: '30 days',
          quantity: '30 tablets',
          refills: 1,
          instructions: 'Take 1 tablet in the morning after breakfast.',
        },
        {
          id: 'med-2',
          medicationName: 'Hydrochlorothiazide 12.5 mg',
          strength: '12.5 mg',
          dosageForm: 'Tablet',
          frequency: 'Once daily in the morning',
          duration: '30 days',
          quantity: '30 tablets',
          refills: 1,
          instructions: 'Take 1 tablet in the morning with water.',
        },
      ],
      dispenseAsWritten: false,
      patientAllergiesAcknowledged: true,
    },
    blockchain: {
      status: 'CONFIRMED',
      txHash: '0x9924a87b1c34ef56d81992039401bfd9472619bbac7381900234ac87451290fa',
      blockNumber: 1984550,
      timestamp: '2026-10-14T10:02:00Z',
      ledgerNetwork: 'Local Hardhat Node',
      isMockData: true,
      notes: 'Record commitment anchored with digital signature.',
    },
    issuedAt: '2026-10-14T10:00:00Z',
    createdAt: '2026-10-14T09:45:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },

  // 2. Comprehensive Metabolic Panel (CMP-14)
  {
    id: 'DOC-LAB-001',
    documentNumber: 'LAB-2026-0081',
    category: 'LAB_REPORT',
    title: 'Comprehensive Metabolic Panel (CMP-14)',
    status: 'FINALIZED',
    version: 1,
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    patientMrn: 'ABHA-91-8841-1029',
    issuerId: 'b76d8afd-971d-47f1-ab77-333954275ada',
    issuerName: 'Dr. Lal PathLabs & Diagnostics',
    issuerRole: 'TESTING_LAB',
    issuerOrg: 'National Reference Laboratory, New Delhi',
    issuerLicense: 'NABL-MC-88910 (ICMR Certified)',
    versionHistory: [
      {
        version: 1,
        documentId: 'DOC-LAB-001',
        documentNumber: 'LAB-2026-0081',
        timestamp: '2026-10-14T11:45:00Z',
        author: 'Dr. Vandana Lal, MD (Pathology)',
        reason: 'Initial certified laboratory report',
      },
    ],
    fileHash: '6d418290ab48123ecba90184712bbef491028347102934810293481203948192',
    issuerSignature: 'RSA-PSS-SHA256:12c48190abf...lalpathlabs_signature',
    verificationToken: 'tok_lab_0081_01_e182bd92',
    qrCodeUrl: 'http://localhost:5173/verify/tok_lab_0081_01_e182bd92',
    clinicalData: {
      testCategory: 'Comprehensive Metabolic Panel',
      specimenType: 'Serum / Venous Blood',
      collectionTimestamp: '2026-10-14T08:15:00Z',
      fastingStatus: 'Fasting (12 hrs)',
      results: [
        { id: 'res-1', parameterName: 'Glucose, Fasting', value: '94', unit: 'mg/dL', referenceRange: '70 - 99 mg/dL', flag: 'NORMAL' },
        { id: 'res-2', parameterName: 'Creatinine, Serum', value: '0.98', unit: 'mg/dL', referenceRange: '0.70 - 1.30 mg/dL', flag: 'NORMAL' },
        { id: 'res-3', parameterName: 'Blood Urea Nitrogen (BUN)', value: '14', unit: 'mg/dL', referenceRange: '7 - 20 mg/dL', flag: 'NORMAL' },
        { id: 'res-4', parameterName: 'eGFR (CKD-EPI)', value: '104', unit: 'mL/min/1.73m²', referenceRange: '> 90 mL/min/1.73m²', flag: 'NORMAL' },
        { id: 'res-5', parameterName: 'Sodium', value: '141', unit: 'mEq/L', referenceRange: '136 - 145 mEq/L', flag: 'NORMAL' },
        { id: 'res-6', parameterName: 'Potassium', value: '4.4', unit: 'mEq/L', referenceRange: '3.5 - 5.1 mEq/L', flag: 'NORMAL' },
      ],
      technologistRemarks: 'Automated clinical chemistry assay calibrated to NIST standards.',
      clinicalSignificance: 'Normal renal and metabolic panel. Electrolytes within target physiological ranges.',
    },
    blockchain: {
      status: 'CONFIRMED',
      txHash: '0x11223344556677889900aabbccddeeff00112233445566778899aabbccddeeff',
      blockNumber: 1984420,
      timestamp: '2026-10-14T11:47:00Z',
      ledgerNetwork: 'Local Hardhat Node',
      isMockData: true,
      notes: 'Record commitment anchored with digital signature.',
    },
    issuedAt: '2026-10-14T11:45:00Z',
    createdAt: '2026-10-14T09:15:00Z',
    updatedAt: '2026-10-14T11:45:00Z',
  },
];

export const INITIAL_CORRECTIONS: CorrectionRequest[] = [
  {
    id: 'CORR-2026-001',
    documentId: 'DOC-RX-001',
    documentNumber: 'RX-2026-0041',
    documentTitle: 'Antihypertensive Titrated Maintenance Regimen',
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    requestedChanges: 'Requesting dosage review due to persistent lightheadedness after morning dose.',
    reason: 'Adverse side-effect: morning dizziness when standing quickly.',
    status: 'PENDING_REVIEW',
    createdAt: '2026-10-15T10:15:00Z',
  },
];

export const INITIAL_CONSENT_REQUESTS: ConsentRequest[] = [
  {
    id: 'req-c-101',
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    patientMrn: 'ABHA-91-8841-1029',
    providerId: 'bff9888f-fb3d-4b5c-a22b-c7a313763f0c',
    providerName: 'Dr. Rajesh Varma, MD, DM',
    providerRole: 'DOCTOR',
    providerOrg: 'AIIMS New Delhi • Department of Cardiology',
    providerLicense: 'NMC-DL-2018-9412',
    status: 'ACTIVE',
    scope: 'FULL_ACCESS',
    purpose: 'Cardiovascular checkup, ongoing hypertension monitoring & digital prescription orders',
    requestedAt: '2026-10-14T09:00:00Z',
    respondedAt: '2026-10-14T09:15:00Z',
  },
  {
    id: 'req-c-102',
    patientId: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
    patientName: 'Aarav Sharma',
    patientMrn: 'ABHA-91-8841-1029',
    providerId: 'b76d8afd-971d-47f1-ab77-333954275ada',
    providerName: 'Dr. Lal PathLabs & Diagnostics',
    providerRole: 'TESTING_LAB',
    providerOrg: 'National Reference Laboratory, New Delhi',
    providerLicense: 'NABL-MC-88910 (ICMR Certified)',
    status: 'ACTIVE',
    scope: 'FULL_ACCESS',
    purpose: 'Diagnostic metabolic panel and official laboratory report issuance',
    requestedAt: '2026-10-14T09:00:00Z',
    respondedAt: '2026-10-14T09:15:00Z',
  },
];
