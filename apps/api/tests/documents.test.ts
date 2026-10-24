import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Phase 5 — Medical Folders, Document Issuance & Verification Integration Tests', () => {
  const patientAData = {
    email: `patientA_${Date.now()}@example.com`,
    password: 'PatientPassword123!',
    role: 'PATIENT',
    fullName: 'Alice Johnson',
    mrn: `MRN-ALICE-${Date.now().toString().slice(-4)}`,
    dateOfBirth: '1990-05-15',
    phone: '+1-555-1001',
  };

  const patientBData = {
    email: `patientB_${Date.now()}@example.com`,
    password: 'PatientPassword123!',
    role: 'PATIENT',
    fullName: 'Bob Smith',
    mrn: `MRN-BOB-${Date.now().toString().slice(-4)}`,
    dateOfBirth: '1988-11-20',
    phone: '+1-555-1002',
  };

  const doctor1Data = {
    email: `doctor1_${Date.now()}@example.com`,
    password: 'DocPassword123!',
    role: 'DOCTOR',
    fullName: 'Dr. Gregory House',
    licenseNumber: `MD-LIC-${Date.now().toString().slice(-4)}`,
    organization: 'Princeton-Plainsboro Clinical Care',
  };

  const doctor2Data = {
    email: `doctor2_${Date.now()}@example.com`,
    password: 'DocPassword123!',
    role: 'DOCTOR',
    fullName: 'Dr. Allison Cameron',
    licenseNumber: `MD-CAM-${Date.now().toString().slice(-4)}`,
    organization: 'Independent Clinic',
  };

  const lab1Data = {
    email: `lab1_${Date.now()}@example.com`,
    password: 'LabPassword123!',
    role: 'TESTING_LAB',
    fullName: 'BioCore Diagnostics',
    licenseNumber: `CLIA-${Date.now().toString().slice(-4)}`,
    organization: 'BioCore Diagnostic Laboratories',
  };

  let patientAId: string;
  let patientBId: string;
  let doctor1Id: string;
  let doctor2Id: string;
  let lab1Id: string;

  let patientACookie: string;
  let patientBCookie: string;
  let doctor1Cookie: string;
  let doctor2Cookie: string;
  let lab1Cookie: string;

  let issuedPrescriptionId: string;
  let issuedLabReportId: string;
  let verificationToken: string;

  beforeAll(async () => {
    // 1. Register Patient A
    const resA = await request(app).post('/api/auth/register').send(patientAData);
    expect(resA.status).toBe(201);
    patientAId = resA.body.user.id;
    patientACookie = (resA.headers['set-cookie'] as unknown as string[])[0]!;

    // 2. Register Patient B
    const resB = await request(app).post('/api/auth/register').send(patientBData);
    expect(resB.status).toBe(201);
    patientBId = resB.body.user.id;
    patientBCookie = (resB.headers['set-cookie'] as unknown as string[])[0]!;

    // 3. Register Doctor 1
    const resDoc1 = await request(app).post('/api/auth/register').send(doctor1Data);
    expect(resDoc1.status).toBe(201);
    doctor1Id = resDoc1.body.user.id;
    doctor1Cookie = (resDoc1.headers['set-cookie'] as unknown as string[])[0]!;

    // 4. Register Doctor 2 (wrong issuer)
    const resDoc2 = await request(app).post('/api/auth/register').send(doctor2Data);
    expect(resDoc2.status).toBe(201);
    doctor2Id = resDoc2.body.user.id;
    doctor2Cookie = (resDoc2.headers['set-cookie'] as unknown as string[])[0]!;

    // 5. Register Lab 1
    const resLab1 = await request(app).post('/api/auth/register').send(lab1Data);
    expect(resLab1.status).toBe(201);
    lab1Id = resLab1.body.user.id;
    lab1Cookie = (resLab1.headers['set-cookie'] as unknown as string[])[0]!;
  });

  afterAll(async () => {
    // Cleanup created test records
    const testDocIds = [issuedPrescriptionId, issuedLabReportId].filter(Boolean);
    const testUserIds = [patientAId, patientBId, doctor1Id, doctor2Id, lab1Id].filter(Boolean);

    await prisma.correctionRequest.deleteMany({
      where: { documentId: { in: testDocIds } },
    });
    await prisma.documentVersion.deleteMany({
      where: { documentId: { in: testDocIds } },
    });
    await prisma.prescriptionDetails.deleteMany({
      where: { documentId: { in: testDocIds } },
    });
    await prisma.labReportDetails.deleteMany({
      where: { documentId: { in: testDocIds } },
    });
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { documentId: { in: testDocIds } },
          { actorId: { in: testUserIds } },
        ],
      },
    });
    await prisma.document.deleteMany({
      where: { id: { in: testDocIds } },
    });
    await prisma.patientAssociation.deleteMany({
      where: {
        OR: [
          { patientId: { in: [patientAId, patientBId].filter(Boolean) } },
          { providerId: { in: [doctor1Id, doctor2Id, lab1Id].filter(Boolean) } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: testUserIds },
      },
    });
    await prisma.$disconnect();
  });

  describe('Requirement: Secure Patient Lookup & Association Workflow', () => {
    it('rejects patient lookup by name alone (requires exact MRN + secondary identifier)', async () => {
      const res = await request(app)
        .post('/api/associations/lookup')
        .set('Cookie', doctor1Cookie)
        .send({
          fullName: 'Alice Johnson',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('successfully finds patient with exact MRN and confirmed Date of Birth', async () => {
      const res = await request(app)
        .post('/api/associations/lookup')
        .set('Cookie', doctor1Cookie)
        .send({
          mrn: patientAData.mrn,
          dateOfBirth: patientAData.dateOfBirth,
        });

      expect(res.status).toBe(200);
      expect(res.body.patient).toHaveProperty('id', patientAId);
      expect(res.body.patient).toHaveProperty('fullName', patientAData.fullName);
      expect(res.body.patient).toHaveProperty('mrn', patientAData.mrn);
    });

    it('rejects document issuance before active association is established (403 ASSOCIATION_REQUIRED)', async () => {
      const res = await request(app)
        .post('/api/documents/prescriptions/finalize')
        .set('Cookie', doctor1Cookie)
        .send({
          patientId: patientAId,
          title: 'Unassociated Prescription',
          clinicalIndication: 'Asthma flare',
          medications: [
            {
              name: 'Albuterol Inhaler',
              dosage: '90mcg',
              frequency: 'Every 4-6 hours as needed',
              duration: '30 days',
            },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'ASSOCIATION_REQUIRED');
    });

    it('establishes active association between Doctor 1 and Patient A', async () => {
      const res = await request(app)
        .post('/api/associations')
        .set('Cookie', doctor1Cookie)
        .send({
          patientId: patientAId,
          purpose: 'Outpatient clinical consultations and prescriptions',
        });

      expect(res.status).toBe(201);
      expect(res.body.association).toHaveProperty('status', 'ACTIVE');
      expect(res.body.association.patientId).toBe(patientAId);
      expect(res.body.association.providerId).toBe(doctor1Id);
    });

    it('establishes active association between Lab 1 and Patient A', async () => {
      const res = await request(app)
        .post('/api/associations')
        .set('Cookie', lab1Cookie)
        .send({
          patientId: patientAId,
          purpose: 'Diagnostic pathology and panel reporting',
        });

      expect(res.status).toBe(201);
      expect(res.body.association).toHaveProperty('status', 'ACTIVE');
    });
  });

  describe('Test 1: Doctor can issue a prescription', () => {
    it('successfully issues, signs, and finalizes a prescription', async () => {
      const payload = {
        patientId: patientAId,
        title: 'Prescription: Acute Bacterial Bronchitis',
        clinicalIndication: 'Productive purulent cough with rhonchi',
        medications: [
          {
            name: 'Amoxicillin-Clavulanate',
            dosage: '875/125 mg',
            frequency: 'Twice daily with meals',
            duration: '7 days',
            instructions: 'Complete full antibiotic course',
            refills: 0,
          },
          {
            name: 'Benzonatate',
            dosage: '100 mg',
            frequency: 'Three times daily as needed',
            duration: '5 days',
            instructions: 'Swallow whole with water',
            refills: 0,
          },
        ],
        notes: 'Follow up in 10 days if symptoms persist.',
      };

      // Test preview endpoint first
      const previewRes = await request(app)
        .post('/api/documents/prescriptions/preview')
        .set('Cookie', doctor1Cookie)
        .send(payload);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.preview).toHaveProperty('fileHash');
      expect(previewRes.body.preview).toHaveProperty('canonicalBytesHex');

      // Finalize prescription
      const res = await request(app)
        .post('/api/documents/prescriptions/finalize')
        .set('Cookie', doctor1Cookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('document');
      const doc = res.body.document;

      expect(doc.documentNumber).toMatch(/^RX-\d{4}-\d+/);
      expect(doc.status).toBe('FINALIZED');
      expect(doc.version).toBe(1);
      expect(doc.fileHash).toHaveLength(64); // SHA-256 hex digest
      expect(doc.issuerSignature).toBeDefined();
      expect(doc.verificationToken).toMatch(/^tok_rx_/);
      expect(doc.fileStoragePath).toBeDefined();

      issuedPrescriptionId = doc.id;
      verificationToken = doc.verificationToken;

      // Verify public zero-knowledge verification endpoint
      const verifyRes = await request(app).get(`/api/verify/${verificationToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verification).toHaveProperty('documentNumber', doc.documentNumber);
      expect(verifyRes.body.verification).toHaveProperty('category', 'PRESCRIPTION');
      expect(verifyRes.body.verification).toHaveProperty('fileHash', doc.fileHash);
      expect(verifyRes.body.verification).toHaveProperty('signatureVerified', true);
      // Ensure zero-knowledge: NO clinical or private patient details exposed
      expect(verifyRes.body.verification).not.toHaveProperty('clinicalData');
      expect(verifyRes.body.verification).not.toHaveProperty('medications');
      expect(verifyRes.body.verification).not.toHaveProperty('patient');
    });
  });

  describe('Test 2: Lab can issue a report', () => {
    it('successfully issues, signs, and finalizes a diagnostic lab report', async () => {
      const payload = {
        patientId: patientAId,
        title: 'Comprehensive Metabolic Panel (CMP)',
        specimen: 'Serum',
        collectionDate: '2026-10-24T08:30:00Z',
        results: [
          {
            testName: 'Fasting Plasma Glucose',
            value: '92',
            unit: 'mg/dL',
            referenceRange: '70-99',
            flag: 'NORMAL',
          },
          {
            testName: 'Serum Creatinine',
            value: '0.9',
            unit: 'mg/dL',
            referenceRange: '0.6-1.2',
            flag: 'NORMAL',
          },
          {
            testName: 'Potassium',
            value: '4.2',
            unit: 'mEq/L',
            referenceRange: '3.5-5.0',
            flag: 'NORMAL',
          },
        ],
        interpretation: 'Metabolic markers within normal clinical reference intervals.',
      };

      const res = await request(app)
        .post('/api/documents/lab-reports/finalize')
        .set('Cookie', lab1Cookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('document');
      const doc = res.body.document;

      expect(doc.documentNumber).toMatch(/^LAB-\d{4}-\d+/);
      expect(doc.status).toBe('FINALIZED');
      expect(doc.version).toBe(1);
      expect(doc.fileHash).toHaveLength(64);
      expect(doc.issuerSignature).toBeDefined();
      expect(doc.verificationToken).toMatch(/^tok_lab_/);

      issuedLabReportId = doc.id;
    });
  });

  describe('Test 3: A patient can view authorized records', () => {
    it('allows Patient A to view their own prescription and lab report', async () => {
      const resRx = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}`)
        .set('Cookie', patientACookie);

      expect(resRx.status).toBe(200);
      expect(resRx.body.document).toHaveProperty('id', issuedPrescriptionId);
      expect(resRx.body.document.patientId).toBe(patientAId);
      expect(resRx.body.document).toHaveProperty('clinicalData');

      const resLab = await request(app)
        .get(`/api/documents/${issuedLabReportId}`)
        .set('Cookie', patientACookie);

      expect(resLab.status).toBe(200);
      expect(resLab.body.document).toHaveProperty('id', issuedLabReportId);
      expect(resLab.body.document.patientId).toBe(patientAId);
    });

    it('lists both issued records under Patient A document repository', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Cookie', patientACookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.documents)).toBe(true);
      const docIds = res.body.documents.map((d: any) => d.id);
      expect(docIds).toContain(issuedPrescriptionId);
      expect(docIds).toContain(issuedLabReportId);
    });
  });

  describe('Test 4: Another patient cannot access the file', () => {
    it('blocks Patient B from viewing Patient A document details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}`)
        .set('Cookie', patientBCookie);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'ACCESS_DENIED');
    });

    it('blocks Patient B from downloading Patient A private clinical file (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}/file`)
        .set('Cookie', patientBCookie);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'ACCESS_DENIED');
    });
  });

  describe('Test 5: Unsupported or oversized uploads are rejected', () => {
    it('rejects an unsupported file type / non-medical binary (400 INVALID_FILE_TYPE)', async () => {
      // Fake executable or shell script content
      const fakeExecutable = Buffer.from('#!/bin/bash\necho "malicious script"\n');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', doctor1Cookie)
        .attach('file', fakeExecutable, 'payload.sh');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_FILE_TYPE');
    });

    it('rejects an oversized file exceeding 10MB limit (413 Payload Too Large)', async () => {
      // Allocate 11MB buffer
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 0x41);

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', doctor1Cookie)
        .attach('file', oversizedBuffer, 'large_scan.bin');

      expect(res.status).toBe(413);
      expect(res.body).toHaveProperty('code', 'PAYLOAD_TOO_LARGE');
    });

    it('accepts a valid medical PDF file upload with genuine %PDF- magic bytes', async () => {
      // Valid minimal PDF header
      const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', doctor1Cookie)
        .attach('file', pdfHeader, 'lab_results.pdf');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('file');
      expect(res.body.file.mimeType).toBe('application/pdf');
      expect(res.body.file.storagePath).toMatch(/\.bin$/);
    });
  });

  describe('Test 6: Finalized document versions cannot be overwritten', () => {
    it('rejects direct PUT/PATCH overwrite on a finalized document (409 Conflict)', async () => {
      const res = await request(app)
        .put(`/api/documents/${issuedPrescriptionId}`)
        .set('Cookie', doctor1Cookie)
        .send({
          title: 'Directly Overwritten Title',
          clinicalData: { forged: true },
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'FINALIZED_DOCUMENT_IMMUTABLE');
    });
  });

  describe('Test 7 & 8: Authorized correction creates new version & preserves history', () => {
    it('creates version 2 when authorized original issuer performs an amendment', async () => {
      const amendmentPayload = {
        amendmentReason: 'Dosage reduction: reduced Amoxicillin-Clavulanate dosage due to mild GI upset',
        title: 'Prescription: Acute Bacterial Bronchitis (Amended)',
        clinicalData: {
          medications: [
            {
              name: 'Amoxicillin-Clavulanate',
              dosage: '500/125 mg', // Adjusted from 875/125 mg
              frequency: 'Twice daily with meals',
              duration: '7 days',
              instructions: 'Complete course; reduced dosage for GI tolerance',
              refills: 0,
            },
          ],
        },
      };

      const res = await request(app)
        .post(`/api/documents/${issuedPrescriptionId}/amend`)
        .set('Cookie', doctor1Cookie)
        .send(amendmentPayload);

      expect(res.status).toBe(200);
      expect(res.body.document).toHaveProperty('version', 2);
      expect(res.body.document.amendmentReason).toBe(amendmentPayload.amendmentReason);
      expect(res.body.document.versions).toHaveLength(2);
    });

    it('preserves immutable version history and audit log for authorized viewers', async () => {
      const res = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}/history`)
        .set('Cookie', patientACookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('versions');
      expect(res.body).toHaveProperty('auditEvents');

      const versions = res.body.versions;
      expect(versions.length).toBe(2);
      expect(versions.some((v: any) => v.versionNumber === 1)).toBe(true);
      expect(versions.some((v: any) => v.versionNumber === 2)).toBe(true);

      const auditEvents = res.body.auditEvents;
      expect(auditEvents.length).toBeGreaterThanOrEqual(2);
      const actions = auditEvents.map((a: any) => a.action);
      expect(actions).toContain('DOCUMENT_FINALIZED');
      expect(actions).toContain('DOCUMENT_AMENDED');
    });
  });

  describe('Test 9: The wrong issuer cannot amend a record', () => {
    it('rejects amendment attempt by Doctor 2 on Doctor 1 document (403 UNAUTHORIZED_ISSUER)', async () => {
      const res = await request(app)
        .post(`/api/documents/${issuedPrescriptionId}/amend`)
        .set('Cookie', doctor2Cookie)
        .send({
          amendmentReason: 'Unauthorized doctor attempting to alter prescription',
          clinicalData: { altered: true },
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'UNAUTHORIZED_ISSUER');
    });
  });

  describe('Test 10: File download authorization is checked server-side', () => {
    it('allows Patient A to download their finalized private document file', async () => {
      const res = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}/file`)
        .set('Cookie', patientACookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="RX-/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toContain('private');
      expect(res.body).toBeDefined();
    });

    it('rejects unauthenticated document download request (401 Unauthorized)', async () => {
      const res = await request(app).get(`/api/documents/${issuedPrescriptionId}/file`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'AUTH_REQUIRED');
    });

    it('rejects unauthorized patient download request (403 ACCESS_DENIED)', async () => {
      const res = await request(app)
        .get(`/api/documents/${issuedPrescriptionId}/file`)
        .set('Cookie', patientBCookie);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'ACCESS_DENIED');
    });
  });
});
