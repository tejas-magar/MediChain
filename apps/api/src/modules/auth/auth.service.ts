import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { keystoreService } from '../../lib/keystore.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface SanitizedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  mrn: string | null;
  licenseNumber: string | null;
  organization: string | null;
  specialty: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string[];
  dateOfBirth: Date | null;
  phone: string | null;
  publicKeyPem: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {

  /**
   * Generates a unique, collision-free Patient ID (MRN)
   * Format: PAT-YYYY-XXXX-HASH (e.g. PAT-2026-8842-E9A2)
   */
  async generateUniquePatientMRN(): Promise<string> {
    const year = new Date().getFullYear();
    let candidate = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 20) {
      attempts++;
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      // Format: ABHA-YYYY-XXXX-HASH (Indian Digital Health ID & Hospital MRN)
      candidate = `ABHA-${year}-${randomDigits}-${suffix}`;

      const found = await prisma.user.findUnique({
        where: { mrn: candidate },
      });
      if (!found) {
        exists = false;
      }
    }

    return candidate;
  }

  /**
   * Registers a new user with proper password hashing, role-specific attributes,
   * auto-generated unique patient IDs, and cryptographic issuer key provisioning.
   */
  async registerUser(input: RegisterInput): Promise<{ user: SanitizedUser; privateKeyPem?: string }> {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      const error = new Error('An account with this email address already exists.');
      (error as any).statusCode = 409;
      (error as any).code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    // If issuer (Doctor or Lab), generate RSA key pair
    let publicKeyPem: string | null = null;
    let privateKeyPem: string | undefined = undefined;

    if (input.role === UserRole.DOCTOR || input.role === UserRole.TESTING_LAB) {
      const keys = keystoreService.generateKeyPair();
      publicKeyPem = keys.publicKeyPem;
      privateKeyPem = keys.privateKeyPem;
    }

    let mrn: string | null = null;
    if (input.role === UserRole.PATIENT) {
      if (input.mrn && input.mrn.trim() !== '') {
        const existingMRN = await prisma.user.findUnique({
          where: { mrn: input.mrn.trim() },
        });
        if (existingMRN) {
          const error = new Error(`Patient ID / MRN '${input.mrn}' is already in use.`);
          (error as any).statusCode = 409;
          (error as any).code = 'MRN_ALREADY_EXISTS';
          throw error;
        }
        mrn = input.mrn.trim();
      } else {
        mrn = await this.generateUniquePatientMRN();
      }
    }

    const created = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        fullName: input.fullName,
        mrn,
        licenseNumber: input.licenseNumber ?? null,
        organization: input.organization ?? null,
        specialty: input.specialty ?? null,
        gender: input.gender ?? null,
        bloodType: input.bloodType ?? null,
        allergies: input.allergies ?? [],
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        phone: input.phone ?? null,
        publicKeyPem,
      },
    });

    // Save private key in local secure keystore
    if (privateKeyPem) {
      keystoreService.saveIssuerKey(created.id, privateKeyPem);
    }

    const user: SanitizedUser = {
      id: created.id,
      email: created.email,
      role: created.role,
      fullName: created.fullName,
      mrn: created.mrn,
      licenseNumber: created.licenseNumber,
      organization: created.organization,
      specialty: created.specialty,
      gender: created.gender,
      bloodType: created.bloodType,
      allergies: created.allergies,
      dateOfBirth: created.dateOfBirth,
      phone: created.phone,
      publicKeyPem: created.publicKeyPem,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return { user, privateKeyPem };
  }

  /**
   * Authenticates a user with email or Patient ID (MRN) and password,
   * with optional portal role validation to guarantee separated portal access.
   */
  async loginUser(input: LoginInput): Promise<SanitizedUser> {
    const identifier = input.email.trim();

    // Query user by email OR unique Patient ID / MRN
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { mrn: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      const error = new Error('Invalid email, Patient ID (MRN), or password.');
      (error as any).statusCode = 401;
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      const error = new Error('Invalid email, Patient ID (MRN), or password.');
      (error as any).statusCode = 401;
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Enforce role separation if login portal specified an expected role
    if (input.expectedRole && user.role !== input.expectedRole) {
      const roleNameMap: Record<UserRole, string> = {
        PATIENT: 'Patient Portal',
        DOCTOR: 'Physician Portal',
        TESTING_LAB: 'Pathology & Diagnostic Lab Portal',
      };
      const expectedPortal = roleNameMap[input.expectedRole] || input.expectedRole;
      const actualPortal = roleNameMap[user.role] || user.role;
      const error = new Error(
        `Portal Access Mismatch: This account is registered for ${actualPortal}, but you are signing in via the ${expectedPortal}. Please switch to the correct portal tab.`
      );
      (error as any).statusCode = 403;
      (error as any).code = 'ROLE_MISMATCH';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      mrn: user.mrn,
      licenseNumber: user.licenseNumber,
      organization: user.organization,
      specialty: user.specialty,
      gender: user.gender,
      bloodType: user.bloodType,
      allergies: user.allergies,
      dateOfBirth: user.dateOfBirth,
      phone: user.phone,
      publicKeyPem: user.publicKeyPem,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Retrieves a sanitized user profile by ID.
   */
  async getUserById(id: string): Promise<SanitizedUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      mrn: user.mrn,
      licenseNumber: user.licenseNumber,
      organization: user.organization,
      specialty: user.specialty,
      gender: user.gender,
      bloodType: user.bloodType,
      allergies: user.allergies,
      dateOfBirth: user.dateOfBirth,
      phone: user.phone,
      publicKeyPem: user.publicKeyPem,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
