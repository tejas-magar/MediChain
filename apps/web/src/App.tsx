import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';

// Patient Pages
import { PatientOverview } from './pages/patient/PatientOverview';
import { PatientFolder } from './pages/patient/PatientFolder';
import { PatientPrescriptions } from './pages/patient/PatientPrescriptions';
import { PatientLabReports } from './pages/patient/PatientLabReports';

// Doctor Pages
import { DoctorOverview } from './pages/doctor/DoctorOverview';
import { PatientSearch } from './pages/doctor/PatientSearch';
import { CreatePrescription } from './pages/doctor/CreatePrescription';
import { DoctorPrescriptions } from './pages/doctor/DoctorPrescriptions';

// Testing Lab Pages
import { LabOverview } from './pages/lab/LabOverview';
import { CreateLabReport } from './pages/lab/CreateLabReport';
import { LabReports } from './pages/lab/LabReports';

// Shared Pages
import { DocumentDetail } from './pages/shared/DocumentDetail';
import { VerifyDocument } from './pages/shared/VerifyDocument';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import { UserRole } from './types';

// Role home redirector
const RoleHomeRedirect: React.FC = () => {
  const { isPatient, isDoctor } = useRole();
  if (isPatient) return <Navigate to="/patient/overview" replace />;
  if (isDoctor) return <Navigate to="/doctor/overview" replace />;
  return <Navigate to="/lab/overview" replace />;
};

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const { role, currentUser } = useRole();
  const effectiveRole = currentUser ? currentUser.role : role;

  if (effectiveRole !== allowedRole) {
    if (effectiveRole === 'PATIENT') return <Navigate to="/patient/overview" replace />;
    if (effectiveRole === 'DOCTOR') return <Navigate to="/doctor/overview" replace />;
    return <Navigate to="/lab/overview" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Default redirect to active role home */}
              <Route index element={<RoleHomeRedirect />} />

              {/* Patient Routes */}
              <Route path="patient/overview" element={<ProtectedRoute allowedRole="PATIENT"><PatientOverview /></ProtectedRoute>} />
              <Route path="patient/records" element={<ProtectedRoute allowedRole="PATIENT"><PatientFolder /></ProtectedRoute>} />
              <Route path="patient/prescriptions" element={<ProtectedRoute allowedRole="PATIENT"><PatientPrescriptions /></ProtectedRoute>} />
              <Route path="patient/lab-reports" element={<ProtectedRoute allowedRole="PATIENT"><PatientLabReports /></ProtectedRoute>} />

              {/* Doctor Routes */}
              <Route path="doctor/overview" element={<ProtectedRoute allowedRole="DOCTOR"><DoctorOverview /></ProtectedRoute>} />
              <Route path="doctor/patients" element={<ProtectedRoute allowedRole="DOCTOR"><PatientSearch /></ProtectedRoute>} />
              <Route path="doctor/prescriptions/new" element={<ProtectedRoute allowedRole="DOCTOR"><CreatePrescription /></ProtectedRoute>} />
              <Route path="doctor/prescriptions" element={<ProtectedRoute allowedRole="DOCTOR"><DoctorPrescriptions /></ProtectedRoute>} />

              {/* Testing Lab Routes */}
              <Route path="lab/overview" element={<ProtectedRoute allowedRole="TESTING_LAB"><LabOverview /></ProtectedRoute>} />
              <Route path="lab/patients" element={<ProtectedRoute allowedRole="TESTING_LAB"><PatientSearch /></ProtectedRoute>} />
              <Route path="lab/reports/new" element={<ProtectedRoute allowedRole="TESTING_LAB"><CreateLabReport /></ProtectedRoute>} />
              <Route path="lab/reports" element={<ProtectedRoute allowedRole="TESTING_LAB"><LabReports /></ProtectedRoute>} />

              {/* Shared Document & Verification Routes */}
              <Route path="documents/:id" element={<DocumentDetail />} />
              <Route path="verify" element={<VerifyDocument />} />
              <Route path="verify/:token" element={<VerifyDocument />} />

              {/* Authentication & Registration Routes */}
              <Route path="login" element={<LoginPage />} />
              <Route path="login/:role" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="register/:role" element={<RegisterPage />} />

              {/* Fallback */}
              <Route path="*" element={<RoleHomeRedirect />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </ToastProvider>
  );
};

export default App;
