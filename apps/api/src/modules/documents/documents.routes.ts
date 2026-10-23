import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { documentController } from './documents.controller.js';
import { env } from '../../config/env.js';

export const documentRouter = Router();

// Multer in-memory upload handler with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
});

const handleMulterUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: `File upload exceeds the allowable limit of ${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
          code: 'PAYLOAD_TOO_LARGE',
        });
        return;
      }
      res.status(400).json({
        error: err.message || 'File upload error',
        code: 'UPLOAD_ERROR',
      });
      return;
    }
    next();
  });
};

// Prescription routes (Doctor only)
documentRouter.post(
  '/prescriptions/preview',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  documentController.previewPrescription
);

documentRouter.post(
  '/prescriptions/finalize',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  documentController.finalizePrescription
);

// Lab Report routes (Testing Lab only)
documentRouter.post(
  '/lab-reports/preview',
  requireAuth,
  requireRole(UserRole.TESTING_LAB),
  documentController.previewLabReport
);

documentRouter.post(
  '/lab-reports/finalize',
  requireAuth,
  requireRole(UserRole.TESTING_LAB),
  documentController.finalizeLabReport
);

// Private File Upload (Doctors & Labs)
documentRouter.post(
  '/upload',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  handleMulterUpload,
  documentController.uploadFile
);

// Document Amendment (Original Issuer only)
documentRouter.post(
  '/:id/amend',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  documentController.amendDocument
);

// Direct document update rejection (Immutability enforcement)
documentRouter.put(
  '/:id',
  requireAuth,
  documentController.updateDocumentDirectly
);

// Document Listing (Role filtered)
documentRouter.get(
  '/',
  requireAuth,
  documentController.listDocuments
);

// Document Detail (Access control checked server-side)
documentRouter.get(
  '/:id',
  requireAuth,
  documentController.getDocument
);

// Document File Download (Access control checked server-side)
documentRouter.get(
  '/:id/file',
  requireAuth,
  documentController.downloadFile
);

// Document Version History & Audit Log
documentRouter.get(
  '/:id/history',
  requireAuth,
  documentController.getDocumentHistory
);
