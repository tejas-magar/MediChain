import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { documentService } from './documents.service.js';
import { storageService } from '../../lib/storage.js';
import {
  createPrescriptionSchema,
  createLabReportSchema,
  amendDocumentSchema,
} from './documents.schemas.js';

export class DocumentController {
  /**
   * Endpoint: POST /api/documents/prescriptions/preview
   */
  async previewPrescription(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createPrescriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for prescription preview',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const preview = await documentService.previewPrescription(
        session.userId as string,
        session.role as UserRole,
        parsed.data
      );

      res.status(200).json({ preview });
    } catch (err: any) {
      console.error('[DocumentController] previewPrescription error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to generate prescription preview',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/documents/prescriptions/finalize
   */
  async finalizePrescription(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createPrescriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for prescription finalization',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const document = await documentService.finalizePrescription(
        session.userId as string,
        session.role as UserRole,
        parsed.data,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        message: 'Prescription successfully finalized, signed, and recorded.',
        document,
      });
    } catch (err: any) {
      console.error('[DocumentController] finalizePrescription error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to finalize prescription',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/documents/lab-reports/preview
   */
  async previewLabReport(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createLabReportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for lab report preview',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const preview = await documentService.previewLabReport(
        session.userId as string,
        session.role as UserRole,
        parsed.data
      );

      res.status(200).json({ preview });
    } catch (err: any) {
      console.error('[DocumentController] previewLabReport error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to generate lab report preview',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/documents/lab-reports/finalize
   */
  async finalizeLabReport(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createLabReportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for lab report finalization',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const document = await documentService.finalizeLabReport(
        session.userId as string,
        session.role as UserRole,
        parsed.data,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        message: 'Lab report successfully finalized, signed, and recorded.',
        document,
      });
    } catch (err: any) {
      console.error('[DocumentController] finalizeLabReport error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to finalize lab report',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/documents/upload
   * Private file upload with magic byte validation and size limit enforcement.
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'No file was uploaded in the request.',
          code: 'FILE_REQUIRED',
        });
        return;
      }

      // Strict Magic Byte Inspection
      const validation = storageService.validateMagicBytes(req.file.buffer);
      if (!validation.isValid || !validation.detectedMime) {
        res.status(400).json({
          error: validation.error || 'Invalid file format. Only verified PDF, PNG, JPEG, and JSON documents are permitted.',
          code: 'INVALID_FILE_TYPE',
        });
        return;
      }

      const stored = await storageService.storeFile(req.file.buffer, validation.detectedMime);

      res.status(201).json({
        message: 'File successfully validated and safely stored in private repository.',
        file: stored,
      });
    } catch (err: any) {
      console.error('[DocumentController] uploadFile error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'File upload processing failed',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: POST /api/documents/:id/amend
   */
  async amendDocument(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = amendDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed for document amendment',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const session = req.session as any;
      const updated = await documentService.amendDocument(
        id,
        session.userId as string,
        session.role as UserRole,
        parsed.data,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({
        message: 'Document amendment successfully recorded as a new immutable version.',
        document: updated,
      });
    } catch (err: any) {
      console.error('[DocumentController] amendDocument error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to amend document',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: PUT /api/documents/:id (Direct overwrite test endpoint)
   * Enforces immutability: Rejects attempts to directly overwrite finalized records.
   */
  async updateDocumentDirectly(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await documentService.rejectDirectOverwrite(id);

      // If document is not finalized (draft), it would proceed. Otherwise rejected above.
      res.status(200).json({ message: 'Draft document updated.' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        error: err.message,
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/documents
   */
  async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const session = req.session as any;
      const documents = await documentService.listDocuments(
        session.userId as string,
        session.role as UserRole
      );

      res.status(200).json({ documents });
    } catch (err: any) {
      console.error('[DocumentController] listDocuments error:', err);
      res.status(500).json({
        error: 'Failed to retrieve documents',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/documents/:id
   */
  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const session = req.session as any;

      const document = await documentService.getDocumentById(
        id,
        session.userId as string,
        session.role as UserRole,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({ document });
    } catch (err: any) {
      console.error('[DocumentController] getDocument error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to retrieve document',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/documents/:id/file
   * Enforces server-side download authorization and nosniff security headers.
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const session = req.session as any;

      const { buffer, mimeType, safeFilename } = await documentService.downloadDocumentFile(
        id,
        session.userId as string,
        session.role as UserRole,
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.status(200).send(buffer);
    } catch (err: any) {
      console.error('[DocumentController] downloadFile error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to download document file',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/documents/:id/history
   */
  async getDocumentHistory(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const session = req.session as any;

      const history = await documentService.getDocumentHistory(
        id,
        session.userId as string,
        session.role as UserRole
      );

      res.status(200).json(history);
    } catch (err: any) {
      console.error('[DocumentController] getDocumentHistory error:', err);
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to retrieve document history',
        code: err.code || 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Endpoint: GET /api/verify/:token
   * Public zero-knowledge verification endpoint.
   */
  async verifyByToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token as string;
      const verification = await documentService.verifyByToken(token);

      if (!verification) {
        res.status(404).json({
          error: 'Document verification record not found for this token.',
          code: 'TOKEN_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({ verification });
    } catch (err: any) {
      console.error('[DocumentController] verifyByToken error:', err);
      res.status(500).json({
        error: 'Failed to complete verification inquiry',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

export const documentController = new DocumentController();
