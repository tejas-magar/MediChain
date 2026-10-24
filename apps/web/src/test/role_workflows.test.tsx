import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleProvider } from '../context/RoleContext';
import { ToastProvider } from '../components/ui/Toast';
import { AppLayout } from '../components/layout/AppLayout';
import { mockService } from '../services/mockService';

// Patient pages
import { PatientOverview } from '../pages/patient/PatientOverview';
import { PatientFolder } from '../pages/patient/PatientFolder';
import { PatientPrescriptions } from '../pages/patient/PatientPrescriptions';
import { PatientLabReports } from '../pages/patient/PatientLabReports';

// Doctor pages
import { DoctorOverview } from '../pages/doctor/DoctorOverview';
import { PatientSearch } from '../pages/doctor/PatientSearch';
import { CreatePrescription } from '../pages/doctor/CreatePrescription';
import { DoctorPrescriptions } from '../pages/doctor/DoctorPrescriptions';

// Lab pages
import { LabOverview } from '../pages/lab/LabOverview';
import { CreateLabReport } from '../pages/lab/CreateLabReport';
import { LabReports } from '../pages/lab/LabReports';

// Shared pages
import { DocumentDetail } from '../pages/shared/DocumentDetail';
import { VerifyDocument } from '../pages/shared/VerifyDocument';

const renderWithContext = (initialRoute: string = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RoleProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Patient */}
              <Route path="patient/overview" element={<PatientOverview />} />
              <Route path="patient/records" element={<PatientFolder />} />
              <Route path="patient/prescriptions" element={<PatientPrescriptions />} />
              <Route path="patient/lab-reports" element={<PatientLabReports />} />

              {/* Doctor */}
              <Route path="doctor/overview" element={<DoctorOverview />} />
              <Route path="doctor/patients" element={<PatientSearch />} />
              <Route path="doctor/prescriptions/new" element={<CreatePrescription />} />
              <Route path="doctor/prescriptions" element={<DoctorPrescriptions />} />

              {/* Lab */}
              <Route path="lab/overview" element={<LabOverview />} />
              <Route path="lab/reports/new" element={<CreateLabReport />} />
              <Route path="lab/reports" element={<LabReports />} />

              {/* Shared */}
              <Route path="documents/:id" element={<DocumentDetail />} />
              <Route path="verify/:token" element={<VerifyDocument />} />
              <Route path="verify" element={<VerifyDocument />} />
            </Route>
          </Routes>
        </ToastProvider>
      </RoleProvider>
    </MemoryRouter>
  );
};

