import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Search,
  Upload,
  RefreshCw,
  AlertTriangle,
  Lock,
  Building2,
  Calendar,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormField,
  Input,
  Select,
  Checkbox,
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  ConfirmDialog,
  Alert,
  ToastProvider,
  useToast,
  Skeleton,
  SkeletonTableRow,
  EmptyState,
} from './components/ui';

// Fictional non-sensitive clinical record model
interface FictionalRecord {
  id: string;
  patientRef: string;
  documentType: string;
  issuer: string;
  date: string;
  hashPreview: string;
  status: 'verified' | 'pending' | 'revoked';
}

const SAMPLE_RECORDS: FictionalRecord[] = [
  {
    id: 'REC-2026-0891',
    patientRef: 'PT-9402-A',
    documentType: 'Comprehensive Metabolic Panel',
    issuer: 'St. Jude Pathology Laboratories',
    date: '2026-10-19',
    hashPreview: '9f82...3b1e',
    status: 'verified',
  },
  {
    id: 'REC-2026-0892',
    patientRef: 'PT-1184-C',
    documentType: 'Lumbar Spine MRI Scan',
    issuer: 'Metropolitan Imaging Center',
    date: '2026-10-20',
    hashPreview: '4a1c...e89d',
    status: 'pending',
  },
  {
    id: 'REC-2026-0893',
    patientRef: 'PT-7721-F',
    documentType: 'Histopathology Biopsy Report',
    issuer: 'University Oncology Clinic',
    date: '2026-10-15',
    hashPreview: 'c23f...91aa',
    status: 'revoked',
  },
  {
    id: 'REC-2026-0894',
    patientRef: 'PT-3305-K',
    documentType: 'Discharge Summary & Care Plan',
    issuer: 'General Regional Hospital',
    date: '2026-10-18',
    hashPreview: '7e5d...40c8',
    status: 'verified',
  },
];

