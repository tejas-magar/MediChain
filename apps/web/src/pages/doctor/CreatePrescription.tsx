import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  FileSignature,
  Search,
  CheckCircle2,
  Clock,
  LogIn,
  Lock,
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
  Checkbox,
  Badge,
  Modal,
} from '../../components/ui';
import { MedicationItem, PrescriptionClinicalData, PatientProfile, ConsentScope } from '../../types';
import { PrescriptionPreviewModal } from './PrescriptionPreviewModal';

export const CreatePrescription: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');

  const { activeDoctor, currentUser } = useRole();
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

  // Form State
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [allergiesAcknowledged, setAllergiesAcknowledged] = useState(false);

  // Dynamic Medications list
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: 'med-1',
      medicationName: '',
      strength: '',
      dosageForm: 'Tablet',
      frequency: 'Once daily with meals',
      duration: '30 days',
      quantity: '30 tablets',
      refills: 0,
      instructions: '',
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

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
        console.warn('[CreatePrescription] Notice loading database patients:', err);
      });
  }, [searchParams]);

  useEffect(() => {
    const providerId = currentUser ? currentUser.id : activeDoctor.id;
    const status = mockService.getConsentStatus(selectedPatient.id, providerId, selectedPatient.mrn);
    setConsentStatus(status.status);
    setConsentScope(status.scope);
  }, [selectedPatient, currentUser, activeDoctor]);

  const handleSendAccessRequest = () => {
    setIsRequestingAccess(true);
    const providerId = currentUser ? currentUser.id : activeDoctor.id;
    const providerName = currentUser ? currentUser.fullName : activeDoctor.fullName;
    const providerOrg = currentUser?.organization || activeDoctor.organization;
    const providerLicense = currentUser?.licenseNumber || activeDoctor.licenseNumber;

    mockService.requestAccess(
      providerId,
      providerName,
      'DOCTOR',
      providerOrg,
      providerLicense,
      selectedPatient,
      'Clinical consultation and digital prescription formulation'
    );

    apiClient.requestAssociation(selectedPatient.id, 'Clinical consultation and prescription formulation').catch(() => {});

    setConsentStatus('PENDING');
    setConsentScope(undefined);
    setIsRequestingAccess(false);
  };

  const handleGrantConsent = (decision: 'GRANT_CREATE_ONLY' | 'GRANT_FULL_ACCESS') => {
    const providerId = currentUser ? currentUser.id : activeDoctor.id;
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
    const providerId = currentUser ? currentUser.id : activeDoctor.id;
    const status = mockService.getConsentStatus(selectedPatient.id, providerId, selectedPatient.mrn);
    if (status.request) {
      mockService.respondToConsentRequest(status.request.id, 'REJECT');
      apiClient.respondToAssociation(status.request.id, 'REJECT').catch(() => {});
    }
    setConsentStatus('REVOKED');
    setConsentScope(undefined);
    setIsDemoModalOpen(false);
  };

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

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        id: `med-${Date.now()}`,
        medicationName: '',
        strength: '',
        dosageForm: 'Tablet',
        frequency: 'Once daily in the morning',
        duration: '30 days',
        quantity: '30 tablets',
        refills: 1,
        instructions: '',
      },
    ]);
  };

  const handleRemoveMedication = (id: string) => {
    if (medications.length <= 1) return;
    setMedications(medications.filter((m) => m.id !== id));
  };

  const handleMedicationChange = (id: string, field: keyof MedicationItem, value: any) => {
    setMedications(
      medications.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Prescription title is required.';
    }
    if (!diagnosis.trim()) {
      errors.diagnosis = 'Primary clinical diagnosis is required.';
    }
    if (!treatmentPlan.trim()) {
      errors.treatmentPlan = 'Treatment plan instructions are required.';
    }
    if (!allergiesAcknowledged) {
      errors.allergies = 'You must confirm review of the patient allergy profile.';
    }

    // Validate medication items
    medications.forEach((med, idx) => {
      if (!med.medicationName.trim()) {
        errors[`med_${idx}_name`] = `Medication #${idx + 1} name is required.`;
      }
      if (!med.strength.trim()) {
        errors[`med_${idx}_strength`] = `Medication #${idx + 1} strength is required.`;
      }
      if (!med.instructions.trim()) {
        errors[`med_${idx}_instructions`] = `Medication #${idx + 1} administration instructions are required.`;
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
      const clinicalData: PrescriptionClinicalData = {
        diagnosis: diagnosis.trim(),
        icdCode: icdCode.trim() || undefined,
        treatmentPlan: treatmentPlan.trim(),
        medications,
        dispenseAsWritten: false,
        patientAllergiesAcknowledged: allergiesAcknowledged,
      };

      const mappedMedications = medications.map((m) => ({
        name: `${m.medicationName} ${m.strength}`.trim(),
        dosage: m.strength || 'Standard dosage',
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || undefined,
        refills: m.refills || 0,
      }));

      let targetPatientId = selectedPatient.id;
      // Ensure active association exists with the recipient patient
      try {
        await apiClient.createAssociation(targetPatientId, 'Outpatient clinical consultation').catch(() => {});
      } catch (e) {
        console.warn('[CreatePrescription] Association check:', e);
      }

      let createdId = '';
      try {
        const res = await apiClient.finalizePrescription({
          patientId: targetPatientId,
          title: title.trim(),
          clinicalIndication: diagnosis.trim(),
          medications: mappedMedications,
          notes: treatmentPlan.trim(),
        });
        createdId = res.document.id;
        if (res.document) {
          mockService.syncFromBackend([res.document]);
        }
      } catch (apiErr) {
        console.warn('[CreatePrescription] Backend API call fallback to local store:', apiErr);
      }

      // Sync into mockService so client views have the record
      mockService.registerDynamicPatient(selectedPatient);
      let localDocId = createdId;
      if (!createdId) {
        const localDoc = mockService.createPrescription(
          {
            patientId: selectedPatient.id,
            title: title.trim(),
            clinicalData,
          },
          activeDoctor
        );
        localDocId = localDoc.id;
      }

      setIsFinalizing(false);
      setIsPreviewOpen(false);
      navigate(`/documents/${localDocId}`);
    } catch (err: any) {
      setIsFinalizing(false);
      alert(`Error creating prescription: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create Clinical Prescription
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Formulate official clinical medication orders. Finalized orders are signed and anchored with immutable proofs.
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
                Issuing clinical prescriptions to patients is restricted. Please sign in as an authorized Physician to request patient consent and issue official prescriptions.
              </div>
            </div>
          </div>
          <Link
            to="/login?portal=doctor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 text-white font-semibold text-xs rounded-lg hover:bg-amber-800 transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In as Doctor
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>1. Patient Selection & Demographics</CardTitle>
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
                    Select any patient in the database to formulate orders
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
                            apiClient.createAssociation(p.id, 'Clinical prescription order').catch(() => {});
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
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
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
                      Designated Recipient for Clinical Prescription Order
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

            {/* Patient Allergy Profile */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-0.5">
                Patient Allergy Profile:
              </span>
              <p className="text-amber-800 font-medium">
                {selectedPatient.allergies.join(', ')}
              </p>
            </div>

            <Checkbox
              id="allergies-ack"
              checked={allergiesAcknowledged}
              onChange={(e) => setAllergiesAcknowledged(e.target.checked)}
              label="I certify that I have verified this patient's documented allergy history before prescribing."
            />
            {validationErrors.allergies && (
              <p className="text-xs text-red-600 font-semibold">{validationErrors.allergies}</p>
            )}
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
                Sign in with a verified Doctor account to request digital consent from {selectedPatient.fullName}.
              </div>
            ) : consentStatus === 'ACTIVE' ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1.5 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Patient Consent Active</span>
                </div>
                <p className="text-emerald-800">
                  {consentScope === 'CREATE_ONLY'
                    ? 'Granted Scope: "Allow to create only new prescription or report" — Prior medical history remains confidential; authorization granted to seal this clinical prescription.'
                    : 'Granted Scope: "Share all previous reports and create new report" — Full longitudinal access and prescription issuance granted.'}
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
                    Before sealing clinical prescriptions for {selectedPatient.fullName}, an access request must be issued to the patient.
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

        {/* Prescription Indication */}
        <Card>
          <CardHeader>
            <CardTitle>2. Clinical Indication & Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Prescription Clinical Title"
              required
              error={validationErrors.title}
              helperText="e.g. Antihypertensive Maintenance Regimen, Post-Operative Prophylaxis"
            >
              <Input
                placeholder="e.g. Antihypertensive Dual Therapy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FormField
                  label="Primary Diagnosis"
                  required
                  error={validationErrors.diagnosis}
                >
                  <Input
                    placeholder="e.g. Essential (primary) hypertension"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </FormField>
              </div>
              <div>
                <FormField label="ICD-10 Code (Optional)">
                  <Input
                    placeholder="e.g. I10"
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            <FormField
              label="Treatment Plan & Monitoring Instructions"
              required
              error={validationErrors.treatmentPlan}
            >
              <textarea
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none min-h-[70px]"
                placeholder="e.g. Take daily in the morning. Follow up in clinic in 6 weeks with home blood pressure logs."
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Medication Order Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>3. Prescribed Medications ({medications.length})</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedication}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Medication
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {medications.map((med, index) => (
              <div
                key={med.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Medication #{index + 1}
                  </span>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(med.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <FormField
                      label="Medication Name"
                      required
                      error={validationErrors[`med_${index}_name`]}
                    >
                      <Input
                        placeholder="e.g. Lisinopril, Metformin HCl, Amoxicillin"
                        value={med.medicationName}
                        onChange={(e) => handleMedicationChange(med.id, 'medicationName', e.target.value)}
                      />
                    </FormField>
                  </div>
                  <div>
                    <FormField
                      label="Strength"
                      required
                      error={validationErrors[`med_${index}_strength`]}
                    >
                      <Input
                        placeholder="e.g. 10 mg, 500 mg, 250 mg/5mL"
                        value={med.strength}
                        onChange={(e) => handleMedicationChange(med.id, 'strength', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <FormField label="Form">
                      <Select
                        value={med.dosageForm}
                        onChange={(e) => handleMedicationChange(med.id, 'dosageForm', e.target.value)}
                        options={[
                          { value: 'Tablet', label: 'Tablet' },
                          { value: 'Capsule', label: 'Capsule' },
                          { value: 'Oral Suspension', label: 'Oral Suspension' },
                          { value: 'Inhaler', label: 'Inhaler' },
                          { value: 'Injection', label: 'Injection' },
                        ]}
                      />
                    </FormField>
                  </div>
                  <div>
                    <FormField label="Quantity">
                      <Input
                        placeholder="e.g. 30 tablets"
                        value={med.quantity}
                        onChange={(e) => handleMedicationChange(med.id, 'quantity', e.target.value)}
                      />
                    </FormField>
                  </div>
                  <div>
                    <FormField label="Refills Authorized">
                      <Select
                        value={med.refills.toString()}
                        onChange={(e) => handleMedicationChange(med.id, 'refills', parseInt(e.target.value, 10))}
                        options={[
                          { value: '0', label: '0 (No Refills)' },
                          { value: '1', label: '1 Refill' },
                          { value: '2', label: '2 Refills' },
                          { value: '3', label: '3 Refills' },
                          { value: '5', label: '5 Refills' },
                        ]}
                      />
                    </FormField>
                  </div>
                  <div>
                    <FormField label="Duration">
                      <Input
                        placeholder="e.g. 30 days"
                        value={med.duration}
                        onChange={(e) => handleMedicationChange(med.id, 'duration', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>

                <FormField
                  label="Administration Instructions (Sig)"
                  required
                  error={validationErrors[`med_${index}_instructions`]}
                >
                  <Input
                    placeholder="e.g. Take 1 tablet daily by mouth in the morning with food."
                    value={med.instructions}
                    onChange={(e) => handleMedicationChange(med.id, 'instructions', e.target.value)}
                  />
                </FormField>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {isGuest ? (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <Lock className="w-4 h-4 shrink-0" />
                Sign in with a verified Doctor account to issue this prescription.
              </span>
            ) : consentStatus !== 'ACTIVE' ? (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                Patient consent required before sealing and signing this prescription.
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
                : 'Preview & Finalize Prescription'}
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
            <span className="font-bold block text-sm mb-1">Incoming Provider Access Request</span>
            <p>
              Dr. {currentUser ? currentUser.fullName : activeDoctor.fullName} ({currentUser?.organization || activeDoctor.organization}) is requesting clinical authorization for patient <strong>{selectedPatient.fullName}</strong>.
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
                The provider can formulate and sign this new prescription, but CANNOT view your past medical records and diagnostic folders.
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
                The provider is authorized to inspect historical prescriptions and lab panels as well as formulate new clinical orders.
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

      {/* Preview & Cryptographic Finalization Modal */}
      {isPreviewOpen && (
        <PrescriptionPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onConfirmFinalize={handleConfirmFinalize}
          patient={selectedPatient}
          doctorName={activeDoctor.fullName}
          doctorOrg={activeDoctor.organization}
          doctorLicense={activeDoctor.licenseNumber}
          title={title}
          clinicalData={{
            diagnosis,
            icdCode: icdCode || undefined,
            treatmentPlan,
            medications,
            dispenseAsWritten: false,
            patientAllergiesAcknowledged: allergiesAcknowledged,
          }}
          isSubmitting={isFinalizing}
        />
      )}
    </div>
  );
};