describe('Phase 2 Role-Specific Workflows & Synthetic Data', () => {
  beforeEach(() => {
    localStorage.clear();
    mockService.resetToDefault();
  });

  describe('Patient Screens & Security Boundaries', () => {
    beforeEach(() => {
      localStorage.setItem('mediledger_active_role', 'PATIENT');
      localStorage.setItem(
        'mediledger_auth_user',
        JSON.stringify({
          id: '7cebd1b0-69b2-4c75-a06c-c5eceb035ff1',
          fullName: 'Aarav Sharma',
          role: 'PATIENT',
          mrn: 'ABHA-91-8841-1029',
          email: 'aarav.sharma@example.in',
          dateOfBirth: '1988-06-14',
          gender: 'Male',
          bloodType: 'B+',
          allergies: ['Penicillin'],
        })
      );
    });

    it('renders Patient Overview with health summary and metrics', async () => {
      renderWithContext('/patient/overview');
      await waitFor(() => {
        expect(screen.getAllByText(/Aarav Sharma|Eleanor Vance/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Active Prescriptions/i)).toBeDefined();
        expect(screen.getByText(/Lab Reports|Lab Diagnostic Panels/i)).toBeDefined();
        expect(screen.getByText(/Recent Clinical Records|Recent Official Clinical Records/i)).toBeDefined();
      });
    });

    it('renders Patient Medical Folder with category tabs and document list', async () => {
      renderWithContext('/patient/records');
      await waitFor(() => {
        expect(screen.getAllByText(/Medical Records|Patient Medical Folder/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Antihypertensive Titrated Maintenance Regimen/i)).toBeDefined();
      });
    });

    it('patient folder NEVER displays edit, delete, sign, or finalize actions on finalized documents', async () => {
      renderWithContext('/patient/records');
      await waitFor(() => {
        expect(screen.getAllByText(/Medical Records|Patient Medical Folder/i).length).toBeGreaterThan(0);
      });
      // Verify unauthorized mutation controls do not exist for patients
      expect(screen.queryByRole('button', { name: /^Edit$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Delete$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Sign Record$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Finalize$/i })).toBeNull();

      // Authorized controls exist
      const viewButtons = screen.getAllByRole('button', { name: /^View$/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it('renders Document Detail page and allows requesting correction without editing official record', async () => {
      renderWithContext('/patient/records');
      await waitFor(() => {
        expect(screen.getByText(/Antihypertensive Titrated Maintenance Regimen/i)).toBeDefined();
      });

      // Click the document title link to navigate to document detail
      const docLink = screen.getByText(/Antihypertensive Titrated Maintenance Regimen/i);
      fireEvent.click(docLink);

      await waitFor(() => {
        expect(screen.getAllByText(/RX-2026-0041/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Telmisartan|Lisinopril/i).length).toBeGreaterThan(0);
      });

      // Authorized actions only
      expect(screen.getByRole('button', { name: /Request Correction/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Print Record/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /^Edit Record$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Delete Record$/i })).toBeNull();

      // Open correction request modal
      fireEvent.click(screen.getByRole('button', { name: /Request Correction/i }));
      await waitFor(() => {
        expect(screen.getByText(/Request Document Correction/i)).toBeDefined();
        expect(screen.getByText(/Official clinical records are cryptographically sealed and cannot be edited or deleted/i)).toBeDefined();
      });
    });
  });

  describe('Doctor Screens & Prescription Workflow', () => {
    beforeEach(() => {
      localStorage.setItem('mediledger_active_role', 'DOCTOR');
      localStorage.setItem(
        'mediledger_auth_user',
        JSON.stringify({
          id: 'DOC-101',
          fullName: 'Dr. Rajesh Varma, MD, DM',
          role: 'DOCTOR',
          email: 'dr.rajesh.varma@aiims.edu.in',
          licenseNumber: 'NMC-DL-2018-9412',
          organization: 'AIIMS New Delhi • Department of Cardiology',
        })
      );
    });

    it('renders Doctor Overview with clinical registry and quick actions', async () => {
      renderWithContext('/doctor/overview');
      await waitFor(() => {
        expect(screen.getAllByText(/Dr\. Rajesh Varma|Dr\. Evelyn Reed/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Create Prescription/i).length).toBeGreaterThan(0);
      });
    });

    it('renders Patient Search allowing selection for new prescription', async () => {
      renderWithContext('/doctor/patients');
      await waitFor(() => {
        expect(screen.getByText(/Aarav Sharma/i)).toBeDefined();
        expect(screen.getByText(/ABHA-91-8841-1029/i)).toBeDefined();
      });
    });

    it('validates required fields in Prescription Creation Form and rejects invalid submissions', async () => {
      renderWithContext('/doctor/prescriptions/new');
      await waitFor(() => {
        expect(screen.getByText(/Create Clinical Prescription/i)).toBeDefined();
      });

      // Try previewing with empty form
      const previewButton = screen.getByRole('button', { name: /Preview & Finalize Prescription/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText(/Prescription title is required/i)).toBeDefined();
        expect(screen.getByText(/Primary clinical diagnosis is required/i)).toBeDefined();
        expect(screen.getByText(/Medication #1 name is required/i)).toBeDefined();
        expect(screen.getByText(/Medication #1 strength is required/i)).toBeDefined();
        expect(screen.getByText(/You must confirm review of the patient allergy profile/i)).toBeDefined();
      });
    });

    it('successfully finalizes a prescription through preview and sign flow', async () => {
      renderWithContext('/doctor/prescriptions/new');
      await waitFor(() => {
        expect(screen.getByText(/Create Clinical Prescription/i)).toBeDefined();
      });

      // Check the allergy acknowledgment checkbox
      const allergyCheckbox = screen.getByLabelText(/I certify that I have verified this patient's documented allergy history/i);
      fireEvent.click(allergyCheckbox);

      // Fill in required prescription fields
      const titleInput = screen.getByPlaceholderText(/e\.g\. Antihypertensive Dual Therapy/i);
      fireEvent.change(titleInput, { target: { value: 'Metformin Therapy for Type 2 Diabetes' } });

      const diagnosisInput = screen.getByPlaceholderText(/e\.g\. Essential \(primary\) hypertension/i);
      fireEvent.change(diagnosisInput, { target: { value: 'Type 2 Diabetes Mellitus' } });

      const planInput = screen.getByPlaceholderText(/e\.g\. Take daily in the morning/i);
      fireEvent.change(planInput, { target: { value: 'Take one tablet twice daily with meals.' } });

      const medNameInput = screen.getByPlaceholderText(/e\.g\. Lisinopril, Metformin HCl, Amoxicillin/i);
      fireEvent.change(medNameInput, { target: { value: 'Metformin HCl' } });

      const strengthInput = screen.getByPlaceholderText(/e\.g\. 10 mg, 500 mg, 250 mg\/5mL/i);
      fireEvent.change(strengthInput, { target: { value: '500 mg' } });

      const instructionsInput = screen.getByPlaceholderText(/e\.g\. Take 1 tablet daily by mouth in the morning with food/i);
      fireEvent.change(instructionsInput, { target: { value: 'Take 1 tablet twice daily with breakfast and dinner.' } });

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Preview & Finalize Prescription/i }));

      // Preview modal appears
      await waitFor(() => {
        expect(screen.getByText(/Clinical Prescription Preview & Cryptographic Finalization/i)).toBeDefined();
        expect(screen.getAllByText(/Metformin Therapy for Type 2 Diabetes/i).length).toBeGreaterThan(0);
      });

      // Confirm finalization
      const signButton = screen.getByRole('button', { name: /Sign & Finalize Record/i });
      fireEvent.click(signButton);

      // Verify prescription was recorded in mock storage
      await waitFor(() => {
        const docs = mockService.getDocuments();
        const created = docs.find((d) => d.title === 'Metformin Therapy for Type 2 Diabetes');
        expect(created).toBeDefined();
        expect(created?.status).toBe('FINALIZED');
        expect(created?.fileHash).toBeDefined();
        expect(created?.verificationToken).toBeDefined();
      });
    });
  });

  describe('Testing Lab Screens & Lab Report Workflow', () => {
    beforeEach(() => {
      localStorage.setItem('mediledger_active_role', 'TESTING_LAB');
      localStorage.setItem(
        'mediledger_auth_user',
        JSON.stringify({
          id: 'LAB-201',
          fullName: 'Dr. Lal PathLabs & Diagnostics',
          role: 'TESTING_LAB',
          email: 'reference.lab@lalpathlabs.com',
          licenseNumber: 'NABL-MC-88910 (ICMR Reg: 1042)',
          organization: 'National Reference Laboratory, New Delhi',
        })
      );
    });

    it('renders Lab Overview with laboratory metrics and quick actions', async () => {
      renderWithContext('/lab/overview');
      await waitFor(() => {
        expect(screen.getAllByText(/Dr\. Lal PathLabs|Apex Clinical Reference Laboratories/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Create Lab Report/i).length).toBeGreaterThan(0);
      });
    });

    it('validates required fields in Lab Report Creation Form and rejects empty submissions', async () => {
      renderWithContext('/lab/reports/new');
      await waitFor(() => {
        expect(screen.getByText(/Create Diagnostic Laboratory Report/i)).toBeDefined();
      });

      const previewBtn = screen.getByRole('button', { name: /Preview & Finalize Lab Report/i });
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(screen.getByText(/Laboratory report title is mandatory/i)).toBeDefined();
        expect(screen.getByText(/Technologist validation remarks are mandatory/i)).toBeDefined();
        expect(screen.getByText(/Parameter #1 observed value is required/i)).toBeDefined();
      });
    });

    it('successfully finalizes a lab report through preview and sign flow', async () => {
      renderWithContext('/lab/reports/new');
      await waitFor(() => {
        expect(screen.getByText(/Create Diagnostic Laboratory Report/i)).toBeDefined();
      });

      // Fill in report title
      const titleInput = screen.getByPlaceholderText(/e\.g\. Comprehensive Metabolic Panel \(CMP-14\)/i);
      fireEvent.change(titleInput, { target: { value: 'Endocrine Thyroid Function Panel' } });

      // Fill in the result values
      const valueInputs = screen.getAllByPlaceholderText(/e\.g\. 95, 1\.05/i);
      fireEvent.change(valueInputs[0]!, { target: { value: '88' } });
      fireEvent.change(valueInputs[1]!, { target: { value: '0.85' } });

      // Fill in technologist remarks
      const remarksInput = screen.getByPlaceholderText(/e\.g\. Specimen received on ice within protocol window/i);
      fireEvent.change(remarksInput, { target: { value: 'Specimen verified and analyzed under standard calibrated conditions.' } });

      // Open Preview Modal
      fireEvent.click(screen.getByRole('button', { name: /Preview & Finalize Lab Report/i }));

      await waitFor(() => {
        expect(screen.getByText(/Laboratory Report Preview & Cryptographic Finalization/i)).toBeDefined();
        expect(screen.getAllByText(/Endocrine Thyroid Function Panel/i).length).toBeGreaterThan(0);
      });

      // Confirm and Sign
      const signBtn = screen.getByRole('button', { name: /Sign & Finalize Report/i });
      fireEvent.click(signBtn);

      await waitFor(() => {
        const docs = mockService.getDocuments();
        const created = docs.find((d) => d.title === 'Endocrine Thyroid Function Panel');
        expect(created).toBeDefined();
        expect(created?.status).toBe('FINALIZED');
      });
    });
  });

  describe('Document Verification & Ledger Integrity', () => {
    it('verifies valid token and transparently states Mock Ledger status without claiming real blockchain is live', async () => {
      renderWithContext('/verify/tok_rx_8841_01_c8d194ae');

      await waitFor(() => {
        expect(screen.getByText(/Public Document Verification Portal/i)).toBeDefined();
        expect(screen.getByText(/Official Record Authenticity Confirmed/i)).toBeDefined();
        expect(screen.getAllByText(/Local Hardhat Node/i).length).toBeGreaterThan(0);
      });
    });

    it('accurately identifies superseded documents in version history', async () => {
      renderWithContext('/verify/tok_rx_8840_01_a7f9c2e4');

      await waitFor(() => {
        expect(screen.getByText(/Document Version Superseded/i)).toBeDefined();
        expect(screen.getByText(/superseded by an amended version/i)).toBeDefined();
      });
    });
  });
});