const DesignSystemShowcase: React.FC = () => {
  const { addToast } = useToast();

  // Component state toggles
  const [btnLoading, setBtnLoading] = useState(false);
  const [formValidationErrors, setFormValidationErrors] = useState(false);
  const [tableState, setTableState] = useState<'populated' | 'loading' | 'empty'>('populated');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Form demo state
  const [docId, setDocId] = useState('DOC-2026-9041');
  const [docType, setDocType] = useState('lab');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleSimulateRevoke = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setIsConfirmOpen(false);
      addToast({
        type: 'error',
        title: 'Document Revocation Executed',
        message: 'Cryptographic access for record REC-2026-0893 has been permanently revoked.',
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Clinical Header */}
      <header className="bg-navy-900 border-b border-navy-950 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-medical-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">MediChain</span>
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700 uppercase">
                  Design System v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hospital & Diagnostic Laboratory Interface Standards
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => {
                window.location.hash = '#guidelines';
              }}
            >
              System Docs
            </Button>
            <div className="h-4 w-px bg-navy-800 hidden sm:block" />
            <span className="text-xs text-slate-400 font-mono hidden sm:inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              WCAG AA Compliant
            </span>
          </div>
        </div>
      </header>

      {/* Main Documentation Shell */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-12">
        {/* Intro Banner */}
        <section className="bg-white rounded-lg border border-slate-200/90 p-6 shadow-clinical">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
              Clinical Design System & Component Library
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              MediChain requires a rigorous, credible design language suited for hospitals,
              pathology labs, and health data verification. This preview demonstrates centralized
              tokens, strict contrast, semantic HTML, accessible focus rings, and clear state
              management.
            </p>
          </div>
        </section>

        {/* 1. Centralized Tokens: Colors & Scales */}
        <section id="tokens" className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
              01. Centralized Color & Spacing Tokens
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Restrained palette prioritizing deep navy authority, medical blue accents, and
              unambiguous status indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Primary Navy */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Primary Navy</CardTitle>
                <CardDescription>Structure, text, and primary actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-navy-900 text-white font-mono">
                  <span>navy-900</span>
                  <span>#0F2B3C</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-navy-700 text-white font-mono">
                  <span>navy-700</span>
                  <span>#235675</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-navy-100 text-navy-950 font-mono">
                  <span>navy-100</span>
                  <span>#E1ECF4</span>
                </div>
              </CardContent>
            </Card>

            {/* Medical Blue */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Medical Blue</CardTitle>
                <CardDescription>Active interactions & focus rings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-medical-700 text-white font-mono">
                  <span>medical-700</span>
                  <span>#0254A2</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-medical-500 text-white font-mono">
                  <span>medical-500</span>
                  <span>#0C86EB</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-medical-50 text-medical-950 font-mono">
                  <span>medical-50</span>
                  <span>#F0F7FF</span>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Status Colors */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Status Indicators</CardTitle>
                <CardDescription>Verified, pending, and revoked states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                  <span>Verified</span>
                  <span>#166534</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  <span>Pending</span>
                  <span>#92400E</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                  <span>Revoked</span>
                  <span>#991B1B</span>
                </div>
              </CardContent>
            </Card>

            {/* Neutrals & Surfaces */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Neutrals & Surfaces</CardTitle>
                <CardDescription>Subtle clinical backgrounds & borders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 text-slate-800 border border-slate-200 font-mono">
                  <span>Canvas (slate-50)</span>
                  <span>#F8FAFC</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-white text-slate-800 border border-slate-300 font-mono">
                  <span>Card Surface</span>
                  <span>#FFFFFF</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-slate-200 text-slate-800 font-mono">
                  <span>Borders (slate-200)</span>
                  <span>#E2E8F0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. Button System */}
        <section id="buttons" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
                02. Button Variants & Interactive States
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary, secondary, ghost, danger, and link variants with consistent height scales
                and loading indicators.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${btnLoading ? 'animate-spin' : ''}`} />}
              onClick={() => setBtnLoading(!btnLoading)}
            >
              {btnLoading ? 'Stop Loading State' : 'Simulate Loading State'}
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Variant Row */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Button Hierarchy
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    isLoading={btnLoading}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Upload Record (Primary)
                  </Button>
                  <Button
                    variant="secondary"
                    isLoading={btnLoading}
                    leftIcon={<Search className="w-4 h-4" />}
                  >
                    Verify Token (Secondary)
                  </Button>
                  <Button variant="ghost" isLoading={btnLoading}>
                    Cancel (Ghost)
                  </Button>
                  <Button
                    variant="danger"
                    isLoading={btnLoading}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Revoke Grant (Danger)
                  </Button>
                  <Button variant="link">View Audit Logs (Link)</Button>
                </div>
              </div>

              {/* Size Scale */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Scale: Small (32px), Medium (36px), Large (44px)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">
                    Small (sm)
                  </Button>
                  <Button variant="primary" size="md">
                    Medium (md)
                  </Button>
                  <Button variant="primary" size="lg">
                    Large (lg)
                  </Button>
                  <Button variant="secondary" size="md" disabled>
                    Disabled State
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Form Inputs & Validation States */}
        <section id="forms" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
                03. Form Inputs & Validation Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inputs featuring clear focus rings, label bindings, aria-describedby hints, and
                error alerts.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sliders className="w-3.5 h-3.5" />}
              onClick={() => setFormValidationErrors(!formValidationErrors)}
            >
              {formValidationErrors ? 'Show Valid States' : 'Simulate Validation Errors'}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form
                onSubmit={(e) => e.preventDefault()}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <FormField
                  id="record-id"
                  label="Document Identifier"
                  required
                  hint="Must match official hospital admission or lab accession code"
                  error={
                    formValidationErrors
                      ? 'Invalid format. Expected format: DOC-YYYY-NNNN'
                      : undefined
                  }
                >
                  <Input
                    id="record-id"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    isInvalid={formValidationErrors}
                    leftIcon={<FileText className="w-4 h-4" />}
                  />
                </FormField>

                <FormField
                  id="doc-type"
                  label="Document Category"
                  required
                  hint="Select clinical classification for access permissions"
                  error={
                    formValidationErrors
                      ? 'Please select an authorized clinical category'
                      : undefined
                  }
                >
                  <Select
                    id="doc-type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    isInvalid={formValidationErrors}
                  >
                    <option value="lab">Clinical Pathology / Laboratory Results</option>
                    <option value="imaging">Radiology & Diagnostic Imaging</option>
                    <option value="discharge">Inpatient Discharge Summary</option>
                    <option value="rx">Prescription & Medication Administration</option>
                  </Select>
                </FormField>

                <FormField
                  id="search-patient"
                  label="Patient Lookup (Readonly / Disabled Demo)"
                  hint="Shows disabled and locked input behavior"
                >
                  <Input
                    id="search-patient"
                    defaultValue="PT-9402-A (Anonymized Patient Identifier)"
                    disabled
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                </FormField>

                <div className="flex flex-col justify-center space-y-3 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Consent & Cryptographic Signing
                  </span>
                  <Checkbox
                    id="consent-check"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    label="Cryptographic Verification Consent"
                    description="I confirm this record integrity will be computed using SHA-256 with hospital authority key."
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-slate-500">
                All records are validated against clinical hospital registry standards
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setDocId('DOC-2026-9041')}
                >
                  Reset Form
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() =>
                    addToast({
                      type: 'success',
                      title: 'Record Staged',
                      message: `${docId} prepared for cryptographic verification.`,
                    })
                  }
                >
                  Stage Record
                </Button>
              </div>
            </CardFooter>
          </Card>
        </section>

        {/* 4. Status Badges */}
        <section id="badges" className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
              04. Clinical Status Badges
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unambiguous visual tokens representing verification, pending review, revocation, and
              system status.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Subtle Clinical Badges (Standard)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge status="verified">Verified (SHA-256 Valid)</Badge>
                  <Badge status="pending">Pending Validation</Badge>
                  <Badge status="revoked">Access Revoked</Badge>
                  <Badge status="info">Hospital Verified</Badge>
                  <Badge status="neutral">Draft Record</Badge>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Outlined & Solid Badges
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge status="verified" variant="outline">
                    Verified
                  </Badge>
                  <Badge status="pending" variant="outline">
                    Pending
                  </Badge>
                  <Badge status="revoked" variant="outline">
                    Revoked
                  </Badge>
                  <Badge status="verified" variant="solid">
                    Solid Verified
                  </Badge>
                  <Badge status="revoked" variant="solid">
                    Solid Revoked
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. Clinical Data Table, Skeletons & Empty States */}
        <section id="tables" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
                05. Data Table, Loading Skeletons & Empty States
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Semantic table styling with high-contrast text, record hashes, and simulated
                lifecycle states.
              </p>
            </div>
            {/* View State Switcher */}
            <div className="inline-flex rounded-md shadow-clinical p-1 bg-slate-200/60 text-xs">
              <button
                onClick={() => setTableState('populated')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  tableState === 'populated'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Populated
              </button>
              <button
                onClick={() => setTableState('loading')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  tableState === 'loading'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Skeleton Loading
              </button>
              <button
                onClick={() => setTableState('empty')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  tableState === 'empty'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Empty State
              </button>
            </div>
          </div>

          {tableState === 'loading' && (
            <div className="p-4 bg-white rounded-lg border border-slate-200 mb-3 flex items-center gap-3 shadow-clinical">
              <Skeleton variant="circular" width={32} height={32} />
              <div className="space-y-1.5 flex-1">
                <Skeleton variant="text" width="25%" />
                <Skeleton variant="text" width="45%" />
              </div>
            </div>
          )}

          {tableState === 'empty' ? (
            <EmptyState
              title="No Clinical Records Found"
              description="There are currently no medical documents matching the active criteria or filter parameters."
              action={
                <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                  Register New Record
                </Button>
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID / Patient</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Issuing Facility</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableState === 'loading' ? (
                    <>
                      <SkeletonTableRow columns={6} />
                      <SkeletonTableRow columns={6} />
                      <SkeletonTableRow columns={6} />
                    </>
                  ) : (
                    SAMPLE_RECORDS.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-semibold text-navy-900">
                              {record.id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Ref: {record.patientRef}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {record.documentType}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{record.issuer}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{record.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge status={record.status}>
                            {record.status === 'verified'
                              ? 'Verified'
                              : record.status === 'pending'
                                ? 'Pending'
                                : 'Revoked'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              addToast({
                                type: 'info',
                                title: `Inspecting ${record.id}`,
                                message: `SHA-256 fingerprint verified: ${record.hashPreview}`,
                              });
                            }}
                          >
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </section>

        {/* 6. Notifications: Inline Alerts & Real Toasts */}
        <section id="alerts" className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
              06. Inline Alerts & Toast Notifications
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accessible status messages for clinical feedback, cryptographic validation results,
              and security alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert variant="info" title="Cryptographic Integrity Notice">
              All documents are signed using the institution&apos;s RSA-PSS key and verified via
              SHA-256 digest.
            </Alert>
            <Alert variant="success" title="Record Verified Successfully">
              Document SHA-256 matches the registry timestamp. Signature validity confirmed.
            </Alert>
            <Alert variant="warning" title="Pending Laboratory Confirmation">
              This record has been staged but awaits final signature from St. Jude Pathology.
            </Alert>
            <Alert variant="error" title="Access Authorization Revoked">
              Cryptographic token expired or was revoked by the issuing physician on 2026-10-15.
            </Alert>
          </div>

          {/* Interactive Toast Triggers */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Interactive Toast Triggers</CardTitle>
              <CardDescription>
                Demonstrates accessible floating notifications with auto-dismiss timers.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-3 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                onClick={() =>
                  addToast({
                    type: 'success',
                    title: 'Verification Complete',
                    message: 'Record hash matches the institution registry.',
                  })
                }
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                onClick={() =>
                  addToast({
                    type: 'warning',
                    title: 'Access Timeout Warning',
                    message: 'Verification session will expire in 10 minutes.',
                  })
                }
              >
                Trigger Warning Toast
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
                onClick={() =>
                  addToast({
                    type: 'error',
                    title: 'Verification Failed',
                    message: 'Document hash does not match registry signature.',
                  })
                }
              >
                Trigger Error Toast
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* 7. Dialog & Confirmation Modals */}
        <section id="modals" className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider text-xs">
              07. Dialog & Confirmation Patterns
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accessible modals featuring focus containment, Escape key dismissal, and destructive
              confirmation flows.
            </p>
          </div>

          <Card>
            <CardContent className="py-5 flex flex-wrap gap-4 items-center">
              <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                Open Standard Information Dialog
              </Button>

              <Button variant="danger" size="md" onClick={() => setIsConfirmOpen(true)}>
                Open Revocation Confirmation Dialog
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Standard Modal Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Clinical Document Verification Details"
          description="Detailed cryptographic audit properties for record REC-2026-0891."
          footer={
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close Audit View
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-700">Document Digest (SHA-256):</div>
              <div className="font-mono text-[11px] text-slate-600 break-all">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
            </div>
            <div className="space-y-1 text-slate-600 leading-relaxed">
              <p>
                • Verified by: <strong>St. Jude Pathology Laboratories</strong>
              </p>
              <p>
                • Digital Signature Standard: <strong>RSA-PSS 2048-bit</strong>
              </p>
              <p>
                • Timestamp Authority: <strong>2026-10-19 14:32 UTC</strong>
              </p>
            </div>
          </div>
        </Modal>

        {/* Destructive Confirm Dialog Demo */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleSimulateRevoke}
          title="Revoke Verification Access?"
          message="Are you sure you want to revoke verification credentials for this record? Once revoked, scanning the QR code will indicate this document is invalid or withdrawn."
          confirmLabel="Yes, Revoke Access"
          variant="danger"
          isLoading={confirmLoading}
        />

        {/* 8. Design System Documentation Summary */}
        <section
          id="guidelines"
          className="bg-white border border-slate-200 rounded-lg p-6 shadow-clinical space-y-4"
        >
          <h2 className="text-base font-bold text-navy-900 tracking-tight">
            Design Decisions & Accessibility Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Color Palette & Contrast</h4>
              <p>
                Strictly restrained primary navy (`#0F2B3C`) with medical blue (`#0254A2`) accents.
                Text on neutral surfaces maintains a contrast ratio exceeding 7:1 (exceeding WCAG
                AAA). Status colors are backed by textual badges to ensure color-blind
                accessibility.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Keyboard Navigation & Focus</h4>
              <p>
                All interactive elements (buttons, inputs, selects, dialogs) enforce explicit
                `focus-visible:ring-2 focus-visible:ring-medical-600` outlines. Modals trap focus
                and support native `Escape` key dismissal.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Restrained Medical Aesthetics</h4>
              <p>
                Eliminated decorative gradients, oversized playful fonts, or emojis. Every icon is
                drawn consistently from `lucide-react`. Interfaces prioritize data density,
                readability, and immediate clinical trust.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        MediChain Design System • Clinical Grade UI Components • Privacy-Conscious Architecture
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <DesignSystemShowcase />
    </ToastProvider>
  );
};

export default App;
