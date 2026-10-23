import { AuditAction, UserRole } from '@prisma/client';
import { prisma } from './prisma.js';

export interface RecordAuditParams {
  documentId?: string | null;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | null;
}

/**
 * Persists an immutable audit log entry for regulatory and clinical compliance.
 */
export async function recordAuditEvent(params: RecordAuditParams): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        documentId: params.documentId ?? null,
        action: params.action,
        actorId: params.actorId,
        actorRole: params.actorRole,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        details: params.details ?? undefined,
      },
    });
  } catch (err) {
    console.error(`[AuditLogger] Failed to write audit event: ${err}`);
  }
}
