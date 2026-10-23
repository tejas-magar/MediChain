import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, PatientProfile } from '../types';
import { MOCK_PATIENTS, MOCK_DOCTOR, MOCK_TESTING_LAB } from '../services/mockData';
import { apiClient, RegisterPayload } from '../services/apiClient';

export interface AuthenticatedUser {
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
  dateOfBirth: string | null;
  phone: string | null;
}

interface UserContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: AuthenticatedUser | null;
  loginUser: (identifier: string, pass: string, expectedRole?: UserRole) => Promise<AuthenticatedUser>;
  registerUser: (data: RegisterPayload) => Promise<{ user: AuthenticatedUser; issuerPrivateKeyPem?: string }>;
  logoutUser: () => Promise<void>;
  activePatient: PatientProfile;
  activeDoctor: typeof MOCK_DOCTOR;
  activeLab: typeof MOCK_TESTING_LAB;
  isPatient: boolean;
  isDoctor: boolean;
  isLab: boolean;
  backendUserId?: string;
}

const RoleContext = createContext<UserContextValue | undefined>(undefined);

const ROLE_STORAGE_KEY = 'mediledger_active_role';
const USER_STORAGE_KEY = 'mediledger_auth_user';

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
      if (saved === 'PATIENT' || saved === 'DOCTOR' || saved === 'TESTING_LAB') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'PATIENT';
  });

  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [backendUserId, setBackendUserId] = useState<string | undefined>(() => currentUser?.id);

  // Sync session on mount or check /me
  useEffect(() => {
    apiClient
      .getMe()
      .then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
          setBackendUserId(res.user.id);
          setRoleState(res.user.role);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
          localStorage.setItem(ROLE_STORAGE_KEY, res.user.role);
        }
      })
      .catch(() => {
        // Not logged in or expired session
      });
  }, []);

  // Strictly enforce role locking: If user is logged in, role is always currentUser.role
  const effectiveRole: UserRole = currentUser ? currentUser.role : role;

  const setRole = (newRole: UserRole) => {
    // SECURITY ENFORCEMENT: A logged-in user cannot toggle roles.
    // To access a different role portal, they must log out and authenticate with the appropriate credentials.
    if (currentUser) {
      console.warn(
        `[RoleContext] Unauthorized role toggle blocked: Active session is locked to role '${currentUser.role}'. Please sign out first to access another portal.`
      );
      return;
    }
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch (e) {
      console.warn('Could not save role:', e);
    }
  };

  const loginUser = async (identifier: string, pass: string, expectedRole?: UserRole): Promise<AuthenticatedUser> => {
    const res = await apiClient.login(identifier, pass, expectedRole);
    const user = res.user as AuthenticatedUser;
    setCurrentUser(user);
    setBackendUserId(user.id);
    setRoleState(user.role);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_STORAGE_KEY, user.role);
    return user;
  };

  const registerUser = async (data: RegisterPayload) => {
    const res = await apiClient.register(data);
    const user = res.user as AuthenticatedUser;
    setCurrentUser(user);
    setBackendUserId(user.id);
    setRoleState(user.role);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_STORAGE_KEY, user.role);
    return res as { user: AuthenticatedUser; issuerPrivateKeyPem?: string };
  };

  const logoutUser = async () => {
    try {
      await apiClient.logout();
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    setCurrentUser(null);
    setBackendUserId(undefined);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Dynamic profile with fallback to rich mock data
  const basePatient = MOCK_PATIENTS[0] as PatientProfile;
  const activePatient: PatientProfile = (currentUser && currentUser.role === 'PATIENT')
    ? {
        id: currentUser.id,
        fullName: currentUser.fullName,
        mrn: currentUser.mrn || basePatient.mrn,
        dateOfBirth: (currentUser.dateOfBirth ? currentUser.dateOfBirth.split('T')[0] : null) || basePatient.dateOfBirth,
        gender: (currentUser.gender as any) || basePatient.gender,
        bloodType: currentUser.bloodType || basePatient.bloodType,
        allergies: (currentUser.allergies && currentUser.allergies.length > 0) ? currentUser.allergies : basePatient.allergies,
        phone: currentUser.phone || basePatient.phone,
        email: currentUser.email || basePatient.email,
      }
    : basePatient;

  const activeDoctor = (currentUser && currentUser.role === 'DOCTOR')
    ? {
        ...MOCK_DOCTOR,
        id: currentUser.id,
        fullName: currentUser.fullName,
        licenseNumber: currentUser.licenseNumber || MOCK_DOCTOR.licenseNumber,
        organization: currentUser.organization || MOCK_DOCTOR.organization,
        specialty: currentUser.specialty || MOCK_DOCTOR.specialty,
      }
    : MOCK_DOCTOR;

  const activeLab = (currentUser && currentUser.role === 'TESTING_LAB')
    ? {
        ...MOCK_TESTING_LAB,
        id: currentUser.id,
        fullName: currentUser.fullName,
        licenseNumber: currentUser.licenseNumber || MOCK_TESTING_LAB.licenseNumber,
        organization: currentUser.organization || MOCK_TESTING_LAB.organization,
      }
    : MOCK_TESTING_LAB;

  const value: UserContextValue = {
    role: effectiveRole,
    setRole,
    currentUser,
    loginUser,
    registerUser,
    logoutUser,
    activePatient,
    activeDoctor,
    activeLab,
    isPatient: effectiveRole === 'PATIENT',
    isDoctor: effectiveRole === 'DOCTOR',
    isLab: effectiveRole === 'TESTING_LAB',
    backendUserId,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = (): UserContextValue => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
