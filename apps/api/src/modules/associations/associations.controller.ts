import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { associationService } from './associations.service.js';
import {
  patientLookupSchema,
  createAssociationSchema,
  requestAccessSchema,
  respondAccessSchema,
} from './associations.schemas.js';

export class AssociationController {
  /**
   * Endpoint: POST /api/associations/lookup
   * Searches for a patient using exact MRN and confirmed DOB or email.
   * Matching solely by name is rejected at schema validation.
   */
  async lookupPatient(req: Request, res: Response): Promise<void> {
    try {
      const parsed = patientLookupSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for patient lookup',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const patient = await associationService.lookupPatient(parsed.data);
      if (!patient) {
        res.status(404).json({
          error: 'No patient matched the provided MRN and secondary identity factor (DOB/Email).',
          code: 'PATIENT_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({ patient });
    } catch (err: any) {
      console.error('[AssociationController] lookupPatient error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error during patient lookup',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/associations
   * Establishes a verified patient-to-provider association.
   */
  async createAssociation(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createAssociationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid association parameters',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const providerId = session.userId as string;
      const providerRole = session.role as UserRole;

      const association = await associationService.createAssociation(
        providerId,
        providerRole,
        parsed.data.patientId,
        parsed.data.purpose,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        message: 'Patient association successfully established and active.',
        association,
      });
    } catch (err: any) {
      console.error('[AssociationController] createAssociation error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to create patient association',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/associations/my
   * Returns active associations for the current logged-in user.
   */
  async getMyAssociations(req: Request, res: Response): Promise<void> {
    try {
      const session = req.session as any;
      const associations = await associationService.getMyAssociations(
        session.userId as string,
        session.role as UserRole
      );

      res.status(200).json({ associations });
    } catch (err: any) {
      console.error('[AssociationController] getMyAssociations error:', err);
      res.status(500).json({
        error: 'Failed to retrieve associations',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/associations/:id/revoke
   */
  async revokeAssociation(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const session = req.session as any;

      const association = await associationService.revokeAssociation(
        id,
        session.userId as string,
        session.role as UserRole,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({
        message: 'Association successfully revoked.',
        association,
      });
    } catch (err: any) {
      console.error('[AssociationController] revokeAssociation error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to revoke association',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/associations/patients
   */
  async getAllPatients(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const patients = await associationService.getAllPatients(search);
      res.status(200).json({ patients });
    } catch (err: any) {
      console.error('[AssociationController] getAllPatients error:', err);
      res.status(500).json({
        error: 'Failed to retrieve patients',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/associations/patients/:id
   */
  async getPatientById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const patient = await associationService.getPatientById(id);
      if (!patient) {
        res.status(404).json({
          error: 'Patient not found',
          code: 'PATIENT_NOT_FOUND',
        });
        return;
      }
      res.status(200).json({ patient });
    } catch (err: any) {
      console.error('[AssociationController] getPatientById error:', err);
      res.status(500).json({
        error: 'Failed to retrieve patient details',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/associations/request
   * Doctor or Lab requests access to patient.
   */
  async requestAccess(req: Request, res: Response): Promise<void> {
    try {
      const parsed = requestAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const providerId = session.userId as string;
      const providerRole = session.role as UserRole;

      const association = await associationService.requestAccess(
        providerId,
        providerRole,
        parsed.data.patientId,
        parsed.data.purpose,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        message: 'Access request successfully generated and awaiting patient approval.',
        association,
      });
    } catch (err: any) {
      console.error('[AssociationController] requestAccess error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to request patient access',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/associations/:id/respond
   * Patient responds to an access request (grant CREATE_ONLY, FULL_ACCESS, or REJECT).
   */
  async respondToAccess(req: Request, res: Response): Promise<void> {
    try {
      const associationId = req.params.id as string;
      const parsed = respondAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid response parameters',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const patientId = session.userId as string;

      const association = await associationService.respondToAccessRequest(
        patientId,
        associationId,
        parsed.data.scope,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({
        message: `Access request ${parsed.data.scope === 'REJECT' ? 'rejected' : 'granted successfully'}.`,
        association,
      });
    } catch (err: any) {
      console.error('[AssociationController] respondToAccess error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to respond to access request',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/associations/status
   * Checks current access/consent status with a patient.
   */
  async getAssociationStatus(req: Request, res: Response): Promise<void> {
    try {
      const session = req.session as any;
      const patientId = req.query.patientId as string;
      if (!patientId) {
        res.status(400).json({ error: 'patientId is required', code: 'VALIDATION_ERROR' });
        return;
      }

      const status = await associationService.getAssociationStatus(patientId, session.userId as string);
      res.status(200).json(status);
    } catch (err: any) {
      console.error('[AssociationController] getAssociationStatus error:', err);
      res.status(500).json({
        error: 'Failed to retrieve association status',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

export const associationController = new AssociationController();
