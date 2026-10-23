import bcrypt from 'bcrypt';
import { UserRole, AssociationStatus } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { keystoreService } from './lib/keystore.js';

async function seed() {
  console.log('🌱 Seeding clinical demo users and associations into database...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Patient: Aarav Sharma (ABHA ID)
  const patient = await prisma.user.upsert({
    where: { email: 'aarav.sharma@example.in' },
    update: {
      fullName: 'Aarav Sharma',
      mrn: 'ABHA-91-8841-1029',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'Male',
      bloodType: 'B+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      phone: '+91 98765 43210',
    },
    create: {
      email: 'aarav.sharma@example.in',
      passwordHash,
      role: UserRole.PATIENT,
      fullName: 'Aarav Sharma',
      mrn: 'ABHA-91-8841-1029',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'Male',
      bloodType: 'B+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      phone: '+91 98765 43210',
    },
  });
  console.log(`✅ Seeded Patient: ${patient.fullName} (${patient.mrn})`);

  // Also retain Eleanor Vance for regression test compatibility
  await prisma.user.upsert({
    where: { email: 'eleanor.vance@example.com' },
    update: { fullName: 'Eleanor Vance', mrn: 'MRN-8841-A' },
    create: {
      email: 'eleanor.vance@example.com',
      passwordHash,
      role: UserRole.PATIENT,
      fullName: 'Eleanor Vance',
      mrn: 'MRN-8841-A',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'Female',
      bloodType: 'A+',
      allergies: ['Penicillin'],
      phone: '+91 98765 43210',
    },
  });

  // 2. Doctor: Dr. Rajesh Varma, MD, DM (AIIMS New Delhi)
  let doctorKey = keystoreService.getOrCreateIssuerKey('rajesh-varma-doc-id');
  const doctor = await prisma.user.upsert({
    where: { email: 'dr.rajesh.varma@aiims.edu.in' },
    update: {
      fullName: 'Dr. Rajesh Varma, MD, DM',
      licenseNumber: 'NMC-DL-2018-9412',
      organization: 'AIIMS New Delhi • Department of Cardiology',
      specialty: 'Cardiovascular Medicine & Interventional Cardiology',
      publicKeyPem: doctorKey.publicKeyPem,
    },
    create: {
      email: 'dr.rajesh.varma@aiims.edu.in',
      passwordHash,
      role: UserRole.DOCTOR,
      fullName: 'Dr. Rajesh Varma, MD, DM',
      licenseNumber: 'NMC-DL-2018-9412',
      organization: 'AIIMS New Delhi • Department of Cardiology',
      specialty: 'Cardiovascular Medicine & Interventional Cardiology',
      publicKeyPem: doctorKey.publicKeyPem,
    },
  });
  keystoreService.saveIssuerKey(doctor.id, doctorKey.privateKeyPem);
  console.log(`✅ Seeded Doctor: ${doctor.fullName} (${doctor.licenseNumber})`);

  // Retain Marcus Vance for existing tests
  await prisma.user.upsert({
    where: { email: 'marcus.vance@example.com' },
    update: { fullName: 'Dr. Marcus Vance, MD', licenseNumber: 'NMC-DL-9021-X' },
    create: {
      email: 'marcus.vance@example.com',
      passwordHash,
      role: UserRole.DOCTOR,
      fullName: 'Dr. Marcus Vance, MD',
      licenseNumber: 'NMC-DL-9021-X',
      organization: 'AIIMS New Delhi',
      specialty: 'Cardiology',
      publicKeyPem: doctorKey.publicKeyPem,
    },
  });

  // 3. Testing Lab: Dr. Lal PathLabs & Diagnostics
  let labKey = keystoreService.getOrCreateIssuerKey('lalpathlabs-lab-id');
  const lab = await prisma.user.upsert({
    where: { email: 'reference.lab@lalpathlabs.com' },
    update: {
      fullName: 'Dr. Lal PathLabs & Diagnostics',
      licenseNumber: 'NABL-MC-88910 (ICMR Certified)',
      organization: 'National Reference Laboratory, New Delhi',
      publicKeyPem: labKey.publicKeyPem,
    },
    create: {
      email: 'reference.lab@lalpathlabs.com',
      passwordHash,
      role: UserRole.TESTING_LAB,
      fullName: 'Dr. Lal PathLabs & Diagnostics',
      licenseNumber: 'NABL-MC-88910 (ICMR Certified)',
      organization: 'National Reference Laboratory, New Delhi',
      publicKeyPem: labKey.publicKeyPem,
    },
  });
  keystoreService.saveIssuerKey(lab.id, labKey.privateKeyPem);
  console.log(`✅ Seeded Lab: ${lab.fullName} (${lab.licenseNumber})`);

  // Retain BioCore for existing tests
  await prisma.user.upsert({
    where: { email: 'biocore.lab@example.com' },
    update: { fullName: 'BioCore Diagnostic Laboratories', licenseNumber: 'NABL-88910-DL' },
    create: {
      email: 'biocore.lab@example.com',
      passwordHash,
      role: UserRole.TESTING_LAB,
      fullName: 'BioCore Diagnostic Laboratories',
      licenseNumber: 'NABL-88910-DL',
      organization: 'National Reference Laboratory',
      publicKeyPem: labKey.publicKeyPem,
    },
  });

  // 4. Clinical Associations
  await prisma.patientAssociation.upsert({
    where: {
      patientId_providerId: {
        patientId: patient.id,
        providerId: doctor.id,
      },
    },
    update: {
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date(),
      purpose: 'Cardiovascular care and primary clinical care management',
    },
    create: {
      patientId: patient.id,
      providerId: doctor.id,
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date(),
      purpose: 'Cardiovascular care and primary clinical care management',
    },
  });
  console.log('✅ Established Active Patient-Doctor Association');

  await prisma.patientAssociation.upsert({
    where: {
      patientId_providerId: {
        patientId: patient.id,
        providerId: lab.id,
      },
    },
    update: {
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date(),
      purpose: 'Diagnostic panel orders and laboratory specimen reporting',
    },
    create: {
      patientId: patient.id,
      providerId: lab.id,
      status: AssociationStatus.ACTIVE,
      confirmedAt: new Date(),
      purpose: 'Diagnostic panel orders and laboratory specimen reporting',
    },
  });
  console.log('✅ Established Active Patient-Lab Association');

  console.log('🎉 Seeding successfully completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
