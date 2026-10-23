/**
 * MediChain Clinical Backend API Client
 * Connects frontend workflows to the Express + PostgreSQL backend.
 * Uses credentials: 'include' to automatically manage HTTP-only session cookies.
 */

export interface PatientLookupParams {
  mrn: string;
  dateOfBirth?: string;
  email?: string;
}

export interface PrescriptionPayload {
  patientId: string;
  title: string;
  clinicalIndication: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    refills?: number;
  }>;
  notes?: string;
}

export interface LabReportPayload {
  patientId: string;
  title: string;
  specimen: string;
  collectionDate: string;
  results: Array<{
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'ABNORMAL';
  }>;
  interpretation?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: 'PATIENT' | 'DOCTOR' | 'TESTING_LAB';
  fullName: string;
  mrn?: string;
  licenseNumber?: string;
  organization?: string;
  specialty?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string[];
  dateOfBirth?: string;
  phone?: string;
}

class ApiClient {
  private getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}/api`;
    }
    return 'http://localhost:3001/api';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Transmit session cookies
    });

    if (!response.ok) {
      let errData: any = {};
      try {
        errData = await response.json();
      } catch {
        errData = { error: response.statusText };
      }
      const error = new Error(errData.error || `Request failed with status ${response.status}`);
      (error as any).statusCode = response.status;
      (error as any).code = errData.code;
      (error as any).details = errData.details;
      throw error;
    }

    return response.json();
  }

  // --- Auth & Session ---
  async login(identifier: string, password: string, expectedRole?: string) {
    return this.request<{ user: any; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, password, expectedRole }),
    });
  }

  async register(data: RegisterPayload) {
    return this.request<{ user: any; message: string; issuerPrivateKeyPem?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // --- Associations & Lookup ---
  async lookupPatient(params: PatientLookupParams) {
    return this.request<{ patient: any }>('/associations/lookup', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createAssociation(patientId: string, purpose?: string) {
    return this.request<{ association: any }>('/associations', {
      method: 'POST',
      body: JSON.stringify({ patientId, purpose }),
    });
  }

  async getMyAssociations() {
    return this.request<{ associations: any[] }>('/associations/my');
  }

  async requestAssociation(patientId: string, purpose?: string) {
    return this.request<{ association: any; message: string }>('/associations/request', {
      method: 'POST',
      body: JSON.stringify({ patientId, purpose }),
    });
  }

  async respondToAssociation(associationId: string, scope: 'CREATE_ONLY' | 'FULL_ACCESS' | 'REJECT') {
    return this.request<{ association: any; message: string }>(`/associations/${encodeURIComponent(associationId)}/respond`, {
      method: 'POST',
      body: JSON.stringify({ scope }),
    });
  }

  async getAssociationStatus(patientId: string) {
    return this.request<{ id?: string; status: string; scope?: string; note?: string; confirmedAt?: string; provider?: any }>(
      `/associations/status?patientId=${encodeURIComponent(patientId)}`
    );
  }

  async getAllPatients(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{ patients: any[] }>(`/associations/patients${query}`);
  }

  async getPatientById(id: string) {
    return this.request<{ patient: any }>(`/associations/patients/${encodeURIComponent(id)}`);
  }

  // --- Prescriptions ---
  async previewPrescription(payload: PrescriptionPayload) {
    return this.request<{ preview: any }>('/documents/prescriptions/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async finalizePrescription(payload: PrescriptionPayload) {
    return this.request<{ document: any; message: string }>('/documents/prescriptions/finalize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Lab Reports ---
  async previewLabReport(payload: LabReportPayload) {
    return this.request<{ preview: any }>('/documents/lab-reports/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async finalizeLabReport(payload: LabReportPayload) {
    return this.request<{ document: any; message: string }>('/documents/lab-reports/finalize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Private File Upload ---
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{ file: any; message: string }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // --- Documents ---
  async getDocuments() {
    return this.request<{ documents: any[] }>('/documents');
  }

  async getDocument(id: string) {
    return this.request<{ document: any }>(`/documents/${id}`);
  }

  async getDocumentHistory(id: string) {
    return this.request<{ versions: any[]; auditEvents: any[] }>(`/documents/${id}/history`);
  }

  async amendDocument(id: string, amendmentReason: string, clinicalData: any, title?: string) {
    return this.request<{ document: any; message: string }>(`/documents/${id}/amend`, {
      method: 'POST',
      body: JSON.stringify({ amendmentReason, clinicalData, title }),
    });
  }

  async downloadDocumentFile(id: string) {
    const response = await fetch(`${this.getBaseUrl()}/documents/${id}/file`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'document.bin';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { blob, filename };
  }

  // --- Public Verification ---
  async verifyByToken(token: string) {
    return this.request<{ verification: any }>(`/verify/${token}`);
  }
}

export const apiClient = new ApiClient();
