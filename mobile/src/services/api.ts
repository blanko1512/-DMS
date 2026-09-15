/**
 * Centralized DMS Mobile API Service
 * Handles live REST requests to FastAPI backend with JWT token injection,
 * dynamic baseURL configuration, and resilient fallback handling.
 */

import { Platform } from 'react-native';

// In web, localhost is 127.0.0.1. On Android emulator, 10.0.2.2 maps to host localhost.
const DEFAULT_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://127.0.0.1:8000',
});

let currentBaseUrl = DEFAULT_URL;
let currentAccessToken: string | null = null;
let currentChallengeId: string | null = null;
let currentUserProfile: any = null;

export const ApiConfig = {
  getBaseUrl: () => currentBaseUrl,
  setBaseUrl: (url: string) => {
    currentBaseUrl = url.replace(/\/+$/, '');
  },
  getToken: () => currentAccessToken,
  setToken: (token: string | null) => {
    currentAccessToken = token;
  },
  getChallengeId: () => currentChallengeId,
  setChallengeId: (id: string | null) => {
    currentChallengeId = id;
  },
  getUser: () => currentUserProfile,
  setUser: (user: any) => {
    currentUserProfile = user;
  },
};

/**
 * Core fetch wrapper with timeout, JSON parsing and auth headers
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const url = `${currentBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  // Auto set Content-Type if body is JSON and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        (data && (data.detail || data.message)) ||
        `Request failed with HTTP status ${response.status}`;
      return { data: null, error: errorMsg, status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const msg =
      err.name === 'AbortError'
        ? 'Connection timed out. Check FastAPI backend.'
        : err.message || 'Cannot reach FastAPI server';
    return { data: null, error: msg, status: 0 };
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

export const DmsApi = {
  // System Health
  async getHealth() {
    return apiRequest('/health');
  },
  async getDbHealth() {
    return apiRequest('/health/db');
  },

  // Authentication
  async login(email: string, password: string) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase(), password }),
    });
    if (res.data && res.data.challenge_id) {
      ApiConfig.setChallengeId(res.data.challenge_id);
    }
    return res;
  },

  async verifyOtp(challengeId: string, otp: string) {
    const res = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, otp }),
    });
    if (res.data && res.data.access_token) {
      ApiConfig.setToken(res.data.access_token);
    }
    return res;
  },

  async getMe() {
    const res = await apiRequest('/api/auth/me');
    if (res.data) {
      ApiConfig.setUser(res.data);
    }
    return res;
  },

  // Documents
  async listDocuments(limit: number = 50, offset: number = 0) {
    return apiRequest(`/api/documents?limit=${limit}&offset=${offset}`);
  },

  async searchDocuments(params: {
    q?: string;
    case_id?: string;
    document_type?: string;
    department?: string;
    status?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.case_id) query.append('case_id', params.case_id);
    if (params.document_type) query.append('document_type', params.document_type);
    if (params.department) query.append('department', params.department);
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', String(params.limit));

    return apiRequest(`/api/documents/search?${query.toString()}`);
  },

  async getDocument(documentId: string) {
    return apiRequest(`/api/documents/${documentId}`);
  },

  async uploadDocument(formData: FormData) {
    return apiRequest('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async extractText(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/extract-text`, {
      method: 'POST',
    });
  },

  async validateRequiredFields(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/validate-required-fields`, {
      method: 'POST',
    });
  },

  async validateConsistency(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/validate-consistency`, {
      method: 'POST',
    });
  },

  async getDuplicates(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/duplicates`);
  },

  async getVersions(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/versions`);
  },

  // Shares
  async listShares(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/shares`);
  },

  async createShare(documentId: string, payload: any) {
    return apiRequest(`/api/documents/${documentId}/shares`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getShare(shareId: string) {
    return apiRequest(`/api/shares/${shareId}`);
  },

  async revokeShare(shareId: string) {
    return apiRequest(`/api/shares/${shareId}/revoke`, {
      method: 'POST',
    });
  },

  // Custody
  async getCustody(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/custody`);
  },

  async transferCustody(documentId: string, payload: any) {
    return apiRequest(`/api/documents/${documentId}/custody/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Blockchain
  async getBlockchainVerify(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/blockchain-verify`);
  },

  async createBlockchainProof(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/blockchain-proof`, {
      method: 'POST',
    });
  },

  // Audit Logs
  async listAuditLogs(skip: number = 0, limit: number = 50) {
    return apiRequest(`/api/audit-logs?skip=${skip}&limit=${limit}`);
  },

  // Backups
  async createBackup() {
    return apiRequest('/api/backups/create', {
      method: 'POST',
    });
  },

  async restoreTest(formData: FormData) {
    return apiRequest('/api/backups/restore-test', {
      method: 'POST',
      body: formData,
    });
  },
};
