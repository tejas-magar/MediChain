import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRole, AssociationStatus, DocumentCategory, DocumentStatus, AuditAction, CorrectionStatus } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { keystoreService } from './lib/keystore.js';
import { storageService } from './lib/storage.js';
import { recordAuditEvent } from './lib/audit.js';

export async function seedDatabase() {
  console.log('🌱 Cleaning up old data and seeding production-accurate clinical sample records into PostgreSQL...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Clean existing records in child tables
  await prisma.auditEvent.deleteMany({});
  await prisma.correctionRequest.deleteMany({});
  await prisma.prescriptionMedication.deleteMany({});
  await prisma.prescriptionDetails.deleteMany({});
  await prisma.labTestResult.deleteMany({});
  await prisma.labReportDetails.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.patientAssociation.deleteMany({});

  // Clean up all users except our primary 3 sample personas (and delete any non-sample users)
  const sampleEmails = [
    'aarav.sharma@example.in',
    'dr.rajesh.varma@aiims.edu.in',
    'reference.lab@lalpathlabs.com',
  ];
  await prisma.user.deleteMany({
    where: {
      email: { notIn: sampleEmails },
    },
  });

  // 2. Sample Patient: Aarav Sharma (ABHA ID)
  const patient = await prisma.user.upsert({
    where: { email: 'aarav.sharma@example.in' },
    update: {
      fullName: 'Aarav Sharma',
      mrn: 'ABHA-91-8841-1029',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'Male',
      bloodType: 'B+',
      allergies: ['Penicillin (Moderate rash)', 'Sulfa drugs (Hives)'],
      phone: '+91 98765 43210',
      passwordHash,
    },
    create: {
      id: 'p1111111-1111-4111-a111-111111111111',
      email: 'aarav.sharma@example.in',
      passwordHash,
      role: UserRole.PATIENT,
      fullName: 'Aarav Sharma',
      mrn: 'ABHA-91-8841-1029',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'Male',
      bloodType: 'B+',
      allergies: ['Penicillin (Moderate rash)', 'Sulfa drugs (Hives)'],
      phone: '+91 98765 43210',
    },
  });
  console.log(`✅ [User] Seeded Sample Patient: ${patient.fullName} (${patient.mrn})`);

  // 3. Sample Doctor: Dr. Rajesh Varma, MD, DM (AIIMS New Delhi)
  let doctorKey = keystoreService.getOrCreateIssuerKey('d2222222-2222-4222-a222-222222222222');
  const doctor = await prisma.user.upsert({
    where: { email: 'dr.rajesh.varma@aiims.edu.in' },
    update: {
      fullName: 'Dr. Rajesh Varma, MD, DM',
      licenseNumber: 'NMC-DL-2018-9412',
      organization: 'AIIMS New Delhi • Department of Cardiology',
      specialty: 'Cardiovascular Medicine & Interventional Cardiology',
      publicKeyPem: doctorKey.publicKeyPem,
      passwordHash,
    },
    create: {
      id: 'd2222222-2222-4222-a222-222222222222',
      email: 'dr.rajesh.varma@aiims.edu.in',
      passwordHash,
      role: UserRole.DOCTOR,
      fullName: 'Dr. Rajesh Varma, MD, DM',
      licenseNumber: 'NMC-DL-2018-9412',
      organization: 'AIIMS New Delhi • Department of Cardiology',
      specialty: 'Cardiovascular Medicine & Interventional Cardiology',
      publicKeyPem: doctorKey.publicKeyPem,
    },
  });
  keystoreService.saveIssuerKey(doctor.id, doctorKey.privateKeyPem);
  console.log(`✅ [User] Seeded Sample Doctor: ${doctor.fullName} (${doctor.licenseNumber})`);

  // 4. Sample Testing Lab: Dr. Lal PathLabs & Diagnostics
  let labKey = keystoreService.getOrCreateIssuerKey('l3333333-3333-4333-a333-333333333333');
  const lab = await prisma.user.upsert({
    where: { email: 'reference.lab@lalpathlabs.com' },
    update: {
      fullName: 'Dr. Lal PathLabs & Diagnostics',
      licenseNumber: 'NABL-MC-88910 (ICMR Certified)',
      organization: 'National Reference Laboratory, New Delhi',
      publicKeyPem: labKey.publicKeyPem,
      passwordHash,
    },
    create: {
      id: 'l3333333-3333-4333-a333-333333333333',
      email: 'reference.lab@lalpathlabs.com',
      passwordHash,
      role: UserRole.TESTING_LAB,
      fullName: 'Dr. Lal PathLabs & Diagnostics',
      licenseNumber: 'NABL-MC-88910 (ICMR Certified)',
      organization: 'National Reference Laboratory, New Delhi',
      publicKeyPem: labKey.publicKeyPem,
    },
  });
  keystoreService.saveIssuerKey(lab.id, labKey.privateKeyPem);
  console.log(`✅ [User] Seeded Sample Lab: ${lab.fullName} (${lab.licenseNumber})`);

  // 5. Clinical Associations (ABDM Consent)
  const doctorAssoc = await prisma.patientAssociation.upsert({
    where: {
      patientId_providerId: {
        patientId: patient.id,
        providerId: doctor.id,
      },
    },
    update: {
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date('2026-10-15T10:00:00Z'),
      purpose: JSON.stringify({
        scope: 'FULL_ACCESS',
        note: 'Cardiovascular care, ongoing hypertension monitoring & digital prescription orders',
        requestedAt: '2026-10-15T09:45:00Z',
        respondedAt: '2026-10-15T10:00:00Z',
      }),
    },
    create: {
      patientId: patient.id,
      providerId: doctor.id,
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date('2026-10-15T10:00:00Z'),
      purpose: JSON.stringify({
        scope: 'FULL_ACCESS',
        note: 'Cardiovascular care, ongoing hypertension monitoring & digital prescription orders',
        requestedAt: '2026-10-15T09:45:00Z',
        respondedAt: '2026-10-15T10:00:00Z',
      }),
    },
  });
  console.log(`✅ [PatientAssociation] Established Active Patient-Doctor Association (${doctorAssoc.id})`);

  const labAssoc = await prisma.patientAssociation.upsert({
    where: {
      patientId_providerId: {
        patientId: patient.id,
        providerId: lab.id,
      },
    },
    update: {
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date('2026-10-15T11:00:00Z'),
      purpose: JSON.stringify({
        scope: 'FULL_ACCESS',
        note: 'Diagnostic lipid and glycemic panel intake and official laboratory report issuance',
        requestedAt: '2026-10-15T10:30:00Z',
        respondedAt: '2026-10-15T11:00:00Z',
      }),
    },
    create: {
      patientId: patient.id,
      providerId: lab.id,
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date('2026-10-15T11:00:00Z'),
      purpose: JSON.stringify({
        scope: 'FULL_ACCESS',
        note: 'Diagnostic lipid and glycemic panel intake and official laboratory report issuance',
        requestedAt: '2026-10-15T10:30:00Z',
        respondedAt: '2026-10-15T11:00:00Z',
      }),
    },
  });
  console.log(`✅ [PatientAssociation] Established Active Patient-Lab Association (${labAssoc.id})`);

  // 6a. Superseded Initial Prescription: Antihypertensive Initial Regimen (RX-2026-0040)
  const initRxPayload = {
    schemaVersion: '1.0.0',
    documentNumber: 'RX-2026-0040',
    category: 'PRESCRIPTION',
    title: 'Antihypertensive Initial Regimen',
    status: 'SUPERSEDED',
    version: 1,
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      dateOfBirth: '1985-04-12',
      allergies: patient.allergies,
    },
    issuer: {
      id: doctor.id,
      fullName: doctor.fullName,
      role: 'DOCTOR',
      organization: doctor.organization,
      licenseNumber: doctor.licenseNumber,
    },
    clinicalData: {
      diagnosis: 'Primary Essential Hypertension (ICD-10 I10)',
      icdCode: 'I10',
      treatmentPlan: 'Initial trial of Telmisartan 20 mg daily with monitoring.',
      allergiesAcknowledged: true,
      dispenseAsWritten: false,
      medications: [
        {
          name: 'Telmisartan',
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
    issuedAt: '2026-09-01T10:00:00Z',
  };

  const initRxCanonical = keystoreService.canonicalizeDocument(initRxPayload);
  const initRxFileHash = keystoreService.computeSha256(initRxCanonical);
  const { signature: initRxSignature } = keystoreService.signCanonicalBytes(doctor.id, initRxCanonical);
  const initRxStorage = await storageService.storeFile(initRxCanonical, 'application/json');

  const initRxDoc = await prisma.document.create({
    data: {
      documentNumber: 'RX-2026-0040',
      category: DocumentCategory.PRESCRIPTION,
      title: 'Antihypertensive Initial Regimen',
      description: 'Initial preliminary clinical prescription prior to dosage titration.',
      status: DocumentStatus.SUPERSEDED,
      version: 1,
      patientId: patient.id,
      issuerId: doctor.id,
      fileHash: initRxFileHash,
      issuerSignature: initRxSignature,
      verificationToken: 'tok_rx_8840_01_a7f9c2e4',
      clinicalData: initRxPayload.clinicalData as any,
      fileStoragePath: initRxStorage.storagePath,
      mimeType: 'application/json',
      fileSizeBytes: initRxStorage.fileSizeBytes,
      issuedAt: new Date('2026-09-01T10:00:00Z'),
      prescriptionDetails: {
        create: {
          diagnosis: initRxPayload.clinicalData.diagnosis,
          icdCode: initRxPayload.clinicalData.icdCode,
          treatmentPlan: initRxPayload.clinicalData.treatmentPlan,
          allergiesAcknowledged: true,
          dispenseAsWritten: false,
          medications: {
            create: initRxPayload.clinicalData.medications.map((m) => ({
              name: m.name,
              strength: m.strength,
              dosageForm: m.dosageForm,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
              refills: m.refills,
              instructions: m.instructions,
            })),
          },
        },
      },
      versions: {
        create: {
          versionNumber: 1,
          title: 'Antihypertensive Initial Regimen',
          clinicalData: initRxPayload.clinicalData as any,
          issuerId: doctor.id,
          fileHash: initRxFileHash,
          issuerSignature: initRxSignature,
          fileStoragePath: initRxStorage.storagePath,
          amendmentReason: 'Initial verified clinical prescription',
          finalizedAt: new Date('2026-09-01T10:00:00Z'),
        },
      },
    },
  });
  console.log(`✅ [Document] Seeded Superseded Prescription: ${initRxDoc.title} (${initRxDoc.documentNumber})`);

  // 6b. Active Prescription: Antihypertensive Titrated Maintenance Regimen
  const rxPayload = {
    schemaVersion: '1.0.0',
    documentNumber: 'RX-2026-0041',
    category: 'PRESCRIPTION',
    title: 'Antihypertensive Titrated Maintenance Regimen',
    status: 'FINALIZED',
    version: 1,
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      dateOfBirth: '1985-04-12',
      allergies: patient.allergies,
    },
    issuer: {
      id: doctor.id,
      fullName: doctor.fullName,
      role: 'DOCTOR',
      organization: doctor.organization,
      licenseNumber: doctor.licenseNumber,
    },
    clinicalData: {
      diagnosis: 'Primary Essential Hypertension (ICD-10 I10)',
      icdCode: 'I10',
      treatmentPlan: 'Take Telmisartan and Hydrochlorothiazide once daily with breakfast. Record home blood pressure twice weekly.',
      allergiesAcknowledged: true,
      dispenseAsWritten: false,
      medications: [
        {
          name: 'Telmisartan',
          strength: '40 mg',
          dosageForm: 'Tablet',
          frequency: 'Once daily with food',
          duration: '30 days',
          quantity: '30 tablets',
          refills: 1,
          instructions: 'Take 1 tablet in the morning after breakfast.',
        },
        {
          name: 'Hydrochlorothiazide',
          strength: '12.5 mg',
          dosageForm: 'Tablet',
          frequency: 'Once daily in the morning',
          duration: '30 days',
          quantity: '30 tablets',
          refills: 1,
          instructions: 'Take 1 tablet in the morning with water.',
        },
      ],
    },
    issuedAt: '2026-10-14T10:00:00Z',
  };

  const rxCanonical = keystoreService.canonicalizeDocument(rxPayload);
  const rxFileHash = keystoreService.computeSha256(rxCanonical);
  const { signature: rxSignature } = keystoreService.signCanonicalBytes(doctor.id, rxCanonical);
  const rxStorage = await storageService.storeFile(rxCanonical, 'application/json');

  const rxDoc = await prisma.document.create({
    data: {
      documentNumber: 'RX-2026-0041',
      category: DocumentCategory.PRESCRIPTION,
      title: 'Antihypertensive Titrated Maintenance Regimen',
      description: 'Official clinical prescription for blood pressure control and cardiovascular protection.',
      status: DocumentStatus.FINALIZED,
      version: 1,
      patientId: patient.id,
      issuerId: doctor.id,
      parentDocumentId: initRxDoc.id,
      amendmentReason: 'Dosage titration of Telmisartan and addition of Hydrochlorothiazide for blood pressure control.',
      fileHash: rxFileHash,
      issuerSignature: rxSignature,
      verificationToken: 'tok_rx_8841_01_c8d194ae',
      clinicalData: rxPayload.clinicalData as any,
      fileStoragePath: rxStorage.storagePath,
      mimeType: 'application/json',
      fileSizeBytes: rxStorage.fileSizeBytes,
      issuedAt: new Date('2026-10-14T10:00:00Z'),
      prescriptionDetails: {
        create: {
          diagnosis: rxPayload.clinicalData.diagnosis,
          icdCode: rxPayload.clinicalData.icdCode,
          treatmentPlan: rxPayload.clinicalData.treatmentPlan,
          allergiesAcknowledged: true,
          dispenseAsWritten: false,
          medications: {
            create: rxPayload.clinicalData.medications.map((m) => ({
              name: m.name,
              strength: m.strength,
              dosageForm: m.dosageForm,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
              refills: m.refills,
              instructions: m.instructions,
            })),
          },
        },
      },
      versions: {
        create: {
          versionNumber: 1,
          title: 'Antihypertensive Titrated Maintenance Regimen',
          clinicalData: rxPayload.clinicalData as any,
          issuerId: doctor.id,
          fileHash: rxFileHash,
          issuerSignature: rxSignature,
          fileStoragePath: rxStorage.storagePath,
          amendmentReason: 'Initial verified clinical prescription',
          finalizedAt: new Date('2026-10-14T10:00:00Z'),
        },
      },
    },
  });
  console.log(`✅ [Document] Seeded Prescription: ${rxDoc.title} (${rxDoc.documentNumber})`);

  await recordAuditEvent({
    documentId: rxDoc.id,
    action: AuditAction.DOCUMENT_FINALIZED,
    actorId: doctor.id,
    actorRole: UserRole.DOCTOR,
    details: {
      documentNumber: rxDoc.documentNumber,
      fileHash: rxFileHash,
      verificationToken: rxDoc.verificationToken,
    },
  });

  // 7. Sample Lab Report: Comprehensive Metabolic Panel (CMP-14)
  const labPayload = {
    schemaVersion: '1.0.0',
    documentNumber: 'LAB-2026-0081',
    category: 'LAB_REPORT',
    title: 'Comprehensive Metabolic Panel (CMP-14)',
    status: 'FINALIZED',
    version: 1,
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      dateOfBirth: '1985-04-12',
    },
    issuer: {
      id: lab.id,
      fullName: lab.fullName,
      role: 'TESTING_LAB',
      organization: lab.organization,
      licenseNumber: lab.licenseNumber,
    },
    clinicalData: {
      testCategory: 'Chemistry',
      specimenType: 'Serum / Venous Blood',
      collectionTimestamp: '2026-10-14T09:15:00Z',
      fastingStatus: 'Fasting (12 hrs)',
      technologistRemarks: 'Specimen clear, non-hemolyzed. Calibrated on Roche Cobas 6000 (NABL Standard).',
      clinicalSignificance: 'Normal glycemic and electrolyte profile. Renal markers within reference parameters.',
      results: [
        { parameterName: 'Glucose, Fasting', value: '92', unit: 'mg/dL', referenceRange: '70 - 99 mg/dL', flag: 'NORMAL' },
        { parameterName: 'Serum Creatinine', value: '0.91', unit: 'mg/dL', referenceRange: '0.55 - 1.02 mg/dL', flag: 'NORMAL' },
        { parameterName: 'Blood Urea Nitrogen (BUN)', value: '14', unit: 'mg/dL', referenceRange: '7 - 20 mg/dL', flag: 'NORMAL' },
        { parameterName: 'eGFR (Estimated GFR)', value: '98', unit: 'mL/min/1.73m2', referenceRange: '> 60 mL/min/1.73m2', flag: 'NORMAL' },
        { parameterName: 'Serum Sodium', value: '140', unit: 'mEq/L', referenceRange: '136 - 145 mEq/L', flag: 'NORMAL' },
        { parameterName: 'Serum Potassium', value: '4.2', unit: 'mEq/L', referenceRange: '3.5 - 5.1 mEq/L', flag: 'NORMAL' },
      ],
    },
    issuedAt: '2026-10-14T11:45:00Z',
  };

  const labCanonical = keystoreService.canonicalizeDocument(labPayload);
  const labFileHash = keystoreService.computeSha256(labCanonical);
  const { signature: labSignature } = keystoreService.signCanonicalBytes(lab.id, labCanonical);
  const labStorage = await storageService.storeFile(labCanonical, 'application/json');

  const labDoc = await prisma.document.create({
    data: {
      documentNumber: 'LAB-2026-0081',
      category: DocumentCategory.LAB_REPORT,
      title: 'Comprehensive Metabolic Panel (CMP-14)',
      description: 'Diagnostic serum biochemical panel including renal, hepatic, and electrolyte evaluations.',
      status: DocumentStatus.FINALIZED,
      version: 1,
      patientId: patient.id,
      issuerId: lab.id,
      fileHash: labFileHash,
      issuerSignature: labSignature,
      verificationToken: 'tok_lab_8881_01_f7b2a991',
      clinicalData: labPayload.clinicalData as any,
      fileStoragePath: labStorage.storagePath,
      mimeType: 'application/json',
      fileSizeBytes: labStorage.fileSizeBytes,
      issuedAt: new Date('2026-10-14T11:45:00Z'),
      labReportDetails: {
        create: {
          testCategory: labPayload.clinicalData.testCategory,
          specimenType: labPayload.clinicalData.specimenType,
          collectionTimestamp: new Date(labPayload.clinicalData.collectionTimestamp),
          fastingStatus: labPayload.clinicalData.fastingStatus,
          technologistRemarks: labPayload.clinicalData.technologistRemarks,
          clinicalSignificance: labPayload.clinicalData.clinicalSignificance,
          results: {
            create: labPayload.clinicalData.results.map((r) => ({
              parameterName: r.parameterName,
              value: r.value,
              unit: r.unit,
              referenceRange: r.referenceRange,
              flag: r.flag as any,
            })),
          },
        },
      },
      versions: {
        create: {
          versionNumber: 1,
          title: 'Comprehensive Metabolic Panel (CMP-14)',
          clinicalData: labPayload.clinicalData as any,
          issuerId: lab.id,
          fileHash: labFileHash,
          issuerSignature: labSignature,
          fileStoragePath: labStorage.storagePath,
          amendmentReason: 'Initial certified laboratory report',
          finalizedAt: new Date('2026-10-14T11:45:00Z'),
        },
      },
    },
  });
  console.log(`✅ [Document] Seeded Lab Report: ${labDoc.title} (${labDoc.documentNumber})`);

  await recordAuditEvent({
    documentId: labDoc.id,
    action: AuditAction.DOCUMENT_FINALIZED,
    actorId: lab.id,
    actorRole: UserRole.TESTING_LAB,
    details: {
      documentNumber: labDoc.documentNumber,
      fileHash: labFileHash,
      verificationToken: labDoc.verificationToken,
    },
  });

  // 8. Sample Correction Request
  const correction = await prisma.correctionRequest.create({
    data: {
      documentId: rxDoc.id,
      patientId: patient.id,
      requestedChanges: 'Confirm refill authorization for upcoming business travel.',
      reason: 'Need to ensure 60-day supply is documented on prescription before traveling.',
      status: CorrectionStatus.PENDING_REVIEW,
    },
  });
  console.log(`✅ [CorrectionRequest] Seeded Correction Request (${correction.id})`);

  console.log('🎉 Production-accurate database seeding completed! All tables successfully populated.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

