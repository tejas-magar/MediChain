import { AssociationStatus, AuditAction, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { recordAuditEvent } from '../../lib/audit.js';
import { PatientLookupInput } from './associations.schemas.js';

export class AssociationService {
  /**
   * Secure Patient Lookup:
   * Enforces multi-factor patient identity matching using exact MRN plus DOB or email.
   * Matches by patient name alone are strictly prohibited to prevent misattribution.
   */
  async lookupPatient(input: PatientLookupInput) {
    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        mrn: { equals: input.mrn.trim(), mode: 'insensitive' },
      },
    });

    if (!patient) {
      return null;
    }

    // Secondary factor confirmation: Date of Birth OR verified email
    let confirmed = false;

    if (input.email && patient.email.toLowerCase() === input.email.trim().toLowerCase()) {
      confirmed = true;
    }

    if (input.dateOfBirth && patient.dateOfBirth) {
      const patientDobStr = patient.dateOfBirth.toISOString().split('T')[0];
      const inputDobStr = new Date(input.dateOfBirth).toISOString().split('T')[0];
      if (patientDobStr === inputDobStr) {
        confirmed = true;
      }
    }

    if (!confirmed) {
      return null;
    }

    return {
      id: patient.id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      dateOfBirth: patient.dateOfBirth,
      email: patient.email,
      phone: patient.phone,
    };
  }

  /**
   * Establishes a verified Patient-to-Provider clinical association.
   */
  async createAssociation(
    providerId: string,
    providerRole: UserRole,
    patientId: string,
    purpose?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Verify provider role
    if (providerRole !== UserRole.DOCTOR && providerRole !== UserRole.TESTING_LAB) {
      const error = new Error('Only licensed Doctors and accredited Testing Labs can initiate patient associations.');
      (error as any).statusCode = 403;
      (error as any).code = 'ROLE_FORBIDDEN';
      throw error;
    }

    // Verify patient exists and has PATIENT role
    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: patientId }, { mrn: patientId }],
      },
    });

    if (!patient) {
      const error = new Error('Specified patient was not found or is not a registered patient.');
      (error as any).statusCode = 404;
      (error as any).code = 'PATIENT_NOT_FOUND';
      throw error;
    }
    const actualPatientId = patient.id;

    const association = await prisma.patientAssociation.upsert({
      where: {
        patientId_providerId: {
          patientId: actualPatientId,
          providerId,
        },
      },
      update: {
        status: AssociationStatus.ACTIVE,
        confirmedAt: new Date(),
        purpose: purpose ?? 'Clinical care and diagnostic document issuance',
        updatedAt: new Date(),
      },
      create: {
        patientId: actualPatientId,
        providerId,
        status: AssociationStatus.ACTIVE,
        confirmedAt: new Date(),
        purpose: purpose ?? 'Clinical care and diagnostic document issuance',
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mrn: true,
            email: true,
            dateOfBirth: true,
          },
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            role: true,
            organization: true,
            licenseNumber: true,
          },
        },
      },
    });

    await recordAuditEvent({
      action: AuditAction.ASSOCIATION_CREATED,
      actorId: providerId,
      actorRole: providerRole,
      ipAddress,
      userAgent,
      details: {
        associationId: association.id,
        patientId,
        patientMrn: patient.mrn,
        purpose,
      },
    });

    await recordAuditEvent({
      action: AuditAction.ASSOCIATION_CONFIRMED,
      actorId: providerId,
      actorRole: providerRole,
      ipAddress,
      userAgent,
      details: {
        associationId: association.id,
        patientId,
        status: AssociationStatus.ACTIVE,
      },
    });

    return association;
  }

  /**
   * Retrieves all active and pending associations for the current user.
   */
  async getMyAssociations(userId: string, role: UserRole) {
    if (role === UserRole.PATIENT) {
      return await prisma.patientAssociation.findMany({
        where: {
          patientId: userId,
          status: { in: [AssociationStatus.ACTIVE, AssociationStatus.PENDING_CONFIRMATION] },
        },
        include: {
          provider: {
            select: {
              id: true,
              fullName: true,
              role: true,
              organization: true,
              licenseNumber: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      return await prisma.patientAssociation.findMany({
        where: {
          providerId: userId,
          status: { in: [AssociationStatus.ACTIVE, AssociationStatus.PENDING_CONFIRMATION] },
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              mrn: true,
              email: true,
              dateOfBirth: true,
              phone: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }
  }

  /**
   * Retrieves all registered patients from the database.
   * Can be filtered with an optional search string (name, MRN/ABHA, email, phone).
   */
  async getAllPatients(search?: string) {
    const where: any = {
      role: UserRole.PATIENT,
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { mrn: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const patients = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        mrn: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        allergies: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p) => ({
      ...p,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
    }));
  }

  /**
   * Retrieves a single patient by ID or MRN.
   */
  async getPatientById(id: string) {
    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [
          { id },
          { mrn: id },
        ],
      },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        allergies: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!patient) return null;

    return {
      ...patient,
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : null,
    };
  }

  /**
   * Generates a pending access request to a patient.
   * Scoped to ABDM consent model where patient must grant permission.
   */
  async requestAccess(
    providerId: string,
    providerRole: UserRole,
    patientId: string,
    purpose?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (providerRole !== UserRole.DOCTOR && providerRole !== UserRole.TESTING_LAB) {
      const error = new Error('Only licensed Doctors and accredited Testing Labs can request patient access.');
      (error as any).statusCode = 403;
      (error as any).code = 'ROLE_FORBIDDEN';
      throw error;
    }

    const patient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: patientId }, { mrn: patientId }],
      },
    });

    if (!patient) {
      const error = new Error('Specified patient was not found.');
      (error as any).statusCode = 404;
      (error as any).code = 'PATIENT_NOT_FOUND';
      throw error;
    }
    const actualPatientId = patient.id;

    const purposeData = JSON.stringify({
      scope: 'PENDING',
      requestedScope: 'FULL_ACCESS',
      note: purpose || 'Clinical consultation, historical records review, and document issuance',
      requestedAt: new Date().toISOString(),
    });

    const association = await prisma.patientAssociation.upsert({
      where: {
        patientId_providerId: {
          patientId: actualPatientId,
          providerId,
        },
      },
      update: {
        status: AssociationStatus.PENDING_CONFIRMATION,
        purpose: purposeData,
        updatedAt: new Date(),
      },
      create: {
        patientId: actualPatientId,
        providerId,
        status: AssociationStatus.PENDING_CONFIRMATION,
        purpose: purposeData,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mrn: true,
            email: true,
            dateOfBirth: true,
          },
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            role: true,
            organization: true,
            licenseNumber: true,
          },
        },
      },
    });

    await recordAuditEvent({
      action: AuditAction.ASSOCIATION_CREATED,
      actorId: providerId,
      actorRole: providerRole,
      ipAddress,
      userAgent,
      details: {
        associationId: association.id,
        patientId,
        patientMrn: patient.mrn,
        status: 'PENDING_CONFIRMATION',
      },
    });

    return association;
  }

  /**
   * Patient responds to an access request with granular consent:
   * - CREATE_ONLY: Provider can issue new prescriptions/reports, but CANNOT view historical records.
   * - FULL_ACCESS: Provider can view all historical records and issue new documents.
   * - REJECT: Access denied / revoked.
   */
  async respondToAccessRequest(
    patientId: string,
    associationId: string,
    decision: 'CREATE_ONLY' | 'FULL_ACCESS' | 'REJECT',
    ipAddress?: string,
    userAgent?: string
  ) {
    const association = await prisma.patientAssociation.findUnique({
      where: { id: associationId },
      include: { provider: true, patient: true },
    });

    if (!association) {
      const error = new Error('Access request not found.');
      (error as any).statusCode = 404;
      (error as any).code = 'ASSOCIATION_NOT_FOUND';
      throw error;
    }

    if (association.patientId !== patientId) {
      const error = new Error('Forbidden: Only the target patient can grant or deny access.');
      (error as any).statusCode = 403;
      (error as any).code = 'ROLE_FORBIDDEN';
      throw error;
    }

    if (decision === 'REJECT') {
      const updated = await prisma.patientAssociation.update({
        where: { id: associationId },
        data: {
          status: AssociationStatus.REVOKED,
          updatedAt: new Date(),
        },
      });

      await recordAuditEvent({
        action: AuditAction.ASSOCIATION_REVOKED,
        actorId: patientId,
        actorRole: UserRole.PATIENT,
        ipAddress,
        userAgent,
        details: { associationId, providerId: association.providerId, decision: 'REJECT' },
      });

      return updated;
    }

    const purposeData = JSON.stringify({
      scope: decision,
      note:
        decision === 'CREATE_ONLY'
          ? 'Authorized for new prescription & report issuance only. Historical records withheld.'
          : 'Full clinical access: authorized to view all previous records and issue new documents.',
      respondedAt: new Date().toISOString(),
    });

    const updated = await prisma.patientAssociation.update({
      where: { id: associationId },
      data: {
        status: AssociationStatus.ACTIVE,
        confirmedAt: new Date(),
        purpose: purposeData,
        updatedAt: new Date(),
      },
      include: {
        provider: {
          select: {
            id: true,
            fullName: true,
            role: true,
            organization: true,
            licenseNumber: true,
          },
        },
      },
    });

    await recordAuditEvent({
      action: AuditAction.ASSOCIATION_CONFIRMED,
      actorId: patientId,
      actorRole: UserRole.PATIENT,
      ipAddress,
      userAgent,
      details: { associationId, providerId: association.providerId, scope: decision },
    });

    return updated;
  }

  /**
   * Retrieves association / consent status between a specific patient and provider.
   */
  async getAssociationStatus(patientId: string, providerId: string) {
    const resolvedPatient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: patientId }, { mrn: patientId }],
      },
      select: { id: true },
    });
    const actualPatientId = resolvedPatient ? resolvedPatient.id : patientId;

    const association = await prisma.patientAssociation.findFirst({
      where: {
        patientId: actualPatientId,
        providerId,
      },
      include: {
        provider: {
          select: {
            id: true,
            fullName: true,
            role: true,
            organization: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!association) {
      return { status: 'NONE' };
    }

    let scope: 'CREATE_ONLY' | 'FULL_ACCESS' | 'PENDING' | 'DEFAULT' = 'DEFAULT';
    let note: string | undefined;
    try {
      if (association.purpose && association.purpose.startsWith('{')) {
        const parsed = JSON.parse(association.purpose);
        scope = parsed.scope;
        note = parsed.note;
      }
    } catch {}

    return {
      id: association.id,
      status: association.status,
      scope,
      note,
      confirmedAt: association.confirmedAt,
      provider: association.provider,
    };
  }

  /**
   * Checks whether an active, valid clinical association exists between patient and provider,
   * respecting patient's granted consent scope (CREATE_DOCUMENT vs VIEW_HISTORY).
   */
  async verifyActiveAssociation(
    patientId: string,
    providerId: string,
    requiredPermission?: 'CREATE_DOCUMENT' | 'VIEW_HISTORY'
  ): Promise<boolean> {
    const resolvedPatient = await prisma.user.findFirst({
      where: {
        role: UserRole.PATIENT,
        OR: [{ id: patientId }, { mrn: patientId }],
      },
      select: { id: true },
    });
    const actualPatientId = resolvedPatient ? resolvedPatient.id : patientId;

    const association = await prisma.patientAssociation.findFirst({
      where: {
        patientId: actualPatientId,
        providerId,
        status: AssociationStatus.ACTIVE,
      },
    });

    if (!association) return false;
    if (association.expiresAt && association.expiresAt < new Date()) return false;

    // Check scope if viewing historical documents
    if (requiredPermission === 'VIEW_HISTORY') {
      try {
        if (association.purpose && association.purpose.startsWith('{')) {
          const parsed = JSON.parse(association.purpose);
          if (parsed.scope === 'CREATE_ONLY') {
            // Patient granted creation only; viewing past history is disallowed
            return false;
          }
        }
      } catch {
        // Fallback to true if purpose is plain string
      }
    }

    return true;
  }

  /**
   * Revokes an existing association.
   */
  async revokeAssociation(
    associationId: string,
    actorId: string,
    actorRole: UserRole,
    ipAddress?: string,
    userAgent?: string
  ) {
    const association = await prisma.patientAssociation.findUnique({
      where: { id: associationId },
    });

    if (!association) {
      const error = new Error('Association not found.');
      (error as any).statusCode = 404;
      (error as any).code = 'ASSOCIATION_NOT_FOUND';
      throw error;
    }

    if (association.patientId !== actorId && association.providerId !== actorId) {
      const error = new Error('Forbidden: You can only revoke associations in which you are a party.');
      (error as any).statusCode = 403;
      (error as any).code = 'ROLE_FORBIDDEN';
      throw error;
    }

    const updated = await prisma.patientAssociation.update({
      where: { id: associationId },
      data: {
        status: AssociationStatus.REVOKED,
      },
    });

    await recordAuditEvent({
      action: AuditAction.ASSOCIATION_REVOKED,
      actorId,
      actorRole,
      ipAddress,
      userAgent,
      details: {
        associationId,
        patientId: association.patientId,
        providerId: association.providerId,
      },
    });

    return updated;
  }
}

export const associationService = new AssociationService();
