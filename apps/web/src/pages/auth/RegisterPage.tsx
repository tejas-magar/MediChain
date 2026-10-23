import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  FlaskConical,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Award,
  Activity,
  Heart,
  Copy,
  Check,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { UserRole } from '../../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { registerUser } = useRole();

  // Role selector state
  const urlRole = searchParams.get('role')?.toUpperCase() as UserRole;
  const initialRole: UserRole =
    urlRole && (urlRole === 'PATIENT' || urlRole === 'DOCTOR' || urlRole === 'TESTING_LAB')
      ? urlRole
      : 'PATIENT';

  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);

  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Patient specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Female');
  const [bloodType, setBloodType] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');

  // Doctor specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology & Internal Medicine');

  // Lab specific fields
  const [cliaNumber, setCliaNumber] = useState('');
  const [labFacilityName, setLabFacilityName] = useState('');

  // Submission state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success modal/card state
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setSearchParams({ role: role.toLowerCase() });
    setErrorMessage(null);
  };

  const copyPatientId = () => {
    if (registrationSuccess?.user?.mrn) {
      navigator.clipboard.writeText(registrationSuccess.user.mrn);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage(
        'Password must be at least 8 characters long and contain at least one uppercase letter and one number.'
      );
      return;
    }

    if (activeRole === 'DOCTOR' && !licenseNumber.trim()) {
      setErrorMessage('Medical License Number is required for Physician registration.');
      return;
    }

    if (activeRole === 'TESTING_LAB' && !labFacilityName.trim()) {
      setErrorMessage('Laboratory or Facility Name is required for Diagnostic Lab registration.');
      return;
    }

    setIsLoading(true);

    try {
      const allergiesList = allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload: any = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: activeRole,
        phone: phone.trim() || undefined,
      };

      if (activeRole === 'PATIENT') {
        let parsedDob: string | undefined = undefined;
        if (dateOfBirth && dateOfBirth.trim()) {
          const parsed = Date.parse(dateOfBirth.trim());
          if (!isNaN(parsed)) {
            parsedDob = new Date(parsed).toISOString();
          }
        }
        payload.dateOfBirth = parsedDob;
        payload.gender = gender;
        payload.bloodType = bloodType;
        payload.allergies = allergiesList;
      } else if (activeRole === 'DOCTOR') {
        payload.licenseNumber = licenseNumber.trim();
        payload.organization = organization.trim() || undefined;
        payload.specialty = specialty.trim() || undefined;
      } else if (activeRole === 'TESTING_LAB') {
        payload.licenseNumber = cliaNumber.trim() || undefined;
        payload.organization = labFacilityName.trim();
      }

      const res = await registerUser(payload);
      setRegistrationSuccess(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check the provided information.');
    } finally {
      setIsLoading(false);
    }
  };

  // If registered successfully, show rich confirmation & Digital Health ID card
  if (registrationSuccess) {
    const user = registrationSuccess.user;
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-3">
            Registration Complete
          </span>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome to MediChain, {user.fullName}!
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 max-w-md mx-auto">
            Your clinical account has been created and registered on the secure healthcare network.
          </p>

          {/* Digital Health ID Card (Especially prominent for Patient) */}
          <div className="mt-8 text-left bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <ShieldCheck className="w-40 h-40" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-wider uppercase text-slate-300">
                    ABDM Digital Health ID
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Ayushman Bharat Verifiable Health Profile
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {user.role}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                  Full Legal Name
                </span>
                <span className="font-bold text-base text-white">{user.fullName}</span>
              </div>

              {user.mrn && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                    Auto-Generated Unique ABHA / Patient ID
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-emerald-300 text-base">
                      {user.mrn}
                    </span>
                    <button
                      type="button"
                      onClick={copyPatientId}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Patient ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {user.role === 'DOCTOR' && (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      Medical License
                    </span>
                    <span className="font-mono font-semibold text-white">{user.licenseNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      Specialty &amp; Affiliation
                    </span>
                    <span className="font-medium text-slate-200">
                      {user.specialty} • {user.organization}
                    </span>
                  </div>
                </>
              )}

              {user.role === 'TESTING_LAB' && (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      Accreditation / Facility
                    </span>
                    <span className="font-medium text-white">{user.organization}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      CLIA Certification
                    </span>
                    <span className="font-mono font-semibold text-emerald-300">{user.licenseNumber || 'Active'}</span>
                  </div>
                </>
              )}

              {user.role === 'PATIENT' && (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      Blood Group &amp; Gender
                    </span>
                    <span className="font-medium text-slate-200">
                      {user.bloodType || 'A+'} • {user.gender || 'Female'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      Allergy Alerts
                    </span>
                    <span className="font-medium text-amber-300">
                      {user.allergies && user.allergies.length > 0 ? user.allergies.join(', ') : 'None Reported'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Verified Status
              </span>
              <span className="font-mono">Created: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                if (user.role === 'PATIENT') navigate('/patient/overview');
                else if (user.role === 'DOCTOR') navigate('/doctor/overview');
                else navigate('/lab/overview');
              }}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {user.role === 'PATIENT' && (
              <button
                type="button"
                onClick={() => navigate('/patient/records')}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-all"
              >
                View Medical Records Folder
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold mb-3.5 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ABDM • Ayushman Bharat Digital Mission Compatible</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Register on MediChain Health Registry
        </h1>
        <p className="text-slate-500 text-sm mt-1.5 max-w-md mx-auto">
          Choose your clinical role to begin. Unique ABHA Patient IDs are generated automatically with cryptographic verification.
        </p>
      </div>

      {/* Role Picker */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { id: 'PATIENT', label: 'Patient', sub: 'Personal Health Records', icon: User },
          { id: 'DOCTOR', label: 'Physician', sub: 'Licensed Medical Doctor', icon: Stethoscope },
          { id: 'TESTING_LAB', label: 'Pathology Lab', sub: 'Diagnostic Laboratory', icon: FlaskConical },
        ].map((tab) => {
          const isSelected = activeRole === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleRoleChange(tab.id as UserRole)}
              className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <TabIcon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-bold leading-none">{tab.label}</div>
                <div
                  className={`text-[10px] mt-1 font-normal ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {tab.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Registration Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMessage}</div>
          </div>
        )}

        {/* Auto ID Notice for Patient */}
        {activeRole === 'PATIENT' && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950">
                Automatic Unique ABHA ID &amp; Patient MRN Generation
              </div>
              <div className="text-emerald-800 text-[11px] mt-0.5">
                Upon registration, a unique Ayushman Bharat Health Account (ABHA) ID (e.g.{' '}
                <span className="font-mono font-semibold">ABHA-2026-XXXX-XXXX</span>) will be automatically assigned to you. You can use this ID to sign in and share verified medical folders with doctors and labs.
              </div>
            </div>
          </div>
        )}

        {/* Doctor Key Provisioning Notice */}
        {activeRole === 'DOCTOR' && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 text-blue-900 text-xs flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-950">
                Physician Credentialing (NMC / State Medical Council)
              </div>
              <div className="text-blue-800 text-[11px] mt-0.5">
                Registered with the National Medical Commission (NMC) or State Medical Council. An authorized RSA-2048 signing keypair will be provisioned automatically for digitally signing prescriptions.
              </div>
            </div>
          </div>
        )}

        {/* Lab Key Provisioning Notice */}
        {activeRole === 'TESTING_LAB' && (
          <div className="mb-6 p-4 rounded-xl bg-purple-50/80 border border-purple-200/90 text-purple-900 text-xs flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-purple-950">
                Diagnostic Laboratory Accreditation (NABL / ICMR)
              </div>
              <div className="text-purple-800 text-[11px] mt-0.5">
                Accredited testing laboratories receive an independent cryptographic issuer certificate conforming to NABL / ICMR digital pathology standards.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Basic Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={activeRole === 'DOCTOR' ? 'Dr. Jane Smith, MD' : 'Eleanor Vance'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* Section: Password & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Min 8 chars, 1 Uppercase, 1 Digit</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Role-Specific Fields: PATIENT */}
          {activeRole === 'PATIENT' && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Clinical &amp; Demographic Profile</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Blood Group
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Clinical Allergies &amp; Drug Sensitivities (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Latex, Peanuts"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Role-Specific Fields: DOCTOR */}
          {activeRole === 'DOCTOR' && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-500" />
                <span>Physician Licensure &amp; Clinical Affiliation</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    NMC / Medical Council Registration No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. NMC-DL-2018-9412 or MCI-18492"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Clinical Specialty
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Internal Medicine, Neurology"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Hospital / Clinical Practice Name
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. AIIMS New Delhi / Apollo Hospitals / Fortis Healthcare"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Role-Specific Fields: TESTING LAB */}
          {activeRole === 'TESTING_LAB' && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-purple-500" />
                <span>Laboratory Facility &amp; Certification</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Laboratory Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={labFacilityName}
                    onChange={(e) => setLabFacilityName(e.target.value)}
                    placeholder="e.g. Dr. Lal PathLabs & Diagnostics / SRL Diagnostics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    NABL Accreditation / ICMR Number
                  </label>
                  <input
                    type="text"
                    value={cliaNumber}
                    onChange={(e) => setCliaNumber(e.target.value)}
                    placeholder="e.g. NABL-MC-88910 or ICMR-REG-1042"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Provisioning Account &amp; Digital Identity...</span>
                </>
              ) : (
                <>
                  <span>
                    Create {activeRole === 'PATIENT' ? 'Patient' : activeRole === 'DOCTOR' ? 'Doctor' : 'Lab'} Account
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing account footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            to={`/login?portal=${activeRole.toLowerCase()}`}
            className="font-bold text-slate-900 hover:underline"
          >
            Sign in to your {activeRole === 'PATIENT' ? 'Patient' : activeRole === 'DOCTOR' ? 'Doctor' : 'Lab'} Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
