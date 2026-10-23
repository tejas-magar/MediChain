import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Pill,
  Search,
  PlusCircle,
  QrCode,
  Menu,
  X,
  Stethoscope,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  AlertCircle,
  Folder,
  Share2,
  User,
  FlaskConical,
  ShieldCheck,
  ChevronRight,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { isPatient, isDoctor, currentUser, logoutUser } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const patientNav = [
    { label: 'Dashboard', to: '/patient/overview', icon: LayoutDashboard },
    { label: 'Medical Records', to: '/patient/records', icon: FileText },
    { label: 'Medications', to: '/patient/prescriptions', icon: Pill },
    { label: 'Allergies', to: '/patient/records?category=ALLERGIES', icon: AlertTriangle },
    { label: 'Conditions', to: '/patient/records?category=CONDITIONS', icon: AlertCircle },
    { label: 'Medical History', to: '/patient/records', icon: Folder },
    { label: 'Shared Access', to: '/patient/records?tab=shared', icon: Share2 },
    { label: 'Profile', to: '/patient/overview', icon: User },
    { label: 'Verify Document', to: '/verify', icon: QrCode },
  ];

  const doctorNav = [
    { label: 'Dashboard', to: '/doctor/overview', icon: LayoutDashboard },
    { label: 'Prescriptions', to: '/doctor/prescriptions', icon: Pill },
    { label: 'Create Prescription', to: '/doctor/prescriptions/new', icon: PlusCircle },
    { label: 'Find Patient', to: '/doctor/patients', icon: Search },
    { label: 'Verify Document', to: '/verify', icon: QrCode },
  ];

  const labNav = [
    { label: 'Dashboard', to: '/lab/overview', icon: LayoutDashboard },
    { label: 'Lab Reports', to: '/lab/reports', icon: FlaskConical },
    { label: 'Create Lab Report', to: '/lab/reports/new', icon: PlusCircle },
    { label: 'Find Patient', to: '/lab/patients', icon: Search },
    { label: 'Verify Document', to: '/verify', icon: QrCode },
  ];

  const navItems = isPatient ? patientNav : isDoctor ? doctorNav : labNav;
  const roleLabel = isPatient ? 'Patient' : isDoctor ? 'Doctor' : 'Testing Lab';

  const sidebarContent = (
    <aside className="relative flex flex-col h-full bg-white select-none">
      {/* Brand Header (Matching User Screenshot) */}
      <div className="px-6 py-6 border-b border-slate-100 flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
          <Stethoscope className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-slate-900 font-bold text-lg tracking-tight leading-none">
            MediCloud
          </div>
          <div className="text-slate-400 text-xs font-normal mt-1 leading-none">
            Ayushman Bharat Digital Health Hub
          </div>
        </div>
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role & Portal Status */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
          {currentUser ? 'Authenticated Account' : 'Digital Health Access'}
        </div>
        {currentUser ? (
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{roleLabel} Portal</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800">
                VERIFIED
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-300 mt-1 truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {currentUser.mrn || currentUser.licenseNumber || currentUser.email}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                Session Active
              </span>
              <button
                type="button"
                onClick={async () => {
                  await logoutUser();
                  navigate('/login');
                }}
                className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="text-xs font-semibold text-slate-800">Guest Session</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sign in with your ABHA ID or physician credentials to access health records.</div>
            <div className="mt-2 flex gap-1.5">
              <Link
                to="/login"
                className="flex-1 text-center py-1 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors border border-slate-200"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User profile / auth footer (Only displayed for authenticated sessions) */}
      {currentUser && (
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentUser.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-slate-900 text-xs font-bold truncate leading-tight">
                {currentUser.fullName}
              </div>
              <div className="text-slate-400 text-[11px] truncate mt-0.5 font-mono">
                {currentUser.mrn || currentUser.licenseNumber || currentUser.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logoutUser();
              navigate('/login');
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Log Out of MediChain"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-20">
        {sidebarContent}
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </div>

      {/* ── Right panel (header + main) ── */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center px-6 gap-4">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-500 hover:text-slate-900 mr-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / page context */}
          <div className="flex items-center text-xs text-slate-400 gap-1.5 font-medium">
            <span className="text-slate-900 font-semibold">
              {currentUser ? `${roleLabel} Portal` : 'MediCloud Health Network'}
            </span>
            {currentUser && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 truncate max-w-[160px]">{currentUser.fullName}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Zero-knowledge status indicator */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifiable EHR Registry</span>
            </span>

            {/* Auth navigation links */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                  {currentUser.mrn || currentUser.licenseNumber || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    navigate('/login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}

            {/* Avatar - only when authenticated */}
            {currentUser && (
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold ml-1">
                {currentUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-6 sm:px-8 py-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-8 flex items-center justify-between text-xs text-slate-400">
          <span>MediCloud EHR &amp; MediChain ABDM Health Network &bull; Standards-compliant with EHR Guidelines of India &copy; 2026</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            ABDM Privacy Layer Active
          </span>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
