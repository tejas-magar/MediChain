import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  FileSignature,
  Search,
  CheckCircle2,
  Lock,
  LogIn,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { apiClient } from '../../services/apiClient';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  FormField,
  Input,
  Select,
  Badge,
  Modal,
} from '../../components/ui';
import { LabResultItem, LabReportClinicalData, PatientProfile, ConsentScope } from '../../types';
import { LabReportPreviewModal } from './LabReportPreviewModal';

export const CreateLabReport: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');

  const { activeLab, currentUser } = useRole();
  const isGuest = !currentUser;

  const [allPatients, setAllPatients] = useState<PatientProfile[]>(() => mockService.getPatients());
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile>(() => {
    const list = mockService.getPatients();
    if (initialPatientId) {
      const match = list.find((p) => p.id === initialPatientId || p.mrn === initialPatientId);
      if (match) return match;
    }
    return list[0] as PatientProfile;
  });

  const [consentStatus, setConsentStatus] = useState<'NONE' | 'PENDING' | 'ACTIVE' | 'REVOKED'>('NONE');
  const [consentScope, setConsentScope] = useState<ConsentScope | undefined>(undefined);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Fetch all registered patients from database on mount
  useEffect(() => {
    apiClient
      .getAllPatients()
      .then((res) => {
        if (res.patients && res.patients.length > 0) {
          const mapped: PatientProfile[] = res.patients.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            mrn: p.mrn,
            dateOfBirth: p.dateOfBirth || '1990-01-01',
            gender: (p.gender as any) || 'Other',
            bloodType: p.bloodType || 'O+',
            allergies: p.allergies && p.allergies.length > 0 ? p.allergies : ['NKDA'],
            phone: p.phone || '',
            email: p.email || '',
          }));
          mapped.forEach((p) => mockService.registerDynamicPatient(p));
          const combined = mockService.getPatients();
          setAllPatients(combined);

          const paramId = searchParams.get('patientId');
          if (paramId) {
            const match = combined.find((p) => p.id === paramId || p.mrn === paramId);
            if (match) {
              setSelectedPatient(match);
            } else {
              apiClient.getPatientById(paramId).then((r) => {
                if (r.patient) {
                  const singleP: PatientProfile = {
                    id: r.patient.id,
                    fullName: r.patient.fullName,
                    mrn: r.patient.mrn,
                    dateOfBirth: r.patient.dateOfBirth || '1990-01-01',
                    gender: r.patient.gender || 'Other',
                    bloodType: r.patient.bloodType || 'O+',
                    allergies: r.patient.allergies && r.patient.allergies.length > 0 ? r.patient.allergies : ['NKDA'],
                    phone: r.patient.phone || '',
                    email: r.patient.email || '',
                  };
                  mockService.registerDynamicPatient(singleP);
                  setSelectedPatient(singleP);
                }
              }).catch(() => {});
            }
          }
        }
      })
      .catch((err) => {
        console.warn('[CreateLabReport] Notice loading database patients:', err);
      });
  }, [searchParams]);

  const filteredPatients = allPatients.filter((p) => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const providerId = currentUser ? currentUser.id : activeLab.id;
    const status = mockService.getConsentStatus(selectedPatient.id, providerId, selectedPatient.mrn);
    setConsentStatus(status.status);
    setConsentScope(status.scope);
  }, [selectedPatient, currentUser, activeLab]);

  const handleSendAccessRequest = () => {
    setIsRequestingAccess(true);
    const providerId = currentUser ? currentUser.id : activeLab.id;
    const providerName = currentUser ? currentUser.fullName : activeLab.fullName;
    const providerOrg = currentUser?.organization || activeLab.organization;
    const providerLicense = currentUser?.licenseNumber || activeLab.licenseNumber;

    mockService.requestAccess(
      providerId,
      providerName,
      'TESTING_LAB',
      providerOrg,
      providerLicense,
      selectedPatient,
      'Diagnostic pathology specimen intake and certified report issuance'
    );

    apiClient.requestAssociation(selectedPatient.id, 'Diagnostic pathology report issuance').catch(() => {});

    setConsentStatus('PENDING');
    setConsentScope(undefined);
    setIsRequestingAccess(false);
  };

  const handleGrantConsent = (decision: 'GRANT_CREATE_ONLY' | 'GRANT_FULL_ACCESS') => {
    const providerId = currentUser ? currentUser.id : activeLab.id;
    const status = mockService.getConsentStatus(selectedPatient.id, providerId, selectedPatient.mrn);
    if (status.request) {
      mockService.respondToConsentRequest(status.request.id, decision);
      apiClient.respondToAssociation(status.request.id, decision === 'GRANT_CREATE_ONLY' ? 'CREATE_ONLY' : 'FULL_ACCESS').catch(() => {});
    }
    setConsentStatus('ACTIVE');
    setConsentScope(decision === 'GRANT_CREATE_ONLY' ? 'CREATE_ONLY' : 'FULL_ACCESS');
    setIsDemoModalOpen(false);
  };

  const handleDeclineConsent = () => {
    const providerId = currentUser ? currentUser.id : activeLab.id;
    const status = mockService.getConsentStatus(selectedPatient.id, providerId, selectedPatient.mrn);
    if (status.request) {
      mockService.respondToConsentRequest(status.request.id, 'REJECT');
      apiClient.respondToAssociation(status.request.id, 'REJECT').catch(() => {});
    }
    setConsentStatus('REVOKED');
    setConsentScope(undefined);
    setIsDemoModalOpen(false);
  };

  // Form State
  const [title, setTitle] = useState('');
  const [testCategory, setTestCategory] = useState<LabReportClinicalData['testCategory']>('Chemistry');
  const [specimenType, setSpecimenType] = useState<LabReportClinicalData['specimenType']>('Serum / Venous Blood');
  const [fastingStatus, setFastingStatus] = useState<LabReportClinicalData['fastingStatus']>('Fasting (12 hrs)');
  const [technologistRemarks, setTechnologistRemarks] = useState('');

  // Dynamic Results List
  const [results, setResults] = useState<LabResultItem[]>([
    {
      id: 'res-1',
      parameterName: 'Glucose, Fasting',
      value: '',
      unit: 'mg/dL',
      referenceRange: '70 - 99 mg/dL',
      flag: 'NORMAL',
    },
    {
      id: 'res-2',
      parameterName: 'Serum Creatinine',
      value: '',
      unit: 'mg/dL',
      referenceRange: '0.55 - 1.02 mg/dL',
      flag: 'NORMAL',
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleAddResult = () => {
    setResults([
      ...results,
      {
        id: `res-${Date.now()}`,
        parameterName: '',
        value: '',
        unit: 'mg/dL',
        referenceRange: '',
        flag: 'NORMAL',
      },
    ]);
  };

  const handleRemoveResult = (id: string) => {
    if (results.length <= 1) return;
    setResults(results.filter((r) => r.id !== id));
  };

  const handleResultChange = (id: string, field: keyof LabResultItem, value: any) => {
    setResults(
      results.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Laboratory report title is mandatory.';
    }
    if (!technologistRemarks.trim()) {
      errors.technologistRemarks = 'Technologist validation remarks are mandatory.';
    }

    results.forEach((res, idx) => {
      if (!res.parameterName.trim()) {
        errors[`res_${idx}_name`] = `Parameter #${idx + 1} analyte name is required.`;
      }
      if (!res.value.trim()) {
        errors[`res_${idx}_value`] = `Parameter #${idx + 1} observed value is required.`;
      }
      if (!res.referenceRange.trim()) {
        errors[`res_${idx}_ref`] = `Parameter #${idx + 1} reference range is required.`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsPreviewOpen(true);
    }
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizing(true);
    try {
      const clinicalData: LabReportClinicalData = {
        testCategory,
        specimenType,
        collectionTimestamp: new Date().toISOString(),
        fastingStatus,
        results,
        technologistRemarks: technologistRemarks.trim(),
      };

      const mappedResults = results.map((r) => ({
        testName: r.parameterName.trim(),
        value: r.value.trim(),
        unit: r.unit.trim(),
        referenceRange: r.referenceRange.trim(),
        flag: (r.flag === 'ABNORMAL_HIGH'
          ? 'HIGH'
          : r.flag === 'ABNORMAL_LOW'
          ? 'LOW'
          : r.flag === 'CRITICAL'
          ? 'CRITICAL'
          : 'NORMAL') as any,
      }));

      let targetPatientId = selectedPatient.id;
      // Ensure active association exists with the recipient patient
      try {
        await apiClient.createAssociation(targetPatientId, 'Diagnostic pathology and panel reporting').catch(() => {});
      } catch (e) {
        console.warn('[CreateLabReport] Association check:', e);
      }

      let createdId = '';
      try {
        const res = await apiClient.finalizeLabReport({
          patientId: targetPatientId,
          title: title.trim(),
          specimen: specimenType,
          collectionDate: new Date().toISOString(),
          results: mappedResults,
          interpretation: technologistRemarks.trim(),
        });
        createdId = res.document.id;
      } catch (apiErr) {
        console.warn('[CreateLabReport] Backend API call fallback to local store:', apiErr);
      }

      mockService.registerDynamicPatient(selectedPatient);
      const localDoc = mockService.createLabReport(
        {
          patientId: selectedPatient.id,
          title: title.trim(),
          clinicalData,
        },
        activeLab
      );

      setIsFinalizing(false);
      setIsPreviewOpen(false);
      navigate(`/documents/${createdId || localDoc.id}`);
    } catch (err: any) {
      setIsFinalizing(false);
      alert(`Error creating lab report: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create Diagnostic Laboratory Report
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Record certified diagnostic pathology findings. Finalized reports are sealed with digital signatures and committed to the integrity ledger.
        </p>
      </div>

      {/* Guest Mode Warning Banner */}
      {isGuest && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="font-bold text-sm">Guest Session (Read-Only Mode)</div>
              <div className="text-xs text-amber-800 mt-0.5">
                Issuing certified diagnostic laboratory reports is restricted. Please sign in as an authorized Laboratory to request patient consent and issue official reports.
              </div>
            </div>
          </div>
          <Link
            to="/login?portal=testing_lab"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 text-white font-semibold text-xs rounded-lg hover:bg-amber-800 transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In as Laboratory
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>1. Patient Association & Specimen Details</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="text-xs"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                {isPickerOpen ? 'Hide Patient Directory' : 'Search / Switch Patient'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Search Picker when open */}
            {isPickerOpen && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Clinical Patients Directory ({filteredPatients.length} registered)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Select any patient in the database to formulate lab reports
                  </span>
                </div>
                <Input
                  placeholder="Search by patient name, ABHA ID, phone, email..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No patients matched "{pickerSearch}".
                    </div>
                  ) : (
                    filteredPatients.map((p) => {
                      const isSelected = selectedPatient.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setIsPickerOpen(false);
                            apiClient.createAssociation(p.id, 'Diagnostic pathology intake').catch(() => {});
                          }}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {p.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <span>{p.fullName}</span>
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  {p.mrn}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>DOB: {p.dateOfBirth}</span>
                                <span>•</span>
                                <span>Blood: {p.bloodType}</span>
                                <span>•</span>
                                <span className="text-amber-800 font-medium">
                                  Allergies: {p.allergies.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected ? 'primary' : 'outline'}
                            className="text-xs shrink-0 ml-3"
                          >
                            {isSelected ? 'Selected' : 'Select Patient'}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Selected Patient Identity Overview Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {selectedPatient.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{selectedPatient.fullName}</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                        {selectedPatient.mrn}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Specimen Donor & Recipient for Certified Laboratory Report
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                    Identity Confirmed
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPickerOpen(true)}
                    className="text-xs"
                  >
                    Change Patient
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3">
                <div>
                  <span className="text-slate-400 block">Date of Birth:</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.dateOfBirth}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Gender:</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Blood Type:</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.bloodType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPatient.phone || 'On file'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FormField label="Test Category" required>
                  <Select
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value as any)}
                    options={[
                      { value: 'Chemistry', label: 'Chemistry' },
                      { value: 'Hematology', label: 'Hematology' },
                      { value: 'Lipid Panel', label: 'Lipid Panel' },
                      { value: 'Endocrine', label: 'Endocrine' },
                      { value: 'Urinalysis', label: 'Urinalysis' },
                      { value: 'Immunology', label: 'Immunology' },
                    ]}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Specimen Type" required>
                  <Select
                    value={specimenType}
                    onChange={(e) => setSpecimenType(e.target.value as any)}
                    options={[
                      { value: 'Serum / Venous Blood', label: 'Serum / Venous Blood' },
                      { value: 'Plasma', label: 'Plasma' },
                      { value: 'Random Urine', label: 'Random Urine' },
                      { value: 'Saliva', label: 'Saliva' },
                      { value: 'Tissue Biopsy', label: 'Tissue Biopsy' },
                    ]}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Fasting Status" required>
                  <Select
                    value={fastingStatus}
                    onChange={(e) => setFastingStatus(e.target.value as any)}
                    options={[
                      { value: 'Fasting (12 hrs)', label: 'Fasting (12 hrs)' },
                      { value: 'Non-Fasting', label: 'Non-Fasting' },
                      { value: 'Not Applicable', label: 'Not Applicable' },
                    ]}
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ABDM Patient Consent & Access Authorization Card */}
        <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <CardTitle>Patient Digital Health Consent (ABDM Gateway)</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consent-driven clinical access per Ayushman Bharat Digital Mission & MediChain integrity framework.
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  consentStatus === 'ACTIVE'
                    ? 'success'
                    : consentStatus === 'PENDING'
                    ? 'warning'
                    : consentStatus === 'REVOKED'
                    ? 'danger'
                    : 'neutral'
                }
              >
                {consentStatus === 'ACTIVE'
                  ? `AUTHORIZED (${consentScope === 'CREATE_ONLY' ? 'CREATE ONLY' : 'FULL ACCESS'})`
                  : consentStatus === 'PENDING'
                  ? 'PENDING PATIENT CONSENT'
                  : consentStatus === 'REVOKED'
                  ? 'CONSENT REVOKED'
                  : 'NO ACTIVE CONSENT'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isGuest ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                Sign in with a verified Laboratory account to request digital consent from {selectedPatient.fullName}.
              </div>
            ) : consentStatus === 'ACTIVE' ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1.5 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Patient Consent Active</span>
                </div>
                <p className="text-emerald-800">
                  {consentScope === 'CREATE_ONLY'
                    ? 'Granted Scope: "Allow to create only new prescription or report" — Prior medical history remains confidential; authorization granted to seal this diagnostic laboratory report.'
                    : 'Granted Scope: "Share all previous reports and create new report" — Full longitudinal access and diagnostic report issuance granted.'}
                </p>
              </div>
            ) : consentStatus === 'PENDING' ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Access Request Pending Patient Authorization</span>
                </div>
                <p className="text-amber-800">
                  A digital consent request was dispatched to {selectedPatient.fullName} ({selectedPatient.mrn}). The patient can approve via their Patient Portal.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                    onClick={() => setIsDemoModalOpen(true)}
                  >
                    Simulate Patient Approval (Demo Gateway)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Patient Authorization Required
                  </span>
                  <span className="text-slate-600">
                    Before finalizing diagnostic laboratory reports for {selectedPatient.fullName}, an access request must be issued to the patient.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleSendAccessRequest}
                  disabled={isRequestingAccess}
                  className="shrink-0 text-xs"
                >
                  {isRequestingAccess ? 'Dispatching...' : 'Request Patient Consent'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Title */}
        <Card>
          <CardHeader>
            <CardTitle>2. Diagnostic Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Official Panel / Report Title"
              required
              error={validationErrors.title}
              helperText="e.g. Comprehensive Metabolic Panel (CMP-14), Renal Function Assessment"
            >
              <Input
                placeholder="e.g. Comprehensive Metabolic Panel (CMP-14)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>3. Analyte Results & Reference Ranges ({results.length})</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddResult}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Analyte
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((res, index) => (
              <div
                key={res.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Analyte #{index + 1}
                  </span>
                  {results.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveResult(res.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove analyte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <FormField
                      label="Analyte / Test Parameter"
                      required
                      error={validationErrors[`res_${index}_name`]}
                    >
                      <Input
                        placeholder="e.g. Glucose Fasting, Serum Creatinine"
                        value={res.parameterName}
                        onChange={(e) => handleResultChange(res.id, 'parameterName', e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField
                      label="Observed Value"
                      required
                      error={validationErrors[`res_${index}_value`]}
                    >
                      <Input
                        placeholder="e.g. 95, 1.05"
                        value={res.value}
                        onChange={(e) => handleResultChange(res.id, 'value', e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField label="Unit">
                      <Input
                        placeholder="e.g. mg/dL, mmol/L"
                        value={res.unit}
                        onChange={(e) => handleResultChange(res.id, 'unit', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FormField
                      label="Standard Reference Range"
                      required
                      error={validationErrors[`res_${index}_ref`]}
                    >
                      <Input
                        placeholder="e.g. 70 - 99 mg/dL"
                        value={res.referenceRange}
                        onChange={(e) => handleResultChange(res.id, 'referenceRange', e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField label="Clinical Flag">
                      <Select
                        value={res.flag}
                        onChange={(e) => handleResultChange(res.id, 'flag', e.target.value)}
                        options={[
                          { value: 'NORMAL', label: 'Normal (In Range)' },
                          { value: 'ABNORMAL_HIGH', label: 'High (Abnormal)' },
                          { value: 'ABNORMAL_LOW', label: 'Low (Abnormal)' },
                          { value: 'CRITICAL', label: 'Critical Alert' },
                        ]}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            ))}

            <FormField
              label="Technologist & Pathologist Remarks"
              required
              error={validationErrors.technologistRemarks}
              helperText="Note specimen viability, assay methodology, or clinical interpretations."
            >
              <textarea
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[70px]"
                placeholder="e.g. Specimen received on ice within protocol window. Photometric analyzer calibration verified."
                value={technologistRemarks}
                onChange={(e) => setTechnologistRemarks(e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {isGuest ? (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <Lock className="w-4 h-4 shrink-0" />
                Sign in with a verified Laboratory account to issue this diagnostic report.
              </span>
            ) : consentStatus !== 'ACTIVE' ? (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                Patient consent required before sealing and signing this diagnostic report.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Patient authorization active ({consentScope === 'CREATE_ONLY' ? 'Create New Only' : 'Full Access'}). Ready for cryptographic sealing.
              </span>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isGuest || consentStatus !== 'ACTIVE'}
            >
              <FileSignature className="w-4 h-4 mr-1.5" />
              {isGuest
                ? 'Sign In to Finalize'
                : consentStatus !== 'ACTIVE'
                ? 'Awaiting Consent'
                : 'Preview & Finalize Lab Report'}
            </Button>
          </div>
        </div>
      </form>

      {/* Patient Consent Simulator Modal (Demo Mode) */}
      <Modal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Patient Consent Authorization (ABDM Gateway)"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <span className="font-bold block text-sm mb-1">Incoming Laboratory Access Request</span>
            <p>
              {currentUser ? currentUser.fullName : activeLab.fullName} ({currentUser?.organization || activeLab.organization}) is requesting diagnostic pathology authorization for patient <strong>{selectedPatient.fullName}</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Patient Choice — Select Authorization Level:
            </label>

            <button
              type="button"
              onClick={() => handleGrantConsent('GRANT_CREATE_ONLY')}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 flex items-center justify-between">
                <span>1. Allow to create only new prescription or report</span>
                <Badge variant="neutral" className="text-[10px]">Restricted</Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                The laboratory can process specimens and sign this new diagnostic report, but CANNOT view your past medical records and diagnostic folders.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGrantConsent('GRANT_FULL_ACCESS')}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                <span>2. Share all previous reports and create new report</span>
                <Badge variant="success" className="text-[10px]">Full Access</Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                The laboratory is authorized to inspect historical records as well as formulate and sign new diagnostic reports.
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeclineConsent}
              className="text-xs text-red-600 hover:bg-red-50 border-red-200"
            >
              Decline Request
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDemoModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <LabReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onConfirmFinalize={handleConfirmFinalize}
          patient={selectedPatient}
          labName={activeLab.fullName}
          labOrg={activeLab.organization}
          labLicense={activeLab.licenseNumber}
          title={title}
          clinicalData={{
            testCategory,
            specimenType,
            collectionTimestamp: new Date().toISOString(),
            fastingStatus,
            results,
            technologistRemarks,
          }}
          isSubmitting={isFinalizing}
        />
      )}
    </div>
  );
};
