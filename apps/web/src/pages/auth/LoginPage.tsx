import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  FlaskConical,
  User,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { UserRole } from '../../types';

interface PortalConfig {
  id: UserRole;
  title: string;
  badge: string;
  description: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  icon: React.ElementType;
  demoUser: {
    label: string;
    email: string;
    pass: string;
    meta: string;
  };
}

const PORTALS: Record<UserRole, PortalConfig> = {
  PATIENT: {
    id: 'PATIENT',
    title: 'Patient Portal',
    badge: 'ABHA & Personal Health Records',
    description: 'Access and review your verifiable medical records, active prescriptions, lab panels, and cryptographic ABHA health certificates.',
    identifierLabel: 'Email or ABHA Number / Patient ID',
    identifierPlaceholder: 'e.g. aarav.sharma@example.in or ABHA-91-8841-1029',
    icon: User,
    demoUser: {
      label: 'Demo Patient: Aarav Sharma (ABHA ID)',
      email: 'aarav.sharma@example.in',
      pass: 'Password123!',
      meta: 'ABHA: 91-8841-1029 • New Delhi',
    },
  },
  DOCTOR: {
    id: 'DOCTOR',
    title: 'Physician Portal',
    badge: 'Clinical EHR & Prescribing (NMC/MCI)',
    description: 'Search verified patients via ABHA ID, issue cryptographically signed prescriptions, and review longitudinal clinical folders.',
    identifierLabel: 'Physician Work Email',
    identifierPlaceholder: 'e.g. dr.rajesh.varma@aiims.edu.in',
    icon: Stethoscope,
    demoUser: {
      label: 'Demo Doctor: Dr. Rajesh Varma, MD, DM',
      email: 'dr.rajesh.varma@aiims.edu.in',
      pass: 'Password123!',
      meta: 'NMC-DL-2018-9412 • AIIMS New Delhi',
    },
  },
  TESTING_LAB: {
    id: 'TESTING_LAB',
    title: 'Pathology & Testing Lab',
    badge: 'Diagnostic Panel Certification (NABL/ICMR)',
    description: 'Process patient specimen test panels, record structured results, and finalize NABL-accredited diagnostic certificates.',
    identifierLabel: 'Laboratory Facility Email',
    identifierPlaceholder: 'e.g. reference.lab@lalpathlabs.com',
    icon: FlaskConical,
    demoUser: {
      label: 'Demo Lab: Dr. Lal PathLabs',
      email: 'reference.lab@lalpathlabs.com',
      pass: 'Password123!',
      meta: 'NABL-MC-88910 • ICMR Reg: 1042',
    },
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role: contextRole, setRole, loginUser } = useRole();

  // Determine initial portal from URL parameter, context, or default to PATIENT
  const urlPortal = searchParams.get('portal')?.toUpperCase() as UserRole;
  const initialPortal: UserRole =
    urlPortal && PORTALS[urlPortal] ? urlPortal : contextRole || 'PATIENT';

  const [activePortal, setActivePortal] = useState<UserRole>(initialPortal);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mismatchRole, setMismatchRole] = useState<UserRole | null>(null);

  const portal = PORTALS[activePortal];
  const Icon = portal.icon;

  const handlePortalSwitch = (newPortal: UserRole) => {
    setActivePortal(newPortal);
    setRole(newPortal);
    setSearchParams({ portal: newPortal.toLowerCase() });
    setErrorMessage(null);
    setMismatchRole(null);
  };

  const fillDemoCredentials = () => {
    setIdentifier(portal.demoUser.email);
    setPassword(portal.demoUser.pass);
    setErrorMessage(null);
    setMismatchRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your identifier and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setMismatchRole(null);

    try {
      // Authenticate with expected role enforcement
      const user = await loginUser(identifier.trim(), password, activePortal);

      // Redirect to role overview
      if (user.role === 'PATIENT') {
        navigate('/patient/overview');
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/overview');
      } else {
        navigate('/lab/overview');
      }
    } catch (err: any) {
      if (err.code === 'ROLE_MISMATCH') {
        setErrorMessage(err.message);
        if (err.message.includes('Physician') || err.message.includes('Doctor')) {
          setMismatchRole('DOCTOR');
        } else if (err.message.includes('Patient')) {
          setMismatchRole('PATIENT');
        } else if (err.message.includes('Lab')) {
          setMismatchRole('TESTING_LAB');
        }
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10">
      {/* Top Header Card */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold mb-3.5 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>MediChain • Ayushman Bharat Digital Mission (ABDM) Compatible</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Select Your Healthcare Portal
        </h1>
        <p className="text-slate-500 text-sm mt-1.5 max-w-lg mx-auto">
          Separated, role-authenticated access for Patients, Licensed Physicians, and Diagnostic Laboratories.
        </p>
      </div>

      {/* Portal Tabs Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {(Object.keys(PORTALS) as UserRole[]).map((r) => {
          const cfg = PORTALS[r];
          const TabIcon = cfg.icon;
          const isSelected = activePortal === r;

          return (
            <button
              key={r}
              type="button"
              onClick={() => handlePortalSwitch(r)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <TabIcon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div>
                <div
                  className={`text-sm font-bold leading-tight ${
                    isSelected ? 'text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {cfg.title}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {cfg.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Login Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Portal Information Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{portal.title} Sign In</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                  Secure
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{portal.description}</p>
            </div>
          </div>

          {/* Quick Demo Fill Button */}
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/80 transition-colors self-start sm:self-auto"
            title="Auto-fill verified demo test account credentials"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Auto-fill Demo</span>
          </button>
        </div>

        {/* Mismatch Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">{errorMessage}</div>
                {mismatchRole && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch(mismatchRole)}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-rose-900 underline hover:no-underline"
                  >
                    Switch to {PORTALS[mismatchRole].title} now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {portal.identifierLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={portal.identifierPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-sans"
                required
              />
            </div>
            {activePortal === 'PATIENT' && (
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                You can sign in using your registered email OR your auto-generated ABHA ID / Patient ID (e.g. ABHA-91-8841-1029).
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Encrypted &amp; Salted (Cost 12)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {portal.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo Account Quick-Selection Card */}
        <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Preset Demo Account Available</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">{portal.demoUser.label}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {portal.demoUser.email} • {portal.demoUser.meta}
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shrink-0"
            >
              Load Credentials
            </button>
          </div>

          {/* Registration Navigation */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <span>
              Need a new account?{' '}
              <Link
                to={`/register?role=${activePortal.toLowerCase()}`}
                className="font-bold text-slate-900 hover:underline"
              >
                Register as {portal.title.replace(' Portal', '')}
              </Link>
            </span>
            <Link
              to="/verify"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              Verify a QR code without logging in <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
