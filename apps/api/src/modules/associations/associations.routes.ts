import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { associationController } from './associations.controller.js';

export const associationRouter = Router();

// Lookup patient requires active session and DOCTOR or TESTING_LAB role
associationRouter.post(
  '/lookup',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  associationController.lookupPatient
);

// Establish association requires DOCTOR or TESTING_LAB role
associationRouter.post(
  '/',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  associationController.createAssociation
);

// Doctor / Lab requests clinical access from patient
associationRouter.post(
  '/request',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  associationController.requestAccess
);

// Patient grants or denies access with granular scope
associationRouter.post(
  '/:id/respond',
  requireAuth,
  requireRole(UserRole.PATIENT),
  associationController.respondToAccess
);

// Check current association / consent status with a patient
associationRouter.get(
  '/status',
  requireAuth,
  associationController.getAssociationStatus
);

// Get my associations is open to any authenticated user (Patient, Doctor, Lab)
associationRouter.get('/my', requireAuth, associationController.getMyAssociations);

// List all registered patients from database (for DOCTOR or TESTING_LAB)
associationRouter.get(
  '/patients',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  associationController.getAllPatients
);

// Get specific patient by ID from database
associationRouter.get(
  '/patients/:id',
  requireAuth,
  requireRole(UserRole.DOCTOR, UserRole.TESTING_LAB),
  associationController.getPatientById
);

// Revoke association
associationRouter.post('/:id/revoke', requireAuth, associationController.revokeAssociation);
