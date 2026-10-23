import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('MediLedger Authentication & Role Enforcement API', () => {
  const testPatient = {
    email: `patient_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'PATIENT',
    fullName: 'Jane Doe',
    dateOfBirth: '1985-04-12',
    phone: '+1-555-0199',
  };

  const testDoctor = {
    email: `doctor_${Date.now()}@example.com`,
    password: 'DocPassword123!',
    role: 'DOCTOR',
    fullName: 'Dr. Gregory House',
    licenseNumber: 'MD-CAL-89211',
    organization: 'Princeton-Plainsboro Teaching Hospital',
  };

  const testLab = {
    email: `lab_${Date.now()}@example.com`,
    password: 'LabPassword123!',
    role: 'TESTING_LAB',
    fullName: 'Alex Vance, Lead Technologist',
    licenseNumber: 'CLIA-99812-CA',
    organization: 'BioCore Reference Laboratories',
  };

  afterAll(async () => {
    // Clean up created test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testPatient.email, testDoctor.email, testLab.email],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('User Registration (POST /api/auth/register)', () => {
    it('successfully registers a Patient with valid credentials and sets session cookie', async () => {
      const res = await request(app).post('/api/auth/register').send(testPatient);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testPatient.email);
      expect(res.body.user.role).toBe('PATIENT');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Check session cookie
      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.startsWith('mediledger.sid='))).toBe(true);
    });

    it('rejects registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app).post('/api/auth/register').send(testPatient);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('successfully registers a Doctor and provisions RSA digital signing keypair', async () => {
      const res = await request(app).post('/api/auth/register').send(testDoctor);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('DOCTOR');
      expect(res.body.user.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(res.body.issuerPrivateKeyPem).toContain('BEGIN PRIVATE KEY');
    });

    it('rejects Doctor registration without required license number (400 Bad Request)', async () => {
      const invalidDoctor = {
        email: `doc_no_lic_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'DOCTOR',
        fullName: 'Dr. No License',
      };

      const res = await request(app).post('/api/auth/register').send(invalidDoctor);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('successfully registers a Testing Lab with organization details', async () => {
      const res = await request(app).post('/api/auth/register').send(testLab);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('TESTING_LAB');
      expect(res.body.user.organization).toBe(testLab.organization);
      expect(res.body.user.publicKeyPem).toBeDefined();
    });
  });

  describe('User Login & Session Management (POST /api/auth/login)', () => {
    it('rejects invalid password with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testDoctor.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('successfully logs in Doctor and returns session cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testDoctor.email,
        password: testDoctor.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testDoctor.email);
      expect(res.body.user.role).toBe('DOCTOR');

      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.startsWith('mediledger.sid='))).toBe(true);
    });
  });

  describe('Session Inspection (GET /api/auth/me)', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'AUTH_REQUIRED');
    });

    it('returns authenticated user profile when valid session cookie is provided', async () => {
      const agent = request.agent(app);

      // Log in
      await agent.post('/api/auth/login').send({
        email: testDoctor.email,
        password: testDoctor.password,
      });

      // Fetch profile
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(testDoctor.email);
      expect(meRes.body.user.role).toBe('DOCTOR');
    });
  });

  describe('Strict Role-Based Access Enforcement', () => {
    it('allows Doctor to access Doctor-only route and denies Lab-only route (403 Forbidden)', async () => {
      const doctorAgent = request.agent(app);
      await doctorAgent.post('/api/auth/login').send({
        email: testDoctor.email,
        password: testDoctor.password,
      });

      // Doctor accessing doctor route -> Allowed
      const docRouteRes = await doctorAgent.get('/api/test/doctor-only');
      expect(docRouteRes.status).toBe(200);
      expect(docRouteRes.body.access).toBe('granted');

      // Doctor accessing lab route -> Strictly Forbidden
      const labRouteRes = await doctorAgent.get('/api/test/lab-only');
      expect(labRouteRes.status).toBe(403);
      expect(labRouteRes.body.code).toBe('ROLE_FORBIDDEN');
      expect(labRouteRes.body.currentRole).toBe('DOCTOR');
    });

    it('allows Testing Lab to access Lab-only route and denies Doctor-only route (403 Forbidden)', async () => {
      const labAgent = request.agent(app);
      await labAgent.post('/api/auth/login').send({
        email: testLab.email,
        password: testLab.password,
      });

      // Lab accessing lab route -> Allowed
      const labRouteRes = await labAgent.get('/api/test/lab-only');
      expect(labRouteRes.status).toBe(200);
      expect(labRouteRes.body.access).toBe('granted');

      // Lab accessing doctor route -> Strictly Forbidden
      const docRouteRes = await labAgent.get('/api/test/doctor-only');
      expect(docRouteRes.status).toBe(403);
      expect(docRouteRes.body.code).toBe('ROLE_FORBIDDEN');
      expect(docRouteRes.body.currentRole).toBe('TESTING_LAB');
    });

    it('denies Patient access to both Doctor and Lab clinical routes (403 Forbidden)', async () => {
      const patientAgent = request.agent(app);
      await patientAgent.post('/api/auth/login').send({
        email: testPatient.email,
        password: testPatient.password,
      });

      // Patient accessing patient route -> Allowed
      const patientRouteRes = await patientAgent.get('/api/test/patient-only');
      expect(patientRouteRes.status).toBe(200);

      // Patient accessing doctor route -> Forbidden
      const docRes = await patientAgent.get('/api/test/doctor-only');
      expect(docRes.status).toBe(403);

      // Patient accessing lab route -> Forbidden
      const labRes = await patientAgent.get('/api/test/lab-only');
      expect(labRes.status).toBe(403);
    });
  });

  describe('User Logout (POST /api/auth/logout)', () => {
    it('terminates the active session and prevents subsequent access', async () => {
      const agent = request.agent(app);

      await agent.post('/api/auth/login').send({
        email: testPatient.email,
        password: testPatient.password,
      });

      // Verify authenticated
      const meBefore = await agent.get('/api/auth/me');
      expect(meBefore.status).toBe(200);

      // Logout
      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);

      // Subsequent access must fail
      const meAfter = await agent.get('/api/auth/me');
      expect(meAfter.status).toBe(401);
    });
  });

  describe('Portal Separation & Unique Patient ID (MRN) Auto-Generation', () => {
    let autoPatientMRN = '';
    const autoPatientEmail = `auto_mrn_${Date.now()}@example.com`;

    it('auto-generates a unique Patient ID (MRN) when patient registers without providing one', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: autoPatientEmail,
        password: 'Password123!',
        role: 'PATIENT',
        fullName: 'Auto ID Patient',
        gender: 'Male',
        bloodType: 'B+',
        allergies: ['Dust'],
      });

      expect(res.status).toBe(201);
      expect(res.body.user.mrn).toBeDefined();
      expect(res.body.user.mrn).toMatch(/^(ABHA|PAT)-\d{4}-\d{4}-[A-F0-9]{4}$/);
      autoPatientMRN = res.body.user.mrn;
    });

    it('allows patient to authenticate using their auto-generated Patient ID (MRN)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: autoPatientMRN, // Passing MRN in the identifier field
        password: 'Password123!',
        expectedRole: 'PATIENT',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(autoPatientEmail);
      expect(res.body.user.mrn).toBe(autoPatientMRN);
    });

    it('enforces portal separation and rejects doctor attempting to login to Patient Portal (403 ROLE_MISMATCH)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testDoctor.email,
        password: testDoctor.password,
        expectedRole: 'PATIENT', // Trying to enter patient portal with doctor account
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_MISMATCH');
    });

    it('allows doctor to login to Physician Portal with expectedRole DOCTOR', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testDoctor.email,
        password: testDoctor.password,
        expectedRole: 'DOCTOR',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('DOCTOR');
    });

    it('allows lab to login to Testing Lab Portal with expectedRole TESTING_LAB', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testLab.email,
        password: testLab.password,
        expectedRole: 'TESTING_LAB',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('TESTING_LAB');
    });
  });
});

