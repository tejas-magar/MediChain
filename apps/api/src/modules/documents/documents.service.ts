import crypto from 'crypto';
import {
  AuditAction,
  DocumentCategory,
  DocumentStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { keystoreService } from '../../lib/keystore.js';
import { storageService } from '../../lib/storage.js';
import { recordAuditEvent } from '../../lib/audit.js';
import { associationService } from '../associations/associations.service.js';
import {
  CreatePrescriptionInput,
  CreateLabReportInput,
  AmendDocumentInput,
} from './documents.schemas.js';

export class DocumentService {
  /**
   * Generates a preview and canonical byte hash for a draft prescription.
   */
  async previewPrescription(issuerId: string, role: UserRole, input: CreatePrescriptionInput) {
    if (role !== UserRole.DOCTOR) {
      const err = new Error('Only licensed Doctors can generate prescription previews.');
      (err as any).statusCode = 403;
      (err as any).code = 'ROLE_FORBIDDEN';
      throw err;
    }

    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: input.patientId }, { mrn: input.patientId }],
      },
    });
    if (!patient) {
      const err = new Error('Specified patient does not exist or is not a patient.');
      (err as any).statusCode = 404;
      (err as any).code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    const hasAssociation = await associationService.verifyActiveAssociation(patient.id, issuerId);
    if (!hasAssociation) {
      const err = new Error('Active patient-to-provider association required before issuing documents.');
      (err as any).statusCode = 403;
      (err as any).code = 'ASSOCIATION_REQUIRED';
      throw err;
    }

    const payload = {
      category: DocumentCategory.PRESCRIPTION,
      title: input.title,
      clinicalIndication: input.clinicalIndication,
      medications: input.medications,
      notes: input.notes ?? null,
      patientId: patient.id,
      issuerId,
    };

    const canonicalBytes = keystoreService.canonicalizeDocument(payload);
    const fileHash = keystoreService.computeSha256(canonicalBytes);

    return {
      status: DocumentStatus.DRAFT,
      previewPayload: payload,
      canonicalBytesHex: canonicalBytes.toString('hex'),
      fileHash,
      isValid: true,
    };
  }

  /**
   * Finalizes and signs a medical prescription.
   */
  async finalizePrescription(
    issuerId: string,
    role: UserRole,
    input: CreatePrescriptionInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (role !== UserRole.DOCTOR) {
      const err = new Error('Only licensed Doctors can issue prescriptions.');
      (err as any).statusCode = 403;
      (err as any).code = 'ROLE_FORBIDDEN';
      throw err;
    }

    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: input.patientId }, { mrn: input.patientId }],
      },
    });
    if (!patient) {
      const err = new Error('Specified patient does not exist or is not a patient.');
      (err as any).statusCode = 404;
      (err as any).code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    const hasAssociation = await associationService.verifyActiveAssociation(patient.id, issuerId, 'CREATE_DOCUMENT');
    if (!hasAssociation) {
      const err = new Error('Active patient-to-provider association required before issuing documents.');
      (err as any).statusCode = 403;
      (err as any).code = 'ASSOCIATION_REQUIRED';
      throw err;
    }

    const doctor = await prisma.user.findUnique({
      where: { id: issuerId },
    });
    if (!doctor) {
      const err = new Error('Doctor profile not found.');
      (err as any).statusCode = 404;
      (err as any).code = 'USER_NOT_FOUND';
      throw err;
    }

    // Generate unique document number and high-entropy opaque verification token
    const documentNumber = `RX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const verificationToken = `tok_rx_${crypto.randomBytes(16).toString('hex')}`;
    const issuedAt = new Date();

    // Canonical payload structure
    const clinicalPayload = {
      documentNumber,
      category: DocumentCategory.PRESCRIPTION,
      title: input.title,
      clinicalIndication: input.clinicalIndication,
      medications: input.medications,
      notes: input.notes ?? null,
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        mrn: patient.mrn,
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
      },
      issuer: {
        id: doctor.id,
        fullName: doctor.fullName,
        licenseNumber: doctor.licenseNumber,
        organization: doctor.organization,
      },
      version: 1,
      issuedAt: issuedAt.toISOString(),
    };

    // 1. Generate canonical final bytes
    const canonicalBytes = keystoreService.canonicalizeDocument(clinicalPayload);

    // 2. Compute SHA-256 over exact canonical bytes
    const fileHash = keystoreService.computeSha256(canonicalBytes);

    // 3. Cryptographically sign canonical bytes using genuine RSA private key
    const { signature } = keystoreService.signCanonicalBytes(issuerId, canonicalBytes);

    // 4. Store file privately
    const stored = await storageService.storeFile(canonicalBytes, 'application/json');

    // 5. Create database record and immutable version record in a transaction
    const document = await prisma.$transaction(async (tx) => {
      const createdDoc = await tx.document.create({
        data: {
          documentNumber,
          category: DocumentCategory.PRESCRIPTION,
          title: input.title,
          description: input.clinicalIndication,
          status: DocumentStatus.FINALIZED,
          version: 1,
          patientId: patient.id,
          issuerId,
          fileHash,
          issuerSignature: signature,
          verificationToken,
          clinicalData: clinicalPayload,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          issuedAt,
          prescriptionDetails: {
            create: {
              diagnosis: input.clinicalIndication,
              treatmentPlan: input.notes || input.clinicalIndication,
              allergiesAcknowledged: true,
              dispenseAsWritten: false,
              medications: {
                create: input.medications.map((m) => ({
                  name: m.name,
                  strength: m.dosage,
                  dosageForm: 'Oral',
                  frequency: m.frequency,
                  duration: m.duration,
                  quantity: 'Standard Unit',
                  refills: m.refills ?? 0,
                  instructions: m.instructions ?? null,
                })),
              },
            },
          },
        },
        include: {
          patient: {
            select: { id: true, fullName: true, mrn: true, email: true },
          },
          issuer: {
            select: { id: true, fullName: true, organization: true, licenseNumber: true, role: true, publicKeyPem: true },
          },
          prescriptionDetails: {
            include: { medications: true },
          },
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: createdDoc.id,
          versionNumber: 1,
          title: createdDoc.title,
          clinicalData: clinicalPayload,
          fileHash,
          issuerSignature: signature,
          issuerId,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          finalizedAt: issuedAt,
        },
      });

      return createdDoc;
    });

    // 6. Write audit event
    await recordAuditEvent({
      documentId: document.id,
      action: AuditAction.DOCUMENT_FINALIZED,
      actorId: issuerId,
      actorRole: role,
      ipAddress,
      userAgent,
      details: {
        documentNumber,
        category: DocumentCategory.PRESCRIPTION,
        fileHash,
        version: 1,
        verificationToken,
      },
    });

    return document;
  }

  /**
   * Generates a preview and canonical byte hash for a draft lab report.
   */
  async previewLabReport(issuerId: string, role: UserRole, input: CreateLabReportInput) {
    if (role !== UserRole.TESTING_LAB) {
      const err = new Error('Only accredited Testing Labs can generate lab report previews.');
      (err as any).statusCode = 403;
      (err as any).code = 'ROLE_FORBIDDEN';
      throw err;
    }

    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: input.patientId }, { mrn: input.patientId }],
      },
    });
    if (!patient) {
      const err = new Error('Specified patient does not exist or is not a patient.');
      (err as any).statusCode = 404;
      (err as any).code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    const hasAssociation = await associationService.verifyActiveAssociation(patient.id, issuerId, 'CREATE_DOCUMENT');
    if (!hasAssociation) {
      const err = new Error('Active patient-to-provider association required before issuing documents.');
      (err as any).statusCode = 403;
      (err as any).code = 'ASSOCIATION_REQUIRED';
      throw err;
    }

    const payload = {
      category: DocumentCategory.LAB_REPORT,
      title: input.title,
      specimen: input.specimen,
      collectionDate: input.collectionDate,
      results: input.results,
      interpretation: input.interpretation ?? null,
      patientId: patient.id,
      issuerId,
    };

    const canonicalBytes = keystoreService.canonicalizeDocument(payload);
    const fileHash = keystoreService.computeSha256(canonicalBytes);

    return {
      status: DocumentStatus.DRAFT,
      previewPayload: payload,
      canonicalBytesHex: canonicalBytes.toString('hex'),
      fileHash,
      isValid: true,
    };
  }

  /**
   * Finalizes and signs a diagnostic lab report.
   */
  async finalizeLabReport(
    issuerId: string,
    role: UserRole,
    input: CreateLabReportInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (role !== UserRole.TESTING_LAB) {
      const err = new Error('Only accredited Testing Labs can issue lab reports.');
      (err as any).statusCode = 403;
      (err as any).code = 'ROLE_FORBIDDEN';
      throw err;
    }

    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: input.patientId }, { mrn: input.patientId }],
      },
    });
    if (!patient) {
      const err = new Error('Specified patient does not exist or is not a patient.');
      (err as any).statusCode = 404;
      (err as any).code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    const hasAssociation = await associationService.verifyActiveAssociation(patient.id, issuerId, 'CREATE_DOCUMENT');
    if (!hasAssociation) {
      const err = new Error('Active patient-to-provider association required before issuing documents.');
      (err as any).statusCode = 403;
      (err as any).code = 'ASSOCIATION_REQUIRED';
      throw err;
    }

    const lab = await prisma.user.findUnique({
      where: { id: issuerId },
    });
    if (!lab) {
      const err = new Error('Laboratory profile not found.');
      (err as any).statusCode = 404;
      (err as any).code = 'USER_NOT_FOUND';
      throw err;
    }

    const documentNumber = `LAB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const verificationToken = `tok_lab_${crypto.randomBytes(16).toString('hex')}`;
    const issuedAt = new Date();

    const clinicalPayload = {
      documentNumber,
      category: DocumentCategory.LAB_REPORT,
      title: input.title,
      specimen: input.specimen,
      collectionDate: input.collectionDate,
      results: input.results,
      interpretation: input.interpretation ?? null,
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        mrn: patient.mrn,
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
      },
      issuer: {
        id: lab.id,
        fullName: lab.fullName,
        licenseNumber: lab.licenseNumber,
        organization: lab.organization,
      },
      version: 1,
      issuedAt: issuedAt.toISOString(),
    };

    const canonicalBytes = keystoreService.canonicalizeDocument(clinicalPayload);
    const fileHash = keystoreService.computeSha256(canonicalBytes);
    const { signature } = keystoreService.signCanonicalBytes(issuerId, canonicalBytes);
    const stored = await storageService.storeFile(canonicalBytes, 'application/json');

    const document = await prisma.$transaction(async (tx) => {
      const createdDoc = await tx.document.create({
        data: {
          documentNumber,
          category: DocumentCategory.LAB_REPORT,
          title: input.title,
          description: `Diagnostic panel: ${input.title}`,
          status: DocumentStatus.FINALIZED,
          version: 1,
          patientId: patient.id,
          issuerId,
          fileHash,
          issuerSignature: signature,
          verificationToken,
          clinicalData: clinicalPayload,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          issuedAt,
          labReportDetails: {
            create: {
              testCategory: input.title,
              specimenType: input.specimen,
              collectionTimestamp: isNaN(Date.parse(input.collectionDate)) ? new Date() : new Date(input.collectionDate),
              technologistRemarks: input.interpretation ?? null,
              clinicalSignificance: 'Diagnostic Pathology Panel',
              results: {
                create: input.results.map((r) => ({
                  parameterName: r.testName,
                  value: r.value,
                  unit: r.unit,
                  referenceRange: r.referenceRange,
                  flag: r.flag || 'NORMAL',
                })),
              },
            },
          },
        },
        include: {
          patient: {
            select: { id: true, fullName: true, mrn: true, email: true },
          },
          issuer: {
            select: { id: true, fullName: true, organization: true, licenseNumber: true, role: true, publicKeyPem: true },
          },
          labReportDetails: {
            include: { results: true },
          },
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: createdDoc.id,
          versionNumber: 1,
          title: createdDoc.title,
          clinicalData: clinicalPayload,
          fileHash,
          issuerSignature: signature,
          issuerId,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          finalizedAt: issuedAt,
        },
      });

      return createdDoc;
    });

    await recordAuditEvent({
      documentId: document.id,
      action: AuditAction.DOCUMENT_FINALIZED,
      actorId: issuerId,
      actorRole: role,
      ipAddress,
      userAgent,
      details: {
        documentNumber,
        category: DocumentCategory.LAB_REPORT,
        fileHash,
        version: 1,
        verificationToken,
      },
    });

    return document;
  }

  /**
   * Controlled document amendment workflow:
   * Only the original issuer can amend their own document.
   * Increments version number and preserves all previous immutable versions and audit events.
   * Finalized document files are never silently overwritten.
   */
  async amendDocument(
    documentId: string,
    issuerId: string,
    role: UserRole,
    input: AmendDocumentInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      const err = new Error('Document not found.');
      (err as any).statusCode = 404;
      (err as any).code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    // Strict Authorization: Only the original authorized issuer may amend
    if (document.issuerId !== issuerId) {
      await recordAuditEvent({
        documentId,
        action: AuditAction.ACCESS_DENIED,
        actorId: issuerId,
        actorRole: role,
        ipAddress,
        userAgent,
        details: { reason: 'Unauthorized issuer attempted document amendment', originalIssuerId: document.issuerId },
      });

      const err = new Error('Forbidden: Only the original authorized issuer may amend this document.');
      (err as any).statusCode = 403;
      (err as any).code = 'UNAUTHORIZED_ISSUER';
      throw err;
    }

    if (document.status !== DocumentStatus.FINALIZED) {
      const err = new Error(`Cannot amend document with status '${document.status}'. Only finalized documents can be amended.`);
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_STATUS';
      throw err;
    }

    const newVersionNumber = document.version + 1;
    const amendedTimestamp = new Date();

    const amendedClinicalPayload = {
      ...(typeof document.clinicalData === 'object' && document.clinicalData !== null ? (document.clinicalData as any) : {}),
      ...input.clinicalData,
      version: newVersionNumber,
      amendmentReason: input.amendmentReason,
      amendedAt: amendedTimestamp.toISOString(),
    };

    const canonicalBytes = keystoreService.canonicalizeDocument(amendedClinicalPayload);
    const newFileHash = keystoreService.computeSha256(canonicalBytes);
    const { signature: newSignature } = keystoreService.signCanonicalBytes(issuerId, canonicalBytes);
    const stored = await storageService.storeFile(canonicalBytes, 'application/json');

    const updatedDocument = await prisma.$transaction(async (tx) => {
      // 1. Create immutable DocumentVersion record
      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: newVersionNumber,
          title: input.title ?? document.title,
          clinicalData: amendedClinicalPayload,
          fileHash: newFileHash,
          issuerSignature: newSignature,
          issuerId,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          finalizedAt: amendedTimestamp,
          amendmentReason: input.amendmentReason,
        },
      });

      // 2. Update parent document to reflect latest version
      return await tx.document.update({
        where: { id: documentId },
        data: {
          version: newVersionNumber,
          title: input.title ?? document.title,
          clinicalData: amendedClinicalPayload,
          fileHash: newFileHash,
          issuerSignature: newSignature,
          fileStoragePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          amendmentReason: input.amendmentReason,
          updatedAt: amendedTimestamp,
        },
        include: {
          versions: { orderBy: { versionNumber: 'desc' } },
          patient: { select: { id: true, fullName: true, mrn: true, email: true } },
          issuer: { select: { id: true, fullName: true, organization: true, licenseNumber: true, role: true, publicKeyPem: true } },
        },
      });
    });

    await recordAuditEvent({
      documentId,
      action: AuditAction.DOCUMENT_AMENDED,
      actorId: issuerId,
      actorRole: role,
      ipAddress,
      userAgent,
      details: {
        documentNumber: document.documentNumber,
        previousVersion: document.version,
        newVersion: newVersionNumber,
        amendmentReason: input.amendmentReason,
        newFileHash,
      },
    });

    return updatedDocument;
  }

  /**
   * Enforces immutability: Rejects direct overwrites of finalized document versions.
   */
  async rejectDirectOverwrite(documentId: string) {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return;

    if (document.status === DocumentStatus.FINALIZED || document.status === DocumentStatus.SUPERSEDED) {
      const err = new Error('Conflict: Finalized document versions cannot be overwritten. You must use the authorized amendment workflow to create a new version.');
      (err as any).statusCode = 409;
      (err as any).code = 'FINALIZED_DOCUMENT_IMMUTABLE';
      throw err;
    }
  }

  /**
   * Retrieves document details with server-side authorization checks and audit event recording.
   */
  async getDocumentById(
    documentId: string,
    userId: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, email: true, dateOfBirth: true, gender: true, bloodType: true, allergies: true } },
        issuer: { select: { id: true, fullName: true, organization: true, licenseNumber: true, role: true, publicKeyPem: true, specialty: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
        prescriptionDetails: {
          include: { medications: true },
        },
        labReportDetails: {
          include: { results: true },
        },
      },
    });

    if (!document) {
      const err = new Error('Document not found.');
      (err as any).statusCode = 404;
      (err as any).code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    // Access control checks
    let isAuthorized = false;

    if (role === UserRole.PATIENT) {
      isAuthorized = document.patientId === userId;
    } else if (role === UserRole.DOCTOR || role === UserRole.TESTING_LAB) {
      if (document.issuerId === userId) {
        isAuthorized = true;
      } else {
        isAuthorized = await associationService.verifyActiveAssociation(document.patientId, userId, 'VIEW_HISTORY');
      }
    }

    if (!isAuthorized) {
      await recordAuditEvent({
        documentId,
        action: AuditAction.ACCESS_DENIED,
        actorId: userId,
        actorRole: role,
        ipAddress,
        userAgent,
        details: { reason: 'Unauthorized user attempted to view private clinical document', patientId: document.patientId },
      });

      const err = new Error('Forbidden: You are not authorized to view this document.');
      (err as any).statusCode = 403;
      (err as any).code = 'ACCESS_DENIED';
      throw err;
    }

    await recordAuditEvent({
      documentId,
      action: AuditAction.DOCUMENT_VIEWED,
      actorId: userId,
      actorRole: role,
      ipAddress,
      userAgent,
      details: { documentNumber: document.documentNumber, version: document.version },
    });

    return document;
  }

  /**
   * Downloads the private document file with strict server-side authorization checks.
   */
  async downloadDocumentFile(
    documentId: string,
    userId: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      const err = new Error('Document not found.');
      (err as any).statusCode = 404;
      (err as any).code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    let isAuthorized = false;

    if (role === UserRole.PATIENT) {
      isAuthorized = document.patientId === userId;
    } else if (role === UserRole.DOCTOR || role === UserRole.TESTING_LAB) {
      if (document.issuerId === userId) {
        isAuthorized = true;
      } else {
        isAuthorized = await associationService.verifyActiveAssociation(document.patientId, userId);
      }
    }

    if (!isAuthorized) {
      await recordAuditEvent({
        documentId,
        action: AuditAction.ACCESS_DENIED,
        actorId: userId,
        actorRole: role,
        ipAddress,
        userAgent,
        details: { reason: 'Unauthorized user attempted to download private clinical file', patientId: document.patientId },
      });

      const err = new Error('Forbidden: You do not have permission to download this medical document file.');
      (err as any).statusCode = 403;
      (err as any).code = 'ACCESS_DENIED';
      throw err;
    }

    if (!document.fileStoragePath) {
      const err = new Error('No physical file is associated with this document record.');
      (err as any).statusCode = 404;
      (err as any).code = 'FILE_NOT_FOUND';
      throw err;
    }

    const buffer = await storageService.getFile(document.fileStoragePath);
    const safeFilename = storageService.getSafeDownloadFilename(document.documentNumber, document.mimeType);

    await recordAuditEvent({
      documentId,
      action: AuditAction.DOCUMENT_DOWNLOADED,
      actorId: userId,
      actorRole: role,
      ipAddress,
      userAgent,
      details: { documentNumber: document.documentNumber, safeFilename },
    });

    return {
      buffer,
      mimeType: document.mimeType || 'application/octet-stream',
      safeFilename,
    };
  }

  /**
   * Retrieves list of authorized documents for the current user.
   */
  async listDocuments(userId: string, role: UserRole) {
    if (role === UserRole.PATIENT) {
      return await prisma.document.findMany({
        where: { patientId: userId },
        include: {
          issuer: { select: { fullName: true, organization: true, licenseNumber: true, role: true } },
          prescriptionDetails: { include: { medications: true } },
          labReportDetails: { include: { results: true } },
        },
        orderBy: { issuedAt: 'desc' },
      });
    } else {
      return await prisma.document.findMany({
        where: {
          OR: [
            { issuerId: userId },
            {
              patient: {
                patientAssociations: {
                  some: { providerId: userId, status: 'ACTIVE' },
                },
              },
            },
          ],
        },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          issuer: { select: { fullName: true, organization: true, licenseNumber: true, role: true } },
          prescriptionDetails: { include: { medications: true } },
          labReportDetails: { include: { results: true } },
        },
        orderBy: { issuedAt: 'desc' },
      });
    }
  }

  /**
   * Retrieves version history and audit log for a document.
   */
  async getDocumentHistory(documentId: string, userId: string, role: UserRole) {
    // Validate read authorization first
    await this.getDocumentById(documentId, userId, role);

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    const auditEvents = await prisma.auditEvent.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, role: true, organization: true } },
      },
    });

    return { versions, auditEvents };
  }

  /**
   * Zero-Knowledge Public Verification:
   * Returns minimal non-clinical metadata.
   * NEVER exposes patient names, diagnoses, prescriptions, lab results, or private files.
   */
  async verifyByToken(token: string) {
    const document = await prisma.document.findUnique({
      where: { verificationToken: token },
      include: {
        issuer: {
          select: {
            role: true,
            organization: true,
            licenseNumber: true,
            publicKeyPem: true,
          },
        },
      },
    });

    if (!document) {
      return null;
    }

    // Verify cryptographic signature if available
    let signatureVerified = false;
    if (document.fileHash && document.issuerSignature && document.issuer.publicKeyPem) {
      try {
        let bytesToVerify: Buffer | null = null;
        if (document.fileStoragePath) {
          try {
            bytesToVerify = await storageService.getFile(document.fileStoragePath);
          } catch {
            // Fallback to canonical clinicalData
          }
        }
        if (!bytesToVerify && document.clinicalData) {
          bytesToVerify = keystoreService.canonicalizeDocument(document.clinicalData);
        }
        if (bytesToVerify) {
          signatureVerified = keystoreService.verifySignature(
            bytesToVerify,
            document.issuerSignature,
            document.issuer.publicKeyPem
          );
        }
      } catch (err) {
        console.warn('[VerifyByToken] signature verification exception:', err);
      }
    }

    return {
      documentNumber: document.documentNumber,
      category: document.category,
      status: document.status,
      version: document.version,
      fileHash: document.fileHash,
      issuerSignature: document.issuerSignature,
      signatureVerified,
      issuer: {
        organization: document.issuer.organization,
        licenseNumber: document.issuer.licenseNumber,
        role: document.issuer.role,
      },
      issuedAt: document.issuedAt,
      blockchainStatus: document.blockchainStatus,
      blockchainTxHash: document.blockchainTxHash,
      blockchainBlockNumber: document.blockchainBlockNumber,
    };
  }
}

export const documentService = new DocumentService();
